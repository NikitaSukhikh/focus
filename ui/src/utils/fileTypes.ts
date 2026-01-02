/**
 * File type detection and utilities
 */

export type FileCategory = 'image' | 'audio' | 'pdf' | 'document' | 'text' | 'unknown';

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

// Audio file extensions
const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'flac',
  'ogg',
  'oga',
  'm4a',
  'aac',
  'wma',
  'opus',
  'aiff',
  'aif',
  'aifc',
  'alac',
  'ape',
  'wv',
  'mka',
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

  if (AUDIO_EXTENSIONS.has(extension)) {
    return {
      category: 'audio',
      extension,
      mimeType: getAudioMimeType(extension),
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
 * Get MIME type for audio extensions
 */
function getAudioMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    wma: 'audio/x-ms-wma',
    opus: 'audio/opus',
    aiff: 'audio/aiff',
    aif: 'audio/aiff',
    aifc: 'audio/aiff',
    alac: 'audio/x-alac',
    ape: 'audio/x-ape',
    wv: 'audio/x-wavpack',
    mka: 'audio/x-matroska',
  };

  return mimeTypes[extension] || 'audio/mpeg';
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
 * Convert Windows file path to URL-safe format
 */
export function convertPathToAssetUrl(filePath: string): string {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  // Convert Windows backslashes to forward slashes
  const normalizedPath = filePath.replace(/\\/g, '/');

  return `asset://localhost/${normalizedPath}`;
}

/**
 * Get file name from path
 */
export function getFileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || '';
}
