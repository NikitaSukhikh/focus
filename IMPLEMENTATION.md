# Space Management Implementation

## What Was Implemented

### 1. Space Creation
The '+' button in the left sidebar adds a new space with:
- Default name "My First Space"
- Name automatically highlighted for editing
- Press Enter to save, Escape to cancel
- Click outside the input to save

### 2. Space Rename (Works in Both Locations)

**Left Sidebar:**
- Right-click on space name → "Rename"
- Edit inline with highlighted text
- Press Enter to save, Escape to cancel

**Main Pane (Center):**
- Right-click on space title → "Rename"
- Double-click on space title to edit directly
- Auto-select text for quick editing
- Press Enter to save, Escape to cancel

### 3. Space Delete (Works in Both Locations)

**Left Sidebar:**
- Right-click on space name → "Delete"
- Removes space and all its data from database

**Main Pane (Center):**
- Right-click on space title → "Delete"
- Cascade delete: removes space and all associated objects

### 4. Space Selection
- Click any space in the sidebar to select it
- Selected space displays in main pane
- Selection is shared across all components via Zustand store

### 5. Backend Integration
- Created API client for spaces
- Connected to FastAPI endpoints at `/api/spaces`
- Supports both mock mode and backend mode

### 6. Database Persistence
- Spaces stored in SQLite database
- Data: id, name, description, icon, color, position, object_count
- Full CRUD operations: Create, Read, Update, Delete

## Files Created/Modified

**Created:**
- [ui/src/api/spaces.ts](ui/src/api/spaces.ts) - API client for spaces
- [ui/src/stores/spaceStore.ts](ui/src/stores/spaceStore.ts) - Zustand store for shared state

**Modified:**
- [ui/src/components/layout/LeftSidebar.tsx](ui/src/components/layout/LeftSidebar.tsx) - Space list with CRUD
- [ui/src/components/layout/CenterPane.tsx](ui/src/components/layout/CenterPane.tsx) - Space title with CRUD
- [ui/vite.config.ts](ui/vite.config.ts) - Added proxy for `/api` to backend

## Testing Instructions

### 1. Start Backend
```powershell
.\run-backend.ps1
```

### 2. Start Frontend
```bash
cd ui
npm run dev
```

### 3. Switch to Backend Mode
Open browser console and run:
```javascript
focusDataMode.set('backend')
```

### 4. Test Space Creation
1. Click Cmd/Ctrl+L to open left sidebar
2. Click the '+' button in the left sidebar
3. A new space appears with "My First Space" highlighted
4. Type a new name (e.g., "My Projects")
5. Press Enter to save
6. The space is now stored in the database

### 5. Test Rename (Sidebar)
1. Right-click on any space in the sidebar
2. Select "Rename" from context menu
3. Edit the name (text is auto-selected)
4. Press Enter to save

### 6. Test Rename (Main Pane)
1. Select an space from the sidebar
2. Right-click on the space title in the main pane
3. Select "Rename" OR double-click the title
4. Edit the name (text is auto-selected)
5. Press Enter to save

### 7. Test Delete (Sidebar)
1. Right-click on any space in the sidebar
2. Select "Delete" from context menu
3. Space is removed from database (with all its objects)

### 8. Test Delete (Main Pane)
1. Select an space from the sidebar
2. Right-click on the space title in the main pane
3. Select "Delete" from context menu
4. Space is removed from database (with all its objects)

### 9. Test Selection
1. Click on different spaces in the sidebar
2. Notice the main pane updates to show the selected space's name
3. Selected space is highlighted in the sidebar

## Backend Endpoints Used

- `POST /api/spaces` - Create new space
- `GET /api/spaces` - List all spaces
- `PUT /api/spaces/{id}` - Update space name
- `DELETE /api/spaces/{id}` - Delete space (cascade)

## Database Schema

Spaces are stored with the following structure:
```sql
CREATE TABLE spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    position INTEGER NOT NULL,
    object_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

## Mock Mode Support

The implementation also works in mock mode for development without backend:
```javascript
focusDataMode.set('mock')
```

## Features Summary

✅ Create spaces with auto-highlight name editing
✅ Rename spaces from sidebar (right-click)
✅ Rename spaces from main pane (right-click or double-click)
✅ Delete spaces from sidebar (right-click)
✅ Delete spaces from main pane (right-click)
✅ Select spaces by clicking in sidebar
✅ Shared state across all components
✅ Full database persistence
✅ Works in both mock and backend modes

## Debugging

If features don't work as expected:

1. **Open Browser Console** (F12 → Console tab)
2. **Check for console logs** - Operations log their flow
3. **Verify mode** - Run `focusDataMode.get()` to check current mode
4. **Check for errors** - Look for red error messages

See [TESTING.md](TESTING.md) for detailed test scenarios and expected console output.
