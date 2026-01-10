; Focus Installer Script for Inno Setup
; This creates a proper Windows installer with directory selection

#define MyAppName "Focus"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Nikita Sukhikh"
#define MyAppExeName "focus.exe"
#define MyAppId "{{B8F3E8A0-1234-5678-9ABC-DEF012345678}"

[Setup]
; Basic app information
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\release
OutputBaseFilename=Focus-{#MyAppVersion}-Setup
SetupIconFile=..\ui\src\assets\focus.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Privileges - use lowest to allow installation to user directories
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; License and info dialogs
LicenseFile=..\LICENSE
InfoBeforeFile=installer-info.txt

; Uninstall
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

; Visual appearance
WizardImageFile=compiler:WizModernImage-IS.bmp
WizardSmallImageFile=compiler:WizModernSmallImage-IS.bmp

; Version information
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Desktop Application
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}

; Additional settings for better compatibility
DisableProgramGroupPage=yes
DisableWelcomePage=no
DisableReadyPage=no
AlwaysShowDirOnReadyPage=yes
AlwaysShowGroupOnReadyPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Registry]
; Register application for "Open With" menu
Root: HKA; Subkey: "Software\Classes\.focus"; ValueType: string; ValueName: ""; ValueData: "FocusFile"; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\FocusFile"; ValueType: string; ValueName: ""; ValueData: "Focus File"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\FocusFile\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"
Root: HKA; Subkey: "Software\Classes\FocusFile\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""
; App Paths registration (allows running 'focus' from command line)
Root: HKA; Subkey: "Software\Microsoft\Windows\CurrentVersion\App Paths\{#MyAppExeName}"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName}"; Flags: uninsdeletekey

[Files]
; Main application files - copy entire portable directory
Source: "..\ui\out\Focus-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Note: This copies all files and folders from the portable build

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
// Custom directory selection dialog text
function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = wpSelectDir then
  begin
    if not DirExists(WizardDirValue) then
    begin
      if not CreateDir(WizardDirValue) then
      begin
        MsgBox('Unable to create the directory:' + #13#10 + WizardDirValue + #13#10 + 'Please select a different directory.', mbError, MB_OK);
        Result := False;
      end;
    end;
  end;
end;

// Check disk space (moved to DirChange for more accurate checks)
function DirChange(NewDir: String): Boolean;
var
  DiskSpaceMB: Integer;
  AvailableSpace: Cardinal;
begin
  Result := True;
  DiskSpaceMB := 500; // Approximate size needed in MB

  // Check if we have enough space on the target drive
  if GetSpaceOnDisk(NewDir, False, AvailableSpace, nil) then
  begin
    if AvailableSpace < (DiskSpaceMB * 1024 * 1024) then
    begin
      MsgBox('Insufficient disk space on selected drive. At least ' + IntToStr(DiskSpaceMB) + ' MB required.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

// Check if Visual C++ Redistributable is installed
function IsVCRedistInstalled(): Boolean;
var
  UninstallKey: String;
  InstalledVersion: String;
begin
  Result := False;

  // Check for Visual C++ 2015-2022 Redistributable (x64)
  // Multiple registry locations to check
  UninstallKey := 'SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64';
  if RegQueryStringValue(HKLM, UninstallKey, 'Version', InstalledVersion) then
  begin
    Result := True;
    Exit;
  end;

  UninstallKey := 'SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64';
  if RegQueryStringValue(HKLM, UninstallKey, 'Version', InstalledVersion) then
  begin
    Result := True;
    Exit;
  end;

  // Also check for newer versions
  UninstallKey := 'SOFTWARE\Microsoft\DevDiv\VC\Servicing\14.0\RuntimeMinimum';
  if RegQueryStringValue(HKLM, UninstallKey, 'Version', InstalledVersion) then
  begin
    Result := True;
    Exit;
  end;
end;

// Check system requirements on setup initialization
function InitializeSetup(): Boolean;
var
  Version: TWindowsVersion;
  VCRedistMsg: String;
begin
  Result := True;

  GetWindowsVersionEx(Version);

  // Focus requires Windows 10 or later (for Electron compatibility)
  if Version.Major < 10 then
  begin
    MsgBox('Focus requires Windows 10 or later.' + #13#10 +
           'Your system: Windows ' + IntToStr(Version.Major) + '.' + IntToStr(Version.Minor),
           mbCriticalError, MB_OK);
    Result := False;
    Exit;
  end;

  // Check if this is 64-bit Windows
  if not Is64BitInstallMode then
  begin
    MsgBox('Focus requires 64-bit Windows.', mbCriticalError, MB_OK);
    Result := False;
    Exit;
  end;

  // Check for Visual C++ Redistributable (warning only, not blocking)
  if not IsVCRedistInstalled() then
  begin
    VCRedistMsg := 'Microsoft Visual C++ Redistributable (x64) is not detected on your system.' + #13#10 + #13#10 +
                   'Focus may require this to run properly. If the application fails to start after installation, ' +
                   'please download and install it from:' + #13#10 + #13#10 +
                   'https://aka.ms/vs/17/release/vc_redist.x64.exe' + #13#10 + #13#10 +
                   'Do you want to continue with the installation?';

    if MsgBox(VCRedistMsg, mbConfirmation, MB_YESNO) = IDNO then
    begin
      Result := False;
      Exit;
    end;
  end;
end;
