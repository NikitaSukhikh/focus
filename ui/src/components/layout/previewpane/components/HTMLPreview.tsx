/* eslint-disable react/no-unknown-property */

interface HTMLPreviewProps {
  htmlPreviewUrl: string;
  title?: string;
}

// HTMLPreview renders local HTML files as fully interactive webpages in an embedded webview
export function HTMLPreview({ htmlPreviewUrl, title }: HTMLPreviewProps) {
  return (
    <div className="flex-1 relative" style={{ background: 'var(--background-dark)' }}>
      <webview
        src={htmlPreviewUrl}
        partition="persist:html-preview"
        allowpopups={'false' as any}
        title={title}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
