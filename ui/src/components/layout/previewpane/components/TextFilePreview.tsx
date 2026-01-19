interface TextFilePreviewProps {
  content?: string;
  filePath?: string;
  isFullWindow?: boolean;
}

// TextFilePreview renders plain text files with optional header details.
export function TextFilePreview({ content, filePath, isFullWindow = false }: TextFilePreviewProps) {
  if (isFullWindow) {
    return (
      <div className="flex-1 min-h-0 overflow-auto custom-scroll" style={{ background: 'var(--background-dark)' }}>
        <div className="flex flex-col min-h-full w-full p-6">
          <div className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            {content ? 'Text file preview' : 'Loading text preview...'}
            {filePath && (
              <div className="text-xs break-all mt-1" style={{ color: 'var(--color-text-muted)' }}>{filePath}</div>
            )}
          </div>
          <pre
            className="flex-1 whitespace-pre-wrap font-mono text-base leading-7 m-0"
            style={{
              background: 'transparent',
              color: 'var(--color-text-primary)',
              border: 'none',
              outline: 'none',
            }}
          >
            {content || ''}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 overflow-auto flex flex-col custom-scroll"
      style={{ background: 'var(--background-dark)', color: 'var(--color-text-primary)' }}
    >
      <pre
        className="whitespace-pre-wrap font-mono text-sm leading-6 w-full m-0 p-6"
        style={{
          flex: 1,
          minHeight: '100%',
          background: 'transparent',
          color: 'var(--color-text-primary)',
          border: 'none',
          borderRadius: 0,
          outline: 'none',
        }}
      >
        {content || ''}
      </pre>
    </div>
  );
}
