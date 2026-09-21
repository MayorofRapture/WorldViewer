use std::collections::HashSet;
use std::io::Write;
use std::net::{Ipv4Addr, SocketAddrV4, UdpSocket};
use std::process;
use std::thread;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::{Manager, State};
use tauri_plugin_shell::ShellExt;

#[derive(Clone)]
struct StartupMode(Option<SmokeMode>);

#[derive(Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum SmokeMode { Launch, Synthetic, #[serde(rename = "tracking-sidecar")] TrackingSidecar }

#[derive(Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum SmokeStatus { Pass, Fail }

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SmokeCheck { id: String, status: SmokeStatus, detail: Option<String> }

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SmokeError { code: String, message: String }

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SmokeResult {
    schema_version: u8,
    mode: SmokeMode,
    status: SmokeStatus,
    checks: Vec<SmokeCheck>,
    duration_ms: f64,
    errors: Vec<SmokeError>,
}

fn startup_mode_from_environment() -> Option<SmokeMode> {
    match std::env::var("WORLD_VIEWER_SMOKE_MODE").ok().as_deref() {
        Some("launch") => Some(SmokeMode::Launch),
        Some("synthetic") => Some(SmokeMode::Synthetic),
        Some("tracking-sidecar") => Some(SmokeMode::TrackingSidecar),
        _ => None,
    }
}

const OPENSEEFACE_PACKET_BYTES: usize = 1785;
const OPENSEEFACE_PORT: u16 = 11573;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TrackingEvidence {
    sidecar_spawn_ms: f64,
    first_valid_pose_ms: Option<f64>,
    sidecar_pid: u32,
    total_packet_count: usize,
    valid_pose_count: usize,
    invalid_pose_count: usize,
    valid_rate: f64,
    live_pose_cadence_hz: Option<f64>,
    face_ids_observed: Vec<i32>,
    frame_dimensions_reported: Vec<[u32; 2]>,
    pnp_error_mean: Option<f64>,
    observation_duration_ms: f64,
    openseeface_version: &'static str,
    model: u8,
    camera: [u32; 3],
    udp: &'static str,
}

#[derive(Clone, Copy)]
struct PacketHeader { upstream_timestamp: f64, face_id: i32, width: f32, height: f32, got_3d_points: bool, pnp_error: f32 }

fn finite_f32(bytes: &[u8], offset: usize) -> Result<f32, String> {
    let value = f32::from_le_bytes(bytes.get(offset..offset + 4).ok_or("truncated OpenSeeFace float")?.try_into().map_err(|_| "invalid OpenSeeFace float")?);
    value.is_finite().then_some(value).ok_or_else(|| "non-finite OpenSeeFace float".to_owned())
}

fn parse_tracking_headers(bytes: &[u8]) -> Result<Vec<PacketHeader>, String> {
    if bytes.is_empty() || bytes.len() % OPENSEEFACE_PACKET_BYTES != 0 {
        return Err(format!("expected a non-empty multiple of {OPENSEEFACE_PACKET_BYTES} bytes, received {}", bytes.len()));
    }
    bytes.chunks_exact(OPENSEEFACE_PACKET_BYTES).map(|frame| {
        let upstream_timestamp = f64::from_le_bytes(frame[0..8].try_into().map_err(|_| "invalid OpenSeeFace timestamp")?);
        if !upstream_timestamp.is_finite() { return Err("non-finite OpenSeeFace timestamp".to_owned()); }
        let face_id = i32::from_le_bytes(frame[8..12].try_into().map_err(|_| "invalid OpenSeeFace face ID")?);
        Ok(PacketHeader { upstream_timestamp, face_id, width: finite_f32(frame, 12)?, height: finite_f32(frame, 16)?, got_3d_points: frame[28] != 0, pnp_error: finite_f32(frame, 29)? })
    }).collect()
}

fn tracking_args() -> [&'static str; 26] {
    ["-i", "127.0.0.1", "-p", "11573", "-W", "640", "-H", "360", "-F", "24", "-c", "0", "-v", "0", "-s", "1", "--faces", "1", "--model", "3", "--gaze-tracking", "0", "--max-threads", "1", "--no-3d-adapt", "1"]
}

