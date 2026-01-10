/* eslint-disable react/no-unknown-property */
import { Z_INDEX } from '../../../../constants/zIndex';
import { VideoEmbed, getVideoEmbedRenderOptions } from '../../../../utils/videoEmbeds';

interface VideoPreviewProps {
  videoEmbed: VideoEmbed;
  title?: string;
}

// VideoPreview renders an embedded player for recognized video links (e.g., YouTube/Vimeo) inside the preview pane.
export function VideoPreview({ videoEmbed, title }: VideoPreviewProps) {
  const renderOptions = getVideoEmbedRenderOptions(videoEmbed);

  return (
    <div
      className="w-full flex justify-center"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: Z_INDEX.CONTENT_PREVIEW,
        background: 'var(--background-dark)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: '100%', paddingTop: '56.25%' }}>
        {renderOptions.useWebview ? (
          <webview
            src={renderOptions.src}
            partition={renderOptions.webviewPartition}
            httpReferrer={renderOptions.webviewReferrer}
            allowpopups="true"
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
            title={title || 'Video preview'}
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
  );
}
