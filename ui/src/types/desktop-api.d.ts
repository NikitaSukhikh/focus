/* eslint-disable no-unused-vars */
export {};

declare global {
  interface DesktopAPI {
    platform: 'electron';
    openDialog: (_options: import('electron').OpenDialogOptions) => Promise<import('electron').OpenDialogReturnValue>;
    openExternal: (_url: string) => Promise<void>;
    openAuthWindow: (_payload: { url: string; title?: string; width?: number; height?: number }) => Promise<void>;
    // TODO: Add preview-specific APIs when renderer contract is finalized.
  }

  interface Window {
    desktopAPI?: DesktopAPI;
  }
}
