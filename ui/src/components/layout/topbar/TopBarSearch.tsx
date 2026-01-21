import React from 'react';
import { Search } from 'lucide-react';
import { TOP_BAR } from '../../../constants/panesDimensions';
import { FONT_ROLES } from '../../../styles/fontManager';

interface TopBarSearchProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

// Hidden for current version.
export const TopBarSearch: React.FC<TopBarSearchProps> = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="relative" style={{ display: 'none' }} aria-hidden="true">
      <div
        className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
        style={{ paddingLeft: `${TOP_BAR.search.iconPaddingLeft}px` }}
      >
        <Search size={TOP_BAR.search.iconSize} style={{ color: 'var(--color-text-muted)' }} />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
        className="focus:outline-none"
        style={{
          ...FONT_ROLES.topbarControl,
          background: 'var(--glass-bg)',
          color: 'var(--color-text-primary)',
          border: `${TOP_BAR.search.inputBorderWidth}px solid var(--color-border-subtle)`,
          width: `${TOP_BAR.search.inputWidth}px`,
          padding: `${TOP_BAR.search.inputPaddingY}px ${TOP_BAR.search.inputPaddingRight}px ${TOP_BAR.search.inputPaddingY}px ${TOP_BAR.search.inputPaddingLeft}px`,
          borderRadius: `${TOP_BAR.search.inputBorderRadius}px`,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary-color)';
          e.currentTarget.style.boxShadow = `0 0 ${TOP_BAR.search.focusShadowBlur}px var(--shadow)`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
};

