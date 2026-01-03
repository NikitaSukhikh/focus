export const SHORTCUT_HINT_LINES = [
  "Press 'Ctrl+Y' to create new space",
  "'Ctrl+I' or right click - add link/files",
  "'Ctrl+Left/Right' - open/close sidebar",
  "'Ctrl+Down/Up' - navigate spaces",
  "'Ctrl+Enter' - load selected space",
  "'Ctrl+N' - rename focused space",
  "'Ctrl+Delete' - delete focused space",
  "'Ctrl+U' - toggle preview pane",
] as const;

export const SHORTCUT_HINT_TEXT = SHORTCUT_HINT_LINES.join('\n');
