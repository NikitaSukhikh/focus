import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Settings, PlayCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Z_INDEX } from '@/constants/zIndex';
import { FONT_ROLES } from '@/styles/fontManager';
import { useLanguage } from '@/hooks/useLanguage';
import type { LanguageCode } from '@/i18n/config';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  sidebarWidth: number;
  onViewTutorial: () => void;
}

export function SettingsDialog({ isOpen, onClose, anchorRef, sidebarWidth, onViewTutorial }: SettingsDialogProps) {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [bottomOffset, setBottomOffset] = useState(0);

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setBottomOffset(window.innerHeight - rect.top + 8);
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      {/* Transparent overlay for click-outside */}
      <div
        className="fixed inset-0"
        style={{ zIndex: Z_INDEX.DROPDOWN_BACKDROP }}
        onClick={onClose}
      />
      {/* Drop-up panel */}
      <div
        className="fixed rounded-xl shadow-2xl"
        style={{
          zIndex: Z_INDEX.DROPDOWN_MENU,
          bottom: bottomOffset,
          left: 0,
          width: sidebarWidth,
          background: 'var(--background-light)',
          border: '1px solid var(--color-border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <Settings size={16} style={{ color: 'var(--primary-color)', opacity: 0.8 }} />
          <span style={{ ...FONT_ROLES.sidebarTitle, color: 'var(--color-text-secondary)' }}>
            {t('settings.title')}
          </span>
        </div>

        <div className="px-4 py-3 space-y-2">
          <label style={{ ...FONT_ROLES.sidebarHint, color: 'var(--color-text-muted)', display: 'block' }}>
            {t('settings.languageLabel')}
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            className="w-full px-2 py-1.5 rounded-lg focus:outline-none"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
            }}
          >
            {supportedLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div
          className="px-4 pb-3"
          style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '10px' }}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-colors text-left"
            style={{
              ...FONT_ROLES.sidebarHint,
              color: 'var(--color-text-secondary)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--glass-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            onClick={() => { onViewTutorial(); onClose(); }}
          >
            <PlayCircle size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
            {t('settings.viewTutorial')}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
