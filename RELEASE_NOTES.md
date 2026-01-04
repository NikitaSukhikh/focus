# Focus Desktop App - Release Build

## Installation

### Windows Installer (Recommended)
Run: `ui/out/make/squirrel.windows/x64/focus-ui-1.0.0 Setup.exe`

This will:
- Install Focus to your system
- Create Start Menu shortcuts
- Automatically start the app after installation

### Portable Version
Extract: `ui/out/make/zip/win32/x64/focus-ui-win32-x64-1.0.0.zip`
Run: `focus.exe` from the extracted folder

## What's Included

The installer contains:
1. **Electron UI** - React/TypeScript frontend
2. **Backend Server** - Python/FastAPI backend (auto-starts on port 8000)
3. **All dependencies** - Self-contained, no external dependencies needed

## Recent Fixes

### Backend Integration
- ✅ Backend executable properly bundled into installer
- ✅ Backend auto-starts when app launches
- ✅ API calls correctly route to `localhost:8000` in production
- ✅ Enhanced logging for troubleshooting backend startup issues

### Build Process
- Rebuilt backend with PyInstaller (removed unnecessary .env bundling)
- Fixed API base URL detection (development vs production)
- Added proper error dialogs if backend fails to start

## How It Works

When you run `focus.exe`:
1. Electron main process starts
2. Backend (`focus-backend.exe`) spawns automatically from resources
3. Backend listens on `http://localhost:8000`
4. Frontend connects to backend API
5. Both processes managed by Electron lifecycle

## Troubleshooting

If you see only the UI shell without data:
1. Check if port 8000 is available (another app might be using it)
2. Run from command line to see console logs
3. Look for error dialogs about backend startup
4. Check if antivirus is blocking `focus-backend.exe`

The app now includes debug logging that will show:
- Backend executable path
- Working directory
- Whether backend started successfully
- Any startup errors
