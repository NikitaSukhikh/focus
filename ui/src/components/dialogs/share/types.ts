/**
 * Shared types for space sharing so the top-bar trigger and space-share dialog stay in sync.
 */
export interface SpaceShareFilters {
  links: boolean;
  webArticles: boolean;
  files: boolean;
  textNotes: boolean;
}

export const createDefaultSpaceShareFilters = (): SpaceShareFilters => ({
  links: true,
  webArticles: true,
  files: true,
  textNotes: true,
});

export const hasAnySpaceShareFilterSelected = (filters: SpaceShareFilters): boolean =>
  filters.links || filters.webArticles || filters.files || filters.textNotes;
