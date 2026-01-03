import { TYPOGRAPHY_FONTS, TYPOGRAPHY_OPACITY, TYPOGRAPHY_SIZES, TYPOGRAPHY_WEIGHTS } from './typographics';

type FontDefinition = {
  fontFamily: string;
  fontWeight: number | string;
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
  opacity?: number;
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
    fontWeight: TYPOGRAPHY_WEIGHTS.TOPBAR_HEADER,
    opacity: TYPOGRAPHY_OPACITY.TOPBAR_HEADER,
    ...TYPOGRAPHY_SIZES.TOPBAR_HEADER,
  },
  topbarControl: {
    fontFamily: TYPOGRAPHY_FONTS.TOPBAR_CONTROL,
    fontWeight: TYPOGRAPHY_WEIGHTS.TOPBAR_CONTROL,
    opacity: TYPOGRAPHY_OPACITY.TOPBAR_CONTROL,
    ...TYPOGRAPHY_SIZES.TOPBAR_CONTROL,
  },
  topbarMeta: {
    fontFamily: TYPOGRAPHY_FONTS.TOPBAR_META,
    fontWeight: TYPOGRAPHY_WEIGHTS.TOPBAR_META,
    opacity: TYPOGRAPHY_OPACITY.TOPBAR_META,
    ...TYPOGRAPHY_SIZES.TOPBAR_META,
  },

  // Left sidebar
  sidebarTitle: {
    fontFamily: TYPOGRAPHY_FONTS.SIDEBAR_TITLE,
    fontWeight: TYPOGRAPHY_WEIGHTS.SIDEBAR_TITLE,
    opacity: TYPOGRAPHY_OPACITY.SIDEBAR_TITLE,
    ...TYPOGRAPHY_SIZES.SIDEBAR_TITLE,
  },
  sidebarItem: {
    fontFamily: TYPOGRAPHY_FONTS.SIDEBAR_ITEM,
    fontWeight: TYPOGRAPHY_WEIGHTS.SIDEBAR_ITEM,
    opacity: TYPOGRAPHY_OPACITY.SIDEBAR_ITEM,
    ...TYPOGRAPHY_SIZES.SIDEBAR_ITEM,
  },
  sidebarHint: {
    fontFamily: TYPOGRAPHY_FONTS.SIDEBAR_HINT,
    fontWeight: TYPOGRAPHY_WEIGHTS.SIDEBAR_HINT,
    opacity: TYPOGRAPHY_OPACITY.SIDEBAR_HINT,
    ...TYPOGRAPHY_SIZES.SIDEBAR_HINT,
  },

  // Panes (preview, assistant, center canvas)
  paneTitle: {
    fontFamily: TYPOGRAPHY_FONTS.PANE_TITLE,
    fontWeight: TYPOGRAPHY_WEIGHTS.PANE_TITLE,
    opacity: TYPOGRAPHY_OPACITY.PANE_TITLE,
    ...TYPOGRAPHY_SIZES.PANE_TITLE,
  },
  paneSubtitle: {
    fontFamily: TYPOGRAPHY_FONTS.PANE_SUBTITLE,
    fontWeight: TYPOGRAPHY_WEIGHTS.PANE_SUBTITLE,
    opacity: TYPOGRAPHY_OPACITY.PANE_SUBTITLE,
    ...TYPOGRAPHY_SIZES.PANE_SUBTITLE,
  },
  paneBody: {
    fontFamily: TYPOGRAPHY_FONTS.PANE_BODY,
    fontWeight: TYPOGRAPHY_WEIGHTS.PANE_BODY,
    opacity: TYPOGRAPHY_OPACITY.PANE_BODY,
    ...TYPOGRAPHY_SIZES.PANE_BODY,
  },
  paneBodyMuted: {
    fontFamily: TYPOGRAPHY_FONTS.PANE_BODY_MUTED,
    fontWeight: TYPOGRAPHY_WEIGHTS.PANE_BODY_MUTED,
    opacity: TYPOGRAPHY_OPACITY.PANE_BODY_MUTED,
    ...TYPOGRAPHY_SIZES.PANE_BODY_MUTED,
  },

  // Monospace / system text
  code: {
    fontFamily: TYPOGRAPHY_FONTS.CODE,
    fontWeight: TYPOGRAPHY_WEIGHTS.CODE,
    opacity: TYPOGRAPHY_OPACITY.CODE,
    ...TYPOGRAPHY_SIZES.CODE,
  },
};

export type FontRole = keyof typeof FONT_ROLES;

export const fontManager = {
  stacks: FONT_STACKS,
  roles: FONT_ROLES,
};
