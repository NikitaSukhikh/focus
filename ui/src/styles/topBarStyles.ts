// Centralizes TopBar-specific visual tokens so component markup stays free of hardcoded style literals.
export const TOP_BAR_STYLES = {
  shareMenuCheckboxAccentColor: '#3b82f6',
  aiAssistantLogoLightFilter: 'none',
  aiAssistantLogoDarkFilter: 'brightness(1.35) saturate(1.15) drop-shadow(0 0 3px rgba(255,255,255,0.45))',
  aiAssistantDialogBackground: 'var(--glass-bg)',
  aiAssistantDialogBorder: '1px solid var(--color-border-subtle)',
  aiAssistantDialogTitleColor: 'var(--color-text-primary)',
  aiAssistantDialogMessageColor: 'var(--color-text-secondary)',
} as const;
