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
          <div className="text-red-600" style={FONT_ROLES.paneBody}>Cannot Preview Document</div>
          <div className="text-slate-600 max-w-md text-center px-4" style={FONT_ROLES.paneBodyMuted}>
            This file is too complex or large to preview. The file may contain pivot tables, external data connections, or complex formulas that cannot be displayed.
          </div>
          <div className="text-slate-500 max-w-md text-center px-4 text-sm mt-2" style={FONT_ROLES.paneBodyMuted}>
            Open the file in Excel or try a simpler document.
          </div>
          <div className="text-slate-400 max-w-md text-center break-all px-4 text-xs mt-4" style={FONT_ROLES.paneBodyMuted}>
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
