use std::collections::HashSet;
use std::fs::OpenOptions;
use std::io::Write;
use std::net::{Ipv4Addr, SocketAddrV4, UdpSocket};
use std::process;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{Manager, State};
use tauri_plugin_shell::ShellExt;

#[cfg(windows)]
use webview2_com::{
    CoTaskMemPWSTR, Microsoft::Web::WebView2::Win32::*, PermissionRequestedEventHandler,
};
#[cfg(windows)]
use windows::core::PWSTR;

#[derive(Clone)]
struct StartupMode(Option<SmokeMode>);

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum SmokeMode { Launch, Synthetic, #[serde(rename = "tracking-sidecar")] TrackingSidecar, #[serde(rename = "tracking-sustained")] TrackingSustained, #[serde(rename = "mediapipe-idle")] MediaPipeIdle, #[serde(rename = "mediapipe-24hz")] MediaPipe24Hz, #[serde(rename = "mediapipe-20hz")] MediaPipe20Hz, #[serde(rename = "mediapipe-480x270-20hz")] MediaPipe480x27020Hz, #[serde(rename = "mediapipe-matrix-diagnostic")] MediaPipeMatrixDiagnostic }

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
    parse_startup_mode(std::env::var("WORLD_VIEWER_SMOKE_MODE").ok().as_deref())
}

fn parse_startup_mode(value: Option<&str>) -> Option<SmokeMode> {
    match value {
        Some("launch") => Some(SmokeMode::Launch),
        Some("synthetic") => Some(SmokeMode::Synthetic),
        Some("tracking-sidecar") => Some(SmokeMode::TrackingSidecar),
        Some("tracking-sustained") => Some(SmokeMode::TrackingSustained),
        Some("mediapipe-idle") => Some(SmokeMode::MediaPipeIdle),
        Some("mediapipe-24hz") => Some(SmokeMode::MediaPipe24Hz),
        Some("mediapipe-20hz") => Some(SmokeMode::MediaPipe20Hz),
        Some("mediapipe-480x270-20hz") => Some(SmokeMode::MediaPipe480x27020Hz),
        Some("mediapipe-matrix-diagnostic") => Some(SmokeMode::MediaPipeMatrixDiagnostic),
        _ => None,
    }
}

fn lifecycle_hold_from_environment() -> bool {
    std::env::var("WORLD_VIEWER_SMOKE_LIFECYCLE_HOLD").ok().as_deref() == Some("1")
}

fn write_benchmark_event(mut event: serde_json::Value) -> Result<(), String> {
    if let serde_json::Value::Object(fields) = &mut event {
        let epoch_ms = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|error| error.to_string())?.as_secs_f64() * 1000.0;
        fields.insert("hostEpochMs".into(), serde_json::json!(epoch_ms));
    }
    let line = serde_json::to_string(&event).map_err(|error| error.to_string())?;
    if let Ok(path) = std::env::var("WORLD_VIEWER_BENCHMARK_EVENT_PATH") {
        let mut file = OpenOptions::new().create(true).append(true).open(path).map_err(|error| error.to_string())?;
        writeln!(file, "{line}").map_err(|error| error.to_string())?;
        file.flush().map_err(|error| error.to_string())?;
    } else {
        println!("{line}");
        std::io::stdout().flush().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn record_benchmark_event(event: serde_json::Value) -> Result<(), String> {
    write_benchmark_event(event)
}

#[cfg(windows)]
fn media_pipe_benchmark_mode(mode: Option<SmokeMode>) -> bool {
    matches!(
        mode,
        Some(SmokeMode::MediaPipeIdle | SmokeMode::MediaPipe24Hz | SmokeMode::MediaPipe20Hz | SmokeMode::MediaPipe480x27020Hz | SmokeMode::MediaPipeMatrixDiagnostic)
    )
}

#[cfg(windows)]
fn install_mediapipe_camera_permission_handler(app: &tauri::App) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Err("MediaPipe benchmark window was not available".to_owned());
    };

    window
        .with_webview(|webview| unsafe {
            let controller = webview.controller();
            let result = controller
                .CoreWebView2()
                .map_err(|error| format!("could not access WebView2 controller: {error}"))
                .and_then(|core_webview| {
                    let handler = PermissionRequestedEventHandler::create(Box::new(|_sender, args| {
                        let Some(args) = args else {
                            return Ok(());
                        };

                        let mut uri = PWSTR::null();
                        let mut permission_kind = COREWEBVIEW2_PERMISSION_KIND_UNKNOWN_PERMISSION;
                        args.Uri(&mut uri)?;
                        args.PermissionKind(&mut permission_kind)?;
                        let uri = CoTaskMemPWSTR::from(uri).to_string();
                        let is_packaged_origin = uri == "http://tauri.localhost"
                            || uri.starts_with("http://tauri.localhost/")
                            || uri == "https://tauri.localhost"
                            || uri.starts_with("https://tauri.localhost/");
                        let is_camera = permission_kind == COREWEBVIEW2_PERMISSION_KIND_CAMERA;
                        let allowed = is_packaged_origin && is_camera;

                        let _ = write_benchmark_event(serde_json::json!({
                            "kind": "permission-request",
                            "permissionKind": permission_kind.0,
                            "permission": if is_camera { "camera" } else { "other" },
                            "uri": uri,
                            "allowed": allowed,
                            "handlerScope": "mediapipe-benchmark-camera-only",
                        }));

                        if allowed {
                            args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW)?;
                        }
                        Ok(())
                    }));
                    let mut token = 0;
                    core_webview
                        .add_PermissionRequested(&handler, &mut token)
                        .map_err(|error| format!("could not install WebView2 permission handler: {error}"))
                        .and_then(|_| {
                            write_benchmark_event(serde_json::json!({
                                "kind": "permission-handler-installed",
                                "handlerScope": "mediapipe-benchmark-camera-only",
                                "permission": "camera",
                            }))
                        })
                });
            if let Err(error) = result {
                let _ = write_benchmark_event(serde_json::json!({
                    "kind": "permission-handler-error",
                    "error": error,
                }));
            }
        })
        .map_err(|error| format!("could not access benchmark WebView: {error}"))?;
    Ok(())
}

