// Arrow metadata helpers centralize persistence payload and change detection for endpoint re-anchoring.
import type { ArrowSegment } from '@/components/layout/centerpane/types';

const isSameAnchorRef = (a?: ArrowSegment['startAnchor'], b?: ArrowSegment['startAnchor']): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.tileId === b.tileId && a.edge === b.edge && a.edgeIndex === b.edgeIndex;
};

export const didArrowEndpointChange = (before: ArrowSegment, after: ArrowSegment): boolean => {
  const moved =
    Math.abs(before.start.x - after.start.x) > 0.5
    || Math.abs(before.start.y - after.start.y) > 0.5
    || Math.abs(before.end.x - after.end.x) > 0.5
    || Math.abs(before.end.y - after.end.y) > 0.5;
  return moved || !isSameAnchorRef(before.startAnchor, after.startAnchor) || !isSameAnchorRef(before.endAnchor, after.endAnchor);
};

export const toArrowMetadata = (arrow: ArrowSegment) => ({
  arrow: true,
  start_x: arrow.start.x,
  start_y: arrow.start.y,
  end_x: arrow.end.x,
  end_y: arrow.end.y,
  start_tile_id: arrow.startAnchor?.tileId ?? null,
  start_anchor_edge: arrow.startAnchor?.edge ?? null,
  start_anchor_index: arrow.startAnchor?.edgeIndex ?? null,
  end_tile_id: arrow.endAnchor?.tileId ?? null,
  end_anchor_edge: arrow.endAnchor?.edge ?? null,
  end_anchor_index: arrow.endAnchor?.edgeIndex ?? null,
});

export const buildArrowGeometrySignature = (arrow: ArrowSegment): string =>
  [
    Math.round(arrow.start.x * 10),
    Math.round(arrow.start.y * 10),
    Math.round(arrow.end.x * 10),
    Math.round(arrow.end.y * 10),
    arrow.startAnchor?.tileId ?? '',
    arrow.startAnchor?.edge ?? '',
    arrow.startAnchor?.edgeIndex ?? -1,
    arrow.endAnchor?.tileId ?? '',
    arrow.endAnchor?.edge ?? '',
    arrow.endAnchor?.edgeIndex ?? -1,
  ].join('|');
