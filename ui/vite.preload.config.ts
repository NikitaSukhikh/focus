import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src-electron/preload.ts',
      formats: ['es'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external: ['electron'],
    },
    outDir: '.vite/build',
    emptyOutDir: false,
  },
});
