import React, { forwardRef } from 'react';
import { Tag } from 'lucide-react';
import { TOP_BAR } from '../../../../constants/panesDimensions';
import { FONT_ROLES } from '../../../../styles/fontManager';

export interface TagsButtonProps {
  onClick?: () => void;
  isActive?: boolean;
}

export const TagsButton = forwardRef<HTMLButtonElement, TagsButtonProps>(({ onClick, isActive = false }, ref) => (
  <button
    type="button"
    ref={ref}
    onClick={onClick}
    aria-pressed={isActive}
    aria-haspopup="menu"
    aria-expanded={isActive}
    className="flex items-center rounded-lg transition-colors"
    style={{
      background: isActive ? 'var(--glass-bg)' : 'transparent',
      color: isActive ? 'var(--primary-color)' : 'var(--color-text-secondary)',
      border: isActive
        ? `${TOP_BAR.tags.buttonBorderWidth}px solid var(--color-border-strong)`
        : `${TOP_BAR.tags.buttonBorderWidth}px solid transparent`,
      boxShadow: isActive ? `0 0 ${TOP_BAR.tags.buttonActiveShadowBlur}px var(--shadow)` : 'none',
      columnGap: `${TOP_BAR.tags.buttonGap}px`,
      padding: `${TOP_BAR.tags.buttonPaddingY}px ${TOP_BAR.tags.buttonPaddingX}px`,
    }}
    onMouseEnter={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = 'var(--glass-bg)';
        e.currentTarget.style.color = 'var(--primary-color)';
      }
    }}
    onMouseLeave={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--color-text-secondary)';
      }
    }}
    title="Manage tags"
  >
    <Tag size={TOP_BAR.tags.iconSize} />
    <span style={{ ...FONT_ROLES.topbarControl, color: 'inherit' }}>Tags</span>
  </button>
));

TagsButton.displayName = 'TagsButton';

