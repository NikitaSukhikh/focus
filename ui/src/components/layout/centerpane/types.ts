import type React from 'react';

export type IconKind =
  | 'link'
  | 'file'
  | 'gmail'
  | 'google_drive'
  | 'google_sheets'
  | 'google_docs'
  | 'google_slides'
  | 'text'
  | 'telegram'
  | 'intstorage'
  | 'unknown';

export interface DroppedIcon {
  id: string;
  type: IconKind;
  title: string;
  x: number;
  y: number;
  serviceKey?: string; // To track specific Google services like 'sheets', 'docs', 'slides'
  url?: string; // For link objects
  description?: string; // For all objects
  faviconUrl?: string;
  service?: string;
  filePath?: string; // For file objects - path to original file
  content?: string; // For text type objects - stores note content
}

export interface PreviewTarget {
  url?: string;
  title?: string;
  tileId?: string;
  filePath?: string;
  type?: IconKind;
  content?: string; // For text type objects - note content for preview
}

export interface CenterPaneProps {
  onObjectClick?: (_target: PreviewTarget) => void;
  onCanvasEmptyClick?: () => void;
  showGrid?: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onOpenQuickAdd?: () => void;
}

export interface CenterPaneHandle {
  addFiles: () => Promise<void>;
}

export interface IconTileProps {
  id: string;
  type: IconKind;
  title: string;
  x: number;
  y: number;
  url?: string;
  description?: string;
  faviconUrl?: string;
  filePath?: string;
  content?: string;
  isSelected?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onPositionChange?: (_x: number, _y: number) => void;
  onDelete?: () => void;
  onRename?: (_newTitle: string) => void;
  onRefreshMetadata?: () => void;
  onEdit?: (_x: number, _y: number, _content: string, _id: string) => void;
}
