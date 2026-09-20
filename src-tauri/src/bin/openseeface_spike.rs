//! Isolated M0D OpenSeeFace evaluation runner. This binary is not linked to the
//! Tauri application and must not be used as a production tracking source.

use serde::Serialize;
use std::fs::{self, File};
use std::io::{self, BufWriter, Write};
use std::net::{Ipv4Addr, SocketAddrV4, UdpSocket};
use std::path::PathBuf;
use std::process::{Child, Command};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const VERSION: &str = "v1.20.5";
const MODEL: i32 = 3;
const POINTS_2D: usize = 68;
const POINTS_3D: usize = 70;
const FEATURE_COUNT: usize = 14;
const PACKET_BYTES: usize = 1785;

#[derive(Clone, Copy, Debug, Serialize)]
struct Vec2 { x: f32, y: f32 }
#[derive(Clone, Copy, Debug, Serialize)]
struct Vec3 { x: f32, y: f32, z: f32 }
#[derive(Clone, Copy, Debug, Serialize)]
struct Quaternion { x: f32, y: f32, z: f32, w: f32 }

#[derive(Debug, Serialize)]
struct Packet {
    upstream_timestamp: f64,
    face_id: i32,
    frame_width: f32,
    frame_height: f32,
    right_eye_open: f32,
    left_eye_open: f32,
    got_3d_points: bool,
    pnp_error: f32,
    raw_quaternion: Quaternion,
    raw_euler_degrees: Vec3,
    raw_pnp_translation: Vec3,
    confidence: Vec<f32>,
    landmarks_2d: Vec<Vec2>,
    points_3d: Vec<Vec3>,
    features: Vec<f32>,
}

#[derive(Serialize)]
struct CandidateSignals {
    raw_pnp_translation_openseeface_model_units: Vec3,
    cyclopean_midpoint_points3d_68_69_openseeface_coordinate_units: Option<Vec3>,
    left_eye_center_pixels: Vec2,
    right_eye_center_pixels: Vec2,
    cyclopean_image_point_pixels: Vec2,
    interocular_distance_pixels: f32,
    eye_landmark_indices: [usize; 12],
}

#[derive(Serialize)]
struct RecordedSample<'a> {
    segment_id: &'a str,
    host_monotonic_receive_ms: f64,
    source_model: i32,
    camera: CameraConfig,
    openseeface_version: &'static str,
    packet: &'a Packet,
    candidates: CandidateSignals,
}

#[derive(Clone, Copy, Serialize)]
struct CameraConfig { index: i32, width: u32, height: u32, fps: u32 }

#[derive(Clone)]
struct Config {
    tracker_dir: PathBuf,
    output_root: PathBuf,
    camera: CameraConfig,
    port: u16,
    settle: Duration,
    capture: Duration,
    interactive: bool,
}

#[derive(Serialize)]
struct AxisStats { count: usize, mean: f64, median: f64, std_dev: f64, min: f64, max: f64, p95_abs_deviation_from_median: f64 }
#[derive(Serialize)]
struct SegmentSummary { id: String, target_description: String, elapsed_monotonic_ms: f64, sample_count: usize, receive_cadence_hz: f64, success_ratio: f64, pnp_error: AxisStats, raw_pnp_x: AxisStats, raw_pnp_y: AxisStats, raw_pnp_z: AxisStats, cyclopean_x: Option<AxisStats>, cyclopean_y: Option<AxisStats>, cyclopean_z: Option<AxisStats> }

