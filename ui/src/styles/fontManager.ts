import { TYPOGRAPHY_FONTS, TYPOGRAPHY_SIZES } from './typographics';

type FontDefinition = {
  fontFamily: string;
  fontWeight: number | string;
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
};

export const FONT_STACKS = {
  sans: TYPOGRAPHY_FONTS.BASE_SANS,
  display: TYPOGRAPHY_FONTS.BASE_DISPLAY,
  mono: TYPOGRAPHY_FONTS.BASE_MONO,
};

/**
 * Typography roles used across panes and sidebars.
 * Align names with UI sections so components can opt into consistent styles.
 */
export const FONT_ROLES: Record<string, FontDefinition> = {
  // Top bar
  topbarTitle: {
    fontFamily: TYPOGRAPHY_FONTS.TOPBAR_HEADER,
    fontWeight: 600,
    ...TYPOGRAPHY_SIZES.TOPBAR_HEADER,
  },
  topbarControl: {
    fontFamily: TYPOGRAPHY_FONTS.TOPBAR_CONTROL,
    fontWeight: 600,
    ...TYPOGRAPHY_SIZES.TOPBAR_CONTROL,
  },
  topbarMeta: {
    fontFamily: TYPOGRAPHY_FONTS.TOPBAR_META,
    fontWeight: 500,
    ...TYPOGRAPHY_SIZES.TOPBAR_META,
  },

  // Left sidebar
  sidebarTitle: {
    fontFamily: TYPOGRAPHY_FONTS.SIDEBAR_TITLE,
    fontWeight: 700,
    ...TYPOGRAPHY_SIZES.SIDEBAR_TITLE,
  },
  sidebarItem: {
    fontFamily: TYPOGRAPHY_FONTS.SIDEBAR_ITEM,
    fontWeight: 600,
    ...TYPOGRAPHY_SIZES.SIDEBAR_ITEM,
  },
  sidebarHint: {
    fontFamily: TYPOGRAPHY_FONTS.SIDEBAR_HINT,
    fontWeight: 500,
    ...TYPOGRAPHY_SIZES.SIDEBAR_HINT,
  },

  // Panes (preview, assistant, center canvas)
  paneTitle: {
    fontFamily: TYPOGRAPHY_FONTS.PANE_TITLE,
    fontWeight: 700,
    ...TYPOGRAPHY_SIZES.PANE_TITLE,
  },
  paneSubtitle: {
    fontFamily: TYPOGRAPHY_FONTS.PANE_SUBTITLE,
    fontWeight: 500,
    ...TYPOGRAPHY_SIZES.PANE_SUBTITLE,
  },
  paneBody: {
    fontFamily: TYPOGRAPHY_FONTS.PANE_BODY,
    fontWeight: 500,
    ...TYPOGRAPHY_SIZES.PANE_BODY,
  },
  paneBodyMuted: {
    fontFamily: TYPOGRAPHY_FONTS.PANE_BODY_MUTED,
    fontWeight: 500,
    ...TYPOGRAPHY_SIZES.PANE_BODY_MUTED,
  },

  // Monospace / system text
  code: {
    fontFamily: TYPOGRAPHY_FONTS.CODE,
    fontWeight: 400,
    ...TYPOGRAPHY_SIZES.CODE,
  },
};

export type FontRole = keyof typeof FONT_ROLES;

export const fontManager = {
  stacks: FONT_STACKS,
  roles: FONT_ROLES,
};
