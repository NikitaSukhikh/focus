import React from 'react';
import { VideoEmbed } from '../../../../utils/videoEmbeds';
import { RenameInput } from './RenameInput';

interface VideoEmbedContentProps {
  videoEmbed: VideoEmbed;
  title: string;
  isRenaming: boolean;
  renamingValue: string;
  setRenamingValue: (value: string) => void;
  handleRenameKeyDown: (e: React.KeyboardEvent) => void;
  handleRenameSubmit: () => void;
  renameInputRef: React.RefObject<HTMLInputElement>;
  isSelected: boolean;
  hoverScaleClass: string;
}

export function VideoEmbedContent({
  videoEmbed,
  title,
  isRenaming,
  renamingValue,
  setRenamingValue,
  handleRenameKeyDown,
  handleRenameSubmit,
  renameInputRef,
  isSelected,
  hoverScaleClass,
}: VideoEmbedContentProps) {
  return (
    <div className={`w-full h-full flex flex-col gap-3 transition-transform duration-150 ${hoverScaleClass}`}>
      <div
        className="w-full rounded-lg overflow-hidden bg-black shadow-inner"
        style={{
          aspectRatio: '16 / 9',
          boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
          flexShrink: 0,
        }}
      >
        <iframe
          src={videoEmbed.embedUrl}
          title={title || 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            display: 'block',
            background: '#000',
          }}
        />
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
