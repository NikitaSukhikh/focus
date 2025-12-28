import { Z_INDEX } from '../../../../constants/zIndex';
import { FONT_ROLES } from '../../../../styles/fontManager';

interface DocumentPreviewProps {
  documentPreviewUrl: string;
  title?: string;
  filePath?: string;
  documentLoading: boolean;
  documentError: string | null;
  onLoad: () => void;
  onError: () => Promise<void>;
}

// DocumentPreview renders office-style documents in an iframe with loading/error overlays, used when a dropped file resolves to a document type.
export function DocumentPreview({
  documentPreviewUrl,
  title,
  filePath,
  documentLoading,
  documentError,
  onLoad,
  onError,
}: DocumentPreviewProps) {
  return (
    <div className="flex-1 w-full relative">
      {documentLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
          <div style={{ ...FONT_ROLES.paneBody, color: 'var(--color-text-muted)' }}>Loading document...</div>
        </div>
      )}
      {documentError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
          <div className="text-red-600" style={FONT_ROLES.paneBody}>Document Preview Error</div>
          <div className="text-slate-600 max-w-md text-center break-all px-4" style={FONT_ROLES.paneBodyMuted}>
            {documentError}
          </div>
          <div className="text-slate-400 max-w-md text-center break-all px-4 text-xs" style={FONT_ROLES.paneBodyMuted}>
            {filePath}
          </div>
        </div>
      )}
      {!documentError && (
        <iframe
          src={documentPreviewUrl}
          title={title || 'Document preview'}
          className="w-full h-full border-0"
          onLoad={onLoad}
          onError={onError}
          onContextMenu={(e) => {
            // Allow default context menu behavior
            e.stopPropagation();
          }}
        />
      )}
    </div>
  );
}
