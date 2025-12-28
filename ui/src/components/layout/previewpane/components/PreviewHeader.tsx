import { X, ExternalLink, Maximize2 } from 'lucide-react';
import { FONT_ROLES } from '../../../../styles/fontManager';
import { openExternalUrl } from '../../../../platform';

interface PreviewHeaderProps {
  title?: string;
  type?: string;
  url?: string;
  onClose: () => void;
  onOpenFullWindow: () => void;
}

// PreviewHeader renders the preview title bar and the controls for opening externally, expanding to full window, or closing the pane.
export function PreviewHeader({ title, type, url, onClose, onOpenFullWindow }: PreviewHeaderProps) {
  return (
    <div className="flex flex-col" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 min-w-0">
          <h2 style={{ ...FONT_ROLES.paneTitle, color: 'var(--primary-color)' }}>Preview</h2>
          {title && type !== 'text' && (
            <span className="truncate" style={{ ...FONT_ROLES.paneSubtitle, color: 'var(--color-text-muted)' }}>
              - {title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFullWindow}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--primary-color)';
              e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title="Open in full window"
          >
            <Maximize2 size={18} />
          </button>
          {url && (
            <button
              onClick={() => url && openExternalUrl(url)}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: 'var(--color-text-secondary)',
                transition: 'all var(--transition-base)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--glass-bg)';
                e.currentTarget.style.color = 'var(--primary-color)';
                e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title="Open in external browser"
            >
              <ExternalLink size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--primary-color)';
              e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title="Close preview"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
