// Arrow geometry helpers centralize anchor lookup and orthogonal path generation for graph-style tile linking.
import { ArrowAnchorRef, FocusRingEdge } from '@/components/layout/centerpane/types';

const STRAIGHT_EPSILON = 0.5;
const ARROW_CORNER_RADIUS = 14;
const EDGE_STUB_DISTANCE = 26;

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

const getTileAnchorCandidates = (tileId: string): AnchorCandidate[] =>
  getTileAnchorElements(tileId)
    .map((anchorEl) => toAnchorCandidate(anchorEl))
    .filter((candidate): candidate is AnchorCandidate => Boolean(candidate));

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
const average = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

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

    // Endpoint retargeting should still resolve a tile when pointer is over tile content,
    // not only when hovering focus-ring hitboxes.
    const directIconTileId = el.dataset.iconTileId;
    if (directIconTileId) return directIconTileId;

    const iconTileRoot = el.closest('[data-icon-tile-id]') as HTMLElement | null;
    if (iconTileRoot?.dataset.iconTileId) {
      return iconTileRoot.dataset.iconTileId;
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
  const candidates = getTileAnchorCandidates(tileId);
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

export const getNearestPointOnTileFocusRing = (
  tileId: string,
  clientX: number,
  clientY: number,
  toCanvasCoords: (_clientX: number, _clientY: number) => { x: number; y: number }
): { edge: FocusRingEdge; point: { x: number; y: number } } | null => {
  const candidates = getTileAnchorCandidates(tileId);
  if (!candidates.length) return null;

  const top = candidates.filter((candidate) => candidate.anchor.edge === 'top');
  const right = candidates.filter((candidate) => candidate.anchor.edge === 'right');
  const bottom = candidates.filter((candidate) => candidate.anchor.edge === 'bottom');
  const left = candidates.filter((candidate) => candidate.anchor.edge === 'left');

  if (!top.length || !right.length || !bottom.length || !left.length) {
    const fallback = getNearestAnchorForTile(tileId, clientX, clientY, toCanvasCoords);
    if (!fallback) return null;
    return { edge: fallback.anchor.edge, point: fallback.point };
  }

  const ringTop = average(top.map((candidate) => candidate.clientY));
  const ringRight = average(right.map((candidate) => candidate.clientX));
  const ringBottom = average(bottom.map((candidate) => candidate.clientY));
  const ringLeft = average(left.map((candidate) => candidate.clientX));

  const projections: Array<{ edge: FocusRingEdge; clientX: number; clientY: number }> = [
    {
      edge: 'top',
      clientX: clamp(clientX, ringLeft, ringRight),
      clientY: ringTop,
    },
    {
      edge: 'right',
      clientX: ringRight,
      clientY: clamp(clientY, ringTop, ringBottom),
    },
    {
      edge: 'bottom',
      clientX: clamp(clientX, ringLeft, ringRight),
      clientY: ringBottom,
    },
    {
      edge: 'left',
      clientX: ringLeft,
      clientY: clamp(clientY, ringTop, ringBottom),
    },
  ];

  let nearest = projections[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  projections.forEach((projection) => {
    const distance = Math.hypot(projection.clientX - clientX, projection.clientY - clientY);
    if (distance < nearestDistance) {
      nearest = projection;
      nearestDistance = distance;
    }
  });

  return {
    edge: nearest.edge,
    point: toCanvasCoords(nearest.clientX, nearest.clientY),
  };
};

interface AnchorPairSelectionResult {
  start: { anchor: ArrowAnchorRef; point: { x: number; y: number } };
  end: { anchor: ArrowAnchorRef; point: { x: number; y: number } };
}

export interface RouteAnchorCandidate {
  anchor: ArrowAnchorRef;
  point: { x: number; y: number };
  scoreOffset?: number;
}

export const getBestAnchorPairForRoute = (
  startCandidates: RouteAnchorCandidate[],
  endCandidates: RouteAnchorCandidate[],
  options: { obstacles?: ArrowPathObstacle[] } = {}
): AnchorPairSelectionResult | null => {
  if (!startCandidates.length || !endCandidates.length) return null;

  const obstacles = options.obstacles ?? [];
  let best: AnchorPairSelectionResult | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  startCandidates.forEach((startCandidate) => {
    endCandidates.forEach((endCandidate) => {
      const routePoints = buildEdgeAwarePoints(startCandidate.point, endCandidate.point, {
        startEdge: startCandidate.anchor.edge,
        endEdge: endCandidate.anchor.edge,
        obstacles,
      });
      const routeScore = scoreEdgeRoute(routePoints, obstacles);
      const score = routeScore.score + (startCandidate.scoreOffset ?? 0) + (endCandidate.scoreOffset ?? 0);

      if (score < bestScore) {
        bestScore = score;
        best = {
          start: { anchor: startCandidate.anchor, point: startCandidate.point },
          end: { anchor: endCandidate.anchor, point: endCandidate.point },
        };
      }
    });
  });

  return best;
};

export const getBestAnchorPairForTiles = (
  startTileId: string,
  endTileId: string,
  startClientPoint: { x: number; y: number },
  endClientPoint: { x: number; y: number },
  toCanvasCoords: (_clientX: number, _clientY: number) => { x: number; y: number }
): AnchorPairSelectionResult | null => {
  if (startTileId === endTileId) return null;

  const startCandidates = getTileAnchorCandidates(startTileId);
  const endCandidates = getTileAnchorCandidates(endTileId);
  if (!startCandidates.length || !endCandidates.length) return null;

  const startRouteCandidates: RouteAnchorCandidate[] = startCandidates.map((startCandidate) => ({
    anchor: startCandidate.anchor,
    point: toCanvasCoords(startCandidate.clientX, startCandidate.clientY),
    scoreOffset: Math.hypot(
      startCandidate.clientX - startClientPoint.x,
      startCandidate.clientY - startClientPoint.y
    ) * 25,
  }));
  const endRouteCandidates: RouteAnchorCandidate[] = endCandidates.map((endCandidate) => ({
    anchor: endCandidate.anchor,
    point: toCanvasCoords(endCandidate.clientX, endCandidate.clientY),
    scoreOffset: Math.hypot(
      endCandidate.clientX - endClientPoint.x,
      endCandidate.clientY - endClientPoint.y
    ) * 25,
  }));

  return getBestAnchorPairForRoute(startRouteCandidates, endRouteCandidates);
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

  interface RoundedCornerMeta {
    inUnit: { x: number; y: number };
    outUnit: { x: number; y: number };
  }

  const cornerMeta = new Map<number, RoundedCornerMeta>();
  const cornerRadii = new Array<number>(points.length).fill(0);
  const segmentLengths = new Array<number>(Math.max(points.length - 1, 0)).fill(0);

  for (let index = 0; index < points.length - 1; index += 1) {
    segmentLengths[index] = distanceBetween(points[index], points[index + 1]);
  }

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const inVector = { x: current.x - previous.x, y: current.y - previous.y };
    const outVector = { x: next.x - current.x, y: next.y - current.y };
    const inLength = Math.hypot(inVector.x, inVector.y);
    const outLength = Math.hypot(outVector.x, outVector.y);

    if (inLength < STRAIGHT_EPSILON || outLength < STRAIGHT_EPSILON) {
      continue;
    }

    const inUnit = { x: inVector.x / inLength, y: inVector.y / inLength };
    const outUnit = { x: outVector.x / outLength, y: outVector.y / outLength };
    const cross = (inUnit.x * outUnit.y) - (inUnit.y * outUnit.x);
    const dot = (inUnit.x * outUnit.x) + (inUnit.y * outUnit.y);

    if (Math.abs(cross) < 0.001 || dot < -0.999) {
      continue;
    }

    cornerMeta.set(index, { inUnit, outUnit });
    cornerRadii[index] = Math.max(
      0,
      Math.min(
        ARROW_CORNER_RADIUS,
        inLength - STRAIGHT_EPSILON,
        outLength - STRAIGHT_EPSILON
      )
    );
  }

  // Keep corner radii as constant as possible while sharing limited segment space.
  const maxIterations = Math.max(points.length * 2, 8);
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let didChange = false;

    for (let segmentIndex = 0; segmentIndex < segmentLengths.length; segmentIndex += 1) {
      const available = Math.max(0, segmentLengths[segmentIndex] - STRAIGHT_EPSILON);
      const leftRadius = cornerRadii[segmentIndex] ?? 0;
      const rightRadius = cornerRadii[segmentIndex + 1] ?? 0;
      const total = leftRadius + rightRadius;
      if (total <= available + STRAIGHT_EPSILON) {
        continue;
      }

      if (available <= STRAIGHT_EPSILON) {
        if (leftRadius > 0) {
          cornerRadii[segmentIndex] = 0;
          didChange = true;
        }
        if (rightRadius > 0) {
          cornerRadii[segmentIndex + 1] = 0;
          didChange = true;
        }
        continue;
      }

      const scale = available / total;
      const nextLeft = leftRadius * scale;
      const nextRight = rightRadius * scale;
      if (
        Math.abs(nextLeft - leftRadius) > STRAIGHT_EPSILON / 100
        || Math.abs(nextRight - rightRadius) > STRAIGHT_EPSILON / 100
      ) {
        cornerRadii[segmentIndex] = nextLeft;
        cornerRadii[segmentIndex + 1] = nextRight;
        didChange = true;
      }
    }

    if (!didChange) {
      break;
    }
  }

  const commands: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const radius = cornerRadii[index] ?? 0;
    const meta = cornerMeta.get(index);
    if (!meta || radius <= STRAIGHT_EPSILON) {
      commands.push(`L ${current.x} ${current.y}`);
      continue;
    }

    const beforeCorner = {
      x: current.x - (meta.inUnit.x * radius),
      y: current.y - (meta.inUnit.y * radius),
    };
    const afterCorner = {
      x: current.x + (meta.outUnit.x * radius),
      y: current.y + (meta.outUnit.y * radius),
    };

    commands.push(`L ${beforeCorner.x} ${beforeCorner.y}`);
    commands.push(`Q ${current.x} ${current.y} ${afterCorner.x} ${afterCorner.y}`);
  }

  const last = points[points.length - 1];
  commands.push(`L ${last.x} ${last.y}`);
  return commands.join(' ');
};

