import { useMemo } from 'react';
import { detectFileType } from '../../../../utils/fileTypes';

interface FileTypeDetection {
  isImageFile: boolean;
  isAudioFile: boolean;
  isDocumentFile: boolean;
  isTextFile: boolean;
  imagePreviewUrl: string | null;
  documentPreviewUrl: string | null;
}

// useFileTypeDetection derives preview flags and API URLs from the incoming type/path so the PreviewPane can pick the right renderer.
export function useFileTypeDetection(
  type?: string,
  filePath?: string
): FileTypeDetection {
  return useMemo(() => {
    const isImageFile = type === 'file' && filePath && /\.(png|jpg|jpeg|gif|bmp|webp|svg|tiff|tif|ico|heic|heif)$/i.test(filePath);
    const isAudioFile = type === 'file' && filePath && /\.(mp3|wav|flac|ogg|oga|m4a|aac|wma|opus|aiff|aif|aifc|alac|ape|wv|mka)$/i.test(filePath);
    const isDocumentFile = type === 'file' && filePath && /\.(docx|doc|odt)$/i.test(filePath);

    const isTextFile = type === 'file' && filePath
      ? detectFileType(filePath).category === 'text'
      : false;

    const imagePreviewUrl = isImageFile && filePath
      ? `/api/thumbnails/full-image?${new URLSearchParams({ file_path: filePath }).toString()}`
      : null;

    const documentPreviewUrl = isDocumentFile && filePath
      ? `/api/thumbnails/document-preview?${new URLSearchParams({ file_path: filePath }).toString()}`
      : null;

    return {
      isImageFile,
      isAudioFile,
      isDocumentFile,
      isTextFile,
      imagePreviewUrl,
      documentPreviewUrl,
    };
  }, [type, filePath]);
}
