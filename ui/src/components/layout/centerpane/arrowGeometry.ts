// Arrow geometry helpers centralize anchor lookup and orthogonal path generation for graph-style tile linking.
import { ArrowAnchorRef, FocusRingEdge } from '@/components/layout/centerpane/types';

const STRAIGHT_EPSILON = 0.5;
const ARROW_CORNER_RADIUS = 14;
const EDGE_STUB_DISTANCE = 26;
const MIN_EDGE_STUB_DISTANCE = ARROW_CORNER_RADIUS + 2;

interface AnchorCandidate {
  anchor: ArrowAnchorRef;
  clientX: number;
  clientY: number;
}

const isFocusRingEdge = (value: string | undefined): value is FocusRingEdge => {
  return value === 'top' || value === 'right' || value === 'bottom' || value === 'left';
};

const getTileAnchorElements = (tileId: string): HTMLElement[] => {
  const selector = `[data-focus-ring-anchor][data-focus-ring-tile-id="${tileId}"]`;
  return Array.from(document.querySelectorAll<HTMLElement>(selector));
};

const toAnchorCandidate = (anchorEl: HTMLElement): AnchorCandidate | null => {
  const edge = anchorEl.dataset.focusRingEdge;
  const edgeIndexRaw = anchorEl.dataset.focusRingEdgeIndex;
  const tileId = anchorEl.dataset.focusRingTileId;
  const edgeIndex = Number(edgeIndexRaw);
  if (!tileId || !isFocusRingEdge(edge) || !Number.isInteger(edgeIndex)) {
    return null;
  }

  const rect = anchorEl.getBoundingClientRect();
  return {
    anchor: { tileId, edge, edgeIndex },
    clientX: rect.left + (rect.width / 2),
    clientY: rect.top + (rect.height / 2),
  };
};

export const findFocusRingTileIdAtClientPoint = (clientX: number, clientY: number): string | null => {
  const hits = document.elementsFromPoint(clientX, clientY);
  for (const element of hits) {
    const el = element as HTMLElement;
    const directTileId = el.dataset.focusRingTileId;
    if (directTileId) return directTileId;

    const root = el.closest('[data-focus-ring-root]') as HTMLElement | null;
    if (root?.dataset.focusRingTileId) {
      return root.dataset.focusRingTileId;
    }
  }
  return null;
};

export const getNearestAnchorForTile = (
  tileId: string,
  clientX: number,
  clientY: number,
  toCanvasCoords: (_clientX: number, _clientY: number) => { x: number; y: number }
): { anchor: ArrowAnchorRef; point: { x: number; y: number } } | null => {
  const candidates = getTileAnchorElements(tileId)
    .map((anchorEl) => toAnchorCandidate(anchorEl))
    .filter((candidate): candidate is AnchorCandidate => Boolean(candidate));
  if (!candidates.length) return null;

  let nearest = candidates[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const dx = candidate.clientX - clientX;
    const dy = candidate.clientY - clientY;
    const dist = Math.hypot(dx, dy);
    if (dist < nearestDistance) {
      nearest = candidate;
      nearestDistance = dist;
    }
  }

  return {
    anchor: nearest.anchor,
    point: toCanvasCoords(nearest.clientX, nearest.clientY),
  };
};

export const resolveAnchorCanvasPoint = (
  anchorRef: ArrowAnchorRef,
  toCanvasCoords: (_clientX: number, _clientY: number) => { x: number; y: number }
): { x: number; y: number } | null => {
  const selector = [
    `[data-focus-ring-anchor]`,
    `[data-focus-ring-tile-id="${anchorRef.tileId}"]`,
    `[data-focus-ring-edge="${anchorRef.edge}"]`,
    `[data-focus-ring-edge-index="${anchorRef.edgeIndex}"]`,
  ].join('');
  const anchorEl = document.querySelector<HTMLElement>(selector);
  if (!anchorEl) {
    const fallbackAnchor = getTileAnchorElements(anchorRef.tileId)
      .map((item) => toAnchorCandidate(item))
      .find((item): item is AnchorCandidate => Boolean(item));
    if (!fallbackAnchor) return null;
    return toCanvasCoords(fallbackAnchor.clientX, fallbackAnchor.clientY);
  }

  const rect = anchorEl.getBoundingClientRect();
  return toCanvasCoords(rect.left + (rect.width / 2), rect.top + (rect.height / 2));
};

