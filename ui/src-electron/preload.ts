import { contextBridge, ipcRenderer } from 'electron';
import type { OpenDialogOptions } from 'electron';

contextBridge.exposeInMainWorld('desktopAPI', {
  platform: 'electron' as const,
  openDialog: (options: OpenDialogOptions) =>
    ipcRenderer.invoke('desktop:open-dialog', options),
  openExternal: (url: string) =>
    ipcRenderer.invoke('desktop:open-external', url),
  showItemInFolder: (filePath: string) =>
    ipcRenderer.invoke('desktop:show-item-in-folder', filePath),
  arrangeWindowsSideBySide: () =>
    ipcRenderer.invoke('desktop:arrange-windows-side-by-side'),
  writeFileToClipboard: (filePath: string) =>
    ipcRenderer.invoke('desktop:write-file-to-clipboard', filePath),
  clearClipboard: () =>
    ipcRenderer.invoke('desktop:clear-clipboard'),
  openAuthWindow: (payload: { url: string; title?: string; width?: number; height?: number }) =>
    ipcRenderer.invoke('desktop:open-auth-window', payload),
  closeFileExplorer: () =>
    ipcRenderer.invoke('desktop:close-file-explorer'),
  // TODO: Add preview/webview helpers once renderer-side API is defined.
});