fn parse_model_value(value: &str) -> Result<u8, String> {
    let parsed = value.parse::<u8>().map_err(|_| format!("WORLD_VIEWER_OPENSEEFACE_MODEL must be 2 or 3; received {value}"))?;
    matches!(parsed, 2 | 3).then_some(parsed).ok_or_else(|| format!("WORLD_VIEWER_OPENSEEFACE_MODEL must be 2 or 3; received {value}"))
}

fn model_from_environment() -> Result<u8, String> {
    parse_model_value(&std::env::var("WORLD_VIEWER_OPENSEEFACE_MODEL").unwrap_or_else(|_| "3".to_owned()))
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
    max_threads: u8,
    camera: [u32; 3],
    udp: &'static str,
    warm_up_duration_ms: Option<f64>,
    measurement_duration_ms: Option<f64>,
    measurement_total_packet_count: Option<usize>,
    measurement_valid_pose_count: Option<usize>,
    measurement_invalid_pose_count: Option<usize>,
    measurement_valid_rate: Option<f64>,
    measurement_live_pose_cadence_hz: Option<f64>,
    measurement_inter_pose_interval_ms_median: Option<f64>,
    measurement_inter_pose_interval_ms_p95: Option<f64>,
    measurement_inter_pose_interval_ms_min: Option<f64>,
    measurement_inter_pose_interval_ms_max: Option<f64>,
    measurement_upstream_timestamps_monotonic: Option<bool>,
    performance_target_hz: Option<f64>,
    performance_target_met: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LifecycleReadiness {
    schema_version: u8,
    kind: &'static str,
    sidecar_pid: u32,
    first_valid_pose_ms: f64,
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

fn max_threads_from_environment() -> Result<u8, String> {
    let value = std::env::var("WORLD_VIEWER_OPENSEEFACE_MAX_THREADS").unwrap_or_else(|_| "1".to_owned());
    let parsed = value.parse::<u8>().map_err(|_| format!("WORLD_VIEWER_OPENSEEFACE_MAX_THREADS must be 1, 2, or 4; received {value}"))?;
    matches!(parsed, 1 | 2 | 4).then_some(parsed).ok_or_else(|| format!("WORLD_VIEWER_OPENSEEFACE_MAX_THREADS must be 1, 2, or 4; received {value}"))
}

fn tracking_args(model: u8, max_threads: u8) -> Vec<String> {
    vec!["-i", "127.0.0.1", "-p", "11573", "-W", "640", "-H", "360", "-F", "24", "-c", "0", "-v", "0", "-s", "1", "--faces", "1", "--model", &model.to_string(), "--gaze-tracking", "0", "--max-threads", &max_threads.to_string(), "--no-3d-adapt", "1"].into_iter().map(str::to_owned).collect()
}

fn percentile(sorted_values: &[f64], percentile: f64) -> Option<f64> {
    if sorted_values.is_empty() { return None; }
    let index = ((sorted_values.len() - 1) as f64 * percentile).round() as usize;
    sorted_values.get(index).copied()
}

async fn run_tracking_sidecar(app: tauri::AppHandle, sustained: bool, lifecycle_hold: bool) -> Result<TrackingEvidence, String> {
    let model = model_from_environment()?;
    let max_threads = max_threads_from_environment()?;
    let socket = UdpSocket::bind(SocketAddrV4::new(Ipv4Addr::LOCALHOST, OPENSEEFACE_PORT)).map_err(|error| format!("could not bind loopback UDP receiver 127.0.0.1:{OPENSEEFACE_PORT}: {error}"))?;
    socket.set_nonblocking(true).map_err(|error| error.to_string())?;
    let runtime_root = app.path().resource_dir().map_err(|error| format!("could not resolve packaged resource directory: {error}"))?;
    let required_runtime_files = vec!["openseeface-facetracker.exe".to_owned(), "python37.dll".to_owned(), format!("models/lm_model{model}_opt.onnx"), "models/mnv3_detection_opt.onnx".to_owned(), "models/retinaface_640x640_opt.onnx".to_owned()];
    let missing_files: Vec<_> = required_runtime_files.iter().filter(|relative| !runtime_root.join(relative).is_file()).collect();
    if !missing_files.is_empty() || !runtime_root.join("models").is_dir() || !runtime_root.join("Licenses").is_dir() {
        return Err(format!("packaged OpenSeeFace runtime is incomplete at {}; missing files: {:?}, models directory: {}, Licenses directory: {}", runtime_root.display(), missing_files, runtime_root.join("models").is_dir(), runtime_root.join("Licenses").is_dir()));
    }
    let started = Instant::now();
    let command = app.shell().sidecar("openseeface-facetracker").map_err(|error| format!("could not resolve packaged OpenSeeFace sidecar: {error}"))?.current_dir(&runtime_root).args(tracking_args(model, max_threads));
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
        if lifecycle_hold {
            let readiness = LifecycleReadiness { schema_version: 1, kind: "tracking-lifecycle-ready", sidecar_pid, first_valid_pose_ms: first_valid_pose_ms.expect("readiness was checked") };
            let line = serde_json::to_string(&readiness).map_err(|error| format!("lifecycle readiness serialization failed: {error}"))?;
            println!("{line}");
            std::io::stdout().flush().map_err(|error| format!("lifecycle readiness flush failed: {error}"))?;
            loop { thread::sleep(Duration::from_secs(1)); }
        }
        let warm_up_started = Instant::now();
        if sustained {
            while warm_up_started.elapsed() < Duration::from_secs(10) {
                match socket.recv_from(&mut buffer) {
                    Ok((count, source)) if source.ip().is_loopback() => for header in parse_tracking_headers(&buffer[..count])? {
                        ids.insert(header.face_id); dimensions.insert((header.width as u32, header.height as u32));
                    },
                    Ok(_) => {},
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(2)),
                    Err(error) => return Err(format!("loopback UDP receive failed: {error}")),
                }
            }
            total = 0;
            valid = 0;
            invalid = 0;
            pnp_errors.clear();
            receive_times.clear();
            upstream_times.clear();
        }
        let observation_started = Instant::now();
        let observation_duration = if sustained { Duration::from_secs(60) } else { Duration::from_secs(10) };
        while observation_started.elapsed() < observation_duration {
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
        let mut intervals_ms: Vec<_> = receive_times.windows(2).map(|pair| pair[1].duration_since(pair[0]).as_secs_f64() * 1000.0).collect();
        intervals_ms.sort_by(f64::total_cmp);
        let upstream_monotonic = upstream_times.windows(2).all(|pair| pair[1] >= pair[0]);
        let mut face_ids_observed: Vec<_> = ids.into_iter().collect(); face_ids_observed.sort_unstable();
        let mut frame_dimensions_reported: Vec<_> = dimensions.into_iter().map(|(w, h)| [w, h]).collect(); frame_dimensions_reported.sort_unstable();
        let measurement_duration_ms = observation_started.elapsed().as_secs_f64() * 1000.0;
        Ok(TrackingEvidence { sidecar_spawn_ms: spawn_ms, first_valid_pose_ms, sidecar_pid, total_packet_count: total, valid_pose_count: valid, invalid_pose_count: invalid, valid_rate: valid as f64 / total.max(1) as f64, live_pose_cadence_hz: cadence, face_ids_observed, frame_dimensions_reported, pnp_error_mean: (!pnp_errors.is_empty()).then(|| pnp_errors.iter().sum::<f64>() / pnp_errors.len() as f64), observation_duration_ms: measurement_duration_ms, openseeface_version: "v1.20.5", model, max_threads, camera: [0, 640, 360], udp: "127.0.0.1:11573", warm_up_duration_ms: sustained.then(|| warm_up_started.elapsed().as_secs_f64() * 1000.0 - measurement_duration_ms), measurement_duration_ms: sustained.then_some(measurement_duration_ms), measurement_total_packet_count: sustained.then_some(total), measurement_valid_pose_count: sustained.then_some(valid), measurement_invalid_pose_count: sustained.then_some(invalid), measurement_valid_rate: sustained.then_some(valid as f64 / total.max(1) as f64), measurement_live_pose_cadence_hz: sustained.then_some(cadence).flatten(), measurement_inter_pose_interval_ms_median: sustained.then(|| percentile(&intervals_ms, 0.5)).flatten(), measurement_inter_pose_interval_ms_p95: sustained.then(|| percentile(&intervals_ms, 0.95)).flatten(), measurement_inter_pose_interval_ms_min: sustained.then(|| intervals_ms.first().copied()).flatten(), measurement_inter_pose_interval_ms_max: sustained.then(|| intervals_ms.last().copied()).flatten(), measurement_upstream_timestamps_monotonic: sustained.then_some(upstream_monotonic), performance_target_hz: sustained.then_some(15.0), performance_target_met: sustained.then(|| cadence.is_some_and(|value| value >= 15.0)) })
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
        .invoke_handler(tauri::generate_handler![get_startup_mode, complete_smoke, record_benchmark_event])
        .setup(|app| {
            #[cfg(windows)]
            if media_pipe_benchmark_mode(startup_mode_from_environment()) {
                install_mediapipe_camera_permission_handler(app)?;
            }
            if matches!(startup_mode_from_environment(), Some(SmokeMode::TrackingSidecar | SmokeMode::TrackingSustained)) {
                let handle = app.handle().clone();
                let sustained = startup_mode_from_environment() == Some(SmokeMode::TrackingSustained);
                let lifecycle_hold = lifecycle_hold_from_environment();
                tauri::async_runtime::spawn(async move {
                    let started = Instant::now();
                    let result = run_tracking_sidecar(handle.clone(), sustained, lifecycle_hold).await;
                    let (status, checks, errors) = match result {
                        Ok(evidence) => {
                            let detail = serde_json::to_string(&evidence).unwrap_or_else(|error| format!("evidence serialization failed: {error}"));
                            let check_id = if sustained { "packaged-openseeface-sustained-operational-run" } else { "packaged-openseeface-operational-run" };
                            (SmokeStatus::Pass, vec![SmokeCheck { id: check_id.into(), status: SmokeStatus::Pass, detail: Some(detail) }], vec![])
                        }
                        Err(message) => { let check_id = if sustained { "packaged-openseeface-sustained-operational-run" } else { "packaged-openseeface-operational-run" }; (SmokeStatus::Fail, vec![SmokeCheck { id: check_id.into(), status: SmokeStatus::Fail, detail: Some(message.clone()) }], vec![SmokeError { code: "TRACKING_SIDECAR_FAILED".into(), message }]) },
                    };
                    let mode = if sustained { SmokeMode::TrackingSustained } else { SmokeMode::TrackingSidecar };
                    let output = SmokeResult { schema_version: 1, mode, status, checks, duration_ms: started.elapsed().as_secs_f64() * 1000.0, errors };
                    let exit_code = if output.status == SmokeStatus::Pass { 0 } else { 1 };
                    match serde_json::to_string(&output) {
                        Ok(line) => {
                            println!("{line}");
                            if let Err(error) = std::io::stdout().flush() {
                                eprintln!("tracking-sidecar result flush failed: {error}");
                                process::exit(1);
                            }
                            process::exit(exit_code);
                        }
                        Err(error) => {
                            eprintln!("tracking-sidecar result serialization failed: {error}");
                            process::exit(1);
                        }
                    }
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
    fn startup_mode_parser_recognizes_all_mediapipe_benchmark_modes() {
        assert_eq!(parse_startup_mode(Some("mediapipe-idle")), Some(SmokeMode::MediaPipeIdle));
        assert_eq!(parse_startup_mode(Some("mediapipe-24hz")), Some(SmokeMode::MediaPipe24Hz));
        assert_eq!(parse_startup_mode(Some("mediapipe-20hz")), Some(SmokeMode::MediaPipe20Hz));
        assert_eq!(parse_startup_mode(Some("mediapipe-480x270-20hz")), Some(SmokeMode::MediaPipe480x27020Hz));
        assert_eq!(parse_startup_mode(Some("mediapipe-matrix-diagnostic")), Some(SmokeMode::MediaPipeMatrixDiagnostic));
        assert_eq!(parse_startup_mode(Some("unknown")), None);
    }

    #[cfg(windows)]
    #[test]
    fn all_mediapipe_benchmark_modes_install_the_camera_permission_handler() {
        for mode in [SmokeMode::MediaPipeIdle, SmokeMode::MediaPipe24Hz, SmokeMode::MediaPipe20Hz, SmokeMode::MediaPipe480x27020Hz, SmokeMode::MediaPipeMatrixDiagnostic] {
            assert!(media_pipe_benchmark_mode(Some(mode)));
        }
    }

    #[test]
    fn new_mediapipe_mode_round_trips_and_validates_as_a_smoke_result() {
        let result: SmokeResult = serde_json::from_str(r#"{
            "schemaVersion": 1,
            "mode": "mediapipe-480x270-20hz",
            "status": "pass",
            "checks": [{ "id": "packaged-mediapipe-benchmark", "status": "pass" }],
            "durationMs": 1.0,
            "errors": []
        }"#).unwrap();
        assert_eq!(result.mode, SmokeMode::MediaPipe480x27020Hz);
        assert!(validate_result(&result, Some(SmokeMode::MediaPipe480x27020Hz)).is_ok());
    }

    #[test]
    fn matrix_diagnostic_mode_round_trips_and_validates_as_a_smoke_result() {
        let result: SmokeResult = serde_json::from_str(r#"{
            "schemaVersion": 1,
            "mode": "mediapipe-matrix-diagnostic",
            "status": "fail",
            "checks": [{ "id": "packaged-mediapipe-matrix-diagnostic", "status": "fail" }],
            "durationMs": 1.0,
            "errors": [{ "code": "MEDIAPIPE_DIAGNOSTIC_CANCELLED", "message": "operator cancelled capture" }]
        }"#).unwrap();
        assert_eq!(result.mode, SmokeMode::MediaPipeMatrixDiagnostic);
        assert!(validate_result(&result, Some(SmokeMode::MediaPipeMatrixDiagnostic)).is_ok());
    }

    #[test]
    fn fixed_sidecar_arguments_preserve_the_validated_tracker_configuration() {
        assert_eq!(tracking_args(3, 1), ["-i", "127.0.0.1", "-p", "11573", "-W", "640", "-H", "360", "-F", "24", "-c", "0", "-v", "0", "-s", "1", "--faces", "1", "--model", "3", "--gaze-tracking", "0", "--max-threads", "1", "--no-3d-adapt", "1"].into_iter().map(str::to_owned).collect::<Vec<_>>());
        let model_three = tracking_args(3, 1);
        let model_two = tracking_args(2, 1);
        assert_eq!(&model_two[0..19], &model_three[0..19]);
        assert_eq!(model_two[19], "2");
        assert_eq!(&model_two[20..], &model_three[20..]);
        let two_threads = tracking_args(3, 2);
        assert_eq!(&two_threads[0..23], &model_three[0..23]);
        assert_eq!(two_threads[23], "2");
        assert_eq!(&two_threads[24..], &model_three[24..]);
    }

    #[test]
    fn model_selection_is_bounded_and_defaults_to_model_three() {
        assert_eq!(parse_model_value("2"), Ok(2));
        assert_eq!(parse_model_value("3"), Ok(3));
        assert!(parse_model_value("1").is_err());
        assert!(parse_model_value("4").is_err());
        assert!(parse_model_value("not-a-model").is_err());
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
