import { app, BrowserWindow, dialog, ipcMain, shell, session } from 'electron';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

// ES module compatibility - define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isMac = process.platform === 'darwin';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcessWithoutNullStreams | null = null;
let isFullWindowPreviewOpen = false;

const getIconPath = () => {
  const devCandidates = [
    path.join(__dirname, '../src/assets/focus.ico'),
    path.join(__dirname, '../src/assets/focus.png'),
    path.resolve(process.cwd(), 'src', 'assets', 'focus.ico'),
    path.resolve(process.cwd(), 'src', 'assets', 'focus.png'),
    path.resolve(process.cwd(), 'ui', 'src', 'assets', 'focus.ico'),
    path.resolve(process.cwd(), 'ui', 'src', 'assets', 'focus.png'),
  ];

  const prodCandidates = [
    path.join(process.resourcesPath, 'focus.ico'),
    path.join(process.resourcesPath, 'focus.icns'),
    path.join(process.resourcesPath, 'focus.png'),
  ];

  const candidates = app.isPackaged ? prodCandidates : devCandidates;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log('[Electron] Using icon:', candidate);
      return candidate;
    }
  }

  // Fallback to default icon
  console.warn('[Electron] No icon found, using default Electron icon');
  return undefined;
};

const requestCloseFullWindowPreview = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send('fullwindow-preview:close-request');
};

const getBackendPath = () => {
  // Packaged app reads from resources; dev uses checked-in binary for convenience.
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'focus-backend.exe');
  }
  return path.resolve(__dirname, '../resources/focus-backend.exe');
};

const getBackendCwd = () => {
  // Run backend from resources so relative storage/log paths live with the app.
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  // In dev, run from repo root/backend if available; otherwise use binary directory.
  const repoBackend = path.resolve(__dirname, '../../backend');
  if (fs.existsSync(repoBackend)) {
    return repoBackend;
  }
  return path.resolve(__dirname, '../resources');
};

const startBackend = () => {
  const backendPath = getBackendPath();
  if (!fs.existsSync(backendPath)) {
    console.warn('[Electron] Backend binary not found at', backendPath);
    return;
  }

  console.log('[Electron] Starting backend:', backendPath);
  backendProcess = spawn(backendPath, [], {
    stdio: 'inherit',
    cwd: getBackendCwd(),
  });

  backendProcess.on('exit', (code, signal) => {
    console.log('[Electron] Backend exited', { code, signal });
    backendProcess = null;
  });

  backendProcess.on('error', (err) => {
    console.error('[Electron] Backend process error', err);
  });
};

const stopBackend = () => {
  if (backendProcess && !backendProcess.killed) {
    console.log('[Electron] Stopping backend...');
    backendProcess.kill();
  }
  backendProcess = null;
};

