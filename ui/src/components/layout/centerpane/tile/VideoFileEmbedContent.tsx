import React, { useEffect } from 'react';
import { RenameInput } from './RenameInput';
import { API_BASE } from '../../../../config/api';

interface VideoFileEmbedContentProps {
  filePath: string;
  title: string;
  isRenaming: boolean;
  renamingValue: string;
  setRenamingValue: (value: string) => void;
  handleRenameKeyDown: (e: React.KeyboardEvent) => void;
  handleRenameSubmit: () => void;
  renameInputRef: React.RefObject<HTMLInputElement>;
  isSelected: boolean;
  hoverScaleClass: string;
  onInteractionChange?: (locked: boolean) => void;
}

// VideoFileEmbedContent renders the inline video player card for local video files on the canvas.
export function VideoFileEmbedContent({
  filePath,
  title,
  isRenaming,
  renamingValue,
  setRenamingValue,
  handleRenameKeyDown,
  handleRenameSubmit,
  renameInputRef,
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
        {isRenaming ? (
          <RenameInput
            value={renamingValue}
            onChange={setRenamingValue}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            inputRef={renameInputRef}
          />
        ) : (
          <>
            <div className={`text-sm font-semibold line-clamp-2 leading-tight text-center ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
              {title}
            </div>
            <div className="text-[11px] text-slate-500 truncate w-full text-center">
              {filePath}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
