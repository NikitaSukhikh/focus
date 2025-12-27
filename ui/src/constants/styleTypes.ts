export const DEFAULT_STYLE = 'default' as const;
export const CYBERPUNK_STYLE = 'cyberpunk' as const;

export type AppStyleType = typeof DEFAULT_STYLE | typeof CYBERPUNK_STYLE;
