// Global hotkey registration helpers.

use tauri::{AppHandle, GlobalShortcutManager, Manager};

pub fn register_hotkeys(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.clone();

    // Register Ctrl+Shift+Space to toggle window visibility
    app.global_shortcut_manager()
        .register("CmdOrCtrl+Shift+Space", move || {
            let window = app_handle.get_window("main").unwrap();
            if window.is_visible().unwrap() {
                window.hide().unwrap();
            } else {
                window.show().unwrap();
                window.set_focus().unwrap();
            }
        });

    println!("Global hotkeys registered successfully");
    Ok(())
}

pub fn unregister_hotkeys(app: &AppHandle) {
    if let Err(e) = app
        .global_shortcut_manager()
        .unregister("CmdOrCtrl+Shift+Space")
    {
        eprintln!("Failed to unregister hotkey: {}", e);
    }
}