const buildStraightPath = (start: { x: number; y: number }, end: { x: number; y: number }) =>
  `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

interface BuildArrowPathOptions {
  startEdge?: FocusRingEdge;
  endEdge?: FocusRingEdge;
  obstacles?: ArrowPathObstacle[];
}

export interface ArrowPathObstacle {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const edgeOutwardVector = (edge: FocusRingEdge): { x: number; y: number } => {
  switch (edge) {
    case 'top':
      return { x: 0, y: -1 };
    case 'right':
      return { x: 1, y: 0 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
  }
};

const distanceBetween = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

const appendPoint = (
  points: Array<{ x: number; y: number }>,
  point: { x: number; y: number }
) => {
  const last = points[points.length - 1];
  if (!last || distanceBetween(last, point) > STRAIGHT_EPSILON) {
    points.push(point);
  }
};

const isHorizontalSegment = (start: { x: number; y: number }, end: { x: number; y: number }) =>
  Math.abs(start.y - end.y) < STRAIGHT_EPSILON;

const isVerticalSegment = (start: { x: number; y: number }, end: { x: number; y: number }) =>
  Math.abs(start.x - end.x) < STRAIGHT_EPSILON;

const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  Math.min(aEnd, bEnd) - Math.max(aStart, bStart) > STRAIGHT_EPSILON;

const segmentIntersectsObstacle = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  obstacle: ArrowPathObstacle
) => {
  if (isHorizontalSegment(start, end)) {
    const y = start.y;
    if (y <= obstacle.top + STRAIGHT_EPSILON || y >= obstacle.bottom - STRAIGHT_EPSILON) return false;
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    return rangesOverlap(minX, maxX, obstacle.left, obstacle.right);
  }

  if (isVerticalSegment(start, end)) {
    const x = start.x;
    if (x <= obstacle.left + STRAIGHT_EPSILON || x >= obstacle.right - STRAIGHT_EPSILON) return false;
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return rangesOverlap(minY, maxY, obstacle.top, obstacle.bottom);
  }

  return false;
};

const segmentCrossesAnyObstacle = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  obstacles: ArrowPathObstacle[]
) => obstacles.some((obstacle) => segmentIntersectsObstacle(start, end, obstacle));

const buildSegmentDetour = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  obstacle: ArrowPathObstacle
): Array<{ x: number; y: number }> | null => {
  if (isHorizontalSegment(start, end)) {
    const upY = obstacle.top - STRAIGHT_EPSILON;
    const downY = obstacle.bottom + STRAIGHT_EPSILON;
    const candidates = [
      [start, { x: start.x, y: upY }, { x: end.x, y: upY }, end],
      [start, { x: start.x, y: downY }, { x: end.x, y: downY }, end],
    ];

    const valid = candidates
      .filter((candidate) => !segmentCrossesAnyObstacle(candidate[0], candidate[1], [obstacle])
        && !segmentCrossesAnyObstacle(candidate[1], candidate[2], [obstacle])
        && !segmentCrossesAnyObstacle(candidate[2], candidate[3], [obstacle]))
      .sort((a, b) => (
        (Math.abs(a[0].y - a[1].y) + Math.abs(a[2].y - a[3].y))
        - (Math.abs(b[0].y - b[1].y) + Math.abs(b[2].y - b[3].y))
      ));
    return valid[0] ?? null;
  }

  if (isVerticalSegment(start, end)) {
    const leftX = obstacle.left - STRAIGHT_EPSILON;
    const rightX = obstacle.right + STRAIGHT_EPSILON;
    const candidates = [
      [start, { x: leftX, y: start.y }, { x: leftX, y: end.y }, end],
      [start, { x: rightX, y: start.y }, { x: rightX, y: end.y }, end],
    ];

    const valid = candidates
      .filter((candidate) => !segmentCrossesAnyObstacle(candidate[0], candidate[1], [obstacle])
        && !segmentCrossesAnyObstacle(candidate[1], candidate[2], [obstacle])
        && !segmentCrossesAnyObstacle(candidate[2], candidate[3], [obstacle]))
      .sort((a, b) => (
        (Math.abs(a[0].x - a[1].x) + Math.abs(a[2].x - a[3].x))
        - (Math.abs(b[0].x - b[1].x) + Math.abs(b[2].x - b[3].x))
      ));
    return valid[0] ?? null;
  }

  return null;
};

const rerouteAroundObstacles = (
  rawPoints: Array<{ x: number; y: number }>,
  obstacles: ArrowPathObstacle[]
): Array<{ x: number; y: number }> => {
  if (rawPoints.length < 2 || obstacles.length === 0) return rawPoints;

  let points = rawPoints.slice();
  const maxIterations = Math.max(obstacles.length * 8, 24);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let didInsertDetour = false;

    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const blocking = obstacles.find((obstacle) => segmentIntersectsObstacle(start, end, obstacle));
      if (!blocking) continue;

      const detour = buildSegmentDetour(start, end, blocking);
      if (!detour) continue;

      points = simplifyOrthogonalPoints([
        ...points.slice(0, index),
        ...detour,
        ...points.slice(index + 2),
      ]);
      didInsertDetour = true;
      break;
    }

    if (!didInsertDetour) {
      return points;
    }
  }

  return points;
};

const simplifyOrthogonalPoints = (rawPoints: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> => {
  if (rawPoints.length <= 2) return rawPoints;
  const points: Array<{ x: number; y: number }> = [];

  rawPoints.forEach((point) => {
    appendPoint(points, point);
    while (points.length >= 3) {
      const a = points[points.length - 3];
      const b = points[points.length - 2];
      const c = points[points.length - 1];
      const horizontal = Math.abs(a.y - b.y) < STRAIGHT_EPSILON && Math.abs(b.y - c.y) < STRAIGHT_EPSILON;
      const vertical = Math.abs(a.x - b.x) < STRAIGHT_EPSILON && Math.abs(b.x - c.x) < STRAIGHT_EPSILON;

      // Remove 0-degree and backtracking turns so the route never overlays itself along the same segment.
      if (horizontal || vertical) {
        points.splice(points.length - 2, 1);
      } else {
        break;
      }
    }
  });

  return points;
};

const buildRoundedPath = (
  rawPoints: Array<{ x: number; y: number }>,
  options: { simplify?: boolean } = {}
): string => {
  const points = options.simplify === false ? rawPoints : simplifyOrthogonalPoints(rawPoints);
  if (points.length < 2) return `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;

  const commands: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];

    const inVector = { x: current.x - previous.x, y: current.y - previous.y };
    const outVector = { x: next.x - current.x, y: next.y - current.y };
    const inLength = Math.hypot(inVector.x, inVector.y);
    const outLength = Math.hypot(outVector.x, outVector.y);

    if (inLength < STRAIGHT_EPSILON || outLength < STRAIGHT_EPSILON) {
      commands.push(`L ${current.x} ${current.y}`);
      continue;
    }

    const inUnit = { x: inVector.x / inLength, y: inVector.y / inLength };
    const outUnit = { x: outVector.x / outLength, y: outVector.y / outLength };
    const cross = (inUnit.x * outUnit.y) - (inUnit.y * outUnit.x);
    const dot = (inUnit.x * outUnit.x) + (inUnit.y * outUnit.y);

    if (Math.abs(cross) < 0.001 || dot < -0.999) {
      commands.push(`L ${current.x} ${current.y}`);
      continue;
    }

    const inRadius = Math.max(0, Math.min(ARROW_CORNER_RADIUS, (inLength / 2) - STRAIGHT_EPSILON));
    const outRadius = Math.max(0, Math.min(ARROW_CORNER_RADIUS, (outLength / 2) - STRAIGHT_EPSILON));

    if (inRadius <= STRAIGHT_EPSILON && outRadius <= STRAIGHT_EPSILON) {
      commands.push(`L ${current.x} ${current.y}`);
      continue;
    }

    const beforeCorner = {
      x: current.x - (inUnit.x * inRadius),
      y: current.y - (inUnit.y * inRadius),
    };
    const afterCorner = {
      x: current.x + (outUnit.x * outRadius),
      y: current.y + (outUnit.y * outRadius),
    };

    commands.push(`L ${beforeCorner.x} ${beforeCorner.y}`);
    commands.push(`Q ${current.x} ${current.y} ${afterCorner.x} ${afterCorner.y}`);
  }

  const last = points[points.length - 1];
  commands.push(`L ${last.x} ${last.y}`);
  return commands.join(' ');
};