fn parse_f32(bytes: &[u8], offset: &mut usize) -> Result<f32, String> {
    let end = offset.checked_add(4).ok_or("packet offset overflow")?;
    let value = f32::from_le_bytes(bytes.get(*offset..end).ok_or("truncated float")?.try_into().map_err(|_| "invalid float")?);
    *offset = end;
    if value.is_finite() { Ok(value) } else { Err("non-finite float".into()) }
}
fn parse_f64(bytes: &[u8], offset: &mut usize) -> Result<f64, String> {
    let end = offset.checked_add(8).ok_or("packet offset overflow")?;
    let value = f64::from_le_bytes(bytes.get(*offset..end).ok_or("truncated double")?.try_into().map_err(|_| "invalid double")?);
    *offset = end;
    if value.is_finite() { Ok(value) } else { Err("non-finite double".into()) }
}
fn parse_i32(bytes: &[u8], offset: &mut usize) -> Result<i32, String> {
    let end = offset.checked_add(4).ok_or("packet offset overflow")?;
    let value = i32::from_le_bytes(bytes.get(*offset..end).ok_or("truncated integer")?.try_into().map_err(|_| "invalid integer")?);
    *offset = end; Ok(value)
}
fn vec2(bytes: &[u8], offset: &mut usize) -> Result<Vec2, String> { Ok(Vec2 { x: parse_f32(bytes, offset)?, y: parse_f32(bytes, offset)? }) }
fn vec3(bytes: &[u8], offset: &mut usize) -> Result<Vec3, String> { Ok(Vec3 { x: parse_f32(bytes, offset)?, y: parse_f32(bytes, offset)?, z: parse_f32(bytes, offset)? }) }

fn decode_packet(bytes: &[u8]) -> Result<Vec<Packet>, String> {
    if bytes.is_empty() || bytes.len() % PACKET_BYTES != 0 { return Err(format!("expected a non-empty multiple of {PACKET_BYTES} bytes, received {}", bytes.len())); }
    let mut packets = Vec::new();
    for frame in bytes.chunks_exact(PACKET_BYTES) {
        let mut o = 0;
        let upstream_timestamp = parse_f64(frame, &mut o)?;
        let face_id = parse_i32(frame, &mut o)?;
        let frame_width = parse_f32(frame, &mut o)?;
        let frame_height = parse_f32(frame, &mut o)?;
        let right_eye_open = parse_f32(frame, &mut o)?;
        let left_eye_open = parse_f32(frame, &mut o)?;
        let got_3d_points = *frame.get(o).ok_or("truncated 3D flag")? != 0; o += 1;
        let pnp_error = parse_f32(frame, &mut o)?;
        let raw_quaternion = Quaternion { x: parse_f32(frame, &mut o)?, y: parse_f32(frame, &mut o)?, z: parse_f32(frame, &mut o)?, w: parse_f32(frame, &mut o)? };
        let raw_euler_degrees = vec3(frame, &mut o)?;
        let raw_pnp_translation = vec3(frame, &mut o)?;
        let confidence = (0..POINTS_2D).map(|_| parse_f32(frame, &mut o)).collect::<Result<Vec<_>, _>>()?;
        let landmarks_2d = (0..POINTS_2D).map(|_| vec2(frame, &mut o)).collect::<Result<Vec<_>, _>>()?;
        let points_3d = (0..POINTS_3D).map(|_| vec3(frame, &mut o)).collect::<Result<Vec<_>, _>>()?;
        let features = (0..FEATURE_COUNT).map(|_| parse_f32(frame, &mut o)).collect::<Result<Vec<_>, _>>()?;
        if o != PACKET_BYTES { return Err("internal protocol length mismatch".into()); }
        packets.push(Packet { upstream_timestamp, face_id, frame_width, frame_height, right_eye_open, left_eye_open, got_3d_points, pnp_error, raw_quaternion, raw_euler_degrees, raw_pnp_translation, confidence, landmarks_2d, points_3d, features });
    }
    Ok(packets)
}

