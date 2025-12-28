/**
 * File type icon components
 */

import React from 'react';
import { FileText, File, FileType, Music } from 'lucide-react';

interface FileIconProps {
  size?: number;
  className?: string;
}

// PDF Icon
export function PdfIcon({ size = 48, className = '' }: FileIconProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
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
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
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
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
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
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
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
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
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

// Text File Icon
export function TextFileIcon({ size = 48, className = '' }: FileIconProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
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

// Audio File Icon
export function AudioFileIcon({ size = 48, className = '' }: FileIconProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Music size={size} className="text-purple-600" />
      <div
        className="absolute bottom-0 right-0 bg-purple-600 text-white text-xs font-bold px-1 rounded"
        style={{ fontSize: size * 0.2 }}
      >
        MP3
      </div>
    </div>
  );
}

// Generic File Icon
export function GenericFileIcon({ size = 48, className = '' }: FileIconProps) {
  return <File size={size} className={`text-slate-500 ${className}`} />;
}

/**
 * Get the appropriate icon component for a file type
 */
export function getFileTypeIcon(extension: string): React.ComponentType<FileIconProps> {
  const ext = extension.toLowerCase();

  if (ext === 'pdf') return PdfIcon;
  if (['doc', 'docx', 'rtf'].includes(ext)) return WordIcon;
  if (ext === 'odt') return OdtIcon;
  if (['xls', 'xlsx', 'ods'].includes(ext)) return ExcelIcon;
  if (['ppt', 'pptx', 'odp'].includes(ext)) return PowerPointIcon;
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
  )
    return AudioFileIcon;
  if (
    [
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
    ].includes(ext)
  )
    return TextFileIcon;

  return GenericFileIcon;
}
