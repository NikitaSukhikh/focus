<!-- Notes on the Tauri shell. -->

# Alfy Tauri Implementation

This directory contains the Rust/Tauri implementation for the Alfy desktop application.

## Features Implemented

### 1. System Tray
- **Icon in system tray**: Always visible, even when window is hidden
- **Tray menu**:
  - Show Alfy
  - Hide Alfy
  - Quit
- **Left-click behavior**: Toggle window visibility

**Files**: [src/tray.rs](src/tray.rs)

### 2. Global Hotkeys
- **Ctrl+Shift+Space** (or Cmd+Shift+Space on macOS): Toggle window visibility
- Hotkeys work even when the window is hidden or another app is focused

**Files**: [src/hotkeys.rs](src/hotkeys.rs)

### 3. Window Management
- **Frameless window**: Custom title bar with window controls
- **Hide on close**: Clicking X hides the window instead of closing the app
- **Center on launch**: Window automatically centers on screen
- **Always on top**: Optional setting
- **Resizable**: Can be maximized/minimized

**Files**: [src/window.rs](src/window.rs), [src/main.rs](src/main.rs)

### 4. Tauri Commands (Rust ↔ JavaScript Bridge)

All commands are exposed to the frontend via the `invoke` API:

#### Window Commands
- `minimize_to_tray()` - Hide window to tray
- `show_from_tray()` - Show window from tray
- `toggle_window()` - Toggle window visibility
- `set_always_on_top(alwaysOnTop: bool)` - Set window always on top
- `is_window_visible()` - Check if window is visible
- `set_window_size(width: u32, height: u32)` - Set window size
- `center_window()` - Center window on screen

#### Backend Communication
- `ping_backend(backendUrl: string)` - Check if backend is reachable
- `send_message(backendUrl: string, message: string)` - Send message to backend

#### System Info
- `get_system_info()` - Get platform, architecture, version

**Files**: [src/commands.rs](src/commands.rs)

### 5. TypeScript Integration

TypeScript wrapper for easy use in React:

```typescript
import { TauriCommands } from '@/services/tauri';

// Hide window
await TauriCommands.minimizeToTray();

// Check backend
const isOnline = await TauriCommands.pingBackend('http://localhost:8420');
```

**Files**: [../src/services/tauri.ts](../src/services/tauri.ts)

### 6. Custom Title Bar

Frameless window with custom title bar component:
- Drag to move window
- Minimize/Maximize/Close buttons
- Styled to match Alfy theme

**Files**: [../src/components/Layout/TitleBar.tsx](../src/components/Layout/TitleBar.tsx)

## Configuration

### Cargo.toml

Dependencies:
- `tauri` - Core Tauri framework with system tray and global shortcut features
- `serde` - Serialization for command parameters
- `tokio` - Async runtime for backend communication
- `reqwest` - HTTP client for backend API calls
- `windows` - Windows API access (Windows-specific features)

### tauri.conf.json

Key settings:
- `systemTray`: Enabled with icon
- `windows`: Frameless, centered, resizable
- `allowlist`: Restricted permissions (shell.open, window controls, global shortcuts)

## Building

### Development
```bash
cd ui
npm run dev:tauri
```

### Production
```bash
cd ui
npm run build:tauri
```

The built executable will be in `src-tauri/target/release/`.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React + TypeScript                    │
│                     (Frontend UI)                        │
└─────────────────────────────────────────────────────────┘
                            │
                            │ @tauri-apps/api/tauri
                            │ invoke()
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Tauri Rust Shell                      │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  main.rs │  │  tray.rs │  │hotkeys.rs│  │window.rs│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              commands.rs                           │ │
│  │  (Rust ↔ JavaScript bridge)                        │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WS
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Python Backend (FastAPI)                   │
│              http://localhost:8420                      │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

Optional Rust helpers for performance-critical tasks:
1. **Activity Monitor** - Track active window/app (see TAURI_RUST_SKETCH.md)
2. **File Watcher** - Monitor file system changes
3. **File Indexer** - Fast parallel file scanning (PyO3 extension)

These are optional and can be implemented when needed for performance optimization.

## Hotkeys Reference

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Space` | Toggle window visibility |
| `Ctrl+W` | Hide window (default browser behavior captured) |
| `Alt+F4` | Hide window (close button captured) |

## Resources

- [Tauri Documentation](https://tauri.app/)
- [Tauri API Reference](https://tauri.app/v1/api/js/)
- [System Tray Guide](https://tauri.app/v1/guides/features/system-tray)
- [Global Shortcuts Guide](https://tauri.app/v1/guides/features/global-shortcut)