fn midpoint(a: Vec3, b: Vec3) -> Vec3 { Vec3 { x: (a.x + b.x) / 2.0, y: (a.y + b.y) / 2.0, z: (a.z + b.z) / 2.0 } }
fn eye_center(points: &[Vec2], indices: &[usize]) -> Vec2 {
    let (x, y) = indices.iter().fold((0.0, 0.0), |(x, y), &i| (x + points[i].x, y + points[i].y));
    Vec2 { x: x / indices.len() as f32, y: y / indices.len() as f32 }
}
fn candidates(packet: &Packet) -> CandidateSignals {
    let left_indices = [36, 37, 38, 39, 40, 41];
    let right_indices = [42, 43, 44, 45, 46, 47];
    let left = eye_center(&packet.landmarks_2d, &left_indices);
    let right = eye_center(&packet.landmarks_2d, &right_indices);
    let image_midpoint = Vec2 { x: (left.x + right.x) / 2.0, y: (left.y + right.y) / 2.0 };
    let dx = left.x - right.x; let dy = left.y - right.y;
    CandidateSignals { raw_pnp_translation_openseeface_model_units: packet.raw_pnp_translation, cyclopean_midpoint_points3d_68_69_openseeface_coordinate_units: packet.got_3d_points.then(|| midpoint(packet.points_3d[68], packet.points_3d[69])), left_eye_center_pixels: left, right_eye_center_pixels: right, cyclopean_image_point_pixels: image_midpoint, interocular_distance_pixels: (dx * dx + dy * dy).sqrt(), eye_landmark_indices: [36,37,38,39,40,41,42,43,44,45,46,47] }
}

fn stats(values: &[f64]) -> AxisStats {
    let mut sorted = values.to_vec(); sorted.sort_by(f64::total_cmp);
    let n = sorted.len(); let mean = sorted.iter().sum::<f64>() / n as f64;
    let median = sorted[(n - 1) / 2];
    let std_dev = (sorted.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / n as f64).sqrt();
    let mut deviations: Vec<f64> = sorted.iter().map(|x| (x - median).abs()).collect(); deviations.sort_by(f64::total_cmp);
    AxisStats { count: n, mean, median, std_dev, min: sorted[0], max: sorted[n - 1], p95_abs_deviation_from_median: deviations[((n - 1) * 95) / 100] }
}

fn config() -> Result<Config, String> {
    let mut cfg = Config { tracker_dir: PathBuf::from(".spike-tools/Binary"), output_root: PathBuf::from("evidence/spikes/m0d-openseeface-physical-pose/sessions"), camera: CameraConfig { index: 0, width: 640, height: 360, fps: 24 }, port: 11573, settle: Duration::from_secs(2), capture: Duration::from_secs(5), interactive: false };
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() { let mut value = || args.next().ok_or_else(|| format!("missing value for {arg}")); match arg.as_str() {
        "--tracker-dir" => cfg.tracker_dir = PathBuf::from(value()?), "--output" => cfg.output_root = PathBuf::from(value()?), "--camera" => cfg.camera.index = value()?.parse().map_err(|_| "camera must be an integer")?, "--port" => cfg.port = value()?.parse().map_err(|_| "port must be a u16")?, "--settle-seconds" => cfg.settle = Duration::from_secs(value()?.parse().map_err(|_| "settle seconds must be a u64")?), "--capture-seconds" => cfg.capture = Duration::from_secs(value()?.parse().map_err(|_| "capture seconds must be a u64")?), "--interactive" => cfg.interactive = true, "--help" => return Err("usage: openseeface-spike [--interactive] [--tracker-dir PATH] [--output PATH] [--camera INDEX] [--port PORT] [--settle-seconds N] [--capture-seconds N]".into()), _ => return Err(format!("unknown argument: {arg}")), } }
    Ok(cfg)
}

fn start_tracker(cfg: &Config) -> Result<Child, String> {
    let executable = cfg.tracker_dir.join("facetracker.exe");
    if !executable.is_file() { return Err(format!("missing tracker at {}; run scripts/stage-openseeface-spike.ps1", executable.display())); }
    Command::new(executable).current_dir(&cfg.tracker_dir).args(["-i", "127.0.0.1", "-p", &cfg.port.to_string(), "-W", &cfg.camera.width.to_string(), "-H", &cfg.camera.height.to_string(), "-F", &cfg.camera.fps.to_string(), "-c", &cfg.camera.index.to_string(), "-v", "0", "-s", "1", "--faces", "1", "--model", "3", "--gaze-tracking", "0", "--max-threads", "1", "--no-3d-adapt", "1"]).spawn().map_err(|e| format!("could not start OpenSeeFace: {e}"))
}

