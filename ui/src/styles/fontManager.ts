type FontDefinition = {
  fontFamily: string;
  fontWeight: number | string;
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
};

export const FONT_STACKS = {
  sans: 'var(--font-sans)',
  display: 'var(--font-display)',
  mono: 'var(--font-mono)',
};

/**
 * Typography roles used across panes and sidebars.
 * Align names with UI sections so components can opt into consistent styles.
 */
export const FONT_ROLES: Record<string, FontDefinition> = {
  // Top bar
  topbarTitle: {
    fontFamily: FONT_STACKS.display,
    fontWeight: 700,
    fontSize: '20px',
    lineHeight: '26px',
    letterSpacing: '0.01em',
  },
  topbarControl: {
    fontFamily: FONT_STACKS.sans,
    fontWeight: 600,
    fontSize: '14px',
    lineHeight: '20px',
  },
  topbarMeta: {
    fontFamily: FONT_STACKS.sans,
    fontWeight: 500,
    fontSize: '12px',
    lineHeight: '18px',
    letterSpacing: '0.01em',
  },

  // Left sidebar
  sidebarTitle: {
    fontFamily: FONT_STACKS.display,
    fontWeight: 700,
    fontSize: '18px',
    lineHeight: '24px',
  },
  sidebarItem: {
    fontFamily: FONT_STACKS.sans,
    fontWeight: 600,
    fontSize: '14px',
    lineHeight: '20px',
  },
  sidebarHint: {
    fontFamily: FONT_STACKS.sans,
    fontWeight: 500,
    fontSize: '13px',
    lineHeight: '20px',
  },

  // Panes (preview, assistant, center canvas)
  paneTitle: {
    fontFamily: FONT_STACKS.display,
    fontWeight: 700,
    fontSize: '18px',
    lineHeight: '24px',
  },
  paneSubtitle: {
    fontFamily: FONT_STACKS.sans,
    fontWeight: 500,
    fontSize: '14px',
    lineHeight: '20px',
  },
  paneBody: {
    fontFamily: FONT_STACKS.sans,
    fontWeight: 500,
    fontSize: '14px',
    lineHeight: '22px',
  },
  paneBodyMuted: {
    fontFamily: FONT_STACKS.sans,
    fontWeight: 500,
    fontSize: '13px',
    lineHeight: '20px',
  },

  // Monospace / system text
  code: {
    fontFamily: FONT_STACKS.mono,
    fontWeight: 400,
    fontSize: '13px',
    lineHeight: '20px',
    letterSpacing: '-0.01em',
  },
};

export type FontRole = keyof typeof FONT_ROLES;

export const fontManager = {
  stacks: FONT_STACKS,
  roles: FONT_ROLES,
};
