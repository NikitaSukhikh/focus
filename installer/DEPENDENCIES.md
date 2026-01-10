# Focus Installer Dependencies

This document details all dependencies handled by the Focus installer.

## Included Dependencies

The installer includes everything needed to run Focus. No additional installations are required (except VC++ Redistributable on some systems).

### Frontend (Electron) Dependencies

**Electron Runtime v35.7.5**
- Complete Chromium browser engine
- Node.js runtime
- V8 JavaScript engine
- Platform-specific rendering libraries

**Electron Libraries:**
- `chrome_*.pak` - Chrome UI resources
- `d3dcompiler_47.dll` - DirectX shader compiler
- `ffmpeg.dll` - Video/audio codec support
- `libEGL.dll`, `libGLESv2.dll` - OpenGL ES graphics
- `vk_swiftshader.dll` - Software Vulkan renderer
- `icudtl.dat` - Unicode support
- `v8_context_snapshot.bin` - V8 optimization data

### Backend (Python) Dependencies

**Python Runtime**
- Embedded Python 3.13 (no separate Python installation needed)
- All dependencies bundled via PyInstaller

**Database Libraries:**
- `aiosqlite` - Async SQLite database access
- `sqlalchemy` - Database ORM
- `greenlet` - Coroutine support

**Image Processing:**
- `PIL` (Pillow) - Image manipulation
- `pillow-heif` - HEIF/HEIC format support

**Document Processing:**
- `openpyxl` - Excel file handling
- `ebooklib` - EPUB ebook support
- `lxml` - XML/HTML parsing
- `pandas` - Data analysis and manipulation
- `numpy` - Numerical computing

**Audio Processing:**
- `mutagen` - Audio metadata reading/writing
- Support for MP3, MP4, FLAC, WAV formats

**Web Framework:**
- `FastAPI` - REST API framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation

**Additional Python Libraries:**
All `.pyd` files (compiled Python extensions) in `_internal\`:
- `_asyncio.pyd` - Async I/O support
- `_sqlite3.pyd` - SQLite interface
- `_ssl.pyd` - SSL/TLS support
- `_hashlib.pyd` - Cryptographic hashing
- And many more...

## External Dependencies (Not Included)

### Required

**Visual C++ Redistributable 2015-2022 (x64)**
- Required by: Python runtime, some native libraries
- Usually pre-installed on Windows 10/11
- Download: https://aka.ms/vs/17/release/vc_redist.x64.exe
- Installer checks and warns if missing

### Implicit (OS-level)

**Windows 10 or later**
- Required by Electron for modern web APIs
- Provides DirectX, graphics drivers, system fonts

**64-bit (x64) Architecture**
- All binaries are compiled for x64 only
- Installer blocks installation on 32-bit systems

## Dependency Distribution

### Single Directory Structure

Everything is bundled in a single directory tree:

```
Focus/
├── focus.exe                      # Electron frontend
├── resources/
│   ├── app.asar                  # Frontend code (React app)
│   └── Focus/                    # Backend bundle
│       ├── Focus.exe             # Python backend
│       └── _internal/            # All Python dependencies
│           ├── *.pyd             # Python extensions
│           ├── *.dll             # Required DLLs
│           └── [packages]/       # Python packages
├── locales/                      # Electron localization
├── *.dll                         # Electron DLLs
└── *.pak                         # Electron resources
```

### No PATH Modifications

The installer does NOT modify system PATH. All dependencies are:

1. **Self-contained**: Located in app directory
2. **Isolated**: Won't conflict with other installations
3. **Portable**: Directory can be moved (after uninstall)

## Compatibility Notes

### PyInstaller Bundle

The backend is bundled with PyInstaller in "onedir" mode:

- **Pros**: Faster startup, easier debugging, smaller individual files
- **Cons**: More files than "onefile" mode
- **Size**: ~50-100MB for backend alone

### ASAR Archive

Frontend code is packaged in Electron's ASAR format:

- **Pros**: Faster loading, single file, prevents casual editing
- **Cons**: Requires Electron to extract
- **Size**: ~600-700KB

## Version Pinning

All dependencies are version-pinned:

- Backend: `backend/requirements.txt`
- Frontend: `ui/package.json` and `ui/package-lock.json`

This ensures consistent behavior across installations.

## Security Considerations

### Code Signing

If configured, the installer can sign executables:

- Uses Authenticode signing
- Prevents Windows SmartScreen warnings
- Configured via environment variables in build script

### Antivirus False Positives

PyInstaller bundles may trigger antivirus warnings:

- This is common with Python-based executables
- All dependencies are from trusted sources
- Code is open source and auditable

## Updating Dependencies

To update dependencies:

1. **Backend**: Update `backend/requirements.txt`, rebuild with PyInstaller
2. **Frontend**: Update `ui/package.json`, run `npm install`, rebuild with Electron Forge
3. **Rebuild installer**: Run `.\build-package.ps1`

The installer automatically includes all updated dependencies.

## Size Breakdown

Approximate installed sizes:

- **Total**: ~450-500 MB
- **Electron Runtime**: ~200 MB
- **Python Backend**: ~100 MB
- **Python Dependencies**: ~150 MB
- **Application Code**: ~1-5 MB

This is typical for modern desktop applications combining Electron + Python.
