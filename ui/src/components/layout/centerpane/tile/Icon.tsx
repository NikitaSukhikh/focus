import { getIconComponent, getGoogleServiceIcon, renderFaviconImage, renderFileTypeIcon } from '@/components/layout/centerpane/tile/iconHelpers';

interface TileIconProps {
  type: string;
  url?: string;
  filePath?: string;
  thumbnailUrl: string | null;
  thumbnailWidth: number;
  thumbnailHeight: number;
  title: string;
  faviconUrl?: string;
  onThumbnailError: () => void;
  size?: number;
}

// TileIcon decides which visual to render for a tile (thumbnail, favicon, google service icon, or type icon) based on the tile's data.
export function TileIcon({
  type,
  url,
  filePath,
  thumbnailUrl,
  thumbnailWidth,
  thumbnailHeight,
  title,
  faviconUrl,
  onThumbnailError,
  size,
}: TileIconProps) {
  if (type === 'file' && thumbnailUrl) {
    return (
      <div
        className="rounded-md shadow-sm overflow-hidden bg-white"
        style={{
          width: `${thumbnailWidth}px`,
          height: `${thumbnailHeight}px`,
        }}
      >
        <img
          src={thumbnailUrl}
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          draggable={false}
          onError={onThumbnailError}
        />
      </div>
    );
  }

  if (type === 'file' && filePath) {
    return renderFileTypeIcon(filePath, size ?? 48);
  }

  if (type === 'link' && url) {
    const googleIcon = getGoogleServiceIcon(url, size ?? 48);
    if (googleIcon) {
      return googleIcon;
    }
  }

  if (type === 'link') {
    return renderFaviconImage(faviconUrl, size ?? 40);
  }

  const Icon = getIconComponent(type);
  return <Icon size={size ?? 48} />;
}
