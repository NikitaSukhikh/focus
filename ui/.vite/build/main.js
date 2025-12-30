import { app as l, session as h, BrowserWindow as f, ipcMain as a, dialog as W, shell as b } from "electron";
import E from "fs";
import r, { dirname as v } from "path";
import { fileURLToPath as x } from "url";
const F = x(import.meta.url), m = v(F), I = process.platform === "darwin";
let i = null;
const P = () => {
  const o = [
    r.join(m, "../src/assets/focus.ico"),
    r.join(m, "../src/assets/focus.png"),
    r.resolve(process.cwd(), "src", "assets", "focus.ico"),
    r.resolve(process.cwd(), "src", "assets", "focus.png"),
    r.resolve(process.cwd(), "ui", "src", "assets", "focus.ico"),
    r.resolve(process.cwd(), "ui", "src", "assets", "focus.png")
  ], e = [
    r.join(process.resourcesPath, "focus.ico"),
    r.join(process.resourcesPath, "focus.icns"),
    r.join(process.resourcesPath, "focus.png")
  ], t = l.isPackaged ? e : o;
  for (const n of t)
    if (E.existsSync(n))
      return console.log("[Electron] Using icon:", n), n;
  console.warn("[Electron] No icon found, using default Electron icon");
}, S = async () => {
  try {
    const o = h.fromPartition("persist:focus-webview"), e = o.getStoragePath(), t = await o.cookies.get({});
    console.log(
      "[Electron] Webview storage",
      JSON.stringify({
        partition: "persist:focus-webview",
        storagePath: e,
        cookieCount: t.length
      })
    );
  } catch (o) {
    console.warn("[Electron] Failed to inspect webview storage", o);
  }
}, k = r.join(m, "preload.cjs");
async function g() {
  console.log("[Electron] Creating main window..."), i = new f({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: !0,
    // Show immediately instead of waiting
    title: "Focus",
    icon: P(),
    autoHideMenuBar: !0,
    // Auto-hide menu bar (press Alt to show temporarily)
    webPreferences: {
      // Use the Vite/Webpack-provided preload entry point
      preload: k,
      contextIsolation: !0,
      sandbox: !1,
      // Must be false to enable webview tag
      nodeIntegration: !1,
      webviewTag: !0
      // Enable <webview> tag support
    }
  }), console.log("[Electron] Window created, loading renderer...");
  {
    const o = r.join(m, "../renderer/main_window/index.html");
    console.log("[Electron] Loading production build:", o), await i.loadFile(o);
  }
  console.log("[Electron] Renderer loaded successfully"), i.setMenuBarVisibility(!1), i.on("ready-to-show", () => {
    console.log("[Electron] Window ready to show"), i?.show();
  }), i.on("closed", () => {
    i = null;
  });
}
l.whenReady().then(() => {
  g().catch((e) => {
    console.error("[Electron] Failed to create main window:", e), l.quit();
  }), h.fromPartition("persist:focus-webview").webRequest.onHeadersReceived((e, t) => {
    const n = { ...e.responseHeaders };
    delete n["x-frame-options"], delete n["X-Frame-Options"], n["content-security-policy"] && (n["content-security-policy"] = n["content-security-policy"].map(
      (s) => s.replace(/frame-ancestors[^;]*(;|$)/g, "")
    )), t({ responseHeaders: n });
  }), S(), l.on("activate", () => {
    f.getAllWindows().length === 0 && g().catch((e) => {
      console.error("[Electron] Failed to recreate main window:", e), l.quit();
    });
  });
});
l.on("window-all-closed", () => {
  I || l.quit();
});
a.handle("desktop:open-dialog", async (o, e) => {
  const t = f.getFocusedWindow() || i;
  if (!t)
    throw new Error("No browser window available");
  return W.showOpenDialog(t, {
    properties: ["openFile", "multiSelections"],
    ...e
  });
});
a.handle("desktop:open-external", async (o, e) => {
  typeof e != "string" || !e.trim() || await b.openExternal(e);
});
a.handle("desktop:show-item-in-folder", async (o, e) => {
  typeof e != "string" || !e.trim() || b.showItemInFolder(e);
});
a.handle("desktop:arrange-windows-side-by-side", async (o) => {
  try {
    const { screen: e, BrowserWindow: t } = await import("electron"), { exec: n } = await import("child_process"), { promisify: s } = await import("util"), w = s(n), d = e.getPrimaryDisplay(), { width: c, height: p } = d.workAreaSize, u = Math.floor(c / 2);
    if (process.platform === "win32") {
      const y = `
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
            [Win32]::SetWindowPos($hwnd, 0, 0, 0, ${u}, ${p}, 0x0040)

            # Hide navigation pane for cleaner view
            try {
              $window.Document.Application.ShowNavigationPane = $$false
            } catch {}

            break
          }
        }
      `;
      try {
        await w(`powershell -Command "${y.replace(/"/g, '\\"')}"`), console.log("[Electron] Windows arranged side-by-side with navigation pane hidden");
      } catch ($) {
        console.warn("[Electron] Failed to configure File Explorer:", $);
      }
    }
    return !0;
  } catch (e) {
    return console.error("[Electron] Failed to arrange windows:", e), !1;
  }
});
a.handle("desktop:write-file-to-clipboard", async (o, e) => {
  if (typeof e != "string" || !e.trim())
    return !1;
  try {
    const { clipboard: t, nativeImage: n } = await import("electron"), s = await import("fs"), w = await import("path");
    if (!s.existsSync(e))
      return console.error("[Electron] File not found:", e), !1;
    const d = w.extname(e).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].includes(d)) {
      const c = n.createFromPath(e);
      return t.writeImage(c), console.log("[Electron] Image copied to clipboard:", e), !0;
    }
    try {
      const c = e.replace(/\//g, "\\");
      t.write({
        text: c,
        bookmark: e
      });
      const p = c + "\0\0", u = Buffer.from(p, "ucs2");
      return t.writeBuffer("FileNameW", u), console.log("[Electron] File copied to clipboard (multi-format):", e), !0;
    } catch (c) {
      console.warn("[Electron] Multi-format clipboard failed, trying FileNameW only:", c);
      const p = e + "\0\0", u = Buffer.from(p, "ucs2");
      return t.writeBuffer("FileNameW", u), !0;
    }
  } catch (t) {
    return console.error("[Electron] Failed to copy file to clipboard:", t), !1;
  }
});
a.handle("desktop:clear-clipboard", async () => {
  try {
    const { clipboard: o } = await import("electron");
    return o.clear(), console.log("[Electron] Clipboard cleared"), !0;
  } catch (o) {
    return console.error("[Electron] Failed to clear clipboard:", o), !1;
  }
});
a.handle("desktop:open-auth-window", async (o, e) => {
  const t = e?.url;
  if (!t) return;
  const n = e.width ?? 500, s = e.height ?? 600, w = e.title ?? "Authenticate", d = new f({
    width: n,
    height: s,
    title: w,
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
  d.setMenuBarVisibility(!1), await d.loadURL(t);
});
a.handle("desktop:close-file-explorer", async () => {
  try {
    if (process.platform === "win32") {
      const { exec: o } = await import("child_process"), { promisify: e } = await import("util"), s = await e(o)(`powershell -ExecutionPolicy Bypass -Command "${`
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
      return console.log("[Electron] External windows closed", s.stdout, s.stderr), !0;
    }
    return !1;
  } catch (o) {
    return console.error("[Electron] Failed to close external windows:", o), !1;
  }
});
