/* eslint-disable react/no-unknown-property */

interface HTMLPreviewProps {
  htmlPreviewUrl: string;
  title?: string;
}

// HTMLPreview renders local HTML files as fully interactive webpages in an embedded webview
export function HTMLPreview({ htmlPreviewUrl, title }: HTMLPreviewProps) {
  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="p-3 border-b border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-500">
          {title || 'HTML Document'} — rendered as webpage
        </div>
      </div>
      <div className="flex-1 relative">
        <webview
          src={htmlPreviewUrl}
          partition="persist:html-preview"
          allowpopups="false"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </div>
  );
}
