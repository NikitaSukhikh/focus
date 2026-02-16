import { X, ExternalLink, Maximize2 } from 'lucide-react';
import { FONT_ROLES } from '@/styles/fontManager';
import { openExternalUrl } from '@/platform';
import { PREVIEW_PANE } from '@/constants/panesDimensions';
import { ICON_SIZES } from '@/constants/objectsDimensions';
import { renderFileTypeIcon, renderFaviconImage, getGoogleServiceIcon } from '@/components/layout/centerpane/tile/iconHelpers';

const { header } = PREVIEW_PANE;

interface EbookMetadata {
  title: string;
  author: string | null;
}

interface PreviewHeaderProps {
  title?: string;
  type?: string;
  url?: string;
  filePath?: string;
  faviconUrl?: string;
  onClose: () => void;
  onOpenFullWindow: () => void;
  ebookMetadata?: EbookMetadata | null;
  showEditHint?: boolean;
}

// PreviewHeader renders the preview title bar and the controls for opening externally, expanding to full window, or closing the pane.
export function PreviewHeader({ title, type, url, filePath, faviconUrl, onClose, onOpenFullWindow, ebookMetadata, showEditHint }: PreviewHeaderProps) {
  const displayTitle = ebookMetadata?.title || title;
  const showEbookInfo = ebookMetadata && (ebookMetadata.title || ebookMetadata.author);

  return (
    <div className="flex flex-col" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: `${header.paddingY}px ${header.paddingX}px` }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex-shrink-0" style={{ opacity: 0.7 }}>
            {type === 'file' && filePath
              ? renderFileTypeIcon(filePath, 16)
              : type === 'link' && url
                ? (getGoogleServiceIcon(url, 16) ?? renderFaviconImage(faviconUrl, 16))
                : null}
          </div>
          {showEditHint ? (
            <span style={{ ...FONT_ROLES.paneTitle, color: 'var(--color-text-muted)', opacity: 0.7, fontSize: '14px' }}>
              (Double-click to edit or add text)
            </span>
          ) : showEbookInfo ? (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate" style={{ ...FONT_ROLES.paneSubtitle, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                {ebookMetadata.title}
              </span>
              {ebookMetadata.author && (
                <span className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  by {ebookMetadata.author}
                </span>
              )}
            </div>
          ) : displayTitle && type !== 'text' ? (
            <span className="truncate" style={{ ...FONT_ROLES.paneSubtitle, color: 'var(--color-text-muted)' }}>
              - {displayTitle}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFullWindow}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--color-text-muted)',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title="Open in full window"
          >
            <Maximize2 size={ICON_SIZES.headerButton} />
          </button>
          {url && (
            <button
              onClick={() => url && openExternalUrl(url)}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--color-text-muted)',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title="Open in external browser"
          >
            <ExternalLink size={ICON_SIZES.headerButton} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--color-text-muted)',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title="Close preview"
          >
            <X size={ICON_SIZES.headerButton} />
          </button>
        </div>
      </div>
    </div>
  );
}

