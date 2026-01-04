import { useMemo } from 'react';
import { detectFileType, isHtmlCodeFile } from '../../../../utils/fileTypes';

interface FileTypeDetection {
  isImageFile: boolean;
  isAudioFile: boolean;
  isDocumentFile: boolean;
  isEbookFile: boolean;
  isTextFile: boolean;
  isMarkdownFile: boolean;
  isHtmlFile: boolean;
  imagePreviewUrl: string | null;
  documentPreviewUrl: string | null;
  ebookPreviewUrl: string | null;
  htmlPreviewUrl: string | null;
}

// useFileTypeDetection derives preview flags and API URLs from the incoming type/path so the PreviewPane can pick the right renderer.
export function useFileTypeDetection(
  type?: string,
  filePath?: string
): FileTypeDetection {
  return useMemo(() => {
    const isImageFile = type === 'file' && filePath && /\.(png|jpg|jpeg|gif|bmp|webp|svg|tiff|tif|ico|heic|heif)$/i.test(filePath);
    const isAudioFile = type === 'file' && filePath && /\.(mp3|wav|flac|ogg|oga|m4a|aac|wma|opus|aiff|aif|aifc|alac|ape|wv|mka)$/i.test(filePath);
    const isDocumentFile = type === 'file' && filePath && /\.(docx|doc|odt|xlsx|xls|xlsm|ods)$/i.test(filePath);
    const isEbookFile = type === 'file' && filePath && /\.(epub|mobi|azw|azw3|fb2|cbz|cbr|pdb|djvu)$/i.test(filePath);
    const isMarkdownFile = type === 'file' && filePath && /\.(md|markdown)$/i.test(filePath);

    // Check if HTML file should be rendered or shown as code
    const isHtmlExtension = type === 'file' && filePath && /\.(html|htm)$/i.test(filePath);
    const shouldShowHtmlAsCode = isHtmlExtension && filePath && isHtmlCodeFile(filePath);
    const isHtmlFile = isHtmlExtension && !shouldShowHtmlAsCode;

    const isTextFile = type === 'file' && filePath
      ? (detectFileType(filePath).category === 'text' && !isHtmlFile && !isMarkdownFile) || shouldShowHtmlAsCode
      : false;

    const imagePreviewUrl = isImageFile && filePath
      ? `/api/thumbnails/full-image?${new URLSearchParams({ file_path: filePath }).toString()}`
      : null;

    const documentPreviewUrl = isDocumentFile && filePath
      ? `/api/thumbnails/document-preview?${new URLSearchParams({ file_path: filePath }).toString()}`
      : null;

    const ebookPreviewUrl = isEbookFile && filePath
      ? `/api/thumbnails/document-preview?${new URLSearchParams({ file_path: filePath }).toString()}`
      : null;

    const htmlPreviewUrl = isHtmlFile && filePath
      ? `file://${filePath}`
      : null;

    return {
      isImageFile,
      isAudioFile,
      isDocumentFile,
      isEbookFile,
      isTextFile,
      isMarkdownFile,
      isHtmlFile,
      imagePreviewUrl,
      documentPreviewUrl,
      ebookPreviewUrl,
      htmlPreviewUrl,
    };
  }, [type, filePath]);
}
