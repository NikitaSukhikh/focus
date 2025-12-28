import { Z_INDEX } from '../../../../constants/zIndex';
import { FONT_ROLES } from '../../../../styles/fontManager';

// EmptyPreview fills the pane with a simple placeholder when nothing is available to render.
export function EmptyPreview() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW_EMPTY }}>
      <div style={{ ...FONT_ROLES.paneBodyMuted, color: 'var(--color-text-muted)' }}>No preview available.</div>
    </div>
  );
}
