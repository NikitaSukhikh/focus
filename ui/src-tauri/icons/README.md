# Tauri App Icons

Place your application icons here. Tauri requires the following formats:

- `32x32.png` - 32x32 PNG icon
- `128x128.png` - 128x128 PNG icon
- `128x128@2x.png` - 256x256 PNG icon (for retina displays)
- `icon.icns` - macOS icon bundle
- `icon.ico` - Windows icon file

## Generating Icons

You can use the Tauri icon generator to create all required formats from a single source image:

```bash
npm run tauri icon path/to/your/icon.png
```

For now, Tauri will use default icons during development.
