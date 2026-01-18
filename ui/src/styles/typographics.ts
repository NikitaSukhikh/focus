type TypographySize = {
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
};

// Font families mapped to semantic roles so components can import consistent stacks.
export const TYPOGRAPHY_FONTS = {
  BASE_SANS: 'var(--font-sans)',
  BASE_DISPLAY: 'var(--font-sans)',
  BASE_MONO: 'var(--font-mono)',
  TOPBAR_HEADER: 'var(--font-sans)',
  TOPBAR_APPNAME: 'var(--font-sans)',
  TOPBAR_CONTROL: 'var(--font-sans)',
  TOPBAR_META: 'var(--font-sans)',
  SIDEBAR_TITLE: 'var(--font-sans)',
  SIDEBAR_ITEM: 'var(--font-sans)',
  SIDEBAR_HINT: 'var(--font-sans)',
  PANE_TITLE: 'var(--font-sans)',
  PANE_SUBTITLE: 'var(--font-sans)',
  PANE_BODY: 'var(--font-sans)',
  PANE_BODY_MUTED: 'var(--font-sans)',
  CODE: 'var(--font-mono)',
  TILE_TITLE: 'var(--font-system-ui)',
  TILE_DESCRIPTION: 'var(--font-system-ui)',
} as const;

// Font weights mapped to the same semantic roles as sizes for consistent thickness across the UI.
export const TYPOGRAPHY_WEIGHTS = {
  TOPBAR_HEADER: 400,
  TOPBAR_APPNAME: 400,
  TOPBAR_CONTROL: 400,
  TOPBAR_META: 400,
  SIDEBAR_TITLE: 400,
  SIDEBAR_ITEM: 400,
  SIDEBAR_HINT: 400,
  PANE_TITLE: 400,
  PANE_SUBTITLE: 400,
  PANE_BODY: 400,
  PANE_BODY_MUTED: 400,
  CODE: 400,
  TILE_TITLE: 400,
  TILE_DESCRIPTION: 400,
} as const;

// Font opacities mapped to the same roles so transparency stays consistent.
export const TYPOGRAPHY_OPACITY = {
  TOPBAR_HEADER: 1,
  TOPBAR_APPNAME: 1,
  TOPBAR_CONTROL: 1,
  TOPBAR_META: 1,
  SIDEBAR_TITLE: 1,
  SIDEBAR_ITEM: 1,
  SIDEBAR_HINT: 1,
  PANE_TITLE: 1,
  PANE_SUBTITLE: 1,
  PANE_BODY: 1,
  PANE_BODY_MUTED: 1,
  CODE: 1,
  TILE_TITLE: 1,
  TILE_DESCRIPTION: 1,
} as const;

// Font sizes and line-heights mapped to semantic roles for a single source of truth.
export const TYPOGRAPHY_SIZES = {
  TOPBAR_HEADER: {
    fontSize: '16px',
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
    fontSize: '16px',
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
  TILE_TITLE: {
    fontSize: '14px',
    lineHeight: '22px',
  },
  TILE_DESCRIPTION: {
    fontSize: '12px',
    lineHeight: '16px',
  },
} as const satisfies Record<string, TypographySize>;

export type TypographyFontKey = keyof typeof TYPOGRAPHY_FONTS;
export type TypographySizeKey = keyof typeof TYPOGRAPHY_SIZES;
export type TypographyWeightKey = keyof typeof TYPOGRAPHY_WEIGHTS;
export type TypographyOpacityKey = keyof typeof TYPOGRAPHY_OPACITY;
