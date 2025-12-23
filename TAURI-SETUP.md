# Tauri Desktop App Setup ✅

Ocean is now configured to run as a **standalone desktop application** using Tauri!

## What Was Added

### 1. Tauri Dependencies
- Added `@tauri-apps/api` (runtime API for frontend)
- Added `@tauri-apps/cli` (build tools)

### 2. Tauri Configuration Files
- **`ui/src-tauri/Cargo.toml`** - Rust dependencies and metadata
- **`ui/src-tauri/tauri.conf.json`** - Tauri app configuration
- **`ui/src-tauri/build.rs`** - Build script
- **`ui/src-tauri/src/main.rs`** - Rust entry point

### 3. NPM Scripts
- `npm run tauri:dev` - Run desktop app in development mode
- `npm run tauri:build` - Build production desktop app
- `npm run tauri` - Access Tauri CLI

### 4. Helper Scripts
- **`run-desktop.sh`** (Linux/Mac) - Quick launch script
- **`run-desktop.ps1`** (Windows) - Quick launch script

## How to Run

### First Time Setup

1. **Install Rust** (if not already installed):
   - Windows: Download from https://www.rust-lang.org/tools/install
   - Linux/Mac: 
     ```bash
     curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
     ```

2. **Install Node dependencies**:
   ```bash
   cd ui
   npm install
   ```

### Launch Desktop App

**Option A: Using NPM**
```bash
cd ui
npm run tauri:dev
```

**Option B: Using Helper Scripts**
```bash
# Windows
.\run-desktop.ps1

# Linux/Mac
./run-desktop.sh
```

## What Happens When You Run

1. Vite dev server starts on http://localhost:5173
2. Tauri compiles the Rust code (first time takes a few minutes)
3. A **native desktop window** opens showing your React app
4. Changes to React code auto-reload in the window

## Tauri vs Browser Mode

| Feature | Desktop (Tauri) | Browser |
|---------|----------------|---------|
| Window | Native OS window | Browser tab |
| File system access | Full access | Limited |
| Menu bar | Native menus | None |
| Updates | Auto-updater support | Reload page |
| Distribution | Installable app | URL |
| Size | ~3-5 MB | N/A |

## App Configuration

The Tauri app is configured in `ui/src-tauri/tauri.conf.json`:

- **Window size**: 1400x900 (min 800x600)
- **App name**: Ocean
- **Identifier**: com.ocean.app
- **Permissions**: File system, HTTP (localhost:8000), Shell

## Building for Production

Create distributable installers:

```bash
cd ui
npm run tauri:build
```

Output location: `ui/src-tauri/target/release/bundle/`

**Windows**: `.msi` and `.exe` installers
**macOS**: `.dmg` and `.app` bundle  
**Linux**: `.deb`, `.AppImage`, and more

## Troubleshooting

### "Rust not found"
Install Rust from https://www.rust-lang.org/tools/install

### "WebView not found" (Linux)
Install WebKit2GTK:
```bash
sudo apt install libwebkit2gtk-4.0-dev
```

### First build is slow
First Tauri build compiles all Rust dependencies (~5 minutes). Subsequent builds are much faster (~10 seconds).

## Next Steps

1. **Run the app**: `npm run tauri:dev`
2. **Add custom icons**: Place app icons in `ui/src-tauri/icons/`
3. **Configure permissions**: Edit `tauri.conf.json` allowlist
4. **Add Rust commands**: Create custom backend functions in `main.rs`

Enjoy your desktop app! 🚀
