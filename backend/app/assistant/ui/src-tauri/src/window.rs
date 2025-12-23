// Window management helpers.

use tauri::Window;

/// Position window at center of screen
pub fn center_window(window: &Window) -> Result<(), Box<dyn std::error::Error>> {
    window.center()?;
    Ok(())
}

/// Set window to always on top
pub fn set_always_on_top(window: &Window, always_on_top: bool) -> Result<(), Box<dyn std::error::Error>> {
    window.set_always_on_top(always_on_top)?;
    Ok(())
}

/// Toggle fullscreen mode
pub fn toggle_fullscreen(window: &Window) -> Result<(), Box<dyn std::error::Error>> {
    let is_fullscreen = window.is_fullscreen()?;
    window.set_fullscreen(!is_fullscreen)?;
    Ok(())
}

/// Set window size
pub fn set_window_size(
    window: &Window,
    width: f64,
    height: f64,
) -> Result<(), Box<dyn std::error::Error>> {
    window.set_size(tauri::PhysicalSize::new(width as u32, height as u32))?;
    Ok(())
}

/// Position window to specific location
pub fn set_window_position(
    window: &Window,
    x: f64,
    y: f64,
) -> Result<(), Box<dyn std::error::Error>> {
    window.set_position(tauri::PhysicalPosition::new(x as i32, y as i32))?;
    Ok(())
}
