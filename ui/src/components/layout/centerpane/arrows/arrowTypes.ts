// Shared arrow-layer types keep center-pane arrow modules aligned on routing and menu state.
import type { ArrowPathObstacle } from '@/components/layout/centerpane/arrows/arrowGeometry';

export interface TileMetricsSnapshot {
  width: number;
  height: number;
  contentInset: number;
  isCentered: boolean;
}

export interface ArrowTileObstacle extends ArrowPathObstacle {
  tileId: string;
}

export interface ArrowContextMenuState {
  x: number;
  y: number;
  arrowId: string;
}