fn receive_segment(socket: &UdpSocket, started: Instant, duration: Duration, id: &str, cfg: &Config, writer: &mut BufWriter<File>) -> Result<Vec<Packet>, String> {
    let mut packets = Vec::new(); let deadline = Instant::now() + duration; let mut buffer = [0_u8; 65535];
    while Instant::now() < deadline {
        match socket.recv_from(&mut buffer) {
            Ok((count, source)) => {
                if source.ip() != std::net::IpAddr::V4(Ipv4Addr::LOCALHOST) { continue; }
                for packet in decode_packet(&buffer[..count])? {
                    let sample = RecordedSample { segment_id: id, host_monotonic_receive_ms: started.elapsed().as_secs_f64() * 1000.0, source_model: MODEL, camera: cfg.camera, openseeface_version: VERSION, candidates: candidates(&packet), packet: &packet };
                    serde_json::to_writer(&mut *writer, &sample).map_err(|e| e.to_string())?; writer.write_all(b"\n").map_err(|e| e.to_string())?; packets.push(packet);
                }
            }
            Err(error) if error.kind() == io::ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(2)),
            Err(error) => return Err(format!("UDP receive failed: {error}")),
        }
    }
    writer.flush().map_err(|e| e.to_string())?; Ok(packets)
}

fn summary(id: &str, target: &str, elapsed: Duration, packets: &[Packet]) -> Option<SegmentSummary> {
    if packets.is_empty() { return None; }
    let raw_x: Vec<f64> = packets.iter().map(|p| p.raw_pnp_translation.x as f64).collect(); let raw_y: Vec<f64> = packets.iter().map(|p| p.raw_pnp_translation.y as f64).collect(); let raw_z: Vec<f64> = packets.iter().map(|p| p.raw_pnp_translation.z as f64).collect(); let errors: Vec<f64> = packets.iter().map(|p| p.pnp_error as f64).collect();
    let eyes: Vec<Vec3> = packets.iter().filter(|p| p.got_3d_points).map(|p| midpoint(p.points_3d[68], p.points_3d[69])).collect();
    let ex: Vec<f64> = eyes.iter().map(|p| p.x as f64).collect(); let ey: Vec<f64> = eyes.iter().map(|p| p.y as f64).collect(); let ez: Vec<f64> = eyes.iter().map(|p| p.z as f64).collect();
    Some(SegmentSummary { id: id.into(), target_description: target.into(), elapsed_monotonic_ms: elapsed.as_secs_f64() * 1000.0, sample_count: packets.len(), receive_cadence_hz: packets.len() as f64 / elapsed.as_secs_f64(), success_ratio: packets.iter().filter(|p| p.got_3d_points).count() as f64 / packets.len() as f64, pnp_error: stats(&errors), raw_pnp_x: stats(&raw_x), raw_pnp_y: stats(&raw_y), raw_pnp_z: stats(&raw_z), cyclopean_x: (!ex.is_empty()).then(|| stats(&ex)), cyclopean_y: (!ey.is_empty()).then(|| stats(&ey)), cyclopean_z: (!ez.is_empty()).then(|| stats(&ez)) })
}

