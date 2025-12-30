import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional Windows code signing (set env vars to enable)
const windowsPfxPath = process.env.WINDOWS_PFX_PATH;
const windowsPfxPassword = process.env.WINDOWS_PFX_PASSWORD;
const windowsSignParams = process.env.WINDOWS_SIGN_PARAMS;

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'focus',
    // electron-packager expects icon without extension; it will pick .ico on Windows and .icns on macOS
    icon: path.join(__dirname, 'src', 'assets', 'focus'),
    extraResource: [
      path.join(__dirname, 'src', 'assets', 'focus.png'),
      path.join(__dirname, 'src', 'assets', 'focus.ico'),
      path.join(__dirname, 'src', 'assets', 'focus.icns'),
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        authors: 'Focus Team',
        // Enable signing when WINDOWS_PFX_PATH/PASSWORD are provided
        ...(windowsPfxPath && { certificateFile: windowsPfxPath }),
        ...(windowsPfxPassword && { certificatePassword: windowsPfxPassword }),
        // Optionally pass raw signtool params (e.g., timestamp server)
        ...(windowsSignParams && { signWithParams: windowsSignParams }),
        // Name the installer executable
        setupExe: 'focus.exe',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src-electron/main.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'src-electron/preload.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.config.ts',
        },
      ],
    }),
  ],
};

export default config;
