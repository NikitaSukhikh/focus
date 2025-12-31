export const SHORTCUT_HINT_LINES = [
  "Press 'Ctrl+Y' to create new space",
  "'Ctrl+I' or right click - add link/files",
  "'Ctrl+L' - toggle left side bar",
  "'Ctrl+U' - toggle preview pane",
] as const;

export const SHORTCUT_HINT_TEXT = SHORTCUT_HINT_LINES.join('\n');