async fn run_tracking_sidecar(app: tauri::AppHandle) -> Result<TrackingEvidence, String> {
    let socket = UdpSocket::bind(SocketAddrV4::new(Ipv4Addr::LOCALHOST, OPENSEEFACE_PORT)).map_err(|error| format!("could not bind loopback UDP receiver 127.0.0.1:{OPENSEEFACE_PORT}: {error}"))?;
    socket.set_nonblocking(true).map_err(|error| error.to_string())?;
    let runtime_root = app.path().resource_dir().map_err(|error| format!("could not resolve packaged resource directory: {error}"))?.join("resources").join("openseeface-runtime");
    if !runtime_root.join("Binary").join("facetracker.exe").is_file() || !runtime_root.join("models").is_dir() || !runtime_root.join("Licenses").is_dir() {
        return Err(format!("packaged OpenSeeFace runtime is incomplete at {}; expected Binary\\facetracker.exe, models, and Licenses", runtime_root.display()));
    }
    let started = Instant::now();
    let runtime_binary_dir = runtime_root.join("Binary");
    let command = app.shell().sidecar("openseeface-facetracker").map_err(|error| format!("could not resolve packaged OpenSeeFace sidecar: {error}"))?.current_dir(&runtime_binary_dir).args(tracking_args());
    let (_events, child) = command.spawn().map_err(|error| format!("could not start packaged OpenSeeFace sidecar: {error}"))?;
    let spawn_ms = started.elapsed().as_secs_f64() * 1000.0;
    let sidecar_pid = child.pid();
    let child = child;
    let result = (|| -> Result<TrackingEvidence, String> {
        let readiness_deadline = Instant::now() + Duration::from_secs(20);
        let mut first_valid_pose_ms = None;
        let mut total = 0usize;
        let mut valid = 0usize;
        let mut invalid = 0usize;
        let mut ids = HashSet::new();
        let mut dimensions = HashSet::new();
        let mut pnp_errors = Vec::new();
        let mut receive_times = Vec::new();
        let mut upstream_times = Vec::new();
        let mut buffer = [0u8; 65535];
        while Instant::now() < readiness_deadline && first_valid_pose_ms.is_none() {
            match socket.recv_from(&mut buffer) {
                Ok((count, source)) if source.ip().is_loopback() => for header in parse_tracking_headers(&buffer[..count])? {
                    total += 1; ids.insert(header.face_id); dimensions.insert((header.width as u32, header.height as u32));
                    if header.got_3d_points { valid += 1; pnp_errors.push(header.pnp_error as f64); first_valid_pose_ms = Some(started.elapsed().as_secs_f64() * 1000.0); receive_times.push(Instant::now()); upstream_times.push(header.upstream_timestamp); } else { invalid += 1; }
                },
                Ok(_) => {},
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(2)),
                Err(error) => return Err(format!("loopback UDP receive failed: {error}")),
            }
        }
        if first_valid_pose_ms.is_none() { return Err("OpenSeeFace did not produce a valid got_3d_points pose within 20 seconds; check camera index 0 and camera ownership.".to_owned()); }
        let observation_started = Instant::now();
        while observation_started.elapsed() < Duration::from_secs(10) {
            match socket.recv_from(&mut buffer) {
                Ok((count, source)) if source.ip().is_loopback() => for header in parse_tracking_headers(&buffer[..count])? {
                    total += 1; ids.insert(header.face_id); dimensions.insert((header.width as u32, header.height as u32));
                    if header.got_3d_points { valid += 1; pnp_errors.push(header.pnp_error as f64); receive_times.push(Instant::now()); upstream_times.push(header.upstream_timestamp); } else { invalid += 1; }
                },
                Ok(_) => {},
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(2)),
                Err(error) => return Err(format!("loopback UDP receive failed: {error}")),
            }
        }
        let cadence = match (receive_times.first(), receive_times.last()) { (Some(first), Some(last)) if receive_times.len() > 1 && last > first => Some((receive_times.len() - 1) as f64 / last.duration_since(*first).as_secs_f64()), _ => None };
        let _upstream_live_timing_observed = upstream_times.windows(2).all(|pair| pair[1] >= pair[0]);
        let mut face_ids_observed: Vec<_> = ids.into_iter().collect(); face_ids_observed.sort_unstable();
        let mut frame_dimensions_reported: Vec<_> = dimensions.into_iter().map(|(w, h)| [w, h]).collect(); frame_dimensions_reported.sort_unstable();
        Ok(TrackingEvidence { sidecar_spawn_ms: spawn_ms, first_valid_pose_ms, sidecar_pid, total_packet_count: total, valid_pose_count: valid, invalid_pose_count: invalid, valid_rate: valid as f64 / total.max(1) as f64, live_pose_cadence_hz: cadence, face_ids_observed, frame_dimensions_reported, pnp_error_mean: (!pnp_errors.is_empty()).then(|| pnp_errors.iter().sum::<f64>() / pnp_errors.len() as f64), observation_duration_ms: observation_started.elapsed().as_secs_f64() * 1000.0, openseeface_version: "v1.20.5", model: 3, camera: [0, 640, 360], udp: "127.0.0.1:11573" })
    })();
    child.kill().map_err(|error| format!("could not terminate test-owned OpenSeeFace sidecar {sidecar_pid}: {error}"))?;
    result
}

