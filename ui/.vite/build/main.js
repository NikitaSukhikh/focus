import { app, session, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = dirname(__filename$1);
const isMac = process.platform === "darwin";
let mainWindow = null;
const logWebviewStorageInfo = async () => {
  try {
    const webviewSession = session.fromPartition("persist:ocean-webview");
    const storagePath = webviewSession.getStoragePath();
    const cookies = await webviewSession.cookies.get({});
    console.log(
      "[Electron] Webview storage",
      JSON.stringify({
        partition: "persist:ocean-webview",
        storagePath,
        cookieCount: cookies.length
      })
    );
  } catch (err) {
    console.warn("[Electron] Failed to inspect webview storage", err);
  }
};
const PRELOAD_PATH = path.join(__dirname$1, "preload.cjs");
async function createMainWindow() {
  console.log("[Electron] Creating main window...");
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: true,
    // Show immediately instead of waiting
    title: "Ocean",
    autoHideMenuBar: true,
    // Auto-hide menu bar (press Alt to show temporarily)
    webPreferences: {
      // Use the Vite/Webpack-provided preload entry point
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: false,
      // Must be false to enable webview tag
      nodeIntegration: false,
      webviewTag: true
      // Enable <webview> tag support
    }
  });
  console.log("[Electron] Window created, loading renderer...");
  {
    console.log("[Electron] Loading dev server:", "http://localhost:5173");
    await mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
  console.log("[Electron] Renderer loaded successfully");
  mainWindow.setMenuBarVisibility(false);
  mainWindow.on("ready-to-show", () => {
    console.log("[Electron] Window ready to show");
    mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(() => {
  createMainWindow().catch((err) => {
    console.error("[Electron] Failed to create main window:", err);
    app.quit();
  });
  const webviewSession = session.fromPartition("persist:ocean-webview");
  webviewSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    delete headers["x-frame-options"];
    delete headers["X-Frame-Options"];
    if (headers["content-security-policy"]) {
      headers["content-security-policy"] = headers["content-security-policy"].map(
        (value) => value.replace(/frame-ancestors[^;]*(;|$)/g, "")
      );
    }
    callback({ responseHeaders: headers });
  });
  void logWebviewStorageInfo();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow().catch((err) => {
        console.error("[Electron] Failed to recreate main window:", err);
        app.quit();
      });
    }
  });
});
app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});
ipcMain.handle("desktop:open-dialog", async (_event, options) => {
  const browserWindow = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!browserWindow) {
    throw new Error("No browser window available");
  }
  return dialog.showOpenDialog(browserWindow, {
    properties: ["openFile", "multiSelections"],
    ...options
  });
});
ipcMain.handle("desktop:open-external", async (_event, targetUrl) => {
  if (typeof targetUrl !== "string" || !targetUrl.trim()) {
    return;
  }
  await shell.openExternal(targetUrl);
});
ipcMain.handle("desktop:show-item-in-folder", async (_event, filePath) => {
  if (typeof filePath !== "string" || !filePath.trim()) {
    return;
  }
  shell.showItemInFolder(filePath);
});
ipcMain.handle("desktop:arrange-windows-side-by-side", async (_event) => {
  try {
    const { screen, BrowserWindow: BrowserWindow2 } = await import("electron");
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const halfWidth = Math.floor(screenWidth / 2);
    if (process.platform === "win32") {
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
        console.log("[Electron] Windows arranged side-by-side with navigation pane hidden");
      } catch (err) {
        console.warn("[Electron] Failed to configure File Explorer:", err);
      }
    }
    return true;
  } catch (err) {
    console.error("[Electron] Failed to arrange windows:", err);
    return false;
  }
});
ipcMain.handle("desktop:write-file-to-clipboard", async (_event, filePath) => {
  if (typeof filePath !== "string" || !filePath.trim()) {
    return false;
  }
  try {
    const { clipboard, nativeImage } = await import("electron");
    const fs = await import("fs");
    const path2 = await import("path");
    if (!fs.existsSync(filePath)) {
      console.error("[Electron] File not found:", filePath);
      return false;
    }
    const ext = path2.extname(filePath).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].includes(ext)) {
      const image = nativeImage.createFromPath(filePath);
      clipboard.writeImage(image);
      console.log("[Electron] Image copied to clipboard:", filePath);
      return true;
    }
    try {
      const normalizedPath = filePath.replace(/\//g, "\\");
      clipboard.write({
        text: normalizedPath,
        bookmark: filePath
      });
      const fileList = normalizedPath + "\0\0";
      const buffer = Buffer.from(fileList, "ucs2");
      clipboard.writeBuffer("FileNameW", buffer);
      console.log("[Electron] File copied to clipboard (multi-format):", filePath);
      return true;
    } catch (clipErr) {
      console.warn("[Electron] Multi-format clipboard failed, trying FileNameW only:", clipErr);
      const fileList = filePath + "\0\0";
      const buffer = Buffer.from(fileList, "ucs2");
      clipboard.writeBuffer("FileNameW", buffer);
      return true;
    }
  } catch (err) {
    console.error("[Electron] Failed to copy file to clipboard:", err);
    return false;
  }
});
ipcMain.handle("desktop:clear-clipboard", async () => {
  try {
    const { clipboard } = await import("electron");
    clipboard.clear();
    console.log("[Electron] Clipboard cleared");
    return true;
  } catch (err) {
    console.error("[Electron] Failed to clear clipboard:", err);
    return false;
  }
});
ipcMain.handle("desktop:open-auth-window", async (_event, payload) => {
  const targetUrl = payload?.url;
  if (!targetUrl) return;
  const width = payload.width ?? 500;
  const height = payload.height ?? 600;
  const title = payload.title ?? "Authenticate";
  const authWindow = new BrowserWindow({
    width,
    height,
    title,
    resizable: true,
    parent: mainWindow ?? void 0,
    modal: false,
    show: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });
  authWindow.setMenuBarVisibility(false);
  await authWindow.loadURL(targetUrl);
});
ipcMain.handle("desktop:close-file-explorer", async () => {
  try {
    if (process.platform === "win32") {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);
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
      console.log("[Electron] External windows closed", result.stdout, result.stderr);
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Electron] Failed to close external windows:", err);
    return false;
  }
});
