mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::read_team_db,
            commands::write_team_db,
            commands::read_settings,
            commands::write_settings,
            commands::read_project_file,
            commands::write_project_file,
            commands::show_open_dialog,
            commands::show_save_dialog,
            commands::show_export_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
