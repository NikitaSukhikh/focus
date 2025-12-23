import React from 'react';

export function GmailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 193" fill="none">
      <path d="M58.182 192.05V93.493L27.507 65.507L0 49.179v132.13c0 5.938 4.808 10.741 10.746 10.741h47.436z" fill="#4285F4"/>
      <path d="M197.818 192.05h47.436c5.938 0 10.746-4.803 10.746-10.741V49.179l-27.507 16.328-30.675 27.986v98.557z" fill="#34A853"/>
      <path d="M197.818 49.179v43.314l58.182-43.314V29.301c0-13.284-15.166-20.839-25.803-12.85l-32.379 32.728z" fill="#FBBC04"/>
      <path d="M58.182 92.493V49.179L128 93.493l69.818-44.314v43.314L128 136.807l-69.818-44.314z" fill="#EA4335"/>
      <path d="M0 29.301v19.878l58.182 43.314V49.179L25.803 16.451C15.166 8.462 0 16.017 0 29.301z" fill="#C5221F"/>
    </svg>
  );
}

export function DriveIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 87.3 78" fill="none">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00AC47"/>
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#EA4335"/>
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D"/>
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684FC"/>
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/>
    </svg>
  );
}

export function SheetsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 88" fill="none">
      <path d="M58 88H6a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6h36l22 22v60a6 6 0 0 1-6 6z" fill="#0F9D58"/>
      <path d="M42 0l22 22H42V0z" fill="#87CEAC"/>
      <path fill="#F1F1F1" d="M14 34h36v6H14zM14 44h36v6H14zM14 54h36v6H14zM14 64h36v6H14z"/>
      <path fill="#0F9D58" d="M24 34h2v40h-2zM38 34h2v40h-2z"/>
    </svg>
  );
}

export function DocsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 88" fill="none">
      <path d="M58 88H6a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6h36l22 22v60a6 6 0 0 1-6 6z" fill="#4285F4"/>
      <path d="M42 0l22 22H42V0z" fill="#A1C2FA"/>
      <path fill="#F1F1F1" d="M14 34h36v4H14zM14 42h36v4H14zM14 50h36v4H14zM14 58h24v4H14z"/>
    </svg>
  );
}

export function SlidesIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 88" fill="none">
      <path d="M58 88H6a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6h36l22 22v60a6 6 0 0 1-6 6z" fill="#F4B400"/>
      <path d="M42 0l22 22H42V0z" fill="#F9E6A7"/>
      <rect x="14" y="34" width="36" height="24" rx="2" fill="#F1F1F1"/>
      <path fill="#F4B400" d="M14 62h36v4H14z"/>
    </svg>
  );
}

export function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
