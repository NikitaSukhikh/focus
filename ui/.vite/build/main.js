import { app as c, session as I, BrowserWindow as y, ipcMain as d, dialog as k, shell as O } from "electron";
import { spawn as L } from "child_process";
import * as w from "fs";
import v from "fs";
import * as S from "path";
import a, { dirname as A } from "path";
import { fileURLToPath as j } from "url";
class D {
  logFilePath;
  isInitialized = !1;
  constructor() {
    this.logFilePath = this.resolveLogFilePath(), this.initialize();
  }
  resolveLogFilePath() {
    const e = c.getPath("userData"), o = S.join(e, "logs");
    return w.existsSync(o) || w.mkdirSync(o, { recursive: !0 }), S.join(o, "focus-app.log");
  }
  initialize() {
    try {
      const e = w.existsSync(this.logFilePath);
      e || w.writeFileSync(this.logFilePath, "", "utf-8");
      const o = w.statSync(this.logFilePath);
      o.size > 10 * 1024 * 1024 && this.rotateLogFile(), e && o.size > 0 && w.appendFileSync(this.logFilePath, `
`, "utf-8"), this.isInitialized = !0, this.log("INFO", "logger_init", "Logger initialized", {
        logFilePath: this.logFilePath
      });
    } catch (e) {
      console.error("[Logger] Failed to initialize:", e);
    }
  }
  rotateLogFile() {
    try {
      const e = `${this.logFilePath}.old`;
      w.existsSync(e) && w.unlinkSync(e), w.renameSync(this.logFilePath, e), w.writeFileSync(this.logFilePath, "", "utf-8");
    } catch (e) {
      console.error("[Logger] Failed to rotate log file:", e);
    }
  }
  formatLogEntry(e) {
    const o = `[${e.timestamp}] [${e.level}] [${e.event}] ${e.message}`;
    if (e.data || e.error) {
      const n = {};
      return e.data && (n.data = e.data), e.error && (n.error = e.error), `${o} ${JSON.stringify(n)}`;
    }
    return o;
  }
  log(e, o, n, r, s) {
    if (!this.isInitialized) {
      console.warn("[Logger] Not initialized, skipping log");
      return;
    }
    const p = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: e,
      event: o,
      message: n,
      data: r,
      error: s ? { message: s.message, stack: s.stack } : void 0
    }, l = this.formatLogEntry(p) + `
`;
    try {
      w.appendFileSync(this.logFilePath, l, "utf-8"), (e === "ERROR" || e === "CRITICAL" ? console.error : e === "WARNING" ? console.warn : console.log)(`[Logger] ${l.trim()}`);
    } catch (g) {
      console.error("[Logger] Failed to write log:", g);
    }
  }
  logStartup(e) {
    this.log("INFO", "app_startup", "Application starting", {
      appVersion: c.getVersion(),
      electronVersion: process.versions.electron,
      platform: process.platform,
      arch: process.arch,
      isPackaged: c.isPackaged,
      ...e
    });
  }
  logInstallation(e, o) {
    this.log("INFO", "installation", `Installation ${e}`, o);
  }
  logBackendStart(e, o) {
    const n = e === "failed" ? "ERROR" : "INFO";
    this.log(n, "backend_start", `Backend start ${e}`, o);
  }
  logBackendError(e, o, n) {
    this.log("ERROR", "backend_error", e, n, o);
  }
  logWindowCreation(e, o) {
    const n = e === "failed" ? "ERROR" : "INFO";
    this.log(n, "window_creation", `Window creation ${e}`, o);
  }
  logDatabaseOperation(e, o, n) {
    const r = o === "success" ? "INFO" : "ERROR";
    this.log(r, "database_operation", `Database ${e} ${o}`, n);
  }
  logSpaceOperation(e, o, n) {
    const r = o === "success" ? "INFO" : "ERROR";
    this.log(r, "space_operation", `Space ${e} ${o}`, n);
  }
  logObjectOperation(e, o, n) {
    const r = o === "success" ? "INFO" : "ERROR";
    this.log(r, "object_operation", `Object ${e} ${o}`, n);
  }
  logError(e, o, n, r) {
    this.log("ERROR", e, o, r, n);
  }
  logWarning(e, o) {
    this.log("WARNING", "warning", e, o);
  }
  logInfo(e, o, n) {
    this.log("INFO", e, o, n);
  }
  logDebug(e, o, n) {
    this.log("DEBUG", e, o, n);
  }
  getLogPath() {
    return this.logFilePath;
  }
}
let F = null;
function m() {
  return F || (F = new D()), F;
}
function z(t) {
  m().logStartup(t);
}
function $(t, e) {
  m().logBackendStart(t, e);
}
function W(t, e, o) {
  m().logBackendError(t, e, o);
}
function P(t, e) {
  m().logWindowCreation(t, e);
}
function R(t, e, o, n) {
  m().logError(t, e, o, n);
}
function E(t, e, o) {
  m().logInfo(t, e, o);
}
const M = j(import.meta.url), f = A(M), T = process.platform === "darwin", q = {
  win32: "Focus.exe",
  darwin: "Focus",
  linux: "Focus",
  aix: "Focus",
  freebsd: "Focus",
  openbsd: "Focus",
  android: "Focus",
  sunos: "Focus"
};
let i = null, h = null, u = null, x = !1;
const H = () => {
  const t = [
    a.join(f, "../src/assets/focus.ico"),
    a.join(f, "../src/assets/focus.png"),
    a.resolve(process.cwd(), "src", "assets", "focus.ico"),
    a.resolve(process.cwd(), "src", "assets", "focus.png"),
    a.resolve(process.cwd(), "ui", "src", "assets", "focus.ico"),
    a.resolve(process.cwd(), "ui", "src", "assets", "focus.png")
  ], e = [
    a.join(process.resourcesPath, "focus.ico"),
    a.join(process.resourcesPath, "focus.icns"),
    a.join(process.resourcesPath, "focus.png")
  ], o = c.isPackaged ? e : t;
  for (const n of o)
    if (v.existsSync(n))
      return console.log("[Electron] Using icon:", n), n;
  console.warn("[Electron] No icon found, using default Electron icon");
}, G = () => {
  !i || i.isDestroyed() || i.webContents.send("fullwindow-preview:close-request");
}, V = () => q[process.platform] ?? "Focus", U = () => {
  const t = V();
  return c.isPackaged ? a.join(process.resourcesPath, "Focus", t) : a.resolve(f, "../resources", t);
}, K = () => {
  if (c.isPackaged)
    return a.join(process.resourcesPath, "Focus");
  const t = a.resolve(f, "../../backend");
  return v.existsSync(t) ? t : a.resolve(f, "../resources");
}, J = () => {
  if (!c.isPackaged) {
    console.log("[Electron] Dev mode detected - skipping backend launch (start backend manually)"), E("backend", "Dev mode detected - backend should be started manually");
    return;
  }
  const t = U(), e = K();
  if (console.log("[Electron] Backend path:", t), console.log("[Electron] Backend CWD:", e), console.log("[Electron] App isPackaged:", c.isPackaged), console.log("[Electron] process.resourcesPath:", process.resourcesPath), E("backend", "Starting backend", {
    backendPath: t,
    backendCwd: e,
    isPackaged: c.isPackaged
  }), !v.existsSync(t)) {
    console.error("[Electron] Backend binary not found at", t), W("Backend binary not found", void 0, { backendPath: t }), k.showErrorBox("Backend Error", `Backend executable not found at: ${t}`);
    return;
  }
  console.log("[Electron] Starting backend:", t), u = L(t, [], {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: e
  });
  let o = "", n = "";
  u.stdout?.on("data", (r) => {
    const s = r.toString();
    o += s, console.log("[Backend stdout]", s.trim()), E("backend_stdout", s.trim());
  }), u.stderr?.on("data", (r) => {
    const s = r.toString();
    n += s, /error|exception|traceback|failed/i.test(s) ? (console.error("[Backend stderr]", s.trim()), R("backend_stderr", s.trim())) : (console.log("[Backend stderr]", s.trim()), E("backend_stderr", s.trim()));
  }), u.on("exit", (r, s) => {
    if (console.log("[Electron] Backend exited", { code: r, signal: s }), !(s === "SIGTERM" || r === 0) && r !== 0) {
      console.error("[Electron] Backend failed. Full stdout:", o), console.error("[Electron] Backend failed. Full stderr:", n), $("failed", {
        exitCode: r,
        signal: s,
        stdout: o.slice(-500),
        // Last 500 chars
        stderr: n.slice(-500)
      });
      const l = n || o || "Unknown error";
      k.showErrorBox(
        "Backend Startup Failed",
        `Backend exited with code ${r}

Error:
${l.slice(-300)}`
      );
    } else
      $("success", { exitCode: r, signal: s });
    u = null;
  }), u.on("error", (r) => {
    console.error("[Electron] Backend process error", r), W("Backend process error", r), k.showErrorBox("Backend Error", `Failed to start backend: ${r.message}`);
  }), $("started", { backendPath: t });
}, N = () => {
  u && !u.killed && (console.log("[Electron] Stopping backend..."), u.kill()), u = null;
}, X = async () => {
  try {
    const t = I.fromPartition("persist:focus-webview"), e = t.getStoragePath(), o = await t.cookies.get({});
    console.log(
      "[Electron] Webview storage",
      JSON.stringify({
        partition: "persist:focus-webview",
        storagePath: e,
        cookieCount: o.length
      })
    );
  } catch (t) {
    console.warn("[Electron] Failed to inspect webview storage", t);
  }
}, Q = a.join(f, "preload.cjs");
function Y() {
  console.log("[Electron] Creating splash window..."), h = new y({
    width: 420,
    height: 260,
    frame: !1,
    transparent: !0,
    alwaysOnTop: !0,
    resizable: !1,
    show: !0
  });
  const t = a.join(f, "splash.html");
  h.loadFile(t), h.on("closed", () => {
    h = null;
  });
}
async function B() {
  console.log("[Electron] Creating main window..."), P("started"), i = new y({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: !1,
    // Hidden until ready
    title: "Focus",
    icon: H(),
    frame: !1,
    // Remove default title bar for custom implementation
    thickFrame: !1,
    // Disable thick frame to prevent resize tooltip
    autoHideMenuBar: !0,
    // Auto-hide menu bar (press Alt to show temporarily)
    webPreferences: {
      // Use the Vite/Webpack-provided preload entry point
      preload: Q,
      contextIsolation: !0,
      sandbox: !1,
      // Must be false to enable webview tag
      nodeIntegration: !1,
      webviewTag: !0
      // Enable <webview> tag support
    }
  }), console.log("[Electron] Window created, loading renderer...");
  {
    const e = a.join(f, "../renderer/main_window/index.html");
    console.log("[Electron] Loading production build:", e), await i.loadFile(e);
  }
  console.log("[Electron] Renderer loaded successfully"), i.setMenuBarVisibility(!1), i.webContents.on("before-input-event", (e, o) => {
    const r = o.key?.toLowerCase() === "f4" && o.alt;
    (o.type === "keyDown" || o.type === "rawKeyDown") && r && x && (e.preventDefault(), G());
  });
  const t = setTimeout(() => {
    console.log("[Electron] Timeout reached, forcing window show..."), i?.show(), h?.close();
  }, 1e4);
  i.webContents.once("did-finish-load", () => {
    console.log("[Electron] Main window ready, closing splash..."), clearTimeout(t), i?.show(), h?.close(), P("success");
  }), i.webContents.on("did-fail-load", (e, o, n) => {
    console.error("[Electron] Renderer failed to load:", o, n), P("failed", { errorCode: o, errorDescription: n }), k.showErrorBox("Failed to Load", `The app failed to load: ${n}`);
  }), i.on("closed", () => {
    i = null, x = !1;
  });
}
c.whenReady().then(() => {
  z(), J(), Y(), B().catch((e) => {
    console.error("[Electron] Failed to create main window:", e), R("window_creation", "Failed to create main window", e), c.quit();
  }), I.fromPartition("persist:focus-webview").webRequest.onHeadersReceived((e, o) => {
    const n = { ...e.responseHeaders };
    delete n["x-frame-options"], delete n["X-Frame-Options"], n["content-security-policy"] && (n["content-security-policy"] = n["content-security-policy"].map(
      (r) => r.replace(/frame-ancestors[^;]*(;|$)/g, "")
    )), o({ responseHeaders: n });
  }), X(), c.on("activate", () => {
    y.getAllWindows().length === 0 && B().catch((e) => {
      console.error("[Electron] Failed to recreate main window:", e), c.quit();
    });
  });
});
c.on("window-all-closed", () => {
  T || (N(), c.quit());
});
c.on("before-quit", () => {
  N();
});
d.on("fullwindow-preview:state", (t, e) => {
  x = !!e;
});
d.handle("desktop:open-dialog", async (t, e) => {
  const o = y.getFocusedWindow() || i;
  if (!o)
    throw new Error("No browser window available");
  return k.showOpenDialog(o, {
    properties: ["openFile", "multiSelections"],
    ...e
  });
});
d.handle("desktop:open-external", async (t, e) => {
  typeof e != "string" || !e.trim() || await O.openExternal(e);
});
d.handle("desktop:show-item-in-folder", async (t, e) => {
  typeof e != "string" || !e.trim() || O.showItemInFolder(e);
});
d.handle("desktop:arrange-windows-side-by-side", async (t) => {
  try {
    const { screen: e, BrowserWindow: o } = await import("electron"), { exec: n } = await import("child_process"), { promisify: r } = await import("util"), s = r(n), p = e.getPrimaryDisplay(), { width: l, height: g } = p.workAreaSize, b = Math.floor(l / 2);
    if (process.platform === "win32") {
      const C = `
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
            [Win32]::SetWindowPos($hwnd, 0, 0, 0, ${b}, ${g}, 0x0040)

            # Hide navigation pane for cleaner view
            try {
              $window.Document.Application.ShowNavigationPane = $$false
            } catch {}

            break
          }
        }
      `;
      try {
        await s(`powershell -Command "${C.replace(/"/g, '\\"')}"`), console.log("[Electron] Windows arranged side-by-side with navigation pane hidden");
      } catch (_) {
        console.warn("[Electron] Failed to configure File Explorer:", _);
      }
    }
    return !0;
  } catch (e) {
    return console.error("[Electron] Failed to arrange windows:", e), !1;
  }
});
d.handle("desktop:write-file-to-clipboard", async (t, e) => {
  if (typeof e != "string" || !e.trim())
    return !1;
  try {
    const { clipboard: o, nativeImage: n } = await import("electron"), r = await import("fs"), s = await import("path");
    if (!r.existsSync(e))
      return console.error("[Electron] File not found:", e), !1;
    const p = s.extname(e).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].includes(p)) {
      const l = n.createFromPath(e);
      return o.writeImage(l), console.log("[Electron] Image copied to clipboard:", e), !0;
    }
    try {
      const l = e.replace(/\//g, "\\");
      o.write({
        text: l,
        bookmark: e
      });
      const g = l + "\0\0", b = Buffer.from(g, "ucs2");
      return o.writeBuffer("FileNameW", b), console.log("[Electron] File copied to clipboard (multi-format):", e), !0;
    } catch (l) {
      console.warn("[Electron] Multi-format clipboard failed, trying FileNameW only:", l);
      const g = e + "\0\0", b = Buffer.from(g, "ucs2");
      return o.writeBuffer("FileNameW", b), !0;
    }
  } catch (o) {
    return console.error("[Electron] Failed to copy file to clipboard:", o), !1;
  }
});
d.handle("desktop:clear-clipboard", async () => {
  try {
    const { clipboard: t } = await import("electron");
    return t.clear(), console.log("[Electron] Clipboard cleared"), !0;
  } catch (t) {
    return console.error("[Electron] Failed to clear clipboard:", t), !1;
  }
});
d.handle("desktop:open-auth-window", async (t, e) => {
  const o = e?.url;
  if (!o) return;
  const n = e.width ?? 500, r = e.height ?? 600, s = e.title ?? "Authenticate", p = new y({
    width: n,
    height: r,
    title: s,
    resizable: !0,
    parent: i ?? void 0,
    modal: !1,
    show: !0,
    webPreferences: {
      contextIsolation: !0,
      sandbox: !0,
      nodeIntegration: !1
    }
  });
  p.setMenuBarVisibility(!1), await p.loadURL(o);
});
d.handle("desktop:close-file-explorer", async () => {
  try {
    if (process.platform === "win32") {
      const { exec: t } = await import("child_process"), { promisify: e } = await import("util"), r = await e(t)(`powershell -ExecutionPolicy Bypass -Command "${`
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
      `.replace(/"/g, '\\"')}"`);
      return console.log("[Electron] External windows closed", r.stdout, r.stderr), !0;
    }
    return !1;
  } catch (t) {
    return console.error("[Electron] Failed to close external windows:", t), !1;
  }
});
d.handle("window:minimize", () => {
  i?.minimize();
});
d.handle("window:maximize", () => {
  i?.isMaximized() ? i?.unmaximize() : i?.maximize();
});
d.handle("window:close", () => {
  i?.close();
});
d.handle("window:is-maximized", () => i?.isMaximized() ?? !1);
