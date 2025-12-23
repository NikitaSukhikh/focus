// Tauri commands exposed to the frontend.

use serde::{Deserialize, Serialize};
use tauri::Window;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

/// Minimize window to system tray
#[tauri::command]
pub fn minimize_to_tray(window: Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

/// Show window from tray
#[tauri::command]
pub fn show_from_tray(window: Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

/// Toggle window visibility
#[tauri::command]
pub fn toggle_window(window: Window) -> Result<(), String> {
    let is_visible = window.is_visible().map_err(|e| e.to_string())?;

    if is_visible {
        window.hide().map_err(|e| e.to_string())
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())
    }
}

/// Set window always on top
#[tauri::command]
pub fn set_always_on_top(window: Window, always_on_top: bool) -> Result<(), String> {
    window
        .set_always_on_top(always_on_top)
        .map_err(|e| e.to_string())
}

/// Get window visibility state
#[tauri::command]
pub fn is_window_visible(window: Window) -> Result<bool, String> {
    window.is_visible().map_err(|e| e.to_string())
}

/// Set window size
#[tauri::command]
pub fn set_window_size(window: Window, width: u32, height: u32) -> Result<(), String> {
    window
        .set_size(tauri::PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())
}

/// Center window on screen
#[tauri::command]
pub fn center_window(window: Window) -> Result<(), String> {
    window.center().map_err(|e| e.to_string())
}

/// Check if backend is reachable
#[tauri::command]
pub async fn ping_backend(backend_url: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/health", backend_url);

    match client.get(&url).send().await {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

/// Send message to backend
#[tauri::command]
pub async fn send_message(
    backend_url: String,
    message: String,
    model: Option<String>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/chat", backend_url);

    #[derive(Serialize)]
    struct MessageRequest {
        message: String,
        model: String,
    }

    let model = model.unwrap_or_else(|| "local".to_string());

    match client
        .post(&url)
        .json(&MessageRequest { message, model })
        .send()
        .await
    {
        Ok(response) => response.text().await.map_err(|e| e.to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Get system information
#[tauri::command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    Ok(SystemInfo {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        version: "0.1.0".to_string(),
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub platform: String,
    pub arch: String,
    pub version: String,
}
