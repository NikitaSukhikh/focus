// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{LogicalSize, Manager, Size, WindowEvent};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let size = monitor.size();
                    let target_width = (size.width as f64 * 0.85).round();
                    let target_height = (size.height as f64 * 0.85).round();

                    // Resize to keep the window smaller than the screen on launch.
                    let _ = window.set_size(Size::Logical(LogicalSize {
                        width: target_width,
                        height: target_height,
                    }));
                    let _ = window.center();
                }

                // Handle file drop events from OS
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::FileDrop(file_drop_event) = event {
                        match file_drop_event {
                            tauri::FileDropEvent::Hovered(paths) => {
                                println!("File drop hovered: {:?}", paths);
                            }
                            tauri::FileDropEvent::Dropped(paths) => {
                                println!("Files dropped: {:?}", paths);
                                // Emit event to frontend
                                let _ = window_clone.emit("os-file-drop", paths);
                            }
                            tauri::FileDropEvent::Cancelled => {
                                println!("File drop cancelled");
                            }
                            _ => {}
                        }
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Ocean application");
}
