# Focus Installer

This directory contains the Inno Setup installer configuration for Focus.

## Features

The Focus installer provides:

- **Custom Directory Selection**: Users can choose where to install Focus (default: `C:\Program Files\Focus`)
- **Complete Installation**: Installs all files and folders from the portable build
- **Desktop Shortcut**: Optional desktop icon
- **Start Menu Integration**: Application shortcuts in Start Menu
- **Proper Uninstallation**: Clean removal through Windows "Programs and Features"
- **Disk Space Check**: Verifies sufficient space before installation
- **License Display**: Shows Apache 2.0 license during installation

## Prerequisites

To build the installer, you need:

1. **Inno Setup**: Download and install from https://jrsoftware.org/isdl.php
2. Add Inno Setup to your PATH, or the build script will skip installer creation

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

- `Focus.exe` - Main Electron application
- `resources\` - Backend executable and application resources
- All dependencies and DLLs
- Application assets and configuration

### Installation Steps

1. Welcome screen
2. License agreement (Apache 2.0)
3. Information about the application
4. **Directory selection** (THIS IS WHERE USER CHOOSES LOCATION)
5. Optional tasks (desktop icon, quick launch)
6. Installation progress
7. Completion with option to launch

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

### Installer size is too large

The installer includes all Electron and backend dependencies (~200MB). This is normal for Electron applications.

## File Structure

```
installer/
├── focus-installer.iss    # Main Inno Setup script
├── installer-info.txt     # Pre-installation information shown to user
└── README.md             # This file
```
