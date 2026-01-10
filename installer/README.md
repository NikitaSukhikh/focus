# Focus Installer

This directory contains the Inno Setup installer configuration for Focus.

## Features

The Focus installer provides:

- **Custom Directory Selection**: Users can choose where to install Focus (default: `C:\Program Files\Focus`)
- **Complete Installation**: Installs all files and folders from the portable build
- **Desktop Shortcut**: Optional desktop icon
- **Start Menu Integration**: Application shortcuts in Start Menu
- **Proper Uninstallation**: Clean removal through Windows "Programs and Features"
- **System Requirements Check**: Validates Windows 10+ and 64-bit architecture
- **Disk Space Validation**: Verifies 500MB+ available before installation
- **VC++ Redistributable Detection**: Warns if required runtime is missing
- **License Display**: Shows Apache 2.0 license during installation
- **Registry Integration**: Registers app for command-line usage and file associations

## Prerequisites

### For Building the Installer

1. **Inno Setup**: Download and install from https://jrsoftware.org/isdl.php
2. Add Inno Setup to your PATH, or the build script will skip installer creation

### System Requirements for End Users

The installer automatically checks these requirements:

- **Operating System**: Windows 10 or later (64-bit)
- **Architecture**: x64 (64-bit) only
- **Disk Space**: Minimum 500 MB free space
- **Visual C++ Redistributable**: Microsoft Visual C++ 2015-2022 Redistributable (x64)
  - Download: https://aka.ms/vs/17/release/vc_redist.x64.exe
  - Most Windows systems already have this installed
  - Installer will warn (not block) if missing

## Building the Installer

### Automatic Build

Run the main build script from repository root:

```powershell
.\build-package.ps1
```

This will:
1. Build the backend with PyInstaller
2. Build the frontend with Electron Forge
3. Create the portable ZIP
4. Automatically build the Inno Setup installer (if Inno Setup is installed)

### Manual Build

If you want to build just the installer:

```powershell
# Ensure the portable build exists first
cd d:\ocean
iscc installer\focus-installer.iss
```

The installer will be created in the `release\` directory as `Focus-1.0.0-Setup.exe`.

## Installer Behavior

### Installation Directory

- **Default**: `C:\Program Files\Focus` (requires admin)
- **Customizable**: User can select any directory during installation
- **Privilege Handling**: If user selects a user directory (e.g., `Documents`), admin rights are not required

### What Gets Installed

The installer copies the entire contents of `ui\out\Focus-win32-x64\` which includes:

- `focus.exe` - Main Electron application (frontend)
- `resources\Focus\Focus.exe` - Python backend (PyInstaller bundle)
- `resources\Focus\_internal\` - All Python dependencies and libraries:
  - SQLite database libraries (aiosqlite)
  - Image processing (PIL, pillow-heif)
  - Document processing (openpyxl, ebooklib, lxml, pandas)
  - Audio processing (mutagen)
  - All required DLLs and Python modules
- Electron runtime and Chromium dependencies
- Application assets (icons, resources)
- All required system DLLs (ffmpeg, d3dcompiler, etc.)

### Registry Entries

The installer creates these registry entries:

- **App Paths**: Allows running `focus` from command line
- **File Associations**: Registers `.focus` file type (if needed)
- **Uninstall Info**: Standard Windows uninstall registry entries

All registry entries are removed on uninstallation.

### Installation Steps

1. **System Requirements Check**: Validates Windows 10+, 64-bit, VC++ Redistributable
2. **Welcome Screen**: Introduction to Focus
3. **License Agreement**: Apache 2.0 license
4. **Information Page**: Important pre-installation notes
5. **Directory Selection**: User chooses installation location (default: `C:\Program Files\Focus`)
6. **Optional Tasks**: Desktop shortcut, Start Menu shortcuts
7. **Ready to Install**: Confirmation page showing selected options
8. **Installation Progress**: Files are copied and configured
9. **Completion**: Option to launch Focus immediately

## Customization

### Change Default Install Location

Edit `focus-installer.iss`:

```iss
DefaultDirName={autopf}\{#MyAppName}  ; Program Files (default)
; Or use:
; DefaultDirName={localappdata}\{#MyAppName}  ; AppData\Local
; DefaultDirName={userdocs}\{#MyAppName}      ; Documents
```

### Add Custom Pages

Add custom pages before directory selection in the `[Code]` section.

### Modify App Information

Edit the `#define` constants at the top of `focus-installer.iss`:

```iss
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Nikita Sukhikh"
```

## Testing

To test the installer:

1. Build it using the instructions above
2. Run `release\Focus-1.0.0-Setup.exe`
3. Select a test directory (e.g., `C:\Temp\FocusTest`)
4. Complete installation
5. Verify the application launches
6. Test uninstallation from Windows Settings

## Troubleshooting

### Inno Setup not found

If you see "Inno Setup compiler (iscc.exe) not found in PATH":

1. Download Inno Setup from https://jrsoftware.org/isdl.php
2. Install it
3. Add to PATH: `C:\Program Files (x86)\Inno Setup 6\`
4. Restart PowerShell

### Source files not found

Ensure you've run the full build first:

```powershell
.\build-package.ps1
```

This creates the required `ui\out\Focus-win32-x64\` directory.

### Installer size is large

The installer is approximately 200MB because it includes:

- Complete Electron runtime with Chromium
- Full Python backend with all dependencies
- All required DLLs and libraries
- This is normal for Electron+Python desktop applications

### Installation fails on Windows 7/8

Focus requires Windows 10 or later due to Electron compatibility requirements. The installer will block installation on older Windows versions.

### VC++ Redistributable warning

If you see a warning about Visual C++ Redistributable:

1. Most modern Windows systems already have it
2. Try installing Focus anyway - it may work
3. If Focus fails to launch, download from: https://aka.ms/vs/17/release/vc_redist.x64.exe
4. Install the redistributable and try again

### Application won't start after installation

1. Check Windows Event Viewer for error details
2. Ensure VC++ Redistributable is installed
3. Verify you have Windows 10 or later (64-bit)
4. Try running as administrator
5. Check antivirus isn't blocking the application

## File Structure

```
installer/
├── focus-installer.iss    # Main Inno Setup script
├── installer-info.txt     # Pre-installation information shown to user
└── README.md             # This file
```
