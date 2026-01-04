import type { ForgeConfig, MakerBaseConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional Windows code signing (set env vars to enable)
const windowsPfxPath = process.env.WINDOWS_PFX_PATH;
const windowsPfxPassword = process.env.WINDOWS_PFX_PASSWORD;
const windowsSignParams = process.env.WINDOWS_SIGN_PARAMS;

// Backend binary included as an extra resource (built via PyInstaller)
const backendExecutableByPlatform: Record<NodeJS.Platform, string> = {
  win32: 'focus-backend.exe',
  darwin: 'focus-backend',
  linux: 'focus-backend',
  aix: 'focus-backend',
  freebsd: 'focus-backend',
  openbsd: 'focus-backend',
  android: 'focus-backend',
  sunos: 'focus-backend',
};

const platform = process.platform;
const backendExecutableName = backendExecutableByPlatform[platform] ?? 'focus-backend';

const commonAssets = [path.join(__dirname, 'src', 'assets', 'focus.png')];
const platformAssets =
  platform === 'win32'
    ? [path.join(__dirname, 'src', 'assets', 'focus.ico')]
    : platform === 'darwin'
      ? [path.join(__dirname, 'src', 'assets', 'focus.icns')]
      : [];

const backendBinaryPath = path.join(__dirname, 'resources', backendExecutableName);

const ensureResourceExists = (resourcePath: string) => {
  if (!fs.existsSync(resourcePath)) {
    console.warn(`[forge.config] Missing resource at ${resourcePath}. Ensure the platform-specific backend is downloaded before packaging.`);
  }
  return resourcePath;
};

const platformMakers: MakerBaseConfig[] = [];

if (platform === 'win32') {
  platformMakers.push({
    name: '@electron-forge/maker-squirrel',
    platforms: ['win32'],
    config: {
      name: 'Focus',
      authors: 'Nikita Sukhikh',
      // Code signing (if certificate available)
      ...(windowsPfxPath && { certificateFile: windowsPfxPath }),
      ...(windowsPfxPassword && { certificatePassword: windowsPfxPassword }),
      ...(windowsSignParams && { signWithParams: windowsSignParams }),
    },
  });
  platformMakers.push({
    name: '@electron-forge/maker-zip',
    platforms: ['win32'],
  });
} else if (platform === 'darwin') {
  platformMakers.push({
    name: '@electron-forge/maker-dmg',
    platforms: ['darwin'],
  });
  platformMakers.push({
    name: '@electron-forge/maker-zip',
    platforms: ['darwin'],
  });
} else {
  platformMakers.push({
    name: '@electron-forge/maker-deb',
    platforms: ['linux'],
    config: {},
  });
  platformMakers.push({
    name: '@electron-forge/maker-rpm',
    platforms: ['linux'],
    config: {},
  });
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'focus',
    // electron-packager expects icon without extension; it will pick .ico on Windows and .icns on macOS
    icon: path.join(__dirname, 'src', 'assets', 'focus'),
    extraResource: [...commonAssets, ...platformAssets, ensureResourceExists(backendBinaryPath)],
  },
  rebuildConfig: {},
  makers: platformMakers,
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
