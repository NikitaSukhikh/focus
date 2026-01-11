type FileSelection = string | string[] | null;

export type RuntimePlatform = 'electron';

export const runtimePlatform: RuntimePlatform = 'electron';

/**
 * Opens a file picker in Electron.
 * Returns a single path, an array of paths, or null when cancelled.
 */
export async function openFilePicker(options: { multiple?: boolean; title?: string } = {}): Promise<FileSelection> {
  const api = (window as any).desktopAPI as DesktopAPI;
  const result = await api.openDialog({
    properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
    title: options.title,
  });
  if (result.canceled) return null;
  return options.multiple ? result.filePaths : result.filePaths[0] ?? null;
}

/**
 * Opens a URL in the external browser.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;
  const api = (window as any).desktopAPI as DesktopAPI;
  return api.openExternal(url);
}

/**
 * Opens a file with the OS default handler (or OS picker when no default exists).
 */
export async function openFilePath(filePath: string): Promise<void> {
  if (!filePath) return;
  const api = (window as any).desktopAPI as DesktopAPI;
  return api.openFilePath(filePath);
}

/**
 * Open an auth window for OAuth flows.
 */
export async function openAuthWindow(
  url: string,
  opts: { title?: string; width?: number; height?: number; partition?: string } = {}
): Promise<null> {
  if (!url) return null;
  const api = (window as any).desktopAPI as DesktopAPI;
  await api.openAuthWindow({
    url,
    title: opts.title,
    width: opts.width,
    height: opts.height,
    partition: opts.partition,
  });
  return null;
}
