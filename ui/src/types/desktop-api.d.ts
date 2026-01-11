/* eslint-disable no-unused-vars */
export {};

declare global {
  interface DesktopAPI {
    platform: 'electron';
    openDialog: (_options: import('electron').OpenDialogOptions) => Promise<import('electron').OpenDialogReturnValue>;
    openExternal: (_url: string) => Promise<void>;
    openFilePath: (_filePath: string) => Promise<void>;
    openAuthWindow: (_payload: { url: string; title?: string; width?: number; height?: number; partition?: string }) => Promise<void>;
    showItemInFolder: (_filePath: string) => Promise<void>;
    arrangeWindowsSideBySide: () => Promise<boolean>;
    writeFileToClipboard: (_filePath: string) => Promise<boolean>;
    clearClipboard: () => Promise<boolean>;
    closeFileExplorer: () => Promise<boolean>;
    // Full window preview coordination
    setFullWindowPreviewState: (_isOpen: boolean) => void;
    onCloseFullWindowPreviewRequest: (_handler: () => void) => (() => void) | void;
    // Window controls
    minimizeWindow: () => Promise<void>;
    maximizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
    isWindowMaximized: () => Promise<boolean>;
    // TODO: Add preview-specific APIs when renderer contract is finalized.
  }

  interface Window {
    desktopAPI?: DesktopAPI;
  }
}