type CardinalDirection = 'left' | 'right' | 'up' | 'down';

const segmentDirection = (
  start: { x: number; y: number },
  end: { x: number; y: number }
): CardinalDirection | null => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const horizontal = Math.abs(dx) >= STRAIGHT_EPSILON;
  const vertical = Math.abs(dy) >= STRAIGHT_EPSILON;

  if (horizontal && vertical) return null;
  if (!horizontal && !vertical) return null;
  if (horizontal) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
};

const isOppositeDirection = (first: CardinalDirection, second: CardinalDirection): boolean => {
  return (first === 'left' && second === 'right')
    || (first === 'right' && second === 'left')
    || (first === 'up' && second === 'down')
    || (first === 'down' && second === 'up');
};

const buildEdgeCandidatePoints = (
  start: { x: number; y: number },
  startGuide: { x: number; y: number },
  endGuide: { x: number; y: number },
  end: { x: number; y: number },
  bridgePoints: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> => {
  const points: Array<{ x: number; y: number }> = [];
  appendPoint(points, start);
  appendPoint(points, startGuide);
  bridgePoints.forEach((point) => appendPoint(points, point));
  appendPoint(points, endGuide);
  appendPoint(points, end);
  return points;
};

const buildGuideRouteCandidates = (
  startGuide: { x: number; y: number },
  endGuide: { x: number; y: number },
  stubDistance: number,
  includeDetours: boolean
): Array<Array<{ x: number; y: number }>> => {
  const candidates: Array<Array<{ x: number; y: number }>> = [];
  const dx = endGuide.x - startGuide.x;
  const dy = endGuide.y - startGuide.y;
  const alignedX = Math.abs(dx) < STRAIGHT_EPSILON;
  const alignedY = Math.abs(dy) < STRAIGHT_EPSILON;

  if (alignedX || alignedY) {
    candidates.push([]);
  } else {
    candidates.push([{ x: endGuide.x, y: startGuide.y }]);
    candidates.push([{ x: startGuide.x, y: endGuide.y }]);
  }

  if (!includeDetours) {
    return candidates;
  }

  const guideDistance = distanceBetween(startGuide, endGuide);
  const laneOffset = Math.max(
    ARROW_CORNER_RADIUS + 2,
    Math.min(EDGE_STUB_DISTANCE, Math.max(stubDistance, guideDistance / 2))
  );
  const minX = Math.min(startGuide.x, endGuide.x) - laneOffset;
  const maxX = Math.max(startGuide.x, endGuide.x) + laneOffset;
  const minY = Math.min(startGuide.y, endGuide.y) - laneOffset;
  const maxY = Math.max(startGuide.y, endGuide.y) + laneOffset;

  candidates.push(
    [{ x: minX, y: startGuide.y }, { x: minX, y: endGuide.y }],
    [{ x: maxX, y: startGuide.y }, { x: maxX, y: endGuide.y }],
    [{ x: startGuide.x, y: minY }, { x: endGuide.x, y: minY }],
    [{ x: startGuide.x, y: maxY }, { x: endGuide.x, y: maxY }]
  );

  return candidates;
};

const countPocketLoops = (directions: CardinalDirection[]): number => {
  let loops = 0;
  for (let index = 0; index <= directions.length - 3; index += 1) {
    if (isOppositeDirection(directions[index], directions[index + 2])) {
      loops += 1;
    }
  }
  return loops;
};

interface EdgeRouteScore {
  score: number;
  reversals: number;
  pocketLoops: number;
  guidePocketLoops: number;
  nonOrthogonal: number;
  obstacleCrossings: number;
}

const scoreEdgeRoute = (
  points: Array<{ x: number; y: number }>,
  obstacles: ArrowPathObstacle[]
): EdgeRouteScore => {
  let length = 0;
  let turns = 0;
  let reversals = 0;
  let nonOrthogonal = 0;
  let obstacleCrossings = 0;
  let repeatedVertices = 0;
  let previousDirection: CardinalDirection | null = null;
  const directions: CardinalDirection[] = [];
  const visitedPointIndex = new Map<string, number>();

  points.forEach((point, index) => {
    const key = `${Math.round(point.x / STRAIGHT_EPSILON)}:${Math.round(point.y / STRAIGHT_EPSILON)}`;
    const previousVisit = visitedPointIndex.get(key);
    if (previousVisit !== undefined && Math.abs(index - previousVisit) > 1) {
      repeatedVertices += 1;
    }
    if (previousVisit === undefined) {
      visitedPointIndex.set(key, index);
    }
  });

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const direction = segmentDirection(start, end);

    if (!direction) {
      nonOrthogonal += 1;
      continue;
    }

    directions.push(direction);
    length += Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
    if (previousDirection) {
      if (isOppositeDirection(previousDirection, direction)) {
        reversals += 1;
      } else if (previousDirection !== direction) {
        turns += 1;
      }
    }
    previousDirection = direction;

    if (obstacles.length > 0 && segmentCrossesAnyObstacle(start, end, obstacles)) {
      obstacleCrossings += 1;
    }
  }

  const pocketLoops = countPocketLoops(directions);
  const guidePocketLoops = (() => {
    if (directions.length < 3) return 0;
    let loops = 0;
    if (isOppositeDirection(directions[0], directions[2])) {
      loops += 1;
    }
    const last = directions.length - 1;
    if (isOppositeDirection(directions[last], directions[last - 2])) {
      loops += 1;
    }
    return loops;
  })();
  const score = (nonOrthogonal * 5_000_000)
    + (reversals * 1_000_000)
    + (repeatedVertices * 400_000)
    + (pocketLoops * 250_000)
    + (guidePocketLoops * 1_500_000)
    + (obstacleCrossings * 100_000)
    + (turns * 1_000)
    + length;

  return {
    score,
    reversals,
    pocketLoops,
    guidePocketLoops,
    nonOrthogonal,
    obstacleCrossings,
  };
};

