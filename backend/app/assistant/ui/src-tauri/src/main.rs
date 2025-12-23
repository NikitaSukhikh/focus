// Tauri entrypoint configuring the desktop app.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod hotkeys;
mod tray;
mod window;

use tauri::Manager;

fn main() {
    let tray = tray::create_tray();

    tauri::Builder::default()
        .system_tray(tray)
        .on_system_tray_event(tray::handle_tray_event)
        .invoke_handler(tauri::generate_handler![
            commands::minimize_to_tray,
            commands::show_from_tray,
            commands::toggle_window,
            commands::set_always_on_top,
            commands::is_window_visible,
            commands::set_window_size,
            commands::center_window,
            commands::ping_backend,
            commands::send_message,
            commands::get_system_info,
        ])
        .setup(|app| {
            let app_handle = app.handle();

            // Register global hotkeys
            if let Err(e) = hotkeys::register_hotkeys(&app_handle) {
                eprintln!("Failed to register hotkeys: {}", e);
            }

            // Get main window and center it
            if let Some(window) = app.get_window("main") {
                if let Err(e) = window::center_window(&window) {
                    eprintln!("Failed to center window: {}", e);
                }
            }

            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event.event() {
                // Prevent window from closing, hide instead
                event.window().hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Alfy");
}