import { app as c, session as h, BrowserWindow as m, ipcMain as a, dialog as W, shell as g } from "electron";
import f, { dirname as E } from "path";
import { fileURLToPath as x } from "url";
const v = x(import.meta.url), b = E(v), F = process.platform === "darwin";
let i = null;
const I = async () => {
  try {
    const o = h.fromPartition("persist:ocean-webview"), e = o.getStoragePath(), t = await o.cookies.get({});
    console.log(
      "[Electron] Webview storage",
      JSON.stringify({
        partition: "persist:ocean-webview",
        storagePath: e,
        cookieCount: t.length
      })
    );
  } catch (o) {
    console.warn("[Electron] Failed to inspect webview storage", o);
  }
}, S = f.join(b, "preload.cjs");
async function u() {
  console.log("[Electron] Creating main window..."), i = new m({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: !0,
    // Show immediately instead of waiting
    title: "Ocean",
    autoHideMenuBar: !0,
    // Auto-hide menu bar (press Alt to show temporarily)
    webPreferences: {
      // Use the Vite/Webpack-provided preload entry point
      preload: S,
      contextIsolation: !0,
      sandbox: !1,
      // Must be false to enable webview tag
      nodeIntegration: !1,
      webviewTag: !0
      // Enable <webview> tag support
    }
  }), console.log("[Electron] Window created, loading renderer...");
  {
    const o = f.join(b, "../renderer/main_window/index.html");
    console.log("[Electron] Loading production build:", o), await i.loadFile(o);
  }
  console.log("[Electron] Renderer loaded successfully"), i.setMenuBarVisibility(!1), i.on("ready-to-show", () => {
    console.log("[Electron] Window ready to show"), i?.show();
  }), i.on("closed", () => {
    i = null;
  });
}
c.whenReady().then(() => {
  u().catch((e) => {
    console.error("[Electron] Failed to create main window:", e), c.quit();
  }), h.fromPartition("persist:ocean-webview").webRequest.onHeadersReceived((e, t) => {
    const n = { ...e.responseHeaders };
    delete n["x-frame-options"], delete n["X-Frame-Options"], n["content-security-policy"] && (n["content-security-policy"] = n["content-security-policy"].map(
      (r) => r.replace(/frame-ancestors[^;]*(;|$)/g, "")
    )), t({ responseHeaders: n });
  }), I(), c.on("activate", () => {
    m.getAllWindows().length === 0 && u().catch((e) => {
      console.error("[Electron] Failed to recreate main window:", e), c.quit();
    });
  });
});
c.on("window-all-closed", () => {
  F || c.quit();
});
a.handle("desktop:open-dialog", async (o, e) => {
  const t = m.getFocusedWindow() || i;
  if (!t)
    throw new Error("No browser window available");
  return W.showOpenDialog(t, {
    properties: ["openFile", "multiSelections"],
    ...e
  });
});
a.handle("desktop:open-external", async (o, e) => {
  typeof e != "string" || !e.trim() || await g.openExternal(e);
});
a.handle("desktop:show-item-in-folder", async (o, e) => {
  typeof e != "string" || !e.trim() || g.showItemInFolder(e);
});
a.handle("desktop:arrange-windows-side-by-side", async (o) => {
  try {
    const { screen: e, BrowserWindow: t } = await import("electron"), { exec: n } = await import("child_process"), { promisify: r } = await import("util"), d = r(n), l = e.getPrimaryDisplay(), { width: s, height: w } = l.workAreaSize, p = Math.floor(s / 2);
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
            [Win32]::SetWindowPos($hwnd, 0, 0, 0, ${p}, ${w}, 0x0040)

            # Hide navigation pane for cleaner view
            try {
              $window.Document.Application.ShowNavigationPane = $$false
            } catch {}

            break
          }
        }
      `;
      try {
        await d(`powershell -Command "${y.replace(/"/g, '\\"')}"`), console.log("[Electron] Windows arranged side-by-side with navigation pane hidden");
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
    const { clipboard: t, nativeImage: n } = await import("electron"), r = await import("fs"), d = await import("path");
    if (!r.existsSync(e))
      return console.error("[Electron] File not found:", e), !1;
    const l = d.extname(e).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].includes(l)) {
      const s = n.createFromPath(e);
      return t.writeImage(s), console.log("[Electron] Image copied to clipboard:", e), !0;
    }
    try {
      const s = e.replace(/\//g, "\\");
      t.write({
        text: s,
        bookmark: e
      });
      const w = s + "\0\0", p = Buffer.from(w, "ucs2");
      return t.writeBuffer("FileNameW", p), console.log("[Electron] File copied to clipboard (multi-format):", e), !0;
    } catch (s) {
      console.warn("[Electron] Multi-format clipboard failed, trying FileNameW only:", s);
      const w = e + "\0\0", p = Buffer.from(w, "ucs2");
      return t.writeBuffer("FileNameW", p), !0;
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
  const n = e.width ?? 500, r = e.height ?? 600, d = e.title ?? "Authenticate", l = new m({
    width: n,
    height: r,
    title: d,
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
  l.setMenuBarVisibility(!1), await l.loadURL(t);
});
a.handle("desktop:close-file-explorer", async () => {
  try {
    if (process.platform === "win32") {
      const { exec: o } = await import("child_process"), { promisify: e } = await import("util"), r = await e(o)(`powershell -ExecutionPolicy Bypass -Command "${`
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
  } catch (o) {
    return console.error("[Electron] Failed to close external windows:", o), !1;
  }
});
