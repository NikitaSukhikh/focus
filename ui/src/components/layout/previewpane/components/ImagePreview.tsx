import { ImageMetadata } from '../hooks/useImageMetadata';

interface ImagePreviewProps {
  imagePreviewUrl: string;
  title?: string;
  filePath?: string;
  imageMetadata: ImageMetadata | null;
  showMetadata?: boolean;
  fillHeight?: boolean;
}

// ImagePreview displays an image file inside the preview pane and optionally shows metadata fetched for that asset.
export function ImagePreview({
  imagePreviewUrl,
  title,
  filePath,
  imageMetadata,
  showMetadata = true,
  fillHeight = false,
}: ImagePreviewProps) {
  const containerClassName = fillHeight ? 'flex-1 min-h-0 h-full overflow-auto' : 'flex-1 overflow-auto';
  const imageClassName = fillHeight ? 'w-full h-full object-contain' : 'w-full h-auto object-contain';

  return (
    <div className={containerClassName}>
      <div className="flex flex-col items-stretch min-h-0 flex-1">
        <img
          src={imagePreviewUrl}
          alt={title || 'Image preview'}
          className={imageClassName}
          style={fillHeight ? { flex: '1 1 auto' } : undefined}
        />
        {showMetadata && imageMetadata && (
          <div
            className="w-full p-4"
            style={{
              background: 'var(--color-surface-panel)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-secondary)',
              borderRadius: 0,
              boxShadow: 'none',
            }}
          >
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="font-semibold w-24" style={{ color: 'var(--color-text-primary)' }}>Location:</span>
                <span className="break-all flex-1">{filePath}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-24" style={{ color: 'var(--color-text-primary)' }}>Size:</span>
                <span>{imageMetadata.file_size_human}</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-24" style={{ color: 'var(--color-text-primary)' }}>Resolution:</span>
                <span>{imageMetadata.height} ƒ- {imageMetadata.width} px</span>
              </div>
              <div className="flex">
                <span className="font-semibold w-24" style={{ color: 'var(--color-text-primary)' }}>Ratio:</span>
                <span>{imageMetadata.aspect_ratio}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
