import { ImageMetadata } from '../hooks/useImageMetadata';

interface ImagePreviewProps {
  imagePreviewUrl: string;
  title?: string;
  filePath?: string;
  imageMetadata: ImageMetadata | null;
}

// ImagePreview displays an image file inside the preview pane and optionally shows metadata fetched for that asset.
export function ImagePreview({ imagePreviewUrl, title, filePath, imageMetadata }: ImagePreviewProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 flex flex-col items-center">
        <img
          src={imagePreviewUrl}
          alt={title || 'Image preview'}
          className="max-w-full object-contain rounded-lg shadow-lg"
        />
        {imageMetadata && (
          <div className="mt-6 w-full max-w-2xl bg-white rounded-lg shadow-md p-4 border border-slate-200">
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="font-semibold text-slate-700 w-24">Location:</span>
                <span className="text-slate-600 break-all flex-1">{filePath}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-slate-700 w-24">Size:</span>
                <span className="text-slate-600">{imageMetadata.file_size_human}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-slate-700 w-24">Resolution:</span>
                <span className="text-slate-600">{imageMetadata.height} × {imageMetadata.width} px</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-slate-700 w-24">Ratio:</span>
                <span className="text-slate-600">{imageMetadata.aspect_ratio}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
