<!-- Notes on Tauri-specific capabilities. -->

# Tauri Features Quick Reference

## 🎯 Implemented Features

### System Tray
- **Icon Location**: Windows system tray (notification area)
- **Left Click**: Toggle window show/hide
- **Right Click Menu**:
  - Show Alfy
  - Hide Alfy
  - Quit

**Implementation**: [src-tauri/src/tray.rs](src-tauri/src/tray.rs)

### Global Hotkeys
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Space` | Toggle window visibility |

Works system-wide, even when:
- Window is hidden
- Another app is focused
- App is minimized to tray

**Implementation**: [src-tauri/src/hotkeys.rs](src-tauri/src/hotkeys.rs)

### Window Management

**Custom Title Bar**:
- Drag to move window
- Minimize button (hides to tray)
- Maximize/Restore button
- Close button (hides to tray, doesn't exit)

**Behavior**:
- Frameless window (no default OS chrome)
- Auto-centers on first launch
- Remembers size/position
- Resizable and maximizable
- Closing hides to tray instead of exiting

**Implementation**:
- Rust: [src-tauri/src/window.rs](src-tauri/src/window.rs)
- React: [src/components/Layout/TitleBar.tsx](src/components/Layout/TitleBar.tsx)

### Tauri Commands (Rust ↔ JavaScript API)

These commands can be called from React/TypeScript:

```typescript
import { TauriCommands } from '@/services/tauri';

// Window control
await TauriCommands.minimizeToTray();
await TauriCommands.showFromTray();
await TauriCommands.toggleWindow();
await TauriCommands.setAlwaysOnTop(true);
const visible = await TauriCommands.isWindowVisible();
await TauriCommands.setWindowSize(1280, 720);
await TauriCommands.centerWindow();

// Backend communication
const isOnline = await TauriCommands.pingBackend('http://localhost:8420');
const response = await TauriCommands.sendMessage('http://localhost:8420', 'Hello');

// System info
const info = await TauriCommands.getSystemInfo();
console.log(info.platform, info.arch, info.version);
```

**Implementation**:
- Rust: [src-tauri/src/commands.rs](src-tauri/src/commands.rs)
- TypeScript: [src/services/tauri.ts](src/services/tauri.ts)

## 📋 Complete Command Reference

### Window Commands

#### `minimize_to_tray()`
Hides the window to system tray
- **Returns**: `Promise<void>`
- **Use Case**: Hide app when minimizing

#### `show_from_tray()`
Shows and focuses the window
- **Returns**: `Promise<void>`
- **Use Case**: Restore app from tray

#### `toggle_window()`
Toggles window visibility (show if hidden, hide if shown)
- **Returns**: `Promise<void>`
- **Use Case**: Hotkey handler, tray click

#### `set_always_on_top(alwaysOnTop: boolean)`
Pins window on top of all other windows
- **Parameters**: `alwaysOnTop` - true to pin, false to unpin
- **Returns**: `Promise<void>`
- **Use Case**: Focus mode, important notifications

#### `is_window_visible()`
Checks if window is currently visible
- **Returns**: `Promise<boolean>`
- **Use Case**: UI state management

#### `set_window_size(width: number, height: number)`
Resizes the window
- **Parameters**: `width`, `height` in pixels
- **Returns**: `Promise<void>`
- **Use Case**: Responsive layouts, user preferences

#### `center_window()`
Centers window on screen
- **Returns**: `Promise<void>`
- **Use Case**: Reset position, first launch

### Backend Communication Commands

#### `ping_backend(backendUrl: string)`
Checks if backend is reachable
- **Parameters**: `backendUrl` - Full URL like 'http://localhost:8420'
- **Returns**: `Promise<boolean>` - true if backend responds, false otherwise
- **Use Case**: Health check before sending requests

#### `send_message(backendUrl: string, message: string)`
Sends a message to the backend
- **Parameters**:
  - `backendUrl` - Full URL like 'http://localhost:8420'
  - `message` - Message text to send
- **Returns**: `Promise<string>` - Response from backend
- **Use Case**: Chat messages, commands
- **Note**: Consider using WebSocket for real-time chat

### System Commands

#### `get_system_info()`
Gets system information
- **Returns**: `Promise<SystemInfo>`
  ```typescript
  {
    platform: string;  // 'windows', 'linux', 'darwin'
    arch: string;      // 'x86_64', 'arm64', etc.
    version: string;   // App version
  }
  ```
- **Use Case**: Debug info, feature detection

## 🎨 UI Components

### TitleBar Component
Custom window title bar with controls

```typescript
import { TitleBar } from '@/components/Layout';

