# Focus App Overview

## Product Summary
Focus is a desktop workspace app for collecting and organizing files, web links, text notes, and visual relationships (arrows) inside customizable Spaces.

Core UX is a three-pane layout:
- Main center pane: active Space canvas with tiles, notes, and arrows.
- Left sidebar: Spaces list and space management.
- Right side: object preview/inspector (plus assistant conversation area: will be soon implemented).

## What Users Can Do

### 1. Organize Work in Spaces
- Create, rename, select, and delete Spaces.
- Persist Space data in SQLite.
- Manage spaces from both sidebar and center pane (context menus and inline editing).

### 2. Build a Visual Canvas
- Add objects (files, links, web articles, plain text notes).
- Drag/reposition tiles on the canvas.
- Double-click empty canvas to add quick text notes.
- Draw arrows by dragging to show relationships between items.

### 3. Preview and Open Content
- Single click: focus item and inspect metadata/preview.
- Double click: open in native app when applicable.
- Dedicated preview behaviors for documents, media, and text/code.

### 4. Work With Many File Types
- `FILES_SUPPORTED.md` lists about 322 extensions.
- Major categories: documents, ebooks, images, audio, video, and large text/code coverage.
- Includes Word/Excel/PDF/HTML, common media formats, and broad developer/config file support.

### 5. Read Ebooks In-App
- Full preview support: EPUB, FB2.
- Limited support: MOBI/AZW/AZW3, CBZ/CBR, PDB, DJVU.
- Ebook metadata extraction (title/author), TOC navigation, embedded images, reader-style layout.

### 6. Use Google Integrations
- Connect Google via OAuth.
- Add Gmail and Google Drive entry points as objects.
- Authenticated link opening for Google services (Gmail/Drive/Docs/Sheets/Slides) with token refresh and account selection.
- Infrastructure is documented for more providers (Microsoft, Dropbox, Box, GitHub, Notion, Atlassian), mostly planned.

### 7. (Near Future) Use AI Assistant Capabilities


## Current Gaps and In-Progress Areas (Documented)
- Packaging notes mention unresolved/needs-validation issues for some metadata refresh and local preview cases.
- Web-only and macOS support docs are scaffold-level plans, not fully completed implementations.
- Assistant docs include a broader "Alfy" architecture (including Tauri plans) that appears to be a parallel or future-oriented subsystem; Focus desktop shell remains Electron-based in current core docs.

## Suggested First-Open Presentation Flow
1. Show three-pane layout and explain Spaces.
2. Create a new Space and rename it.
3. Add a file, a link, and a quick note; draw arrows between them.
4. Click through preview behaviors (document/media/ebook if available).
5. Show Google connect flow and authenticated link behavior.
6. Open assistant pane and demonstrate one practical tool-assisted task (for example read a doc or process a Drive link).
7. Close with local-first architecture, broad format support, and release/security posture.

