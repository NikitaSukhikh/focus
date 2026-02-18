# macOS Implementation Scaffolding

## What's Already Done (partial)

- `focus.icns` asset exists in `ui/src/assets/`
- `forge.config.ts` detects `darwin` and picks `.icns` icon; `MakerDMG`/`MakerZIP` referenced but not yet added to `platformMakers`
- `focus.spec` has `argv_emulation=False`, `codesign_identity=None`, `entitlements_file=None` — stubs in place
- `main.ts:20` has `isMac` flag; `window-all-closed` skips quit on mac (standard behavior)
- `config.py` has `sys.platform == 'darwin'` paths for `~/Library/Application Support/Focus`
- CI has `build-backend-macos` and `build-macos` jobs in `release.yml`

---

## Gaps to Fill

### 1. `forge.config.ts` — Add macOS makers
```ts
// Currently platformMakers is empty for darwin
if (platform === 'darwin') {
  platformMakers.push(
    new MakerDMG({ name: 'Focus', background: '...', icon: '...' }),
    new MakerZIP({}, ['darwin'])
  );
}
```
Also add `MakerDMG` import.

### 2. `focus.spec` — macOS-specific PyInstaller config
- Use `app/main.py` with POSIX path separator (currently hardcodes `app\\main.py` — Windows only)
- Set `codesign_identity` from env var for notarization
- Add `entitlements_file` pointing to `entitlements.plist`
- Consider separate `focus-macos.spec` or platform-conditional logic

### 3. New file: `backend/entitlements.plist`
Required for macOS Hardened Runtime / notarization:
```xml
<key>com.apple.security.cs.allow-jit</key>
<key>com.apple.security.network.client</key>
```

### 4. New script: `build-package.sh`
macOS equivalent of `build-package.ps1`:
- `uv sync --group dev`
- `uv run pyinstaller focus.spec --clean`
- `chmod +x backend/dist/Focus/Focus`
- Copy to `ui/resources/Focus/`
- `npm install && npm run build`

### 5. `main.ts` — macOS-specific IPC handlers
- `desktop:arrange-windows-side-by-side` currently only handles `win32` — add macOS equivalent using AppleScript / `osascript`
- `desktop:close-file-explorer` — add macOS Finder close via AppleScript
- `desktop:write-file-to-clipboard` — `FileNameW` buffer format is Windows-only; use `NSFilenamesPboardType` approach or `clipboard.writeText(filePath)` on macOS
- Window frame: `frame: false` requires custom title bar; on macOS, consider `titleBarStyle: 'hiddenInset'` and `trafficLightPosition` for native feel

### 6. `main.ts` — macOS menu bar
macOS apps need a native menu (`app.applicationMenu`) for standard Cmd+Q, Cmd+W, etc. Currently `autoHideMenuBar: true` is set which doesn't fully apply to macOS.

### 7. Custom title bar / window chrome
The app uses `frame: false` + custom title bar buttons (minimize/maximize/close via IPC). On macOS:
- Use `titleBarStyle: 'hidden'` or `'hiddenInset'` to keep native traffic lights
- Or fully custom with `trafficLightPosition` offset
- IPC handlers `window:minimize/maximize/close` are already wired

### 8. CI — Code signing & notarization (`release.yml`)
`build-macos` job needs:
- `APPLE_DEVELOPER_ID` / `APPLE_TEAM_ID` secrets
- `codesign` step via Electron Forge's `osxSign` + `osxNotarize` packager config
- `security import` for certificate from secret
- Notarization via `notarytool` or `electron-notarize`

### 9. `backend/pyproject.toml` — Platform deps
- Remove or conditionally exclude `pywin32` on macOS (`pywin32==311` is Windows-only)
- Verify all deps have macOS wheels (check `Pillow`, `lxml`, `pandas` — all have macOS wheels)

---

## Priority Order

| Priority | Item |
|---|---|
| 1 | `focus.spec` POSIX path fix (`app/main.py` vs `app\\main.py`) |
| 2 | `forge.config.ts` — add `MakerDMG` for darwin |
| 3 | `build-package.sh` — local build script |
| 4 | `main.ts` — window chrome (`titleBarStyle`) |
| 5 | `main.ts` — macOS menu bar |
| 6 | `main.ts` — clipboard/IPC platform guards |
| 7 | `entitlements.plist` + CI signing/notarization |