const buildEdgeAwarePoints = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  options: BuildArrowPathOptions
): Array<{ x: number; y: number }> => {
  const startOutward = options.startEdge ? edgeOutwardVector(options.startEdge) : null;
  const endOutward = options.endEdge ? edgeOutwardVector(options.endEdge) : null;
  const distance = distanceBetween(start, end);
  const stubDistance = Math.min(EDGE_STUB_DISTANCE, Math.max(4, distance / 3));

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

  const obstacles = options.obstacles ?? [];

  const pickBestRoute = (candidates: Array<Array<{ x: number; y: number }>>) => {
    let bestPoints = buildEdgeCandidatePoints(start, startGuide, endGuide, end, candidates[0] ?? []);
    let bestEvaluation = scoreEdgeRoute(bestPoints, obstacles);

    candidates.forEach((candidateBridge) => {
      const rawPoints = buildEdgeCandidatePoints(start, startGuide, endGuide, end, candidateBridge);
      const routedPoints = rerouteAroundObstacles(rawPoints, obstacles);
      const evaluation = scoreEdgeRoute(routedPoints, obstacles);
      if (evaluation.score < bestEvaluation.score) {
        bestEvaluation = evaluation;
        bestPoints = routedPoints;
      }
    });

    return { points: bestPoints, evaluation: bestEvaluation };
  };

  const primaryCandidates = buildGuideRouteCandidates(startGuide, endGuide, stubDistance, false);
  const primaryBest = pickBestRoute(primaryCandidates);
  if (
    primaryBest.evaluation.reversals === 0
    && primaryBest.evaluation.pocketLoops === 0
    && primaryBest.evaluation.guidePocketLoops === 0
    && primaryBest.evaluation.nonOrthogonal === 0
    && primaryBest.evaluation.obstacleCrossings === 0
  ) {
    return primaryBest.points;
  }

  const allCandidates = buildGuideRouteCandidates(startGuide, endGuide, stubDistance, true);
  return pickBestRoute(allCandidates).points;
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

export const buildArrowRoutePoints = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  options: BuildArrowPathOptions = {}
): Array<{ x: number; y: number }> => {
  if (options.startEdge || options.endEdge) {
    return buildEdgeAwarePoints(start, end, options);
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) < STRAIGHT_EPSILON || Math.abs(dy) < STRAIGHT_EPSILON) {
    return [start, end];
  }

  const horizontalFirst = Math.abs(dx) >= Math.abs(dy);
  const corner = horizontalFirst
    ? { x: end.x, y: start.y }
    : { x: start.x, y: end.y };
  return [start, corner, end];
};

export const buildArrowPath = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  options: BuildArrowPathOptions = {}
): string => {
  const routePoints = buildArrowRoutePoints(start, end, options);
  if (options.startEdge || options.endEdge) {
    // Keep start/end guide legs intact while allowing every corner to round.
    return buildRoundedPath(routePoints, { simplify: false });
  }
  if (routePoints.length <= 2) {
    return buildStraightPath(start, end);
  }
  return buildRoundedPath(routePoints);
};
