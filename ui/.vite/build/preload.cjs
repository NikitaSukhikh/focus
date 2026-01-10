"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("desktopAPI", {
  platform: "electron",
  openDialog: (options) => electron.ipcRenderer.invoke("desktop:open-dialog", options),
  openExternal: (url) => electron.ipcRenderer.invoke("desktop:open-external", url),
  openFilePath: (filePath) => electron.ipcRenderer.invoke("desktop:open-file-path", filePath),
  showItemInFolder: (filePath) => electron.ipcRenderer.invoke("desktop:show-item-in-folder", filePath),
  arrangeWindowsSideBySide: () => electron.ipcRenderer.invoke("desktop:arrange-windows-side-by-side"),
  writeFileToClipboard: (filePath) => electron.ipcRenderer.invoke("desktop:write-file-to-clipboard", filePath),
  clearClipboard: () => electron.ipcRenderer.invoke("desktop:clear-clipboard"),
  openAuthWindow: (payload) => electron.ipcRenderer.invoke("desktop:open-auth-window", payload),
  closeFileExplorer: () => electron.ipcRenderer.invoke("desktop:close-file-explorer"),
  // File path utilities
  getPathForFile: (file) => electron.webUtils.getPathForFile(file),
  // Full window preview coordination
  setFullWindowPreviewState: (isOpen) => electron.ipcRenderer.send("fullwindow-preview:state", isOpen),
  onCloseFullWindowPreviewRequest: (callback) => {
    const channel = "fullwindow-preview:close-request";
    const listener = () => callback();
    electron.ipcRenderer.on(channel, listener);
    return () => electron.ipcRenderer.removeListener(channel, listener);
  },
  // Window controls
  minimizeWindow: () => electron.ipcRenderer.invoke("window:minimize"),
  maximizeWindow: () => electron.ipcRenderer.invoke("window:maximize"),
  closeWindow: () => electron.ipcRenderer.invoke("window:close"),
  isWindowMaximized: () => electron.ipcRenderer.invoke("window:is-maximized")
  // TODO: Add preview/webview helpers once renderer-side API is defined.
});
