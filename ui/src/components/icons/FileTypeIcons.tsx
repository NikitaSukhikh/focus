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
    <img
      src="/logos/pdf_logo.png"
      alt="PDF"
      className={`object-contain ${className}`}
      style={{ width: size, height: size, ...iconStyle }}
      draggable={false}
    />
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
    <img
      src="/logos/excel_type.jfif"
      alt="Excel"
      className={`object-contain ${className}`}
      style={{ width: size, height: size, ...iconStyle }}
      draggable={false}
    />
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

const VSCODE_ICON_MAP: Record<string, string> = {
  js: 'file_type_light_js.svg',
  jsx: 'file_type_reactjs.svg',
  ts: 'file_type_typescript.svg',
  tsx: 'file_type_reactts.svg',
  py: 'file_type_python.svg',
  pyw: 'file_type_python.svg',
  java: 'file_type_java.svg',
  c: 'file_type_c.svg',
  cpp: 'file_type_cpp.svg',
  cxx: 'file_type_cpp.svg',
  cc: 'file_type_cpp.svg',
  h: 'file_type_cheader.svg',
  hpp: 'file_type_cheader.svg',
  cs: 'file_type_csharp.svg',
  go: 'file_type_go.svg',
  rs: 'file_type_light_rust.svg',
  php: 'file_type_php.svg',
  rb: 'file_type_ruby.svg',
  swift: 'file_type_swift.svg',
  kt: 'file_type_kotlin.svg',
  json: 'file_type_light_json.svg',
  xml: 'file_type_xml.svg',
  css: 'file_type_css.svg',
  scss: 'file_type_scss.svg',
  sass: 'file_type_scss.svg',
  yaml: 'file_type_light_yaml.svg',
  yml: 'file_type_light_yaml.svg',
  sh: 'file_type_shell.svg',
  bash: 'file_type_shell.svg',
  zsh: 'file_type_shell.svg',
  md: 'file_type_markdown.svg',
  markdown: 'file_type_markdown.svg',
  html: 'file_type_html.svg',
  htm: 'file_type_html.svg',
  sql: 'file_type_sql.svg',
  toml: 'file_type_light_toml.svg',
  cfg: 'file_type_light_ini.svg',
  ini: 'file_type_light_ini.svg',
  log: 'file_type_log.svg',
};

// Code File Icon - uses VS Code default icons when available, falls back to labeled icon
export function CodeFileIcon({ size = 48, className = '', extension = '' }: FileIconProps & { extension?: string }) {
  const ext = extension.toLowerCase();
  const vscodeIcon = VSCODE_ICON_MAP[ext];

  if (vscodeIcon) {
    return (
      <img
        src={`/logos/code-icons/${vscodeIcon}`}
        alt={extension}
        className={`object-contain ${className}`}
        style={{ width: size, height: size, ...iconStyle }}
        draggable={false}
      />
    );
  }

  const label = extension.toUpperCase().slice(0, 4);
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...iconStyle }}>
      <FileText size={size} className="text-indigo-600" />
      <div
        className="absolute bottom-0 right-0 bg-indigo-600 text-white text-xs font-bold px-1 rounded"
        style={{ fontSize: size * 0.2 }}
      >
        {label}
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
