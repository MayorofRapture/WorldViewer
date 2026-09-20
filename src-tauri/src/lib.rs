use std::collections::HashSet;
use std::io::Write;
use std::process;

use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Clone)]
struct StartupMode(Option<SmokeMode>);

#[derive(Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum SmokeMode { Launch, Synthetic }

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
        _ => None,
    }
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
        .manage(StartupMode(startup_mode_from_environment()))
        .invoke_handler(tauri::generate_handler![get_startup_mode, complete_smoke])
        .run(tauri::generate_context!())
        .expect("error while running WorldViewer");
}
