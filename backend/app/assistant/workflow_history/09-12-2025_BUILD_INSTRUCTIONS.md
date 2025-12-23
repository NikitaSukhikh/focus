# Build Instructions for Alfy Tauri App

## Prerequisites Check

### ✅ Already Installed
- **Rust**: 1.91.1 ✓
- **Cargo**: 1.91.1 ✓
- **Node.js & npm** ✓

## ⚠️ Missing Build Tool

The current build error indicates that `dlltool.exe` is not found. This is part of the Windows build toolchain needed for Rust to compile native dependencies.

## Solution: Install Visual Studio Build Tools

### Option 1: Visual Studio Build Tools (Recommended for Rust on Windows)

1. Download Visual Studio Build Tools:
   - Go to: https://visualstudio.microsoft.com/downloads/
   - Scroll down to "Tools for Visual Studio"
   - Download "Build Tools for Visual Studio 2022"

2. Run the installer and select:
   - ✅ **Desktop development with C++**
   - This includes:
     - MSVC v143 - VS 2022 C++ x64/x86 build tools
     - Windows SDK
     - C++ CMake tools for Windows

3. Install and restart your terminal

4. Verify installation:
   ```bash
   # Check if link.exe is available (part of MSVC)
   where link
   ```

### Option 2: MinGW-w64 (Alternative, lighter weight)

1. Install via MSYS2:
   - Download from: https://www.msys2.org/
   - Install and run MSYS2

2. In MSYS2 terminal:
   ```bash
   pacman -S mingw-w64-x86_64-toolchain
   ```

3. Add to PATH:
   - Add `C:\msys64\mingw64\bin` to your system PATH

### Option 3: Use Rust's GNU Toolchain

If you want to use the GNU toolchain instead of MSVC:

1. Install the GNU toolchain target:
   ```bash
   rustup toolchain install stable-x86_64-pc-windows-gnu
   rustup default stable-x86_64-pc-windows-gnu
   ```

2. Install MinGW-w64 (see Option 2 above)

## After Installing Build Tools

1. **Restart your terminal** (important!)

2. **Clean and rebuild**:
   ```bash
   cd ui/src-tauri
   cargo clean
   cd ..
   npm run dev:tauri
   ```

## Development Build

Once build tools are installed:

```bash
cd ui
npm install              # Install npm dependencies
npm run dev:tauri        # Start dev server with hot reload
```

This will:
- Start Vite dev server on http://localhost:5173
- Compile Rust code
- Launch Tauri app with dev tools

## Production Build

```bash
cd ui
npm run build:tauri
```

The executable will be at:
- **EXE**: `ui/src-tauri/target/release/alfy.exe`
- **Installer** (if configured): `ui/src-tauri/target/release/bundle/`

## Common Issues & Solutions

### Issue: `dlltool.exe not found`
**Solution**: Install Visual Studio Build Tools (see above)

### Issue: `link.exe not found`
**Solution**: Install Visual Studio Build Tools with C++ workload

### Issue: `error: linker 'link.exe' not found`
**Solution**: Make sure Visual Studio Build Tools is in your PATH, or switch to GNU toolchain

### Issue: Tauri window doesn't open
**Solution**:
1. Check if backend is running on http://localhost:8420
2. Check browser console for errors (Ctrl+Shift+I in dev mode)
3. Check Rust console output

### Issue: Global hotkeys not working
**Solution**:
- Make sure you're not running multiple instances
- Try running as administrator (some hotkey APIs require elevated permissions)

## Verifying Successful Build

After building, test these features:

1. **System Tray**:
   - App should have an icon in system tray
   - Right-click for menu
   - Left-click to toggle window

2. **Global Hotkey**:
   - Press `Ctrl+Shift+Space` to toggle window
   - Should work even when app is hidden

3. **Window Controls**:
   - Drag title bar to move window
   - Click minimize/maximize/close buttons
   - Close button should hide to tray (not exit)

4. **Backend Communication**:
   - Start Python backend: `python backend/main.py`
   - Check if UI can communicate with backend

## File Permissions

If you encounter permission errors:

```bash
# On Windows, run PowerShell as Administrator:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Environment Variables

Tauri respects these environment variables:

- `RUST_LOG=info` - Enable Rust logging
- `TAURI_DEBUG=1` - Enable Tauri debug mode
- `WEBKIT_DISABLE_COMPOSITING_MODE=1` - Fix rendering issues

Example:
```bash
$env:RUST_LOG="info"
npm run dev:tauri
```

## Troubleshooting Checklist

- [ ] Rust installed and in PATH
- [ ] Visual Studio Build Tools installed with C++ workload
- [ ] Node.js and npm installed
- [ ] Terminal restarted after installing build tools
- [ ] `cargo clean` run before rebuilding
- [ ] No other instance of the app running
- [ ] Python backend running on correct port (8420)

## Getting Help

If you encounter issues:

1. Check error messages carefully
2. Search Tauri GitHub issues: https://github.com/tauri-apps/tauri/issues
3. Tauri Discord: https://discord.gg/tauri
4. Ensure all prerequisites are installed correctly

## Next Steps After Successful Build

Once the app builds successfully:

1. Test all features (tray, hotkeys, window management)
2. Connect to Python backend
3. Implement WebSocket connection for real-time chat
4. Add notification system
5. Implement settings persistence
6. Create installer/updater

Happy building! 🚀
