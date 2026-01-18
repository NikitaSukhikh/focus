/**
 * File type detection and utilities
 */

export type FileCategory = 'image' | 'audio' | 'video' | 'pdf' | 'document' | 'text' | 'ebook' | 'unknown';

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

// Video file extensions
const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'ogg',
  'ogv',
  'avi',
  'mov',
  'wmv',
  'flv',
  'mkv',
  'm4v',
  'mpg',
  'mpeg',
  'mpe',
  '3gp',
  '3g2',
  'mts',
  'm2ts',
  'ts',
  'vob',
  'divx',
  'xvid',
  'f4v',
  'asf',
  'rm',
  'rmvb',
]);

// PDF file extensions
const PDF_EXTENSIONS = new Set(['pdf']);

// Document file extensions (Word, Excel, PowerPoint, etc.)
const DOCUMENT_EXTENSIONS = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'xlsm',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'rtf',
]);

// Excel file extensions (subset of documents)
const EXCEL_EXTENSIONS = new Set([
  'xls',
  'xlsx',
  'xlsm',
  'ods',
]);

// Text file extensions (programming languages, config, markup, etc.)
const TEXT_EXTENSIONS = new Set([
  // Plain text
  'txt',
  'text',
  'log',
  'logs',

  // Markdown
  'md',
  'markdown',
  'mdx',
  'rmd',

  // Data formats
  'json',
  'jsonc',
  'json5',
  'jsonl',
  'ndjson',
  'xml',
  'xsl',
  'xslt',
  'xsd',
  'dtd',
  'csv',
  'tsv',
  'yaml',
  'yml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'config',
  'properties',
  'env',
  'dotenv',

  // Web (ts/mts excluded - conflict with video transport stream extensions)
  'html',
  'htm',
  'xhtml',
  'css',
  'scss',
  'sass',
  'less',
  'styl',
  'stylus',
  'js',
  'mjs',
  'cjs',
  'cts',
  'tsx',
  'jsx',
  'vue',
  'svelte',
  'astro',
  'php',
  'phtml',
  'twig',
  'blade',
  'ejs',
  'erb',
  'hbs',
  'handlebars',
  'mustache',
  'pug',
  'jade',
  'haml',
  'slim',

  // Systems programming
  'c',
  'h',
  'cpp',
  'cxx',
  'cc',
  'c++',
  'hpp',
  'hxx',
  'hh',
  'h++',
  'ino',
  'rs',
  'go',
  'zig',
  'nim',
  'v',
  'd',
  'di',

  // JVM languages
  'java',
  'kt',
  'kts',
  'scala',
  'sc',
  'groovy',
  'gradle',
  'clj',
  'cljs',
  'cljc',
  'edn',

  // .NET
  'cs',
  'csx',
  'fs',
  'fsx',
  'fsi',
  'vb',
  'vbs',

  // Scripting
  'py',
  'pyw',
  'pyi',
  'pyx',
  'pxd',
  'pxi',
  'rpy',
  'cython',
  'rb',
  'rbw',
  'rake',
  'gemspec',
  'podspec',
  'thor',
  'jbuilder',
  'perl',
  'pl',
  'pm',
  'pod',
  't',
  'lua',
  'tcl',
  'tk',
  'awk',
  'sed',

  // Shell
  'sh',
  'bash',
  'zsh',
  'fish',
  'ksh',
  'csh',
  'tcsh',
  'ps1',
  'psm1',
  'psd1',
  'bat',
  'cmd',
  'btm',

  // Functional
  'hs',
  'lhs',
  'elm',
  'ml',
  'mli',
  'mll',
  'mly',
  'ocaml',
  'erl',
  'hrl',
  'ex',
  'exs',
  'eex',
  'heex',
  'leex',
  'sml',
  'sig',
  'fun',
  'f90',
  'f95',
  'f03',
  'f08',
  'for',
  'ftn',
  'fpp',
  'lisp',
  'lsp',
  'cl',
  'el',
  'scm',
  'ss',
  'rkt',

  // Apple
  'swift',
  'm',
  'mm',

  // Mobile/Cross-platform
  'dart',
  'flutter',

  // Database
  'sql',
  'mysql',
  'pgsql',
  'plsql',
  'tsql',
  'psql',
  'hql',
  'cql',

  // DevOps/Infrastructure
  'dockerfile',
  'containerfile',
  'tf',
  'tfvars',
  'hcl',
  'nomad',
  'vagrantfile',
  'ansible',

  // Build/Package
  'cmake',
  'make',
  'makefile',
  'mk',
  'mak',
  'ninja',
  'gyp',
  'gypi',
  'bazel',
  'buck',
  'pants',
  'sbt',
  'maven',
  'ant',
  'rake',
  'cabal',
  'stack',
  'cargo',
  'mix',
  'rebar',

  // Documentation
  'rst',
  'rest',
  'adoc',
  'asciidoc',
  'asc',
  'org',
  'tex',
  'latex',
  'ltx',
  'sty',
  'cls',
  'bib',
  'bibtex',
  'man',
  'mdoc',
  'pod',

  // Misc programming
  'r',
  'rdata',
  'julia',
  'jl',
  'matlab',
  'octave',
  'cobol',
  'cob',
  'cbl',
  'ada',
  'adb',
  'ads',
  'pas',
  'pp',
  'dpr',
  'lpr',
  'prolog',
  'pro',
  'p',
  'forth',
  'fth',
  '4th',
  'fs',
  'factor',
  'io',
  'red',
  'reds',
  'rebol',
  'reb',
  'hx',
  'hxml',
  'nix',
  'dhall',
  'jsonnet',
  'libsonnet',
  'pkl',
  'cue',
  'rego',
  'wasm',
  'wat',

  // Game dev
  'gd',
  'gdscript',
  'unity',
  'shader',
  'glsl',
  'hlsl',
  'cg',
  'fx',

  // Assembly
  'asm',
  's',
  'S',
  'nasm',
  'masm',
  'yasm',

  // Config/RC files
  'rc',
  'editorconfig',
  'gitconfig',
  'gitignore',
  'gitattributes',
  'gitmodules',
  'npmrc',
  'nvmrc',
  'yarnrc',
  'babelrc',
  'eslintrc',
  'prettierrc',
  'stylelintrc',
  'browserslistrc',
  'huskyrc',
  'lintstagedrc',

  // Misc (svg excluded - handled as image)
  'graphql',
  'gql',
  'proto',
  'protobuf',
  'thrift',
  'avsc',
  'avdl',
  'fbs',
  'capnp',
  'idl',
  'webidl',
  'wsdl',
  'diff',
  'patch',
  'applescript',
  'scpt',
  'vimrc',
  'vim',
  'emacs',
  'ahk',
  'au3',
]);

