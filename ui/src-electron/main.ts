import { app, BrowserWindow, dialog, ipcMain, shell, session } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

// ES module compatibility - define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isMac = process.platform === 'darwin';

let mainWindow: BrowserWindow | null = null;

const logWebviewStorageInfo = async () => {
  try {
    const webviewSession = session.fromPartition('persist:ocean-webview');
    const storagePath = webviewSession.getStoragePath();
    const cookies = await webviewSession.cookies.get({});
    console.log(
      '[Electron] Webview storage',
      JSON.stringify({
        partition: 'persist:ocean-webview',
        storagePath,
        cookieCount: cookies.length,
      })
    );
  } catch (err) {
    console.warn('[Electron] Failed to inspect webview storage', err);
  }
};

// Electron Forge's Vite plugin provides these globals
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Vite plugin defines MAIN_WINDOW_PRELOAD_VITE_ENTRY for preload script
// This path is injected by Electron Forge at build time
const PRELOAD_PATH = path.join(__dirname, 'preload.js');
const PRELOAD_URL = pathToFileURL(PRELOAD_PATH).toString();

async function createMainWindow() {
  console.log('[Electron] Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: true, // Show immediately instead of waiting
    title: 'Ocean',
    autoHideMenuBar: true, // Auto-hide menu bar (press Alt to show temporarily)
    webPreferences: {
      // preload is ESM-built; use file URL so Electron treats it as an ES module
      preload: PRELOAD_URL,
      contextIsolation: true,
      sandbox: false, // Must be false to enable webview tag
      nodeIntegration: false,
      webviewTag: true, // Enable <webview> tag support
    },
  });

  console.log('[Electron] Window created, loading renderer...');

  // Load renderer - Vite plugin provides the dev server URL or the built file path
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    console.log('[Electron] Loading dev server:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
    await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const rendererPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    console.log('[Electron] Loading production build:', rendererPath);
    await mainWindow.loadFile(rendererPath);
  }

  console.log('[Electron] Renderer loaded successfully');

  // Hide the menu bar
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('ready-to-show', () => {
    console.log('[Electron] Window ready to show');
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow().catch((err) => {
    console.error('[Electron] Failed to create main window:', err);
    app.quit();
  });

  // Log where the webview's persistent storage lives so we can verify cookies survive restarts.
  void logWebviewStorageInfo();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow().catch((err) => {
        console.error('[Electron] Failed to recreate main window:', err);
        app.quit();
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

ipcMain.handle('desktop:open-dialog', async (_event, options) => {
  const browserWindow = BrowserWindow.getFocusedWindow() || mainWindow || undefined;
  return dialog.showOpenDialog(browserWindow, {
    properties: ['openFile', 'multiSelections'],
    ...options,
  });
});

ipcMain.handle('desktop:open-external', async (_event, targetUrl: string) => {
  if (typeof targetUrl !== 'string' || !targetUrl.trim()) {
    return;
  }
  await shell.openExternal(targetUrl);
});

ipcMain.handle('desktop:open-auth-window', async (_event, payload: { url?: string; title?: string; width?: number; height?: number }) => {
  const targetUrl = payload?.url;
  if (!targetUrl) return;

  const width = payload.width ?? 500;
  const height = payload.height ?? 600;
  const title = payload.title ?? 'Authenticate';

  const authWindow = new BrowserWindow({
    width,
    height,
    title,
    resizable: true,
    parent: mainWindow ?? undefined,
    modal: false,
    show: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  authWindow.setMenuBarVisibility(false);
  await authWindow.loadURL(targetUrl);
});

// TODO: Implement preview overlay in Electron (either <webview> or frameless child window) once renderer wiring is ready.
