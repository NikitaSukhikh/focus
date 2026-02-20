// Endpoint segment handles expose wider hit areas so arrow retargeting stays precise and easy to grab.
import { ARROW_SEGMENT_EPSILON } from '@/components/layout/centerpane/arrows/constants';

export interface EndpointSegmentHandle {
  endpoint: 'start' | 'end';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  segmentIndex: number;
  orientation: 'horizontal' | 'vertical';
  isEndpointSegment: boolean;
}

type Point = { x: number; y: number };
type OrthogonalDirection = 'right' | 'left' | 'down' | 'up';

const segmentLength = (start: Point, end: Point): number => Math.hypot(end.x - start.x, end.y - start.y);
const isClose = (a: number, b: number): boolean => Math.abs(a - b) <= ARROW_SEGMENT_EPSILON;

const getOrthogonalDirection = (start: Point, end: Point): OrthogonalDirection | null => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) <= ARROW_SEGMENT_EPSILON && Math.abs(dy) <= ARROW_SEGMENT_EPSILON) return null;
  if (Math.abs(dx) <= ARROW_SEGMENT_EPSILON) return dy > 0 ? 'down' : 'up';
  if (Math.abs(dy) <= ARROW_SEGMENT_EPSILON) return dx > 0 ? 'right' : 'left';
  return null;
};

const toEndpointSegmentHandle = (
  endpoint: 'start' | 'end',
  start: Point,
  end: Point,
  segmentIndex: number,
  isEndpointSegment: boolean
): EndpointSegmentHandle | null => {
  const length = segmentLength(start, end);
  if (length <= ARROW_SEGMENT_EPSILON) return null;

  const direction = getOrthogonalDirection(start, end);
  if (!direction) return null;

  const orientation = (direction === 'left' || direction === 'right') ? 'horizontal' : 'vertical';

  return {
    endpoint,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    segmentIndex,
    orientation,
    isEndpointSegment,
  };
};

export const buildEndpointSegmentHandles = (routePoints: Point[]): EndpointSegmentHandle[] => {
  if (routePoints.length < 2) return [];

  let startSegmentIndex: number | null = null;
  for (let index = 0; index < routePoints.length - 1; index += 1) {
    if (segmentLength(routePoints[index], routePoints[index + 1]) > ARROW_SEGMENT_EPSILON) {
      startSegmentIndex = index;
      break;
    }
  }

  let endSegmentIndex: number | null = null;
  for (let index = routePoints.length - 2; index >= 0; index -= 1) {
    if (segmentLength(routePoints[index], routePoints[index + 1]) > ARROW_SEGMENT_EPSILON) {
      endSegmentIndex = index;
      break;
    }
  }

  if (startSegmentIndex === null || endSegmentIndex === null) return [];

  const startPoint = routePoints[startSegmentIndex];
  const startDirection = getOrthogonalDirection(routePoints[startSegmentIndex], routePoints[startSegmentIndex + 1]);
  if (!startDirection) return [];

  let startTurnPoint = routePoints[startSegmentIndex + 1];
  for (let index = startSegmentIndex + 1; index < routePoints.length - 1; index += 1) {
    const direction = getOrthogonalDirection(routePoints[index], routePoints[index + 1]);
    if (direction !== startDirection) break;
    startTurnPoint = routePoints[index + 1];
  }

  const endPoint = routePoints[endSegmentIndex + 1];
  const endDirection = getOrthogonalDirection(routePoints[endSegmentIndex], routePoints[endSegmentIndex + 1]);
  if (!endDirection) return [];

  let endTurnPoint = routePoints[endSegmentIndex];
  for (let index = endSegmentIndex - 1; index >= 0; index -= 1) {
    const direction = getOrthogonalDirection(routePoints[index], routePoints[index + 1]);
    if (direction !== endDirection) break;
    endTurnPoint = routePoints[index];
  }

  const handles: EndpointSegmentHandle[] = [];
  const isSameRun = isClose(startPoint.x, endTurnPoint.x)
    && isClose(startPoint.y, endTurnPoint.y)
    && isClose(startTurnPoint.x, endPoint.x)
    && isClose(startTurnPoint.y, endPoint.y);

  if (isSameRun) {
    // Split single-run paths to keep start/end endpoint drag targets independently reachable.
    const midpoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2,
    };
    const startHandle = toEndpointSegmentHandle('start', startPoint, midpoint, startSegmentIndex, true);
    const endHandle = toEndpointSegmentHandle('end', endPoint, midpoint, endSegmentIndex, true);
    if (startHandle) handles.push(startHandle);
    if (endHandle) handles.push(endHandle);
    return handles;
  }

  const startHandle = toEndpointSegmentHandle('start', startPoint, startTurnPoint, startSegmentIndex, true);
  const endHandle = toEndpointSegmentHandle('end', endPoint, endTurnPoint, endSegmentIndex, true);
  if (startHandle) handles.push(startHandle);
  if (endHandle) handles.push(endHandle);
  return handles;
};
