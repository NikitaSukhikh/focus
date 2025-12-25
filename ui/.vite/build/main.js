import { app, BrowserWindow, ipcMain, dialog, shell, session } from "electron";
import path, { dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
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
const PRELOAD_PATH = path.join(__dirname$1, "preload.js");
const PRELOAD_URL = pathToFileURL(PRELOAD_PATH).toString();
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
      // preload is ESM-built; use file URL so Electron treats it as an ES module
      preload: PRELOAD_URL,
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
  const browserWindow = BrowserWindow.getFocusedWindow() || mainWindow || void 0;
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
