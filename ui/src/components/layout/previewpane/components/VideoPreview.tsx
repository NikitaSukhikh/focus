/* eslint-disable react/no-unknown-property */
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Z_INDEX } from '../../../../constants/zIndex';
import { FONT_ROLES } from '../../../../styles/fontManager';
import { VideoEmbed, getVideoEmbedRenderOptions } from '../../../../utils/videoEmbeds';
import { formatTextWithLinks } from '../../../../utils/linkFormatter';

interface VideoPreviewProps {
  videoEmbed: VideoEmbed;
  title?: string;
  description?: string;
  channelName?: string;
  channelIconUrl?: string;
  isPreviewOpen?: boolean;
  variant?: 'pane' | 'full';
  showMetadata?: boolean;
}

// VideoPreview renders an embedded player for recognized video links (e.g., YouTube/Vimeo) inside the preview pane.
export function VideoPreview({
  videoEmbed,
  title,
  description,
  channelName,
  channelIconUrl,
  isPreviewOpen,
  variant = 'pane',
  showMetadata = true,
}: VideoPreviewProps) {
  const renderOptions = getVideoEmbedRenderOptions(videoEmbed);
  const titleText = title && title.trim().length > 0 ? title : null;
  const descriptionText = description && description.trim().length > 0 ? description : null;
  const channelText = channelName && channelName.trim().length > 0 ? channelName : null;
  const channelIcon = channelIconUrl && channelIconUrl.trim().length > 0 ? channelIconUrl : null;
  const shouldShowMetadata = showMetadata && (!!titleText || !!descriptionText || !!channelText || !!channelIcon);
  const descriptionPanelHeight = 200;
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const isFullWindow = variant === 'full';

  useEffect(() => {
    setIsDescriptionOpen(false);
  }, [videoEmbed.embedUrl, isPreviewOpen]);

  return (
    <div className="w-full flex flex-col items-center" style={{ background: 'var(--background-dark)' }}>
      <div
        className="w-full flex justify-center"
        style={{
          position: isFullWindow ? 'relative' : 'sticky',
          top: isFullWindow ? 'auto' : 0,
          zIndex: Z_INDEX.CONTENT_PREVIEW,
          background: 'var(--background-dark)',
          padding: isFullWindow ? '0' : '16px 24px 0',
        }}
      >
        <div style={{ position: 'relative', width: '100%', maxWidth: '100%', paddingTop: '56.25%' }}>
          {renderOptions.useWebview ? (
            <webview
              src={renderOptions.src}
              partition={renderOptions.webviewPartition}
              httpreferrer={renderOptions.webviewReferrer}
              allowpopups={'true' as any}
              webpreferences="autoplayPolicy=document-user-activation-required"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: '0',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                background: '#000'
              }}
            />
          ) : (
            <iframe
              src={renderOptions.src}
              title={titleText || 'Video preview'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="origin"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: '0',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                background: '#000'
              }}
            />
          )}
        </div>
      </div>
      {shouldShowMetadata && (
        <div className="w-full px-6 pb-6 pt-4">
          {titleText && (
            <div
              style={{
                ...FONT_ROLES.paneTitle,
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                marginBottom: channelText || descriptionText ? '8px' : 0,
              }}
            >
              {titleText}
            </div>
          )}
          {(channelText || channelIcon) && (
            <div
              className="flex items-center gap-2"
              style={{
                ...FONT_ROLES.paneBodyMuted,
                color: 'var(--color-text-muted)',
                marginBottom: descriptionText ? '8px' : 0,
              }}
            >
              {channelIcon && (
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-surface-panel)',
                    border: '1px solid var(--color-border-subtle)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  }}
                >
                  <img
                    src={channelIcon}
                    alt={channelText ? `${channelText} channel icon` : 'Channel icon'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </span>
              )}
              {channelText && <span>{channelText}</span>}
            </div>
          )}
          {descriptionText && (
            <div style={{ marginBottom: isDescriptionOpen ? '8px' : 0 }}>
              <button
                type="button"
                className="flex items-center gap-2"
                style={{
                  ...FONT_ROLES.paneBodyMuted,
                  color: 'var(--color-text-muted)',
                  background: 'transparent',
                  border: '0',
                  padding: 0,
                  cursor: 'pointer',
                }}
                onClick={() => setIsDescriptionOpen((prev) => !prev)}
                aria-expanded={isDescriptionOpen}
              >
                <span>Description</span>
                {isDescriptionOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </div>
          )}
          {descriptionText && (
            <div
              className="preview-description-scroll"
              style={{
                height: `${descriptionPanelHeight}px`,
                overflowY: isDescriptionOpen ? 'auto' : 'hidden',
              }}
            >
              {isDescriptionOpen && (
                <div
                  style={{
                    ...FONT_ROLES.paneBody,
                    color: 'var(--color-text-secondary)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {formatTextWithLinks(descriptionText, 'text-blue-500 underline cursor-pointer')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
