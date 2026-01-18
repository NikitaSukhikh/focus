import React, { useEffect } from 'react';
import { API_BASE } from '../../../../config/api';
import { TYPOGRAPHY_FONTS, TYPOGRAPHY_SIZES, TYPOGRAPHY_WEIGHTS } from '../../../../styles/typographics';

interface VideoFileEmbedContentProps {
  filePath: string;
  title: string;
  isSelected: boolean;
  hoverScaleClass: string;
  onInteractionChange?: (locked: boolean) => void;
}

// VideoFileEmbedContent renders the inline video player card for local video files on the canvas.
export function VideoFileEmbedContent({
  filePath,
  title,
  isSelected,
  hoverScaleClass,
  onInteractionChange,
}: VideoFileEmbedContentProps) {
  const videoUrl = `${API_BASE}/thumbnails/video-file?${new URLSearchParams({ file_path: filePath }).toString()}`;
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const lockRef = React.useRef(false);

  useEffect(() => {
    return () => {
      onInteractionChange?.(false);
    };
  }, [onInteractionChange]);

  const markInteraction = (locked: boolean) => onInteractionChange?.(locked);
  const CONTROL_BAR_HEIGHT = 44;
  const CENTER_PLAY_RADIUS = 46;

  const isLockRegion = (event: React.PointerEvent<HTMLVideoElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const isControls = offsetY >= rect.height - CONTROL_BAR_HEIGHT;

    if (isControls) return true;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const distanceFromCenter = Math.hypot(offsetX - centerX, offsetY - centerY);
    const isPaused = videoRef.current?.paused ?? true;

    return isPaused && distanceFromCenter <= CENTER_PLAY_RADIUS;
  };

  return (
    <div
      className={`w-full h-full flex flex-col gap-3 transition-transform duration-150 ${hoverScaleClass}`}
    >
      {/* Video player */}
      <div
        className="w-full rounded-lg overflow-hidden bg-black shadow-inner"
        style={{
          aspectRatio: '16 / 9',
          boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
          flexShrink: 0,
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          controlsList="nodownload"
          preload="metadata"
          onPointerDown={(e) => {
            if (!isLockRegion(e)) {
              lockRef.current = false;
              return;
            }
            e.stopPropagation();
            lockRef.current = true;
            markInteraction(true);
          }}
          onPointerUp={(e) => {
            if (!lockRef.current) return;
            e.stopPropagation();
            lockRef.current = false;
            markInteraction(false);
          }}
          onPointerLeave={() => {
            if (!lockRef.current) return;
            lockRef.current = false;
            markInteraction(false);
          }}
          onPointerCancel={() => {
            if (!lockRef.current) return;
            lockRef.current = false;
            markInteraction(false);
          }}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            background: '#000',
          }}
          draggable={false}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Title and file path */}
      <div className="w-full min-w-0 flex flex-col items-center gap-0.5 px-1">
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
        <div
          className="text-center whitespace-pre-line break-words line-clamp-2"
          style={{
            fontFamily: TYPOGRAPHY_FONTS.TILE_DESCRIPTION,
            fontSize: TYPOGRAPHY_SIZES.TILE_DESCRIPTION.fontSize,
            lineHeight: TYPOGRAPHY_SIZES.TILE_DESCRIPTION.lineHeight,
            fontWeight: TYPOGRAPHY_WEIGHTS.TILE_DESCRIPTION,
            color: 'var(--color-text-muted)',
          }}
        >
          {filePath}
        </div>
      </div>
    </div>
  );
}
