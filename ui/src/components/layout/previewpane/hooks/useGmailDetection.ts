/**
 * Gmail Detection Hook
 *
 * Shared logic for detecting Gmail URLs across preview components.
 * Used by both PreviewPane and FullWindowPreview to ensure consistent handling.
 */

import { isGmailUrl } from '../../centerpane/utils';

interface UseGmailDetectionParams {
  type?: string;
  url?: string;
}

interface UseGmailDetectionResult {
  isGmail: boolean;
}

export function useGmailDetection({ type, url }: UseGmailDetectionParams): UseGmailDetectionResult {
  const isGmail = type === 'gmail' || (!!url && isGmailUrl(url));

  return { isGmail };
}
