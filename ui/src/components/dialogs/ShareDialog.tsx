import React from 'react';
import ReactDOM from 'react-dom';
import { X, Share2, Copy, CheckCircle2 } from 'lucide-react';
import { Z_INDEX } from '@/constants/zIndex';
import { SharePlatformButtons } from '@/components/dialogs/share/SharePlatformButtons';
import { SharePlatform, SHARE_PLATFORMS } from '@/components/dialogs/share/sharePlatforms';
import { openExternalUrl } from '@/platform';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  filePath?: string;
  shareText?: string;
}

const buildPlainTextShareUrl = (platform: SharePlatform, text: string, shareTitle: string): string => {
  switch (platform.name) {
    case 'Twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    case 'Gmail':
      return `https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(text)}`;
    case 'Reddit':
      return `https://reddit.com/submit?title=${encodeURIComponent(shareTitle)}&text=${encodeURIComponent(text)}`;
    case 'Instagram':
      return 'https://www.instagram.com/';
    case 'Facebook':
      return 'https://www.facebook.com/';
    case 'LinkedIn':
      return 'https://www.linkedin.com/';
    default:
      return platform.getShareUrl('', shareTitle);
  }
};

export function ShareDialog({ isOpen, onClose, url, title, filePath, shareText }: ShareDialogProps) {
  const [copied, setCopied] = React.useState(false);
  const [fileCopiedToClipboard, setFileCopiedToClipboard] = React.useState(false);
  const isFile = !!filePath;
  const normalizedShareText = (shareText || '').trim();
  const isPlainTextShare = !isFile && normalizedShareText.length > 0;
  const valueToShare = isFile ? (filePath || '') : (isPlainTextShare ? normalizedShareText : url);
  const openShareTarget = async (targetUrl: string): Promise<void> => {
    if (!targetUrl) return;
    try {
      await openExternalUrl(targetUrl);
    } catch (error) {
      console.error('[SHARE DIALOG] Failed to open via desktop API, falling back to window.open:', error);
      window.open(targetUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    }
  };

  const handleCopyLink = async () => {
    if (!valueToShare) return;
    try {
      await navigator.clipboard.writeText(valueToShare);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[SHARE DIALOG] Failed to copy:', err);
    }
  };

  const handleClose = async () => {
    // Clear clipboard if we copied a file
    if (fileCopiedToClipboard && (window as any).desktopAPI?.clearClipboard) {
      await (window as any).desktopAPI.clearClipboard();
      setFileCopiedToClipboard(false);
    }

    onClose();
  };

  const copyFileToClipboard = async () => {
    if (!filePath) return false;

    try {
      // Use Electron's native clipboard for file copying (images only)
      if ((window as any).desktopAPI?.writeFileToClipboard) {
        console.log('[SHARE DIALOG] Attempting to copy file to clipboard:', filePath);
        const success = await (window as any).desktopAPI.writeFileToClipboard(filePath);
        console.log('[SHARE DIALOG] Clipboard write result:', success);
        if (success) {
          setFileCopiedToClipboard(true);
          return true;
        }
      } else {
        console.error('[SHARE DIALOG] desktopAPI.writeFileToClipboard not available');
      }

      return false;
    } catch (err) {
      console.error('[SHARE DIALOG] Failed to copy file to clipboard:', err);
      return false;
    }
  };

  const tryOpenDesktopApp = async (desktopUrl: string, webUrl: string): Promise<void> => {
    if (!desktopUrl) {
      await openShareTarget(webUrl);
      return;
    }
    try {
      await openExternalUrl(desktopUrl);
    } catch (error) {
      console.warn('[SHARE DIALOG] Desktop protocol launch failed, opening web share instead:', error);
      await openShareTarget(webUrl);
    }
  };

  const handlePlatformClick = async (platform: SharePlatform) => {
    // For files, handle images vs other files differently
    if (isFile) {
      // Detect if file is an image
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filePath);

      // Open messaging platform first
      if (platform.name === 'WhatsApp') {
        await tryOpenDesktopApp('whatsapp://', 'https://web.whatsapp.com/');
      } else if (platform.name === 'Telegram') {
        await tryOpenDesktopApp('tg://', 'https://web.telegram.org/');
      } else {
        // For other platforms, just open their web version
        const shareUrl = platform.getShareUrl('', '');
        await openShareTarget(shareUrl);
      }

      if (isImage) {
        // Images: Copy to clipboard AFTER opening messaging app
        // Small delay to ensure the window has started opening
        setTimeout(async () => {
          await copyFileToClipboard();
        }, 100);
      } else {
        // PDFs and other files: Show in explorer for drag-and-drop
        if ((window as any).desktopAPI?.showItemInFolder) {
          await (window as any).desktopAPI.showItemInFolder(filePath);
        }

        // Arrange windows side-by-side for better UX (non-image files only)
        if ((window as any).desktopAPI?.arrangeWindowsSideBySide) {
          // Small delay to ensure windows are fully opened
          setTimeout(async () => {
            await (window as any).desktopAPI.arrangeWindowsSideBySide();
          }, 1000);
        }
      }

      // Close the share dialog immediately after opening windows
      // User can now paste image or drag and drop the file
      onClose();
      return;
    }

    if (isPlainTextShare) {
      try {
        await navigator.clipboard.writeText(normalizedShareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('[SHARE DIALOG] Failed to copy plain text for share:', err);
      }

      if (platform.name === 'WhatsApp') {
        const shareUrl = `https://wa.me/?text=${encodeURIComponent(normalizedShareText)}`;
        const desktopUrl = `whatsapp://send?text=${encodeURIComponent(normalizedShareText)}`;
        await tryOpenDesktopApp(desktopUrl, shareUrl);
        return;
      }

      if (platform.name === 'Telegram') {
        const shareUrl = `https://t.me/share/url?text=${encodeURIComponent(normalizedShareText)}`;
        const desktopUrl = `tg://msg_url?url=${encodeURIComponent('')}&text=${encodeURIComponent(normalizedShareText)}`;
        await tryOpenDesktopApp(desktopUrl, shareUrl);
        return;
      }

      const shareUrl = buildPlainTextShareUrl(platform, normalizedShareText, title);
      await openShareTarget(shareUrl);
      return;
    }

    // For URLs, proceed with normal sharing
    const shareUrl = platform.getShareUrl(url, title);

    // Handle WhatsApp with desktop app detection
    if (platform.name === 'WhatsApp') {
      const desktopUrl = `whatsapp://send?text=${encodeURIComponent(`${title}\n${url}`)}`;
      await tryOpenDesktopApp(desktopUrl, shareUrl);
      return;
    }

    // Handle Telegram with desktop app detection
    if (platform.name === 'Telegram') {
      const desktopUrl = `tg://msg_url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
      await tryOpenDesktopApp(desktopUrl, shareUrl);
      return;
    }

    // For all other platforms, open web version
    await openShareTarget(shareUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 transition-opacity"
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Share2 size={20} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Share</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Shared payload preview */}
            <div className="mb-4 max-w-lg">
              {isPlainTextShare ? (
                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{valueToShare}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700 line-clamp-2">{title}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{valueToShare}</p>
                </>
              )}
            </div>

            {/* Copy Link/Path Button */}
            <button
              onClick={handleCopyLink}
              className="w-full mb-4 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium text-slate-700"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={18} className="text-green-600" />
                  <span className="text-green-600">
                    {isFile
                      ? (/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filePath || '')
                          ? 'Image ready to paste!'
                          : 'File ready! Drag from folder to messaging app ->')
                      : 'Copied!'}
                  </span>
                </>
              ) : (
                <>
                  <Copy size={18} />
                  <span>{isFile ? 'Copy Path' : isPlainTextShare ? 'Copy Text' : 'Copy Link'}</span>
                </>
              )}
            </button>

            {/* Share Platforms */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Share to</p>
              <SharePlatformButtons platforms={SHARE_PLATFORMS} onPlatformClick={handlePlatformClick} />
            </div>
          </div>
        </div>
    </div>
  );

  return ReactDOM.createPortal(dialogContent, document.body);
}

