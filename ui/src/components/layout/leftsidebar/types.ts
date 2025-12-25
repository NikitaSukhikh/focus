export interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onResizeStart: React.MouseEventHandler<HTMLDivElement>;
}

export interface IslandItemProps {
  id: string;
  name: string;
  count: number;
  isActive?: boolean;
  isEditing?: boolean;
  onRename: (id: string, newName: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onClick: () => void;
}
