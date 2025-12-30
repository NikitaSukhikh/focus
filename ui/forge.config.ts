import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
