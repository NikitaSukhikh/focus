; Focus Installer Script - Inno Setup 6
; Requires Inno Setup 6: https://jrsoftware.org/isdl.php

#define AppName "Focus"
#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif
#define AppPublisher "Nikita Sukhikh"
#define AppExeName "focus.exe"
#define AppSourceDir "..\ui\out\Focus-win32-x64"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL=https://focus.app
AppSupportURL=https://focus.app/support
AppUpdatesURL=https://focus.app/updates
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
LicenseFile=license.txt
OutputDir=..\dist
OutputBaseFilename=FocusSetup-{#AppVersion}
SetupIconFile=..\ui\src\assets\focus.ico
WizardStyle=modern
WizardSizePercent=120
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableProgramGroupPage=yes
ShowLanguageDialog=no
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"
Name: "startupicon"; Description: "Launch &Focus when Windows starts"; GroupDescription: "Startup:"

[Files]
; Electron app + bundled backend (already embedded by electron-forge as extraResource)
Source: "{#AppSourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon
Name: "{userstartup}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: startupicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch {#AppName}"; Flags: nowait postinstall skipifsilent
