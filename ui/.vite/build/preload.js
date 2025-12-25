import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("desktopAPI", {
  platform: "electron",
  openDialog: (options) => ipcRenderer.invoke("desktop:open-dialog", options),
  openExternal: (url) => ipcRenderer.invoke("desktop:open-external", url),
  openAuthWindow: (payload) => ipcRenderer.invoke("desktop:open-auth-window", payload)
  // TODO: Add preview/webview helpers once renderer-side API is defined.
});