fn validate_result(result: &SmokeResult, active_mode: Option<SmokeMode>) -> Result<(), String> {
    if result.schema_version != 1 { return Err("schemaVersion must be 1".to_owned()); }
    if active_mode != Some(result.mode) { return Err("smoke result mode does not match the active startup mode".to_owned()); }
    if !result.duration_ms.is_finite() || result.duration_ms < 0.0 { return Err("durationMs must be finite and non-negative".to_owned()); }
    let mut ids = HashSet::with_capacity(result.checks.len());
    if result.checks.iter().any(|check| check.id.trim().is_empty() || !ids.insert(check.id.as_str())) {
        return Err("check IDs must be non-empty and unique".to_owned());
    }
    let all_checks_pass = result.checks.iter().all(|check| check.status == SmokeStatus::Pass);
    if result.status == SmokeStatus::Pass && (!all_checks_pass || !result.errors.is_empty()) {
        return Err("pass requires all checks to pass and errors to be empty".to_owned());
    }
    Ok(())
}

#[tauri::command]
fn get_startup_mode(state: State<'_, StartupMode>) -> Option<SmokeMode> { state.0 }

#[tauri::command]
fn complete_smoke(state: State<'_, StartupMode>, result: SmokeResult) -> Result<(), String> {
    validate_result(&result, state.0)?;
    let exit_code = if result.status == SmokeStatus::Pass { 0 } else { 1 };
    let output = serde_json::to_string(&result).map_err(|error| error.to_string())?;
    println!("{output}");
    std::io::stdout().flush().map_err(|error| error.to_string())?;
    process::exit(exit_code);
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(StartupMode(startup_mode_from_environment()))
        .invoke_handler(tauri::generate_handler![get_startup_mode, complete_smoke])
        .setup(|app| {
            if startup_mode_from_environment() == Some(SmokeMode::TrackingSidecar) {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    let started = Instant::now();
                    let result = run_tracking_sidecar(handle.clone()).await;
                    let (status, checks, errors) = match result {
                        Ok(evidence) => {
                            let detail = serde_json::to_string(&evidence).unwrap_or_else(|error| format!("evidence serialization failed: {error}"));
                            (SmokeStatus::Pass, vec![SmokeCheck { id: "packaged-openseeface-operational-run".into(), status: SmokeStatus::Pass, detail: Some(detail) }], vec![])
                        }
                        Err(message) => (SmokeStatus::Fail, vec![SmokeCheck { id: "packaged-openseeface-operational-run".into(), status: SmokeStatus::Fail, detail: Some(message.clone()) }], vec![SmokeError { code: "TRACKING_SIDECAR_FAILED".into(), message }]),
                    };
                    let output = SmokeResult { schema_version: 1, mode: SmokeMode::TrackingSidecar, status, checks, duration_ms: started.elapsed().as_secs_f64() * 1000.0, errors };
                    match serde_json::to_string(&output) {
                        Ok(line) => println!("{line}"),
                        Err(error) => eprintln!("tracking-sidecar result serialization failed: {error}"),
                    }
                    handle.exit(if output.status == SmokeStatus::Pass { 0 } else { 1 });
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running WorldViewer");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_sidecar_arguments_preserve_the_validated_tracker_configuration() {
        assert_eq!(tracking_args(), ["-i", "127.0.0.1", "-p", "11573", "-W", "640", "-H", "360", "-F", "24", "-c", "0", "-v", "0", "-s", "1", "--faces", "1", "--model", "3", "--gaze-tracking", "0", "--max-threads", "1", "--no-3d-adapt", "1"]);
    }

    #[test]
    fn packet_header_requires_the_pinned_full_packet_size_and_finite_fields() {
        assert!(parse_tracking_headers(&[0; OPENSEEFACE_PACKET_BYTES - 1]).is_err());
        let mut packet = [0u8; OPENSEEFACE_PACKET_BYTES];
        packet[0..8].copy_from_slice(&1.0f64.to_le_bytes());
        packet[8..12].copy_from_slice(&7i32.to_le_bytes());
        packet[12..16].copy_from_slice(&640.0f32.to_le_bytes());
        packet[16..20].copy_from_slice(&360.0f32.to_le_bytes());
        packet[28] = 1;
        packet[29..33].copy_from_slice(&0.25f32.to_le_bytes());
        let header = parse_tracking_headers(&packet).unwrap().pop().unwrap();
        assert_eq!(header.face_id, 7);
        assert_eq!((header.width, header.height, header.got_3d_points, header.pnp_error), (640.0, 360.0, true, 0.25));
    }
}
