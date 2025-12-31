type TypographySize = {
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
};

// Font families mapped to semantic roles so components can import consistent stacks.
export const TYPOGRAPHY_FONTS = {
  BASE_SANS: 'var(--font-sans)',
  BASE_DISPLAY: 'var(--font-display)',
  BASE_MONO: 'var(--font-mono)',
  TOPBAR_HEADER: 'var(--font-display)',
  TOPBAR_APPNAME: 'var(--font-display)',
  TOPBAR_CONTROL: 'var(--font-sans)',
  TOPBAR_META: 'var(--font-sans)',
  SIDEBAR_TITLE: 'var(--font-display)',
  SIDEBAR_ITEM: 'var(--font-sans)',
  SIDEBAR_HINT: 'var(--font-sans)',
  PANE_TITLE: 'var(--font-display)',
  PANE_SUBTITLE: 'var(--font-sans)',
  PANE_BODY: 'var(--font-sans)',
  PANE_BODY_MUTED: 'var(--font-sans)',
  CODE: 'var(--font-mono)',
} as const;

// Font sizes and line-heights mapped to semantic roles for a single source of truth.
export const TYPOGRAPHY_SIZES = {
  TOPBAR_HEADER: {
    fontSize: '18px',
    lineHeight: '26px',
    letterSpacing: '0.01em',
  },
  TOPBAR_APPNAME: {
    fontSize: '18px',
    lineHeight: '26px',
    letterSpacing: '0.02em',
  },
  TOPBAR_CONTROL: {
    fontSize: '14px',
    lineHeight: '20px',
  },
  TOPBAR_META: {
    fontSize: '12px',
    lineHeight: '18px',
    letterSpacing: '0.01em',
  },
  SIDEBAR_TITLE: {
    fontSize: '18px',
    lineHeight: '24px',
  },
  SIDEBAR_ITEM: {
    fontSize: '14px',
    lineHeight: '20px',
  },
  SIDEBAR_HINT: {
    fontSize: '13px',
    lineHeight: '20px',
  },
  PANE_TITLE: {
    fontSize: '18px',
    lineHeight: '24px',
  },
  PANE_SUBTITLE: {
    fontSize: '14px',
    lineHeight: '20px',
  },
  PANE_BODY: {
    fontSize: '14px',
    lineHeight: '22px',
  },
  PANE_BODY_MUTED: {
    fontSize: '13px',
    lineHeight: '20px',
  },
  CODE: {
    fontSize: '13px',
    lineHeight: '20px',
    letterSpacing: '-0.01em',
  },
} as const satisfies Record<string, TypographySize>;

export type TypographyFontKey = keyof typeof TYPOGRAPHY_FONTS;
export type TypographySizeKey = keyof typeof TYPOGRAPHY_SIZES;
