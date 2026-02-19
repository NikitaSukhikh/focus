// Centralized arrow constants keep visual interaction tuning consistent across arrow modules.
import { ARROW_SETTINGS } from '@/styles/arrowSettings';

export const FOCUS_RING_DOTS_PER_EDGE = 3;
export const ARROW_ENDPOINT_DOT_OPACITY = 0;
export const ARROW_ROUTE_OBSTACLE_PADDING = 8;
export const ARROW_SEGMENT_EPSILON = 0.5;

export const ARROW_ENDPOINT_SEGMENT_HANDLE_WIDTH = Math.max(
  ARROW_SETTINGS.strokeWidth + (ARROW_SETTINGS.clickAreaPadding * 2),
  18
);
