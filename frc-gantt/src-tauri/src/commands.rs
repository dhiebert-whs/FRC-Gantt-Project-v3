// ============================================================
// FRC Gantt App — Tauri Commands
// src-tauri/src/commands.rs
//
// All file I/O between the React frontend and the host OS.
// Each #[tauri::command] function is callable from TypeScript
// via: import { invoke } from '@tauri-apps/api/core'
//      await invoke('command_name', { arg1, arg2 })
// ============================================================

use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

// ------------------------------------------------------------
// Path helpers
// ------------------------------------------------------------

/// Returns %APPDATA%/FRCGantt/ — creates it if it doesn't exist
fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not resolve app data dir: {}", e))?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Could not create app data dir: {}", e))?;
    Ok(dir)
}

// ------------------------------------------------------------
// Team Database  (team.json)
// ------------------------------------------------------------

#[tauri::command]
pub fn read_team_db(app: AppHandle) -> Result<String, String> {
    let path = app_data_dir(&app)?.join("team.json");
    if !path.exists() {
        // Return empty string — frontend will initialize with defaults
        return Ok(String::new());
    }
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read team.json: {}", e))
}

#[tauri::command]
pub fn write_team_db(app: AppHandle, json: String) -> Result<(), String> {
    let path = app_data_dir(&app)?.join("team.json");
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write team.json: {}", e))
}

// ------------------------------------------------------------
// App Settings  (settings.json)
// ------------------------------------------------------------

#[tauri::command]
pub fn read_settings(app: AppHandle) -> Result<String, String> {
    let path = app_data_dir(&app)?.join("settings.json");
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read settings.json: {}", e))
}

#[tauri::command]
pub fn write_settings(app: AppHandle, json: String) -> Result<(), String> {
    let path = app_data_dir(&app)?.join("settings.json");
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write settings.json: {}", e))
}

// ------------------------------------------------------------
// Project Files  (*.frcgantt)
// ------------------------------------------------------------

#[tauri::command]
pub fn read_project_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read project file '{}': {}", path, e))
}

#[tauri::command]
pub fn write_project_file(path: String, json: String) -> Result<(), String> {
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write project file '{}': {}", path, e))
}

// ------------------------------------------------------------
// Native File Dialogs
// ------------------------------------------------------------

/// Show the native "Open File" dialog filtered to *.frcgantt
/// Returns the selected file path, or None if cancelled
#[tauri::command]
pub async fn show_open_dialog(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let file = app
        .dialog()
        .file()
        .add_filter("FRC Gantt Project", &["frcgantt"])
        .blocking_pick_file();
    Ok(file.map(|f| f.to_string()))
}

/// Show the native "Save File" dialog filtered to *.frcgantt
/// Returns the chosen path, or None if cancelled
#[tauri::command]
pub async fn show_save_dialog(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let file = app
        .dialog()
        .file()
        .add_filter("FRC Gantt Project", &["frcgantt"])
        .set_file_name("project.frcgantt")
        .blocking_save_file();
    Ok(file.map(|f| f.to_string()))
}

/// Show a native "Export" save dialog for PDF/image exports
#[tauri::command]
pub async fn show_export_dialog(app: AppHandle, default_name: String) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let file = app
        .dialog()
        .file()
        .add_filter("PDF Document", &["pdf"])
        .add_filter("PNG Image", &["png"])
        .set_file_name(&default_name)
        .blocking_save_file();
    Ok(file.map(|f| f.to_string()))
}