fn main() -> Result<(), String> {
    let cfg = config()?; let start_stamp = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_secs(); let session = cfg.output_root.join(format!("session-{start_stamp}")); fs::create_dir_all(&session).map_err(|e| e.to_string())?;
    let socket = UdpSocket::bind(SocketAddrV4::new(Ipv4Addr::LOCALHOST, cfg.port)).map_err(|e| format!("could not bind 127.0.0.1:{}: {e}", cfg.port))?; socket.set_nonblocking(true).map_err(|e| e.to_string())?;
    let started = Instant::now(); let mut child = start_tracker(&cfg)?; let launch_ms = started.elapsed().as_secs_f64() * 1000.0;
    let raw_file = File::create(session.join("raw-samples.jsonl")).map_err(|e| e.to_string())?; let mut writer = BufWriter::new(raw_file);
    let plan = [("depth-450", "Approximately 450 mm from screen plane, centered"), ("depth-600", "Approximately 600 mm from screen plane, centered"), ("depth-750", "Approximately 750 mm from screen plane, centered"), ("horizontal-left", "Approximately -150 mm horizontal at 600 mm depth"), ("horizontal-center", "Approximately 0 mm horizontal at 600 mm depth"), ("horizontal-right", "Approximately +150 mm horizontal at 600 mm depth"), ("vertical-down", "Approximately -100 mm vertical at 600 mm depth"), ("vertical-center", "Approximately 0 mm vertical at 600 mm depth"), ("vertical-up", "Approximately +100 mm vertical at 600 mm depth"), ("stationary-1", "Centered 600 mm stationary hold 1"), ("stationary-2", "Centered 600 mm stationary hold 2"), ("stationary-3", "Centered 600 mm stationary hold 3"), ("rotation-neutral", "Centered 600 mm, neutral orientation"), ("rotation-left", "Turn head left while keeping eye midpoint stationary"), ("rotation-right", "Turn head right while keeping eye midpoint stationary"), ("rotation-up", "Look slightly up while keeping eye midpoint stationary"), ("rotation-down", "Look slightly down while keeping eye midpoint stationary")];
    let result = (|| -> Result<Vec<SegmentSummary>, String> { let mut results = Vec::new(); for (id, target) in plan { println!("\nTarget {id}: {target}"); if cfg.interactive { println!("Press Enter when positioned."); let mut line = String::new(); io::stdin().read_line(&mut line).map_err(|e| e.to_string())?; } println!("Settling for {:?}...", cfg.settle); thread::sleep(cfg.settle); println!("Capturing for {:?}...", cfg.capture); let segment_start = Instant::now(); let packets = receive_segment(&socket, started, cfg.capture, id, &cfg, &mut writer)?; if let Some(value) = summary(id, target, segment_start.elapsed(), &packets) { results.push(value); } else { eprintln!("No accepted OpenSeeFace packet received for {id}."); } } Ok(results) })();
    let stop_started = Instant::now(); let exited_before_stop = child.try_wait().map_err(|e| e.to_string())?;
    let (child_status, shutdown_method) = match exited_before_stop {
        Some(status) => (status, "tracker-exited-before-harness-stop"),
        None => { child.kill().map_err(|e| e.to_string())?; (child.wait().map_err(|e| e.to_string())?, "harness-terminated-and-waited") }
    };
    let shutdown_ms = stop_started.elapsed().as_secs_f64() * 1000.0;
    let summaries = result?; serde_json::to_writer_pretty(File::create(session.join("segment-summary.json")).map_err(|e| e.to_string())?, &summaries).map_err(|e| e.to_string())?;
    let metadata = serde_json::json!({ "schemaVersion": 1, "spikeId": "m0d-openseeface-physical-pose", "physicalMeasurementStatus": "completed-user-run-pending-review", "upstream": { "version": VERSION, "model": MODEL, "releaseAsset": "OpenSeeFace-v1.20.5.zip", "releaseSha256": "c9223f3547dce65b09705bb9ff74439b7d36e1c37bbe9668672711cf5aa31147" }, "tracker": { "path": cfg.tracker_dir.join("facetracker.exe"), "arguments": ["-i", "127.0.0.1", "--faces", "1", "--model", "3", "--gaze-tracking", "0", "-v", "0", "-s", "1"], "camera": cfg.camera, "startupMs": launch_ms, "shutdownMs": shutdown_ms, "shutdownMethod": shutdown_method, "exitStatus": child_status.code(), "unexpectedExitObserved": exited_before_stop.is_some(), "udp": format!("127.0.0.1:{}", cfg.port), "nonLoopbackPacketsAccepted": false, "cpuMeasurement": "unavailable: no additional process-profiler dependency was introduced" }, "limitations": ["OpenSeeFace has no control-channel shutdown in this pinned UDP mode, so normal harness shutdown terminates its direct child and waits for it; no process supervisor was added.", "Loopback binding rejects non-loopback UDP packets; it does not prove absence of every possible external connection.", "No physical-position conclusion is produced by this runner; raw coordinate units are preserved." ] });
    serde_json::to_writer_pretty(File::create(session.join("session-metadata.json")).map_err(|e| e.to_string())?, &metadata).map_err(|e| e.to_string())?; println!("Evidence written to {}", session.display()); Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> Vec<u8> { let mut bytes = vec![0_u8; PACKET_BYTES]; let mut o = 0; let put_f64 = |b: &mut Vec<u8>, o: &mut usize, v: f64| { b[*o..*o+8].copy_from_slice(&v.to_le_bytes()); *o += 8; }; let put_i32 = |b: &mut Vec<u8>, o: &mut usize, v: i32| { b[*o..*o+4].copy_from_slice(&v.to_le_bytes()); *o += 4; }; let put_f32 = |b: &mut Vec<u8>, o: &mut usize, v: f32| { b[*o..*o+4].copy_from_slice(&v.to_le_bytes()); *o += 4; }; put_f64(&mut bytes, &mut o, 12.5); put_i32(&mut bytes, &mut o, 7); for v in [640.0,360.0,0.8,0.9] { put_f32(&mut bytes,&mut o,v); } bytes[o]=1;o+=1; put_f32(&mut bytes,&mut o,2.0); for v in [0.0,0.0,0.0,1.0,4.0,5.0,6.0,1.0,2.0,3.0] { put_f32(&mut bytes,&mut o,v); } for _ in 0..POINTS_2D { put_f32(&mut bytes,&mut o,0.9); } for i in 0..POINTS_2D { put_f32(&mut bytes,&mut o,i as f32);put_f32(&mut bytes,&mut o,(i+1) as f32); } for i in 0..POINTS_3D { put_f32(&mut bytes,&mut o,i as f32);put_f32(&mut bytes,&mut o,0.0);put_f32(&mut bytes,&mut o,10.0); } for _ in 0..FEATURE_COUNT { put_f32(&mut bytes,&mut o,0.0); } assert_eq!(o,PACKET_BYTES); bytes }
    #[test] fn decodes_pinned_protocol_fixture() { let packet = decode_packet(&fixture()).unwrap().remove(0); assert_eq!(packet.face_id, 7); assert_eq!(packet.points_3d[69].x, 69.); assert_eq!(packet.raw_pnp_translation.z, 3.); }
    #[test] fn rejects_truncated_and_nonfinite_packets() { assert!(decode_packet(&fixture()[..100]).is_err()); let mut bad = fixture(); bad[0..8].copy_from_slice(&f64::NAN.to_le_bytes()); assert!(decode_packet(&bad).is_err()); }
    #[test] fn derives_eye_midpoint_without_reinterpreting_source_units() { let packet = decode_packet(&fixture()).unwrap().remove(0); let result = candidates(&packet); let eye = result.cyclopean_midpoint_points3d_68_69_openseeface_coordinate_units.unwrap(); assert_eq!(eye.x, 68.5); assert_eq!(result.raw_pnp_translation_openseeface_model_units.x, 1.); }
    #[test] fn calculates_descriptive_statistics() { let value = stats(&[1.,2.,3.,4.,5.]); assert_eq!(value.median, 3.); assert_eq!(value.p95_abs_deviation_from_median, 2.); }
}
