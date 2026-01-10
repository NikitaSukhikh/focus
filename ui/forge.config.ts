import type { ForgeConfig, MakerBaseConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
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
  win32: 'Focus.exe',
  darwin: 'Focus',
  linux: 'Focus',
  aix: 'Focus',
  freebsd: 'Focus',
  openbsd: 'Focus',
  android: 'Focus',
  sunos: 'Focus',
};

const platform = process.platform;
const backendExecutableName = backendExecutableByPlatform[platform] ?? 'Focus';

const commonAssets = [path.join(__dirname, 'src', 'assets', 'focus.png')];
const platformAssets =
  platform === 'win32'
    ? [path.join(__dirname, 'src', 'assets', 'focus.ico')]
    : platform === 'darwin'
      ? [path.join(__dirname, 'src', 'assets', 'focus.icns')]
      : [];

// Backend is now a directory (onedir mode), not a single file
const backendDirPath = path.join(__dirname, 'resources', 'Focus');

const ensureResourceExists = (resourcePath: string) => {
  if (!fs.existsSync(resourcePath)) {
    console.warn(`[forge.config] Missing resource at ${resourcePath}. Ensure the platform-specific backend is downloaded before packaging.`);
  }
  return resourcePath;
};

const platformMakers: MakerBaseConfig[] = [];

// Configure makers based on platform
if (platform === 'win32') {
  platformMakers.push(
    new MakerSquirrel({
      name: 'Focus',
      authors: 'Nikita Sukhikh',
      description: 'Focus desktop application',
    }),
    new MakerZIP({}, ['win32'])
  );
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'focus',
    // electron-packager expects icon without extension; it will pick .ico on Windows and .icns on macOS
    icon: path.join(__dirname, 'src', 'assets', 'focus'),
    extraResource: [...commonAssets, ...platformAssets, ensureResourceExists(backendDirPath)],
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
