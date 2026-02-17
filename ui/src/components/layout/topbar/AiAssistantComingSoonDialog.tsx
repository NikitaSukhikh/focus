/**
 * Temporary AI assistant popover shown from the TopBar AI toggle.
 */
import React from 'react';
import { TOP_BAR } from '@/constants/panesDimensions';
import { FONT_ROLES } from '@/styles/fontManager';
import { TOP_BAR_STYLES } from '@/styles/topBarStyles';
import { useThemeToggle } from '@/hooks/useThemeToggle';

interface AiAssistantComingSoonDialogProps {
  isOpen: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const AI_ASSISTANT_STUB_MESSAGE = "AI Assistant will help you handle all your content soon!";
const AI_ASSISTANT_LOGO_SRC = '/logos/ai_assistant_logo_transparent.png';

export function AiAssistantComingSoonDialog({ isOpen, containerRef }: AiAssistantComingSoonDialogProps) {
  const { isDark } = useThemeToggle();

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute right-0 rounded-lg overflow-hidden"
      style={{
        top: `calc(100% + ${TOP_BAR.aiAssistantDialog.offsetY}px)`,
        width: `${TOP_BAR.aiAssistantDialog.width}px`,
        background: TOP_BAR_STYLES.aiAssistantDialogBackground,
        border: TOP_BAR_STYLES.aiAssistantDialogBorder,
        borderRadius: `${TOP_BAR.aiAssistantDialog.borderRadius}px`,
        boxShadow: 'var(--shadow-strong)',
        backdropFilter: 'var(--glass-blur)',
        padding: `${TOP_BAR.aiAssistantDialog.paddingY}px ${TOP_BAR.aiAssistantDialog.paddingX}px`,
      }}
      role="dialog"
      aria-modal="false"
      aria-label="AI assistant coming soon"
    >
      <img
        src={AI_ASSISTANT_LOGO_SRC}
        alt="AI Assistant"
        style={{
          width: `${TOP_BAR.aiAssistantButton.logoSize}px`,
          height: `${TOP_BAR.aiAssistantButton.logoSize}px`,
          borderRadius: `${TOP_BAR.aiAssistantButton.logoBorderRadius}px`,
          objectFit: 'contain',
          filter: isDark ? TOP_BAR_STYLES.aiAssistantLogoDarkFilter : TOP_BAR_STYLES.aiAssistantLogoLightFilter,
          marginBottom: `${TOP_BAR.aiAssistantDialog.titleBottomMargin}px`,
        }}
      />
      <p
        style={{
          ...FONT_ROLES.topbarControl,
          color: TOP_BAR_STYLES.aiAssistantDialogMessageColor,
        }}
      >
        {AI_ASSISTANT_STUB_MESSAGE}
      </p>
    </div>
  );
}
