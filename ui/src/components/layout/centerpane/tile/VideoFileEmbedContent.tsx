import React from 'react';
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

  const handleVideoInteraction = (locked: boolean) => {
    onInteractionChange?.(locked);
  };

  return (
    <div
      className={`w-full h-full flex flex-col gap-3 transition-transform duration-150 ${hoverScaleClass}`}
    >
      <div
        className="w-full rounded-lg overflow-hidden bg-black shadow-inner"
        style={{
          aspectRatio: '16 / 9',
          boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
          flexShrink: 0,
        }}
      >
        <video
          src={videoUrl}
          controls
          controlsList="nodownload"
          preload="metadata"
          onPointerDown={(e) => {
            e.stopPropagation();
            handleVideoInteraction(true);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            handleVideoInteraction(false);
          }}
          onPointerLeave={() => handleVideoInteraction(false)}
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
      <div className="w-full min-w-0 flex flex-col items-center gap-1 px-1">
        {isRenaming ? (
          <RenameInput
            value={renamingValue}
            onChange={setRenamingValue}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            inputRef={renameInputRef}
          />
        ) : (
          <div className={`text-sm font-semibold line-clamp-2 leading-tight text-center ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
            {title}
          </div>
        )}
      </div>
    </div>
  );
}
