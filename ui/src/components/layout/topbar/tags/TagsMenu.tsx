import { forwardRef } from 'react';
import { Tag } from 'lucide-react';
import { TOP_BAR } from '@/constants/panesDimensions';
import { FONT_ROLES } from '@/styles/fontManager';
import { Z_INDEX } from '@/constants/zIndex';
import { TagColor } from '@/types/tags';

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
      className="absolute right-0 rounded-lg overflow-hidden"
      style={{
        background: 'var(--glass-bg)',
        border: `${TOP_BAR.tags.menuBorderWidth}px solid var(--color-border-subtle)`,
        boxShadow: 'var(--shadow-strong)',
        zIndex: Z_INDEX.DROPDOWN_MENU,
        backdropFilter: 'var(--glass-blur)',
        marginTop: `${TOP_BAR.tags.menuOffsetY}px`,
        width: `${TOP_BAR.tags.menuWidth}px`,
      }}
      role="menu"
    >
      <div style={{ padding: `${TOP_BAR.tags.menuPaddingY}px 0` }}>
        {TAG_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="menuitem"
            onClick={() => onSelect?.(option.id)}
            className="w-full flex items-center transition-colors text-left"
            style={{
              color: 'var(--color-text-primary)',
              ...FONT_ROLES.topbarControl,
              padding: `${TOP_BAR.tags.menuItemPaddingY}px ${TOP_BAR.tags.menuItemPaddingX}px`,
              columnGap: `${TOP_BAR.tags.menuItemGap}px`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span
              className="flex items-center justify-center"
              style={{
                background: `${option.color}1a`,
                color: option.color,
                border: `${TOP_BAR.tags.menuIconBorderWidth}px solid ${option.color}33`,
                width: `${TOP_BAR.tags.menuIconBox}px`,
                height: `${TOP_BAR.tags.menuIconBox}px`,
                borderRadius: `${TOP_BAR.tags.menuIconRadius}px`,
              }}
            >
              <Tag size={TOP_BAR.tags.menuIconSize} color={option.color} />
            </span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

TagsMenu.displayName = 'TagsMenu';

