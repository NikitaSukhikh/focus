import React from 'react';
import ReactDOM from 'react-dom';
import { X, Share2, Copy, CheckCircle2 } from 'lucide-react';
import { Z_INDEX } from '@/constants/zIndex';
import { GmailIcon } from '@/components/icons/GoogleServiceIcons';
import {
  WhatsAppIcon,
  TelegramShareIcon,
  FacebookIcon,
  TwitterIcon,
  LinkedInIcon,
  RedditIcon,
  InstagramIcon
} from '@/components/icons/SocialShareIcons';

interface SharePlatform {
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  getShareUrl: (url: string, title: string) => string;
  color: string;
}

const SHARE_PLATFORMS: SharePlatform[] = [
  {
    name: 'WhatsApp',
    icon: WhatsAppIcon,
    getShareUrl: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
    color: 'hover:bg-green-50'
  },
  {
    name: 'Telegram',
    icon: TelegramShareIcon,
    getShareUrl: (url, title) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    color: 'hover:bg-blue-50'
  },
  {
    name: 'Facebook',
    icon: FacebookIcon,
    getShareUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    color: 'hover:bg-blue-50'
  },
  {
    name: 'Instagram',
    icon: InstagramIcon,
    getShareUrl: (url) => `https://www.instagram.com/`,
    color: 'hover:bg-pink-50'
  },
  {
    name: 'Twitter',
    icon: TwitterIcon,
    getShareUrl: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    color: 'hover:bg-slate-50'
  },
  {
    name: 'LinkedIn',
    icon: LinkedInIcon,
    getShareUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    color: 'hover:bg-blue-50'
  },
  {
    name: 'Gmail',
    icon: GmailIcon,
    getShareUrl: (url, title) => `https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
    color: 'hover:bg-red-50'
  },
  {
    name: 'Reddit',
    icon: RedditIcon,
    getShareUrl: (url, title) => `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    color: 'hover:bg-orange-50'
  }
];

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  filePath?: string;
}

export function ShareDialog({ isOpen, onClose, url, title, filePath }: ShareDialogProps) {
  const [copied, setCopied] = React.useState(false);
  const [fileCopiedToClipboard, setFileCopiedToClipboard] = React.useState(false);
  const openedBrowserWindowRef = React.useRef<Window | null>(null);
  const isFile = !!filePath;

  const handleCopyLink = async () => {
    try {
      const textToCopy = isFile ? filePath : url;
      await navigator.clipboard.writeText(textToCopy);
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

  const tryOpenDesktopApp = async (desktopUrl: string, webUrl: string): Promise<Window | null> => {
    return new Promise((resolve) => {
      // Create a hidden iframe to test if the protocol handler exists
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      let timeout: NodeJS.Timeout;
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          document.body.removeChild(iframe);
        }
      };

      // If the page loses focus, the app likely opened (desktop app)
      const onBlur = () => {
        cleanup();
        resolve(null); // Desktop app opened, no window to track
      };

      window.addEventListener('blur', onBlur, { once: true });

      // Set a timeout to fall back to web version
      timeout = setTimeout(() => {
        window.removeEventListener('blur', onBlur);
        cleanup();
        // Open web version and return the window reference
        const browserWindow = window.open(webUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
        resolve(browserWindow);
      }, 1000);

      // Try to open the desktop app
      iframe.contentWindow!.location.href = desktopUrl;
    });
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
        window.open(shareUrl, '_blank', 'noopener,noreferrer,width=800,height=600');
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

    // For URLs, proceed with normal sharing
    const shareUrl = platform.getShareUrl(url, title);

    // Handle WhatsApp with desktop app detection
    if (platform.name === 'WhatsApp') {
      const desktopUrl = `whatsapp://send?text=${encodeURIComponent(`${title}\n${url}`)}`;
      const browserWindow = await tryOpenDesktopApp(desktopUrl, shareUrl);
      if (browserWindow) openedBrowserWindowRef.current = browserWindow;
      return;
    }

    // Handle Telegram with desktop app detection
    if (platform.name === 'Telegram') {
      const desktopUrl = `tg://msg_url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
      const browserWindow = await tryOpenDesktopApp(desktopUrl, shareUrl);
      if (browserWindow) openedBrowserWindowRef.current = browserWindow;
      return;
    }

    // For all other platforms, open web version
    const browserWindow = window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    if (browserWindow) openedBrowserWindowRef.current = browserWindow;
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
            {/* Title */}
            <div className="mb-4 max-w-lg">
              <p className="text-sm font-medium text-slate-700 line-clamp-2">{title}</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{isFile ? filePath : url}</p>
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
                          : 'File ready! Drag from folder to messaging app →')
                      : 'Copied!'}
                  </span>
                </>
              ) : (
                <>
                  <Copy size={18} />
                  <span>{isFile ? 'Copy Path' : 'Copy Link'}</span>
                </>
              )}
            </button>

            {/* Share Platforms */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Share to</p>
              <div className="flex items-center justify-center gap-2">
                {SHARE_PLATFORMS.map((platform) => {
                  const IconComponent = platform.icon;
                  return (
                    <button
                      key={platform.name}
                      onClick={() => handlePlatformClick(platform)}
                      title={platform.name}
                      className={`p-2.5 rounded-lg border border-slate-200 transition-all hover:scale-110 hover:shadow-md ${platform.color}`}
                    >
                      <IconComponent size={26} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
    </div>
  );

  return ReactDOM.createPortal(dialogContent, document.body);
}