function MyApp() {
  return (
    <div>
      <TitleBar />
      {/* Your content */}
    </div>
  );
}
```

**Features**:
- Draggable region
- Minimize/Maximize/Close buttons
- Shows app name
- Dark theme

**Styling**: Tailwind CSS classes, customizable

### MainLayout Component
Main app layout with title bar

```typescript
import { MainLayout } from '@/components/Layout';

function MyApp() {
  return (
    <MainLayout>
      {/* Your content here */}
    </MainLayout>
  );
}
```

**Features**:
- Includes TitleBar
- Full-height container
- Overflow handling

## 🔧 Configuration

### tauri.conf.json

Key settings:
```json
{
  "tauri": {
    "systemTray": {
      "iconPath": "icons/icon.ico"
    },
    "windows": [{
      "decorations": false,  // Frameless
      "center": true,        // Auto-center
      "width": 1280,
      "height": 720
    }]
  }
}
```

### Cargo.toml

Tauri features enabled:
```toml
[dependencies]
tauri = { version = "1.5", features = [
  "system-tray",      # System tray icon
  "global-shortcut",  # Global hotkeys
  "shell-open"        # Open URLs/files
]}
```

## 📝 Usage Examples

### Hide on Minimize Button

```typescript
import { TauriCommands } from '@/services/tauri';

function MinimizeButton() {
  const handleClick = async () => {
    await TauriCommands.minimizeToTray();
  };

  return <button onClick={handleClick}>Minimize</button>;
}
```

### Check Backend Connection

```typescript
import { TauriCommands } from '@/services/tauri';
import { useEffect, useState } from 'react';

function BackendStatus() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const check = async () => {
      const online = await TauriCommands.pingBackend('http://localhost:8420');
      setIsOnline(online);
    };

    check();
    const interval = setInterval(check, 5000); // Check every 5s

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      Backend: {isOnline  '🟢 Online' : '🔴 Offline'}
    </div>
  );
}
```

### Toggle Always on Top

```typescript
import { TauriCommands } from '@/services/tauri';
import { useState } from 'react';

function AlwaysOnTopToggle() {
  const [isPinned, setIsPinned] = useState(false);

  const toggle = async () => {
    const newState = !isPinned;
    await TauriCommands.setAlwaysOnTop(newState);
    setIsPinned(newState);
  };

  return (
    <button onClick={toggle}>
      {isPinned  '📌 Unpin' : '📌 Pin on Top'}
    </button>
  );
}
```

## 🐛 Debugging

Enable Rust logs:
```bash
$env:RUST_LOG="info"
npm run dev:tauri
```

Enable Tauri debug mode:
```bash
$env:TAURI_DEBUG="1"
npm run dev:tauri
```

Open DevTools in Tauri window:
- Press `Ctrl+Shift+I` (in development mode)
- Or right-click → Inspect

## 📚 Related Files

- **Rust Implementation**: [src-tauri/src/](src-tauri/src/)
- **TypeScript API**: [src/services/tauri.ts](src/services/tauri.ts)
- **UI Components**: [src/components/Layout/](src/components/Layout/)
- **Configuration**: [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)
- **Full Documentation**: [src-tauri/README.md](src-tauri/README.md)

## 🚀 Next Steps

To extend Tauri functionality:

1. **Add more commands** in `commands.rs`
2. **Implement notifications** using Tauri's notification API
3. **Add auto-updater** for production releases
4. **Create system tray menu items** for quick actions
5. **Implement WebSocket** for real-time backend communication
6. **Add keyboard shortcuts** for common actions

Happy coding! 🎉