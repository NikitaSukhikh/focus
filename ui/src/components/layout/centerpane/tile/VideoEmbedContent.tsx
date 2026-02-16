/* eslint-disable react/no-unknown-property */
import React, { useEffect } from 'react';
import { VideoEmbed, getVideoEmbedRenderOptions } from '@/utils/videoEmbeds';
import { TYPOGRAPHY_FONTS, TYPOGRAPHY_SIZES, TYPOGRAPHY_WEIGHTS } from '@/styles/typographics';
import { tileRingOutline, TILE_RING } from '@/styles/tileStyles';

interface VideoEmbedContentProps {
  videoEmbed: VideoEmbed;
  title: string;
  isSelected: boolean;
  hoverScaleClass: string;
  onInteractionChange?: (locked: boolean) => void;
  onEmbedError?: () => void;
}

// VideoEmbedContent renders the inline video player card for links that resolve to embeddable sources (YouTube/Vimeo) on the canvas.
export function VideoEmbedContent({
  videoEmbed,
  title,
  isSelected,
  hoverScaleClass,
  onInteractionChange,
  onEmbedError,
}: VideoEmbedContentProps) {
  const renderOptions = getVideoEmbedRenderOptions(videoEmbed);
  const webviewRef = React.useRef<HTMLWebViewElement | null>(null);

  useEffect(() => {
    return () => {
      onInteractionChange?.(false);
    };
  }, [onInteractionChange]);

  useEffect(() => {
    if (!renderOptions.useWebview || !webviewRef.current) return;

    const webview = webviewRef.current;
    const handleFailLoad = (event: any) => {
      if (event.errorCode === -3) return;
      console.warn('[VideoEmbedContent] Webview failed to load', {
        errorCode: event.errorCode,
        errorDescription: event.errorDescription,
        validatedURL: event.validatedURL,
      });
      onEmbedError?.();
    };

    webview.addEventListener('did-fail-load', handleFailLoad as EventListener);
    webview.addEventListener('did-fail-provisional-load', handleFailLoad as EventListener);

    return () => {
      webview.removeEventListener('did-fail-load', handleFailLoad as EventListener);
      webview.removeEventListener('did-fail-provisional-load', handleFailLoad as EventListener);
    };
  }, [renderOptions.useWebview, onEmbedError]);

  const markInteraction = (locked: boolean) => onInteractionChange?.(locked);

  return (
    <div
      className={`w-full h-full flex flex-col gap-3 transition-transform duration-150 ${hoverScaleClass}`}
      style={{ outline: tileRingOutline('link'), outlineOffset: `${TILE_RING.outlineOffset}px`, borderRadius: `${TILE_RING.borderRadius}px` }}
    >
      <div
        className="w-full rounded-lg overflow-hidden bg-black shadow-inner"
        style={{
          aspectRatio: '16 / 9',
          boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
          flexShrink: 0,
        }}
      >
        {renderOptions.useWebview ? (
          <webview
            ref={webviewRef}
            src={renderOptions.src}
            partition={renderOptions.webviewPartition}
            httpreferrer={renderOptions.webviewReferrer}
            allowpopups={'true' as any}
            webpreferences="autoplayPolicy=document-user-activation-required"
            onPointerDown={(e) => {
              e.stopPropagation();
              markInteraction(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              markInteraction(false);
            }}
            onPointerLeave={() => markInteraction(false)}
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              display: 'block',
              background: '#000',
            }}
          />
        ) : (
          <iframe
            src={renderOptions.src}
            title={title || 'Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="origin"
            onPointerDown={(e) => {
              e.stopPropagation();
              markInteraction(true);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              markInteraction(false);
            }}
            onPointerLeave={() => markInteraction(false)}
            onError={() => onEmbedError?.()}
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              display: 'block',
              background: '#000',
            }}
            draggable={false}
          />
        )}
      </div>
      <div className="w-full min-w-0 flex flex-col items-center gap-1 px-1">
        <div
          className="line-clamp-2 text-center"
          style={{
            fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
            fontSize: TYPOGRAPHY_SIZES.TILE_TITLE.fontSize,
            lineHeight: TYPOGRAPHY_SIZES.TILE_TITLE.lineHeight,
            fontWeight: TYPOGRAPHY_WEIGHTS.TILE_TITLE,
            color: isSelected ? '#1d4ed8' : 'var(--color-text-primary)',
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
}
