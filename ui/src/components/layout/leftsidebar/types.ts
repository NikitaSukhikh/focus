export interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onResizeStart: React.MouseEventHandler<HTMLDivElement>;
  highlightedSpaceId?: string | null;
}

export interface SpaceItemProps {
  id: string;
  name: string;
  isActive?: boolean;
  isHighlighted?: boolean;
  isEditing?: boolean;
  onRename: (_id: string, _newName: string) => void;
  onDuplicate: (_id: string) => void;
  onDelete: (_id: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onClick: () => void;
}
