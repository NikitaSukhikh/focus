import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: 'src-electron/main.ts',
      formats: ['es'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: ['electron', 'path'],
    },
    outDir: '.vite/build',
    emptyOutDir: false,
  },
  plugins: [
    {
      name: 'copy-splash-assets',
      closeBundle() {
        const outDir = '.vite/build';
        const fontsDir = path.join(outDir, 'fonts');

        // Create fonts directory
        if (!existsSync(fontsDir)) {
          mkdirSync(fontsDir, { recursive: true });
        }

        // Copy splash.html
        copyFileSync(
          'src-electron/splash.html',
          path.join(outDir, 'splash.html')
        );

        // Copy Orbitron font
        copyFileSync(
          'src-electron/fonts/Orbitron-Bold.ttf',
          path.join(fontsDir, 'Orbitron-Bold.ttf')
        );

        // Copy icon for splash screen
        copyFileSync(
          'src/assets/focus.png',
          path.join(outDir, 'focus.png')
        );

        console.log('✓ Copied splash.html, fonts, and icon to build output');
      },
    },
  ],
});
