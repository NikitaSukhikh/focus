/**
 * File type detection and utilities
 */

export type FileCategory = 'image' | 'pdf' | 'document' | 'text' | 'unknown';

export interface FileTypeInfo {
  category: FileCategory;
  extension: string;
  mimeType?: string;
}

// Image file extensions
const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'webp',
  'svg',
  'tiff',
  'tif',
  'ico',
  'heic',
  'heif',
]);

// PDF file extensions
const PDF_EXTENSIONS = new Set(['pdf']);

// Document file extensions (Word, Excel, PowerPoint, etc.)
const DOCUMENT_EXTENSIONS = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'rtf',
]);

// Text file extensions
const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'xml',
  'html',
  'htm',
  'css',
  'js',
  'ts',
  'tsx',
  'jsx',
  'py',
  'java',
  'c',
  'cpp',
  'h',
  'cs',
  'go',
  'rs',
  'php',
  'rb',
  'swift',
  'kt',
  'yaml',
  'yml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'sh',
  'bash',
  'log',
]);

/**
 * Get the file extension from a file path or name
 */
export function getFileExtension(filePath: string): string {
  const fileName = filePath.split(/[\\/]/).pop() || '';
  const parts = fileName.split('.');
  if (parts.length < 2) return '';
  return parts.pop()?.toLowerCase() || '';
}

/**
 * Detect the file category based on file path
 */
export function detectFileType(filePath: string): FileTypeInfo {
  const extension = getFileExtension(filePath);

  if (IMAGE_EXTENSIONS.has(extension)) {
    return {
      category: 'image',
      extension,
      mimeType: `image/${extension === 'svg' ? 'svg+xml' : extension === 'jpg' ? 'jpeg' : extension}`,
    };
  }

  if (PDF_EXTENSIONS.has(extension)) {
    return {
      category: 'pdf',
      extension,
      mimeType: 'application/pdf',
    };
  }

  if (DOCUMENT_EXTENSIONS.has(extension)) {
    return {
      category: 'document',
      extension,
      mimeType: getDocumentMimeType(extension),
    };
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    return {
      category: 'text',
      extension,
      mimeType: 'text/plain',
    };
  }

  return {
    category: 'unknown',
    extension,
  };
}

/**
 * Get MIME type for document extensions
 */
function getDocumentMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    odp: 'application/vnd.oasis.opendocument.presentation',
    rtf: 'application/rtf',
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Check if file is an image that can be displayed as thumbnail
 */
export function canShowImageThumbnail(filePath: string): boolean {
  const { category } = detectFileType(filePath);
  return category === 'image';
}

/**
 * Convert Windows file path to URL-safe format for Tauri
 */
export function convertPathToAssetUrl(filePath: string): string {
  // Tauri uses the convertFileSrc API to safely load local files
  // For now, we'll use the file protocol directly
  // In production, you should use Tauri's convertFileSrc
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  // Convert Windows backslashes to forward slashes
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Return as-is for now - Tauri will handle conversion
  return `asset://localhost/${normalizedPath}`;
}

/**
 * Get file name from path
 */
export function getFileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || '';
}
