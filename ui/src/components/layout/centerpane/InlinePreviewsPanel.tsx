// InlinePreviewsPanel renders rich previews for multi-selected link tiles while keeping canvas orchestration focused.
import React, { useMemo } from 'react';
import type { DroppedIcon } from '@/components/layout/centerpane/types';
import { FONT_ROLES } from '@/styles/fontManager';
import { getVideoEmbed } from '@/utils/videoEmbeds';

interface InlinePreviewsPanelProps {
  selectedIcons: DroppedIcon[];
  inlinePreviewLimit?: number;
}

export const InlinePreviewsPanel = ({ selectedIcons, inlinePreviewLimit = 6 }: InlinePreviewsPanelProps) => {
  const inlinePreviewIcons = useMemo(
    () => selectedIcons.slice(0, inlinePreviewLimit),
    [inlinePreviewLimit, selectedIcons]
  );
  const hiddenInlinePreviewCount = Math.max(0, selectedIcons.length - inlinePreviewIcons.length);

  if (selectedIcons.length <= 1) return null;

  return (
    <div
      className="border-t border-slate-200 bg-white/70 backdrop-blur-sm p-4 space-y-4"
      style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)' }}
    >
      <div style={{ ...FONT_ROLES.paneSubtitle, color: 'var(--color-text-muted)' }}>
        Inline previews ({selectedIcons.length})
      </div>
      {hiddenInlinePreviewCount > 0 && (
        <div className="text-xs text-slate-500" style={{ ...FONT_ROLES.paneBodyMuted }}>
          Showing first {inlinePreviewLimit} items - {hiddenInlinePreviewCount} more selected.
        </div>
      )}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        }}
      >
        {inlinePreviewIcons.map((icon) => {
          const embed = getVideoEmbed(icon.url);
          if (!embed) {
            return (
              <div
                key={icon.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 flex flex-col gap-2"
              >
                <div className="text-sm font-semibold text-slate-800 line-clamp-2">{icon.title}</div>
                <div className="text-xs text-slate-500">No inline preview available for this link.</div>
              </div>
            );
          }

          return (
            <div
              key={icon.id}
              className="rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
            >
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src={embed.embedUrl}
                  title={icon.title || 'Preview'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    border: 0,
                    background: '#000',
                  }}
                />
              </div>
              <div className="p-3 text-sm font-semibold text-slate-800 line-clamp-2">{icon.title}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
