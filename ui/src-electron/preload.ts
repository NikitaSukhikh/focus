import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { OpenDialogOptions } from 'electron';

contextBridge.exposeInMainWorld('desktopAPI', {
  platform: 'electron' as const,
  openDialog: (options: OpenDialogOptions) =>
    ipcRenderer.invoke('desktop:open-dialog', options),
  openExternal: (url: string) =>
    ipcRenderer.invoke('desktop:open-external', url),
  openFilePath: (filePath: string) =>
    ipcRenderer.invoke('desktop:open-file-path', filePath),
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
  // File path utilities
  getPathForFile: (file: File) =>
    webUtils.getPathForFile(file),
  // Full window preview coordination
  setFullWindowPreviewState: (isOpen: boolean) =>
    ipcRenderer.send('fullwindow-preview:state', isOpen),
  onCloseFullWindowPreviewRequest: (callback: () => void) => {
    const channel = 'fullwindow-preview:close-request';
    const listener = () => callback();
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  // Main-process metadata write queue (durable across fast window close)
  queueMetadataWrite: (objectId: string, metadata: Record<string, unknown>) =>
    ipcRenderer.invoke('metadata:write', { objectId, metadata }),
  queueObjectPatch: (objectId: string, patch: Record<string, unknown>) =>
    ipcRenderer.invoke('object:patch', { objectId, patch }),
  flushMetadataWrites: (timeoutMs?: number) =>
    ipcRenderer.invoke('metadata:flush', { timeoutMs }),
  getInitialLanguage: (): Promise<string | null> =>
    ipcRenderer.invoke('app:get-initial-language'),
  // Window controls
  minimizeWindow: () =>
    ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () =>
    ipcRenderer.invoke('window:maximize'),
  closeWindow: () =>
    ipcRenderer.invoke('window:close'),
  isWindowMaximized: () =>
    ipcRenderer.invoke('window:is-maximized'),
  // TODO: Add preview/webview helpers once renderer-side API is defined.
});
