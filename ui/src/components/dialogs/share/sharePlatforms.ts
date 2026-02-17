/**
 * Centralized social platform definitions reused by single-item and space share dialogs.
 */
import type React from 'react';
import { GmailIcon } from '@/components/icons/GoogleServiceIcons';
import {
  WhatsAppIcon,
  TelegramShareIcon,
  FacebookIcon,
  TwitterIcon,
  LinkedInIcon,
  RedditIcon,
  InstagramIcon,
} from '@/components/icons/SocialShareIcons';

export interface SharePlatform {
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  getShareUrl: (_url: string, _title: string) => string;
  hoverClassName: string;
}

export const SHARE_PLATFORMS: SharePlatform[] = [
  {
    name: 'WhatsApp',
    icon: WhatsAppIcon,
    getShareUrl: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
    hoverClassName: 'hover:bg-green-50',
  },
  {
    name: 'Telegram',
    icon: TelegramShareIcon,
    getShareUrl: (url, title) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    hoverClassName: 'hover:bg-blue-50',
  },
  {
    name: 'Facebook',
    icon: FacebookIcon,
    getShareUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    hoverClassName: 'hover:bg-blue-50',
  },
  {
    name: 'Instagram',
    icon: InstagramIcon,
    getShareUrl: () => 'https://www.instagram.com/',
    hoverClassName: 'hover:bg-pink-50',
  },
  {
    name: 'Twitter',
    icon: TwitterIcon,
    getShareUrl: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    hoverClassName: 'hover:bg-slate-50',
  },
  {
    name: 'LinkedIn',
    icon: LinkedInIcon,
    getShareUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    hoverClassName: 'hover:bg-blue-50',
  },
  {
    name: 'Gmail',
    icon: GmailIcon,
    getShareUrl: (url, title) => `https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
    hoverClassName: 'hover:bg-red-50',
  },
  {
    name: 'Reddit',
    icon: RedditIcon,
    getShareUrl: (url, title) => `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    hoverClassName: 'hover:bg-orange-50',
  },
];
