import { TILE_RING } from '@/styles/tileStyles';

export const ARROW_SETTINGS = {
  color: '#3b82f6',
  strokeWidth: TILE_RING.strokeWidth,
  clickAreaPadding: 6,
  opacity: {
    normal: 'var(--icon-opacity, 1)',
    draft: 0.5,
  },
  marker: {
    id: 'center-pane-arrowhead',
    width: 12,
    height: 12,
    refX: 10,
    refY: 6,
    path: 'M0 0 L12 6 L0 12 L3 6 Z',
  },
} as const;
