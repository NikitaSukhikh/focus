import React from 'react';
import { Z_INDEX } from '../../../constants/zIndex';
import { TagsButton, TagsMenu, useTagsDropdown, TagColor } from './tags';

interface TopBarTagsProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onTagSelect?: (color: TagColor) => void;
}

// To be implemented in the future: tags button (hidden placeholder)
export const TopBarTags: React.FC<TopBarTagsProps> = ({ isOpen, onToggle, onTagSelect }) => {
  const dropdown = useTagsDropdown({ isOpenProp: isOpen, onToggle });

  const handleTagSelect = (color: TagColor) => {
    onTagSelect?.(color);
    dropdown.close();
  };

  return (
    <div className="relative" style={{ zIndex: Z_INDEX.DROPDOWN_MENU, display: 'none' }} aria-hidden="true">
      <TagsButton ref={dropdown.triggerRef} onClick={dropdown.toggleOpen} isActive={dropdown.isOpen} />
      <TagsMenu ref={dropdown.menuRef} isOpen={dropdown.isOpen} onSelect={handleTagSelect} />
    </div>
  );
};