const logWebviewStorageInfo = async () => {
  try {
    const webviewSession = session.fromPartition('persist:focus-webview');
    const storagePath = webviewSession.getStoragePath();
    const cookies = await webviewSession.cookies.get({});
    console.log(
      '[Electron] Webview storage',
      JSON.stringify({
        partition: 'persist:focus-webview',
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

// In both dev and production, preload.cjs is built to the same directory as main.js
const PRELOAD_PATH = path.join(__dirname, 'preload.cjs');

async function createMainWindow() {
  console.log('[Electron] Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: true, // Show immediately instead of waiting
    title: 'Focus',
    icon: getIconPath(),
    frame: false, // Remove default title bar for custom implementation
    thickFrame: false, // Disable thick frame to prevent resize tooltip
    autoHideMenuBar: true, // Auto-hide menu bar (press Alt to show temporarily)
    webPreferences: {
      // Use the Vite/Webpack-provided preload entry point
      preload: PRELOAD_PATH,
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

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = input.key?.toLowerCase();
    if (input.type === 'keyDown' && key === 'f4' && input.alt && isFullWindowPreviewOpen) {
      event.preventDefault();
      requestCloseFullWindowPreview();
    }
  });

  mainWindow.on('ready-to-show', () => {
    console.log('[Electron] Window ready to show');
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();

  createMainWindow().catch((err) => {
    console.error('[Electron] Failed to create main window:', err);
    app.quit();
  });

  // Configure webview session to handle sites that block embedding
  const webviewSession = session.fromPartition('persist:focus-webview');
  webviewSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };

    // Remove headers that prevent embedding
    delete headers['x-frame-options'];
    delete headers['X-Frame-Options'];

    // Modify CSP to allow framing
    if (headers['content-security-policy']) {
      headers['content-security-policy'] = headers['content-security-policy'].map(
        (value) => value.replace(/frame-ancestors[^;]*(;|$)/g, '')
      );
    }

    callback({ responseHeaders: headers });
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
    stopBackend();
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

ipcMain.on('fullwindow-preview:state', (_event, isOpen: boolean) => {
  isFullWindowPreviewOpen = !!isOpen;
});

ipcMain.handle('desktop:open-dialog', async (_event, options) => {
  const browserWindow = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!browserWindow) {
    throw new Error('No browser window available');
  }
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

ipcMain.handle('desktop:show-item-in-folder', async (_event, filePath: string) => {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    return;
  }
  shell.showItemInFolder(filePath);
});

ipcMain.handle('desktop:arrange-windows-side-by-side', async (_event) => {
  try {
    const { screen, BrowserWindow } = await import('electron');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Get screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Calculate dimensions - full height, half width for side-by-side layout
    const halfWidth = Math.floor(screenWidth / 2);

    // Don't resize Focus window - keep it as is
    // Only position the File Explorer window

    // On Windows, use PowerShell to position and configure File Explorer
    if (process.platform === 'win32') {
      const psScript = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
          }
"@
        $shell = New-Object -ComObject Shell.Application
        $windows = $shell.Windows()
        foreach ($window in $windows) {
          if ($window.Name -eq "File Explorer") {
            $hwnd = $window.HWND

            # Position window on left half, full height
            [Win32]::SetWindowPos($hwnd, 0, 0, 0, ${halfWidth}, ${screenHeight}, 0x0040)

            # Hide navigation pane for cleaner view
            try {
              $window.Document.Application.ShowNavigationPane = $$false
            } catch {}

            break
          }
        }
      `;

      try {
        await execAsync(`powershell -Command "${psScript.replace(/"/g, '\\"')}"`);
        console.log('[Electron] Windows arranged side-by-side with navigation pane hidden');
      } catch (err) {
        console.warn('[Electron] Failed to configure File Explorer:', err);
      }
    }

    return true;
  } catch (err) {
    console.error('[Electron] Failed to arrange windows:', err);
    return false;
  }
});

ipcMain.handle('desktop:write-file-to-clipboard', async (_event, filePath: string) => {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    return false;
  }
  try {
    const { clipboard, nativeImage } = await import('electron');
    const fs = await import('fs');
    const path = await import('path');

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('[Electron] File not found:', filePath);
      return false;
    }

    // For images, write as image to clipboard
    const ext = path.extname(filePath).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(ext)) {
      const image = nativeImage.createFromPath(filePath);
      clipboard.writeImage(image);
      console.log('[Electron] Image copied to clipboard:', filePath);
      return true;
    }

    // For other files (including PDFs), try clipboard.write() with multiple formats
    try {
      // Normalize path to use backslashes on Windows
      const normalizedPath = filePath.replace(/\//g, '\\');

      clipboard.write({
        text: normalizedPath,
        bookmark: filePath
      });

      // Also try FileNameW format for file managers
      const fileList = normalizedPath + '\0\0';
      const buffer = Buffer.from(fileList, 'ucs2');
      clipboard.writeBuffer('FileNameW', buffer);

      console.log('[Electron] File copied to clipboard (multi-format):', filePath);
      return true;
    } catch (clipErr) {
      console.warn('[Electron] Multi-format clipboard failed, trying FileNameW only:', clipErr);
      const fileList = filePath + '\0\0';
      const buffer = Buffer.from(fileList, 'ucs2');
      clipboard.writeBuffer('FileNameW', buffer);
      return true;
    }
  } catch (err) {
    console.error('[Electron] Failed to copy file to clipboard:', err);
    return false;
  }
});

ipcMain.handle('desktop:clear-clipboard', async () => {
  try {
    const { clipboard } = await import('electron');
    clipboard.clear();
    console.log('[Electron] Clipboard cleared');
    return true;
  } catch (err) {
    console.error('[Electron] Failed to clear clipboard:', err);
    return false;
  }
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

ipcMain.handle('desktop:close-file-explorer', async () => {
  try {
    if (process.platform === 'win32') {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Close messaging apps and File Explorer windows more aggressively
      const psScript = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
            [DllImport("user32.dll")]
            public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
          }
"@

        # Close browser windows (Chrome/Edge) with messaging apps
        $browsers = Get-Process | Where-Object {
          ($_.ProcessName -eq "chrome" -or $_.ProcessName -eq "msedge") -and
          $_.MainWindowTitle -match "WhatsApp|Telegram|Facebook|Twitter|LinkedIn|Gmail|Reddit|Instagram"
        }
        foreach ($browser in $browsers) {
          try {
            $browser.CloseMainWindow() | Out-Null
          } catch {}
        }

        # Close desktop messaging apps
        $apps = Get-Process | Where-Object {
          $_.ProcessName -match "WhatsApp|Telegram" -and $_.MainWindowHandle -ne 0
        }
        foreach ($app in $apps) {
          try {
            $app.CloseMainWindow() | Out-Null
          } catch {}
        }

        # Close File Explorer windows using Shell.Application COM
        $shell = New-Object -ComObject Shell.Application
        $windows = $shell.Windows()
        for ($i = $windows.Count - 1; $i -ge 0; $i--) {
          $window = $windows.Item($i)
          if ($window.Name -eq "File Explorer") {
            try {
              $window.Quit()
            } catch {}
          }
        }
      `;

      const result = await execAsync(`powershell -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"')}"`);
      console.log('[Electron] External windows closed', result.stdout, result.stderr);
      return true;
    }
    return false;
  } catch (err) {
    console.error('[Electron] Failed to close external windows:', err);
    return false;
  }
});

// Window control IPC handlers
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// TODO: Implement preview overlay in Electron (either <webview> or frameless child window) once renderer wiring is ready.
