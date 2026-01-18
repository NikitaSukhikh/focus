/**
 * File type icon components
 */

import React from 'react';
import { FileText, File, FileType, Music, BookOpen } from 'lucide-react';

interface FileIconProps {
  size?: number;
  className?: string;
}

const iconStyle = { opacity: 'var(--icon-opacity, 1)' };

// PDF Icon
export function PdfIcon({ size = 48, className = '' }: FileIconProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...iconStyle }}>
      <FileText size={size} className="text-red-600" />
      <div
        className="absolute bottom-0 right-0 bg-red-600 text-white text-xs font-bold px-1 rounded"
        style={{ fontSize: size * 0.2 }}
      >
        PDF
      </div>
    </div>
  );
}

// Word Document Icon
export function WordIcon({ size = 48, className = '' }: FileIconProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...iconStyle }}>
      <FileText size={size} className="text-blue-600" />
      <div
        className="absolute bottom-0 right-0 bg-blue-600 text-white text-xs font-bold px-1 rounded"
        style={{ fontSize: size * 0.2 }}
      >
        DOC
      </div>
    </div>
  );
}

// OpenDocument Text Icon
export function OdtIcon({ size = 48, className = '' }: FileIconProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...iconStyle }}>
      <FileText size={size} className="text-amber-600" />
      <div
        className="absolute bottom-0 right-0 bg-amber-600 text-white text-xs font-bold px-1 rounded"
        style={{ fontSize: size * 0.2 }}
      >
        ODT
      </div>
    </div>
  );
}

// Excel Icon
export function ExcelIcon({ size = 48, className = '' }: FileIconProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...iconStyle }}>
      <FileType size={size} className="text-green-600" />
      <div
        className="absolute bottom-0 right-0 bg-green-600 text-white text-xs font-bold px-1 rounded"
        style={{ fontSize: size * 0.2 }}
      >
        XLS
      </div>
    </div>
  );
}

// PowerPoint Icon
export function PowerPointIcon({ size = 48, className = '' }: FileIconProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...iconStyle }}>
      <FileType size={size} className="text-orange-600" />
      <div
        className="absolute bottom-0 right-0 bg-orange-600 text-white text-xs font-bold px-1 rounded"
        style={{ fontSize: size * 0.2 }}
      >
        PPT
      </div>
    </div>
  );
}

// Text File Icon with dynamic extension display
export function TextFileIcon({ size = 48, className = '' }: FileIconProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...iconStyle }}>
      <FileText size={size} className="text-slate-600" />
      <div
        className="absolute bottom-0 right-0 bg-slate-600 text-white text-xs font-bold px-1 rounded"
        style={{ fontSize: size * 0.2 }}
      >
        TXT
      </div>
    </div>
  );
}

// Code File Icon with dynamic extension display
export function CodeFileIcon({ size = 48, className = '', extension = '' }: FileIconProps & { extension?: string }) {
  const ext = extension.toUpperCase().slice(0, 4); // Limit to 4 chars for display
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...iconStyle }}>
      <FileText size={size} className="text-indigo-600" />
      <div
        className="absolute bottom-0 right-0 bg-indigo-600 text-white text-xs font-bold px-1 rounded"
        style={{ fontSize: size * 0.2 }}
      >
        {ext}
      </div>
    </div>
  );
}

// Audio File Icon with dynamic extension display
export function AudioFileIcon({ size = 48, className = '', extension = '' }: FileIconProps & { extension?: string }) {
  const ext = extension ? extension.toUpperCase().slice(0, 4) : 'MP3'; // Limit to 4 chars for display
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...iconStyle }}>
      <Music size={size} className="text-purple-600" />
      <div
        className="absolute bottom-0 right-0 bg-purple-600 text-white text-xs font-bold px-1 rounded"
        style={{ fontSize: size * 0.2 }}
      >
        {ext}
      </div>
    </div>
  );
}

// Ebook Icon with dynamic extension display
export function EbookIcon({ size = 48, className = '', extension = '' }: FileIconProps & { extension?: string }) {
  const ext = extension ? extension.toUpperCase().slice(0, 4) : 'EPUB';
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...iconStyle }}>
      <BookOpen size={size} className="text-teal-600" />
      <div
        className="absolute bottom-0 right-0 bg-teal-600 text-white text-xs font-bold px-1 rounded"
        style={{ fontSize: size * 0.2 }}
      >
        {ext}
      </div>
    </div>
  );
}

// Generic File Icon
export function GenericFileIcon({ size = 48, className = '' }: FileIconProps) {
  return <File size={size} className={`text-slate-500 ${className}`} style={iconStyle} />;
}

/**
 * Get the appropriate icon component for a file type
 * For code/text files, returns a wrapper component that passes the extension
 */
export function getFileTypeIcon(extension: string): React.ComponentType<FileIconProps> {
  const ext = extension.toLowerCase();

  if (ext === 'pdf') return PdfIcon;
  if (['doc', 'docx', 'rtf'].includes(ext)) return WordIcon;
  if (ext === 'odt') return OdtIcon;
  if (['xls', 'xlsx', 'ods'].includes(ext)) return ExcelIcon;
  if (['ppt', 'pptx', 'odp'].includes(ext)) return PowerPointIcon;

  // Ebook files with specific extension display
  if (['epub', 'mobi', 'azw', 'azw3', 'fb2', 'cbz', 'cbr', 'pdb', 'djvu'].includes(ext)) {
    return (props: FileIconProps) => <EbookIcon {...props} extension={ext} />;
  }

  // Audio files with specific extension display
  if (
    [
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
    ].includes(ext)
  ) {
    return (props: FileIconProps) => <AudioFileIcon {...props} extension={ext} />;
  }

  // Code and text files with specific extension display
  if (
    [
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
      'json',
      'xml',
      'css',
      'yaml',
      'yml',
      'toml',
      'ini',
      'cfg',
      'conf',
      'sh',
      'bash',
      'log',
      'md',
      'markdown',
    ].includes(ext)
  ) {
    // Return a wrapper component that passes the extension
    return (props: FileIconProps) => <CodeFileIcon {...props} extension={ext} />;
  }

  // HTML files - could be code or renderable, show extension
  if (['html', 'htm'].includes(ext)) {
    return (props: FileIconProps) => <CodeFileIcon {...props} extension={ext} />;
  }

  // Plain text files
  if (ext === 'txt') return TextFileIcon;

  return GenericFileIcon;
}