const buildEdgeAwarePath = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  options: BuildArrowPathOptions
): string => {
  const points = buildEdgeAwarePoints(start, end, options);
  // Keep start/end guide legs intact while allowing every corner to round.
  return buildRoundedPath(points, { simplify: false });
};

const buildEdgeAwarePoints = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  options: BuildArrowPathOptions
): Array<{ x: number; y: number }> => {
  const startOutward = options.startEdge ? edgeOutwardVector(options.startEdge) : null;
  const endOutward = options.endEdge ? edgeOutwardVector(options.endEdge) : null;
  const distance = distanceBetween(start, end);
  const stubDistance = Math.max(
    MIN_EDGE_STUB_DISTANCE,
    Math.min(EDGE_STUB_DISTANCE, Math.max(4, distance / 3))
  );

  const startGuide = startOutward
    ? {
        x: start.x + (startOutward.x * stubDistance),
        y: start.y + (startOutward.y * stubDistance),
      }
    : start;

  // End leg approaches the anchor from outside the tile so the arrowhead points into the target edge.
  const endGuide = endOutward
    ? {
        x: end.x + (endOutward.x * stubDistance),
        y: end.y + (endOutward.y * stubDistance),
      }
    : end;

  const points: Array<{ x: number; y: number }> = [];
  appendPoint(points, start);
  appendPoint(points, startGuide);

  const midDx = endGuide.x - startGuide.x;
  const midDy = endGuide.y - startGuide.y;
  if (Math.abs(midDx) >= STRAIGHT_EPSILON && Math.abs(midDy) >= STRAIGHT_EPSILON) {
    const horizontalFirst = Math.abs(midDx) >= Math.abs(midDy);
    appendPoint(
      points,
      horizontalFirst
        ? { x: endGuide.x, y: startGuide.y }
        : { x: startGuide.x, y: endGuide.y }
    );
  }

  appendPoint(points, endGuide);
  appendPoint(points, end);

  return rerouteAroundObstacles(points, options.obstacles ?? []);
};

export const countArrowSegments = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  options: BuildArrowPathOptions = {}
): number => {
  if (options.startEdge || options.endEdge) {
    // Mirror edge-aware rendering behavior and preserve guide legs in segment counting.
    const points = buildEdgeAwarePoints(start, end, options);
    return Math.max(points.length - 1, 1);
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return (Math.abs(dx) < STRAIGHT_EPSILON || Math.abs(dy) < STRAIGHT_EPSILON) ? 1 : 2;
};

export const buildArrowPath = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  options: BuildArrowPathOptions = {}
): string => {
  if (options.startEdge || options.endEdge) {
    return buildEdgeAwarePath(start, end, options);
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) < STRAIGHT_EPSILON || Math.abs(dy) < STRAIGHT_EPSILON) {
    return buildStraightPath(start, end);
  }

  const horizontalFirst = Math.abs(dx) >= Math.abs(dy);
  const corner = horizontalFirst
    ? { x: end.x, y: start.y }
    : { x: start.x, y: end.y };

  return buildRoundedPath([start, corner, end]);
};
