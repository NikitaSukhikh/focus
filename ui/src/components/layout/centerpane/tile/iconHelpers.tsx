import { Grid3x3, Link, FileText } from 'lucide-react';
import { GmailIcon, DriveIcon, SheetsIcon, DocsIcon, SlidesIcon } from '@/components/icons/GoogleServiceIcons';
import { TelegramIcon } from '@/features/telegram/TelegramIcon';
import { IntStorageIcon } from '@/features/intstorage/IntStorageIcon';
import { FALLBACK_FAVICON } from '@/utils/favicon';
import { detectFileType } from '@/utils/fileTypes';
import { getFileTypeIcon } from '@/components/icons/FileTypeIcons';

export function getIconComponent(type: string) {
  switch (type) {
    case 'link': return Link;
    case 'file': return FileText;
    case 'gmail': return GmailIcon;
    case 'google_drive': return DriveIcon;
    case 'google_sheets': return SheetsIcon;
    case 'google_docs': return DocsIcon;
    case 'google_slides': return SlidesIcon;
    case 'telegram': return TelegramIcon;
    case 'intstorage': return IntStorageIcon;
    case 'text': return FileText;
    default: return Grid3x3;
  }
}

export function isGoogleService(url: string): boolean {
  if (!url) return false;
  const urlLower = url.toLowerCase();
  return (
    urlLower.includes('mail.google.com') ||
    urlLower.includes('gmail.com') ||
    urlLower.includes('drive.google.com') ||
    urlLower.includes('docs.google.com') ||
    urlLower.includes('sheets.google.com') ||
    urlLower.includes('slides.google.com')
  );
}

export function getGoogleServiceIcon(url: string, size = 48) {
  if (!url) return null;
  const urlLower = url.toLowerCase();

  if (urlLower.includes('mail.google.com') || urlLower.includes('gmail.com')) {
    return <GmailIcon size={size} />;
  }
  if (urlLower.includes('drive.google.com')) {
    return <DriveIcon size={size} />;
  }
  if (urlLower.includes('docs.google.com/spreadsheets') || urlLower.includes('sheets.google.com')) {
    return <SheetsIcon size={size} />;
  }
  if (urlLower.includes('docs.google.com/document') || urlLower.includes('docs.google.com')) {
    return <DocsIcon size={size} />;
  }
  if (urlLower.includes('docs.google.com/presentation') || urlLower.includes('slides.google.com')) {
    return <SlidesIcon size={size} />;
  }

  return null;
}

export function renderFaviconImage(faviconUrl: string | undefined, size = 40) {
  const faviconLower = (faviconUrl || '').toLowerCase();
  const looksLikeFavicon = faviconLower.endsWith('.ico') || faviconLower.includes('favicon');
  const isLargeImage = faviconUrl && !looksLikeFavicon && !faviconLower.startsWith('data:image');
  const dimension = size === 40 && isLargeImage ? size * 2 : size;

  return (
    <img
      src={faviconUrl || FALLBACK_FAVICON}
      alt=""
      style={{ width: `${dimension}px`, height: `${dimension}px` }}
      className="rounded object-contain"
      draggable={false}
      onError={(e) => {
        if (e.currentTarget.src !== FALLBACK_FAVICON) {
          e.currentTarget.onerror = null;
          e.currentTarget.src = FALLBACK_FAVICON;
        }
      }}
    />
  );
}

export function renderFileTypeIcon(filePath: string, size = 48) {
  const fileTypeInfo = detectFileType(filePath);
  const FileTypeIconComponent = getFileTypeIcon(fileTypeInfo.extension);
  return <FileTypeIconComponent size={size} />;
}
