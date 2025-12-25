import { contextBridge, ipcRenderer } from 'electron';
import type { OpenDialogOptions } from 'electron';

contextBridge.exposeInMainWorld('desktopAPI', {
  platform: 'electron' as const,
  openDialog: (options: OpenDialogOptions) =>
    ipcRenderer.invoke('desktop:open-dialog', options),
  openExternal: (url: string) =>
    ipcRenderer.invoke('desktop:open-external', url),
  openAuthWindow: (payload: { url: string; title?: string; width?: number; height?: number }) =>
    ipcRenderer.invoke('desktop:open-auth-window', payload),
  // TODO: Add preview/webview helpers once renderer-side API is defined.
});
