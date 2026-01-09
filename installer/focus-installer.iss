; Focus Installer Script for Inno Setup
; This creates a proper Windows installer with directory selection

#define MyAppName "Focus"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Nikita Sukhikh"
#define MyAppExeName "Focus.exe"
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

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

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
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

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

// Check disk space
function InitializeSetup(): Boolean;
var
  DiskSpaceMB: Integer;
begin
  Result := True;
  DiskSpaceMB := 500; // Approximate size needed in MB
  if GetSpaceOnDisk(ExpandConstant('{app}'), False, nil, nil) < (DiskSpaceMB * 1024 * 1024) then
  begin
    MsgBox('Insufficient disk space. At least ' + IntToStr(DiskSpaceMB) + ' MB required.', mbError, MB_OK);
    Result := False;
  end;
end;