// Ebook file extensions
const EBOOK_EXTENSIONS = new Set([
  'epub',
  'mobi',
  'azw',
  'azw3',
  'fb2',
  'cbz',
  'cbr',
  'pdb',
  'djvu',
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

// Extensions that are ambiguous between video and text (TypeScript vs MPEG transport stream)
const AMBIGUOUS_VIDEO_TEXT_EXTENSIONS = new Set(['ts', 'mts']);

/**
 * Check if a file path looks like a TypeScript file based on context
 * Uses multiple heuristics: filename patterns, path patterns, and naming conventions
 */
function isLikelyTypeScript(filePath: string): boolean {
  const fileName = filePath.split(/[\\/]/).pop() || '';

  // === STRONG TYPESCRIPT INDICATORS ===

  // TypeScript-specific naming patterns (very high confidence)
  if (/\.(spec|test|d)\.m?ts$/i.test(fileName)) return true;
  if (/\.(stories|mock|stub|fixture)\.m?ts$/i.test(fileName)) return true;

  // Common TypeScript file naming conventions (PascalCase components, camelCase utils)
  // Video files rarely use these patterns
  if (/^[A-Z][a-zA-Z0-9]*\.m?ts$/.test(fileName)) return true; // PascalCase: Component.ts
  if (/^use[A-Z][a-zA-Z0-9]*\.m?ts$/.test(fileName)) return true; // React hooks: useAuth.ts
  if (/^(index|main|app|config|types|utils|helpers|constants)\.m?ts$/i.test(fileName)) return true;

  // TypeScript barrel exports and common patterns
  if (/^_[a-zA-Z]/.test(fileName)) return true; // _partial.ts, _helpers.ts

  // === STRONG VIDEO INDICATORS ===

  // Video-like naming patterns (dates, sequences, generic names)
  // MPEG-TS files from cameras/recorders often have these patterns
  if (/^\d{8}[_-]?\d{6}\.m?ts$/i.test(fileName)) return true; // 20240115_143022.mts (camera timestamp)
  if (/^(VID|MOV|REC|CLIP|VIDEO)[_-]?\d+\.m?ts$/i.test(fileName)) return false; // VID_001.ts
  if (/^[A-Z]{2,4}[_-]?\d{4,}\.m?ts$/i.test(fileName)) return false; // DSC0001.mts, MVI_1234.ts, MVI_0001.mts
  if (/^\d+\.m?ts$/i.test(fileName)) return false; // 001.ts (segment files)

  // Video files typically have media-related paths
  const videoPathPatterns = [
    /[/\\]videos?[/\\]/i,
    /[/\\]movies?[/\\]/i,
    /[/\\]media[/\\]/i,
    /[/\\]recordings?[/\\]/i,
    /[/\\]captures?[/\\]/i,
    /[/\\]footage[/\\]/i,
    /[/\\]clips?[/\\]/i,
    /[/\\]dcim[/\\]/i, // Camera folder
    /[/\\]avchd[/\\]/i, // AVCHD video format folder
    /[/\\]private[/\\]avchd[/\\]/i,
    /[/\\]stream[/\\]/i,
    /[/\\]bdmv[/\\]/i, // Blu-ray folder
  ];

  if (videoPathPatterns.some((pattern) => pattern.test(filePath))) return false;

  // === CODE PROJECT INDICATORS ===

  // Check for common code directory patterns in path
  const codePathPatterns = [
    /[/\\]src[/\\]/i,
    /[/\\]lib[/\\]/i,
    /[/\\]dist[/\\]/i,
    /[/\\]build[/\\]/i,
    /[/\\]app[/\\]/i,
    /[/\\]pages[/\\]/i,
    /[/\\]components[/\\]/i,
    /[/\\]hooks[/\\]/i,
    /[/\\]utils[/\\]/i,
    /[/\\]services[/\\]/i,
    /[/\\]types[/\\]/i,
    /[/\\]models[/\\]/i,
    /[/\\]controllers[/\\]/i,
    /[/\\]routes[/\\]/i,
    /[/\\]api[/\\]/i,
    /[/\\]node_modules[/\\]/i,
    /[/\\]__tests__[/\\]/i,
    /[/\\]packages?[/\\]/i,
    /[/\\]modules?[/\\]/i,
    /[/\\]features?[/\\]/i,
    /[/\\]views?[/\\]/i,
    /[/\\]screens?[/\\]/i,
    /[/\\]stores?[/\\]/i,
    /[/\\]reducers?[/\\]/i,
    /[/\\]actions?[/\\]/i,
    /[/\\]middleware[/\\]/i,
    /[/\\]plugins?[/\\]/i,
    /[/\\]test[/\\]/i,
    /[/\\]tests[/\\]/i,
    /[/\\]spec[/\\]/i,
    /[/\\]e2e[/\\]/i,
    /[/\\]integration[/\\]/i,
    /[/\\]unit[/\\]/i,
  ];

  if (codePathPatterns.some((pattern) => pattern.test(filePath))) return true;

  // Default to TypeScript for .ts/.mts since it's more common in dev context
  // (Focus is a dev-focused app, so this bias makes sense)
  return true;
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

  // Handle ambiguous extensions (ts/mts) - check if likely TypeScript
  if (AMBIGUOUS_VIDEO_TEXT_EXTENSIONS.has(extension)) {
    if (isLikelyTypeScript(filePath)) {
      return {
        category: 'text',
        extension,
        mimeType: 'text/plain',
      };
    }
    // Fall through to video detection
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return {
      category: 'video',
      extension,
      mimeType: getVideoMimeType(extension),
    };
  }

  if (PDF_EXTENSIONS.has(extension)) {
    return {
      category: 'pdf',
      extension,
      mimeType: 'application/pdf',
    };
  }

  if (EBOOK_EXTENSIONS.has(extension)) {
    return {
      category: 'ebook',
      extension,
      mimeType: getEbookMimeType(extension),
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
 * Get MIME type for video extensions
 */
function getVideoMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    ogv: 'video/ogg',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    mkv: 'video/x-matroska',
    m4v: 'video/x-m4v',
    mpg: 'video/mpeg',
    mpeg: 'video/mpeg',
    mpe: 'video/mpeg',
    '3gp': 'video/3gpp',
    '3g2': 'video/3gpp2',
    mts: 'video/mp2t',
    m2ts: 'video/mp2t',
    ts: 'video/mp2t',
    vob: 'video/dvd',
    divx: 'video/divx',
    xvid: 'video/x-xvid',
    f4v: 'video/x-f4v',
    asf: 'video/x-ms-asf',
    rm: 'application/vnd.rn-realmedia',
    rmvb: 'application/vnd.rn-realmedia-vbr',
  };

  return mimeTypes[extension] || 'video/mp4';
}

/**
 * Get MIME type for ebook extensions
 */
function getEbookMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    epub: 'application/epub+zip',
    mobi: 'application/x-mobipocket-ebook',
    azw: 'application/vnd.amazon.ebook',
    azw3: 'application/vnd.amazon.ebook',
    fb2: 'application/x-fictionbook+xml',
    cbz: 'application/vnd.comicbook+zip',
    cbr: 'application/vnd.comicbook-rar',
    pdb: 'application/vnd.palm',
    djvu: 'image/vnd.djvu',
  };

  return mimeTypes[extension] || 'application/octet-stream';
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
    xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
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

/**
 * Check if file is an Excel spreadsheet
 */
export function isExcelFile(filePath: string): boolean {
  const extension = getFileExtension(filePath);
  return EXCEL_EXTENSIONS.has(extension);
}

/**
 * Check if HTML file is likely a renderable webpage or a code template
 * Returns true if it should be treated as code (shown in text editor)
 * Returns false if it should be rendered (shown in webview)
 */
export function isHtmlCodeFile(filePath: string): boolean {
  const fileName = getFileName(filePath).toLowerCase();

  // Common project/template HTML files that should be treated as code
  const codeFilePatterns = [
    'index.html',
    'template.html',
    'base.html',
    'layout.html',
    '_',  // Partial templates often start with underscore
    'component',
    'snippet',
  ];

  return codeFilePatterns.some(pattern => fileName.includes(pattern));
}
