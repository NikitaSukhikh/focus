import { app, session, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { spawn } from "child_process";
import * as fs from "fs";
import fs__default from "fs";
import * as path from "path";
import path__default, { dirname } from "path";
import { fileURLToPath } from "url";
class AppLogger {
  logFilePath;
  isInitialized = false;
  constructor() {
    this.logFilePath = this.resolveLogFilePath();
    this.initialize();
  }
  resolveLogFilePath() {
    const userDataPath = app.getPath("userData");
    const logsDir = path.join(userDataPath, "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    return path.join(logsDir, "focus-app.log");
  }
  initialize() {
    try {
      const fileExists = fs.existsSync(this.logFilePath);
      if (!fileExists) {
        fs.writeFileSync(this.logFilePath, "", "utf-8");
      }
      const stats = fs.statSync(this.logFilePath);
      if (stats.size > 10 * 1024 * 1024) {
        this.rotateLogFile();
      }
      if (fileExists && stats.size > 0) {
        fs.appendFileSync(this.logFilePath, "\n", "utf-8");
      }
      this.isInitialized = true;
      this.log("INFO", "logger_init", "Logger initialized", {
        logFilePath: this.logFilePath
      });
    } catch (error) {
      console.error("[Logger] Failed to initialize:", error);
    }
  }
  rotateLogFile() {
    try {
      const backupPath = `${this.logFilePath}.old`;
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      fs.renameSync(this.logFilePath, backupPath);
      fs.writeFileSync(this.logFilePath, "", "utf-8");
    } catch (error) {
      console.error("[Logger] Failed to rotate log file:", error);
    }
  }
  formatLogEntry(entry) {
    const baseLog = `[${entry.timestamp}] [${entry.level}] [${entry.event}] ${entry.message}`;
    if (entry.data || entry.error) {
      const details = {};
      if (entry.data) details.data = entry.data;
      if (entry.error) details.error = entry.error;
      return `${baseLog} ${JSON.stringify(details)}`;
    }
    return baseLog;
  }
  log(level, event, message, data, error) {
    if (!this.isInitialized) {
      console.warn("[Logger] Not initialized, skipping log");
      return;
    }
    const entry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      event,
      message,
      data,
      error: error ? { message: error.message, stack: error.stack } : void 0
    };
    const logLine = this.formatLogEntry(entry) + "\n";
    try {
      fs.appendFileSync(this.logFilePath, logLine, "utf-8");
      const consoleMethod = level === "ERROR" || level === "CRITICAL" ? console.error : level === "WARNING" ? console.warn : console.log;
      consoleMethod(`[Logger] ${logLine.trim()}`);
    } catch (error2) {
      console.error("[Logger] Failed to write log:", error2);
    }
  }
  logStartup(data) {
    this.log("INFO", "app_startup", "Application starting", {
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      platform: process.platform,
      arch: process.arch,
      isPackaged: app.isPackaged,
      ...data
    });
  }
  logInstallation(status, data) {
    this.log("INFO", "installation", `Installation ${status}`, data);
  }
  logBackendStart(status, data) {
    const level = status === "failed" ? "ERROR" : "INFO";
    this.log(level, "backend_start", `Backend start ${status}`, data);
  }
  logBackendError(message, error, data) {
    this.log("ERROR", "backend_error", message, data, error);
  }
  logWindowCreation(status, data) {
    const level = status === "failed" ? "ERROR" : "INFO";
    this.log(level, "window_creation", `Window creation ${status}`, data);
  }
  logDatabaseOperation(operation, status, data) {
    const level = status === "success" ? "INFO" : "ERROR";
    this.log(level, "database_operation", `Database ${operation} ${status}`, data);
  }
  logSpaceOperation(operation, status, data) {
    const level = status === "success" ? "INFO" : "ERROR";
    this.log(level, "space_operation", `Space ${operation} ${status}`, data);
  }
  logObjectOperation(operation, status, data) {
    const level = status === "success" ? "INFO" : "ERROR";
    this.log(level, "object_operation", `Object ${operation} ${status}`, data);
  }
  logError(errorType, message, error, data) {
    this.log("ERROR", errorType, message, data, error);
  }
  logWarning(message, data) {
    this.log("WARNING", "warning", message, data);
  }
  logInfo(event, message, data) {
    this.log("INFO", event, message, data);
  }
  logDebug(event, message, data) {
    this.log("DEBUG", event, message, data);
  }
  getLogPath() {
    return this.logFilePath;
  }
}
let appLogger = null;
function getAppLogger() {
  if (!appLogger) {
    appLogger = new AppLogger();
  }
  return appLogger;
}
function logStartup(data) {
  getAppLogger().logStartup(data);
}
function logBackendStart(status, data) {
  getAppLogger().logBackendStart(status, data);
}
function logBackendError(message, error, data) {
  getAppLogger().logBackendError(message, error, data);
}
function logWindowCreation(status, data) {
  getAppLogger().logWindowCreation(status, data);
}
function logError(errorType, message, error, data) {
  getAppLogger().logError(errorType, message, error, data);
}
function logInfo(event, message, data) {
  getAppLogger().logInfo(event, message, data);
}
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = dirname(__filename$1);
const isMac = process.platform === "darwin";
const backendExecutableByPlatform = {
  win32: "Focus.exe",
  darwin: "Focus",
  linux: "Focus",
  aix: "Focus",
  freebsd: "Focus",
  openbsd: "Focus",
  android: "Focus",
  sunos: "Focus"
};
let mainWindow = null;
let splashWindow = null;
let backendProcess = null;
let isFullWindowPreviewOpen = false;
const getIconPath = () => {
  const devCandidates = [
    path__default.join(__dirname$1, "../src/assets/focus.ico"),
    path__default.join(__dirname$1, "../src/assets/focus.png"),
    path__default.resolve(process.cwd(), "src", "assets", "focus.ico"),
    path__default.resolve(process.cwd(), "src", "assets", "focus.png"),
    path__default.resolve(process.cwd(), "ui", "src", "assets", "focus.ico"),
    path__default.resolve(process.cwd(), "ui", "src", "assets", "focus.png")
  ];
  const prodCandidates = [
    path__default.join(process.resourcesPath, "focus.ico"),
    path__default.join(process.resourcesPath, "focus.icns"),
    path__default.join(process.resourcesPath, "focus.png")
  ];
  const candidates = app.isPackaged ? prodCandidates : devCandidates;
  for (const candidate of candidates) {
    if (fs__default.existsSync(candidate)) {
      console.log("[Electron] Using icon:", candidate);
      return candidate;
    }
  }
  console.warn("[Electron] No icon found, using default Electron icon");
  return void 0;
};
const requestCloseFullWindowPreview = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send("fullwindow-preview:close-request");
};
const getBackendExecutableName = () => {
  return backendExecutableByPlatform[process.platform] ?? "Focus";
};
const getBackendPath = () => {
  const executableName = getBackendExecutableName();
  if (app.isPackaged) {
    return path__default.join(process.resourcesPath, "Focus", executableName);
  }
  return path__default.resolve(__dirname$1, "../resources", executableName);
};
const getBackendCwd = () => {
  if (app.isPackaged) {
    return path__default.join(process.resourcesPath, "Focus");
  }
  const repoBackend = path__default.resolve(__dirname$1, "../../backend");
  if (fs__default.existsSync(repoBackend)) {
    return repoBackend;
  }
  return path__default.resolve(__dirname$1, "../resources");
};
const startBackend = () => {
  if (!app.isPackaged) {
    console.log("[Electron] Dev mode detected - skipping backend launch (start backend manually)");
    logInfo("backend", "Dev mode detected - backend should be started manually");
    return;
  }
  const backendPath = getBackendPath();
  const backendCwd = getBackendCwd();
  console.log("[Electron] Backend path:", backendPath);
  console.log("[Electron] Backend CWD:", backendCwd);
  console.log("[Electron] App isPackaged:", app.isPackaged);
  console.log("[Electron] process.resourcesPath:", process.resourcesPath);
  logInfo("backend", "Starting backend", {
    backendPath,
    backendCwd,
    isPackaged: app.isPackaged
  });
  if (!fs__default.existsSync(backendPath)) {
    console.error("[Electron] Backend binary not found at", backendPath);
    logBackendError("Backend binary not found", void 0, { backendPath });
    dialog.showErrorBox("Backend Error", `Backend executable not found at: ${backendPath}`);
    return;
  }
  console.log("[Electron] Starting backend:", backendPath);
  backendProcess = spawn(backendPath, [], {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: backendCwd
  });
  let stdoutBuffer = "";
  let stderrBuffer = "";
  backendProcess.stdout?.on("data", (data) => {
    const output = data.toString();
    stdoutBuffer += output;
    console.log("[Backend stdout]", output.trim());
    logInfo("backend_stdout", output.trim());
  });
  backendProcess.stderr?.on("data", (data) => {
    const output = data.toString();
    stderrBuffer += output;
    const isActualError = /error|exception|traceback|failed/i.test(output);
    if (isActualError) {
      console.error("[Backend stderr]", output.trim());
      logError("backend_stderr", output.trim());
    } else {
      console.log("[Backend stderr]", output.trim());
      logInfo("backend_stderr", output.trim());
    }
  });
  backendProcess.on("exit", (code, signal) => {
    console.log("[Electron] Backend exited", { code, signal });
    const isNormalShutdown = signal === "SIGTERM" || code === 0;
    if (!isNormalShutdown && code !== 0) {
      console.error("[Electron] Backend failed. Full stdout:", stdoutBuffer);
      console.error("[Electron] Backend failed. Full stderr:", stderrBuffer);
      logBackendStart("failed", {
        exitCode: code,
        signal,
        stdout: stdoutBuffer.slice(-500),
        // Last 500 chars
        stderr: stderrBuffer.slice(-500)
      });
      const errorMsg = stderrBuffer || stdoutBuffer || "Unknown error";
      dialog.showErrorBox(
        "Backend Startup Failed",
        `Backend exited with code ${code}

Error:
${errorMsg.slice(-300)}`
      );
    } else {
      logBackendStart("success", { exitCode: code, signal });
    }
    backendProcess = null;
  });
  backendProcess.on("error", (err) => {
    console.error("[Electron] Backend process error", err);
    logBackendError("Backend process error", err);
    dialog.showErrorBox("Backend Error", `Failed to start backend: ${err.message}`);
  });
  logBackendStart("started", { backendPath });
};
const stopBackend = () => {
  if (backendProcess && !backendProcess.killed) {
    console.log("[Electron] Stopping backend...");
    backendProcess.kill();
  }
  backendProcess = null;
};
const logWebviewStorageInfo = async () => {
  try {
    const webviewSession = session.fromPartition("persist:focus-webview");
    const storagePath = webviewSession.getStoragePath();
    const cookies = await webviewSession.cookies.get({});
    console.log(
      "[Electron] Webview storage",
      JSON.stringify({
        partition: "persist:focus-webview",
        storagePath,
        cookieCount: cookies.length
      })
    );
  } catch (err) {
    console.warn("[Electron] Failed to inspect webview storage", err);
  }
};
const PRELOAD_PATH = path__default.join(__dirname$1, "preload.cjs");
function createSplashWindow() {
  console.log("[Electron] Creating splash window...");
  splashWindow = new BrowserWindow({
    width: 420,
    height: 260,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: true
  });
  const splashPath = path__default.join(__dirname$1, "splash.html");
  splashWindow.loadFile(splashPath);
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}
async function createMainWindow() {
  console.log("[Electron] Creating main window...");
  logWindowCreation("started");
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    // Hidden until ready
    title: "Focus",
    icon: getIconPath(),
    frame: false,
    // Remove default title bar for custom implementation
    thickFrame: false,
    // Disable thick frame to prevent resize tooltip
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
  const shouldOpenDevTools = !app.isPackaged && process.env.FOCUS_DEVTOOLS === "1";
  let hasShownWindow = false;
  let showTimeout = null;
  const showMainWindow = (reason) => {
    if (!mainWindow || mainWindow.isDestroyed() || hasShownWindow) {
      return;
    }
    hasShownWindow = true;
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    console.log(`[Electron] Showing main window (${reason})...`);
    mainWindow.show();
    splashWindow?.close();
  };
  console.log("[Electron] Window created, loading renderer...");
  {
    console.log("[Electron] Loading dev server:", "http://localhost:5173");
    await mainWindow.loadURL("http://localhost:5173");
    if (shouldOpenDevTools) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  }
  console.log("[Electron] Renderer loaded successfully");
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.on("before-input-event", (event, input) => {
    const key = input.key?.toLowerCase();
    const isAltF4 = key === "f4" && input.alt;
    const isKeyDownEvent = input.type === "keyDown" || input.type === "rawKeyDown";
    if (isKeyDownEvent && isAltF4 && isFullWindowPreviewOpen) {
      event.preventDefault();
      requestCloseFullWindowPreview();
    }
  });
  showTimeout = setTimeout(() => {
    console.log("[Electron] Timeout reached, forcing window show...");
    showMainWindow("timeout");
  }, 1e4);
  mainWindow.once("ready-to-show", () => {
    showMainWindow("ready-to-show");
  });
  mainWindow.webContents.once("did-finish-load", () => {
    console.log("[Electron] Main window ready, closing splash...");
    showMainWindow("did-finish-load");
    logWindowCreation("success");
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("[Electron] Renderer failed to load:", errorCode, errorDescription);
    logWindowCreation("failed", { errorCode, errorDescription });
    dialog.showErrorBox("Failed to Load", `The app failed to load: ${errorDescription}`);
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    isFullWindowPreviewOpen = false;
  });
}
app.whenReady().then(() => {
  logStartup();
  startBackend();
  createSplashWindow();
  createMainWindow().catch((err) => {
    console.error("[Electron] Failed to create main window:", err);
    logError("window_creation", "Failed to create main window", err);
    app.quit();
  });
  const webviewSession = session.fromPartition("persist:focus-webview");
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
    stopBackend();
    app.quit();
  }
});
app.on("before-quit", () => {
  stopBackend();
});
ipcMain.on("fullwindow-preview:state", (_event, isOpen) => {
  isFullWindowPreviewOpen = !!isOpen;
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
ipcMain.handle("desktop:open-file-path", async (_event, filePath) => {
  if (typeof filePath !== "string" || !filePath.trim()) {
    return;
  }
  const normalizedPath = filePath.trim();
  const openResult = await shell.openPath(normalizedPath);
  if (!openResult) {
    return;
  }
  console.warn("[Electron] Failed to open file path:", normalizedPath, openResult);
  if (process.platform === "win32") {
    try {
      const child = spawn("rundll32.exe", ["shell32.dll,OpenAs_RunDLL", normalizedPath], {
        detached: true,
        stdio: "ignore",
        windowsHide: true
      });
      child.on("error", (err) => {
        console.error("[Electron] Failed to open Open With dialog:", err);
      });
      child.unref();
    } catch (err) {
      console.error("[Electron] Failed to open Open With dialog:", err);
    }
  }
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
    const fs2 = await import("fs");
    const path2 = await import("path");
    if (!fs2.existsSync(filePath)) {
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
ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});
ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle("window:close", () => {
  mainWindow?.close();
});
ipcMain.handle("window:is-maximized", () => {
  return mainWindow?.isMaximized() ?? false;
});
