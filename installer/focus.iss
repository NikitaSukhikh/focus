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

[Code]
var
  LanguagePage: TInputOptionWizardPage;

procedure InitializeWizard;
begin
  LanguagePage := CreateInputOptionPage(
    wpWelcome,
    'Choose Language', 'Select the language for Focus',
    'Which language would you like to use?',
    True, False
  );
  LanguagePage.Add('English');
  LanguagePage.Add('Español');
  LanguagePage.Add('Français');
  LanguagePage.Add('Deutsch');
  LanguagePage.Add('中文 (简体)');
  LanguagePage.Add('Русский');
  LanguagePage.Values[0] := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  LangCodes: array of String;
  LangFile: String;
  LangDir: String;
begin
  if CurStep = ssInstall then
  begin
    SetArrayLength(LangCodes, 6);
    LangCodes[0] := 'en';
    LangCodes[1] := 'es';
    LangCodes[2] := 'fr';
    LangCodes[3] := 'de';
    LangCodes[4] := 'zh-CN';
    LangCodes[5] := 'ru';

    LangDir := ExpandConstant('{userappdata}\Focus');
    LangFile := LangDir + '\initial-language';
    ForceDirectories(LangDir);
    SaveStringToFile(LangFile, LangCodes[LanguagePage.SelectedValueIndex], False);
  end;
end;
