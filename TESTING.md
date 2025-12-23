# Testing Island Management

## Setup

1. **Start Backend**
```powershell
.\run-backend.ps1
```

2. **Start Frontend** (in a new terminal)
```bash
cd ui
npm run dev
```

3. **Open Browser**
- Navigate to `http://localhost:5173`
- Open browser DevTools (F12)
- Go to Console tab

## Test Scenarios

### Test 1: Island Creation (Mock Mode)

**Steps:**
1. Open Console and verify mode: `oceanDataMode.get()` should return `'mock'`
2. Press `Cmd/Ctrl + L` to open sidebar
3. Click the `+` button
4. **Expected console output:**
   ```
   handleAddIsland clicked
   createIsland called: {name: 'My First Island', isMockMode: true, currentIslands: 4}
   Setting islands to: 5
   New island created: {id: 'temp-...', name: 'My First Island', count: 0}
   ```
5. **Expected UI:**
   - New island appears at the bottom of the list
   - Name is highlighted/editable
   - Can type new name and press Enter

### Test 2: Island Deletion (Mock Mode)

**Steps:**
1. Right-click on any island in the sidebar
2. Click "Delete"
3. **Expected console output:**
   ```
   handleDeleteIsland: i1
   deleteIsland called: {id: 'i1', isMockMode: true, currentIslands: 4}
   Deleting island (mock mode): {before: 4, after: 3}
   ```
4. **Expected UI:**
   - Island disappears from list immediately
   - If it was selected, another island gets selected

### Test 3: Island Creation (Backend Mode)

**Steps:**
1. Switch to backend mode: `oceanDataMode.set('backend')`
2. Wait for islands to reload from backend
3. Press `Cmd/Ctrl + L` to open sidebar
4. Click the `+` button
5. **Expected console output:**
   ```
   handleAddIsland clicked
   createIsland called: {name: 'My First Island', isMockMode: false, currentIslands: X}
   Created island via API: {id: '...', name: 'My First Island', ...}
   New island created: {...}
   ```
6. **Expected UI:**
   - New island appears
   - Name is highlighted/editable
   - Island is saved to database

### Test 4: Island Deletion (Backend Mode)

**Steps:**
1. Ensure in backend mode
2. Right-click on any island
3. Click "Delete"
4. **Expected console output:**
   ```
   handleDeleteIsland: <uuid>
   deleteIsland called: {id: '<uuid>', isMockMode: false, currentIslands: X}
   Deleted island via API: {before: X, after: X-1}
   ```
5. **Expected UI:**
   - Island disappears
   - Database updated (persists on refresh)

### Test 5: Island Rename (Sidebar)

**Steps:**
1. Right-click on an island
2. Click "Rename"
3. Type new name
4. Press Enter
5. **Expected:** Island name updates in both sidebar and main pane

### Test 6: Island Rename (Main Pane)

**Steps:**
1. Click an island to select it
2. Double-click the island title in the main pane
3. Type new name
4. Press Enter
5. **Expected:** Island name updates in both sidebar and main pane

## Troubleshooting

### Islands don't appear
- Check console for errors
- Verify `oceanDataMode.get()` returns expected mode
- Check Network tab for API calls (backend mode)

### '+' button doesn't work
- Check console for "handleAddIsland clicked" message
- Check for JavaScript errors
- Verify store is initialized

### Delete doesn't work
- Check console for "handleDeleteIsland" message
- Verify context menu appears on right-click
- Check for JavaScript errors

## Success Criteria

✅ Can create islands in both mock and backend modes
✅ Can delete islands in both mock and backend modes
✅ Can rename islands from sidebar
✅ Can rename islands from main pane
✅ Islands persist in database (backend mode)
✅ UI updates immediately on all operations
✅ Console logs show expected flow
