import { app as a, session as x, BrowserWindow as g, ipcMain as i, dialog as b, shell as $ } from "electron";
import { spawn as P } from "child_process";
import E from "fs";
import s, { dirname as S } from "path";
import { fileURLToPath as B } from "url";
const C = B(import.meta.url), w = S(C), I = process.platform === "darwin", N = {
  win32: "Focus.exe",
  darwin: "Focus",
  linux: "Focus",
  aix: "Focus",
  freebsd: "Focus",
  openbsd: "Focus",
  android: "Focus",
  sunos: "Focus"
};
let r = null, m = null, l = null, y = !1;
const A = () => {
  const o = [
    s.join(w, "../src/assets/focus.ico"),
    s.join(w, "../src/assets/focus.png"),
    s.resolve(process.cwd(), "src", "assets", "focus.ico"),
    s.resolve(process.cwd(), "src", "assets", "focus.png"),
    s.resolve(process.cwd(), "ui", "src", "assets", "focus.ico"),
    s.resolve(process.cwd(), "ui", "src", "assets", "focus.png")
  ], e = [
    s.join(process.resourcesPath, "focus.ico"),
    s.join(process.resourcesPath, "focus.icns"),
    s.join(process.resourcesPath, "focus.png")
  ], n = a.isPackaged ? e : o;
  for (const t of n)
    if (E.existsSync(t))
      return console.log("[Electron] Using icon:", t), t;
  console.warn("[Electron] No icon found, using default Electron icon");
}, _ = () => {
  !r || r.isDestroyed() || r.webContents.send("fullwindow-preview:close-request");
}, j = () => N[process.platform] ?? "Focus", M = () => {
  const o = j();
  return a.isPackaged ? s.join(process.resourcesPath, o) : s.resolve(w, "../resources", o);
}, D = () => {
  if (a.isPackaged)
    return process.resourcesPath;
  const o = s.resolve(w, "../../backend");
  return E.existsSync(o) ? o : s.resolve(w, "../resources");
}, O = () => {
  const o = M(), e = D();
  if (console.log("[Electron] Backend path:", o), console.log("[Electron] Backend CWD:", e), console.log("[Electron] App isPackaged:", a.isPackaged), console.log("[Electron] process.resourcesPath:", process.resourcesPath), !E.existsSync(o)) {
    console.error("[Electron] Backend binary not found at", o), b.showErrorBox("Backend Error", `Backend executable not found at: ${o}`);
    return;
  }
  console.log("[Electron] Starting backend:", o), l = P(o, [], {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: e
  }), l.stdout?.on("data", (n) => {
    console.log("[Backend]", n.toString().trim());
  }), l.stderr?.on("data", (n) => {
    console.error("[Backend]", n.toString().trim());
  }), l.on("exit", (n, t) => {
    console.log("[Electron] Backend exited", { code: n, signal: t }), l = null;
  }), l.on("error", (n) => {
    console.error("[Electron] Backend process error", n), b.showErrorBox("Backend Error", `Failed to start backend: ${n.message}`);
  });
}, v = () => {
  l && !l.killed && (console.log("[Electron] Stopping backend..."), l.kill()), l = null;
}, T = async () => {
  try {
    const o = x.fromPartition("persist:focus-webview"), e = o.getStoragePath(), n = await o.cookies.get({});
    console.log(
      "[Electron] Webview storage",
      JSON.stringify({
        partition: "persist:focus-webview",
        storagePath: e,
        cookieCount: n.length
      })
    );
  } catch (o) {
    console.warn("[Electron] Failed to inspect webview storage", o);
  }
}, z = s.join(w, "preload.cjs");
function q() {
  console.log("[Electron] Creating splash window..."), m = new g({
    width: 420,
    height: 260,
    frame: !1,
    transparent: !0,
    alwaysOnTop: !0,
    resizable: !1,
    show: !0
  });
  const o = s.join(w, "splash.html");
  m.loadFile(o), m.on("closed", () => {
    m = null;
  });
}
async function k() {
  console.log("[Electron] Creating main window..."), r = new g({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: !1,
    // Hidden until ready
    title: "Focus",
    icon: A(),
    frame: !1,
    // Remove default title bar for custom implementation
    thickFrame: !1,
    // Disable thick frame to prevent resize tooltip
    autoHideMenuBar: !0,
    // Auto-hide menu bar (press Alt to show temporarily)
    webPreferences: {
      // Use the Vite/Webpack-provided preload entry point
      preload: z,
      contextIsolation: !0,
      sandbox: !1,
      // Must be false to enable webview tag
      nodeIntegration: !1,
      webviewTag: !0
      // Enable <webview> tag support
    }
  }), console.log("[Electron] Window created, loading renderer...");
  {
    const e = s.join(w, "../renderer/main_window/index.html");
    console.log("[Electron] Loading production build:", e), await r.loadFile(e);
  }
  console.log("[Electron] Renderer loaded successfully"), r.setMenuBarVisibility(!1), r.webContents.on("before-input-event", (e, n) => {
    const c = n.key?.toLowerCase() === "f4" && n.alt;
    (n.type === "keyDown" || n.type === "rawKeyDown") && c && y && (e.preventDefault(), _());
  });
  const o = setTimeout(() => {
    console.log("[Electron] Timeout reached, forcing window show..."), r?.show(), m?.close();
  }, 1e4);
  r.webContents.once("did-finish-load", () => {
    console.log("[Electron] Main window ready, closing splash..."), clearTimeout(o), r?.show(), m?.close();
  }), r.webContents.on("did-fail-load", (e, n, t) => {
    console.error("[Electron] Renderer failed to load:", n, t), b.showErrorBox("Failed to Load", `The app failed to load: ${t}`);
  }), r.on("closed", () => {
    r = null, y = !1;
  });
}
a.whenReady().then(() => {
  O(), q(), k().catch((e) => {
    console.error("[Electron] Failed to create main window:", e), a.quit();
  }), x.fromPartition("persist:focus-webview").webRequest.onHeadersReceived((e, n) => {
    const t = { ...e.responseHeaders };
    delete t["x-frame-options"], delete t["X-Frame-Options"], t["content-security-policy"] && (t["content-security-policy"] = t["content-security-policy"].map(
      (c) => c.replace(/frame-ancestors[^;]*(;|$)/g, "")
    )), n({ responseHeaders: t });
  }), T(), a.on("activate", () => {
    g.getAllWindows().length === 0 && k().catch((e) => {
      console.error("[Electron] Failed to recreate main window:", e), a.quit();
    });
  });
});
a.on("window-all-closed", () => {
  I || (v(), a.quit());
});
a.on("before-quit", () => {
  v();
});
i.on("fullwindow-preview:state", (o, e) => {
  y = !!e;
});
i.handle("desktop:open-dialog", async (o, e) => {
  const n = g.getFocusedWindow() || r;
  if (!n)
    throw new Error("No browser window available");
  return b.showOpenDialog(n, {
    properties: ["openFile", "multiSelections"],
    ...e
  });
});
i.handle("desktop:open-external", async (o, e) => {
  typeof e != "string" || !e.trim() || await $.openExternal(e);
});
i.handle("desktop:show-item-in-folder", async (o, e) => {
  typeof e != "string" || !e.trim() || $.showItemInFolder(e);
});
i.handle("desktop:arrange-windows-side-by-side", async (o) => {
  try {
    const { screen: e, BrowserWindow: n } = await import("electron"), { exec: t } = await import("child_process"), { promisify: c } = await import("util"), p = c(t), u = e.getPrimaryDisplay(), { width: d, height: f } = u.workAreaSize, h = Math.floor(d / 2);
    if (process.platform === "win32") {
      const W = `
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
            [Win32]::SetWindowPos($hwnd, 0, 0, 0, ${h}, ${f}, 0x0040)

            # Hide navigation pane for cleaner view
            try {
              $window.Document.Application.ShowNavigationPane = $$false
            } catch {}

            break
          }
        }
      `;
      try {
        await p(`powershell -Command "${W.replace(/"/g, '\\"')}"`), console.log("[Electron] Windows arranged side-by-side with navigation pane hidden");
      } catch (F) {
        console.warn("[Electron] Failed to configure File Explorer:", F);
      }
    }
    return !0;
  } catch (e) {
    return console.error("[Electron] Failed to arrange windows:", e), !1;
  }
});
i.handle("desktop:write-file-to-clipboard", async (o, e) => {
  if (typeof e != "string" || !e.trim())
    return !1;
  try {
    const { clipboard: n, nativeImage: t } = await import("electron"), c = await import("fs"), p = await import("path");
    if (!c.existsSync(e))
      return console.error("[Electron] File not found:", e), !1;
    const u = p.extname(e).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].includes(u)) {
      const d = t.createFromPath(e);
      return n.writeImage(d), console.log("[Electron] Image copied to clipboard:", e), !0;
    }
    try {
      const d = e.replace(/\//g, "\\");
      n.write({
        text: d,
        bookmark: e
      });
      const f = d + "\0\0", h = Buffer.from(f, "ucs2");
      return n.writeBuffer("FileNameW", h), console.log("[Electron] File copied to clipboard (multi-format):", e), !0;
    } catch (d) {
      console.warn("[Electron] Multi-format clipboard failed, trying FileNameW only:", d);
      const f = e + "\0\0", h = Buffer.from(f, "ucs2");
      return n.writeBuffer("FileNameW", h), !0;
    }
  } catch (n) {
    return console.error("[Electron] Failed to copy file to clipboard:", n), !1;
  }
});
i.handle("desktop:clear-clipboard", async () => {
  try {
    const { clipboard: o } = await import("electron");
    return o.clear(), console.log("[Electron] Clipboard cleared"), !0;
  } catch (o) {
    return console.error("[Electron] Failed to clear clipboard:", o), !1;
  }
});
i.handle("desktop:open-auth-window", async (o, e) => {
  const n = e?.url;
  if (!n) return;
  const t = e.width ?? 500, c = e.height ?? 600, p = e.title ?? "Authenticate", u = new g({
    width: t,
    height: c,
    title: p,
    resizable: !0,
    parent: r ?? void 0,
    modal: !1,
    show: !0,
    webPreferences: {
      contextIsolation: !0,
      sandbox: !0,
      nodeIntegration: !1
    }
  });
  u.setMenuBarVisibility(!1), await u.loadURL(n);
});
i.handle("desktop:close-file-explorer", async () => {
  try {
    if (process.platform === "win32") {
      const { exec: o } = await import("child_process"), { promisify: e } = await import("util"), c = await e(o)(`powershell -ExecutionPolicy Bypass -Command "${`
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
      return console.log("[Electron] External windows closed", c.stdout, c.stderr), !0;
    }
    return !1;
  } catch (o) {
    return console.error("[Electron] Failed to close external windows:", o), !1;
  }
});
i.handle("window:minimize", () => {
  r?.minimize();
});
i.handle("window:maximize", () => {
  r?.isMaximized() ? r?.unmaximize() : r?.maximize();
});
i.handle("window:close", () => {
  r?.close();
});
i.handle("window:is-maximized", () => r?.isMaximized() ?? !1);
