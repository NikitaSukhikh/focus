/**
 * Preview target helpers keep one source of truth for what is allowed to open
 * in the right preview pane.
 */
import type { DroppedIcon, PreviewTarget } from '@/components/layout/centerpane/types';
import { PLAIN_TEXT_FILE_PREVIEW_ENABLED } from '@/constants/previewFlags';
import { detectFileType, isHtmlCodeFile } from '@/utils/fileTypes';

type PreviewEligibilityTarget = Pick<PreviewTarget, 'type' | 'filePath'>
  | Pick<DroppedIcon, 'type' | 'filePath'>;

export const isPlainTextFileTarget = (filePath?: string): boolean => {
  if (!filePath) return false;
  if (/\.txt$/i.test(filePath)) return true;
  const isMarkdown = /\.(md|markdown)$/i.test(filePath);
  const isHtmlExtension = /\.(html|htm)$/i.test(filePath);
  const isRenderedHtml = isHtmlExtension && !isHtmlCodeFile(filePath);
  return detectFileType(filePath).category === 'text' && !isRenderedHtml && !isMarkdown;
};

export const isPreviewPaneTargetAllowed = (target?: PreviewEligibilityTarget | null): boolean => {
  if (!target?.type) return true;
  if (target.type === 'text') return false;

  if (target.type === 'file') {
    if (!PLAIN_TEXT_FILE_PREVIEW_ENABLED && isPlainTextFileTarget(target.filePath)) {
      return false;
    }
  }

  return true;
};
