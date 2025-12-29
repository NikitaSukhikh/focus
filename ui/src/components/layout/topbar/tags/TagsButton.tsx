import React, { forwardRef } from 'react';
import { Tag } from 'lucide-react';
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
    className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
    style={{
      background: isActive ? 'var(--glass-bg)' : 'transparent',
      color: isActive ? 'var(--primary-color)' : 'var(--color-text-secondary)',
      border: isActive ? '1px solid var(--color-border-strong)' : '1px solid transparent',
      boxShadow: isActive ? '0 0 10px var(--shadow)' : 'none',
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
    <Tag size={18} />
    <span style={{ ...FONT_ROLES.topbarControl, color: 'inherit' }}>Tags</span>
  </button>
));

TagsButton.displayName = 'TagsButton';
