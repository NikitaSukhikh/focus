import React, { forwardRef } from 'react';
import { Tag } from 'lucide-react';
import { FONT_ROLES } from '../../../../styles/fontManager';
import { Z_INDEX } from '../../../../constants/zIndex';
import { TagColor } from '../../../../types/tags';

export interface TagsMenuProps {
  isOpen: boolean;
  onSelect?: (color: TagColor) => void;
}

const TAG_OPTIONS: Array<{ id: TagColor; label: string; color: string }> = [
  { id: 'green', label: 'Green tag', color: '#22c55e' },
  { id: 'blue', label: 'Blue tag', color: '#3b82f6' },
  { id: 'yellow', label: 'Yellow tag', color: '#eab308' },
  { id: 'red', label: 'Red tag', color: '#ef4444' },
];

export const TagsMenu = forwardRef<HTMLDivElement, TagsMenuProps>(({ isOpen, onSelect }, ref) => {
  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 mt-2 w-44 rounded-lg overflow-hidden"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--color-border-subtle)',
        boxShadow: 'var(--shadow-strong)',
        zIndex: Z_INDEX.DROPDOWN_MENU,
        backdropFilter: 'var(--glass-blur)',
      }}
      role="menu"
    >
      <div className="py-1">
        {TAG_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="menuitem"
            onClick={() => onSelect?.(option.id)}
            className="w-full px-3 py-2 flex items-center gap-3 transition-colors text-left"
            style={{
              color: 'var(--color-text-primary)',
              ...FONT_ROLES.topbarControl,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span
              className="flex items-center justify-center w-6 h-6 rounded-md"
              style={{ background: `${option.color}1a`, color: option.color, border: `1px solid ${option.color}33` }}
            >
              <Tag size={16} color={option.color} />
            </span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

TagsMenu.displayName = 'TagsMenu';
