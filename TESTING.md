# Testing Space Management

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

### Test 1: Space Creation (Mock Mode)

**Steps:**
1. Open Console and verify mode: `focusDataMode.get()` should return `'mock'`
2. Press `Cmd/Ctrl + L` to open sidebar
3. Click the `+` button
4. **Expected console output:**
   ```
   handleAddSpace clicked
   createSpace called: {name: 'My First Space', isMockMode: true, currentSpaces: 4}
   Setting spaces to: 5
   New space created: {id: 'temp-...', name: 'My First Space', count: 0}
   ```
5. **Expected UI:**
   - New space appears at the bottom of the list
   - Name is highlighted/editable
   - Can type new name and press Enter

### Test 2: Space Deletion (Mock Mode)

**Steps:**
1. Right-click on any space in the sidebar
2. Click "Delete"
3. **Expected console output:**
   ```
   handleDeleteSpace: i1
   deleteSpace called: {id: 'i1', isMockMode: true, currentSpaces: 4}
   Deleting space (mock mode): {before: 4, after: 3}
   ```
4. **Expected UI:**
   - Space disappears from list immediately
   - If it was selected, another space gets selected

### Test 3: Space Creation (Backend Mode)

**Steps:**
1. Switch to backend mode: `focusDataMode.set('backend')`
2. Wait for spaces to reload from backend
3. Press `Cmd/Ctrl + L` to open sidebar
4. Click the `+` button
5. **Expected console output:**
   ```
   handleAddSpace clicked
   createSpace called: {name: 'My First Space', isMockMode: false, currentSpaces: X}
   Created space via API: {id: '...', name: 'My First Space', ...}
   New space created: {...}
   ```
6. **Expected UI:**
   - New space appears
   - Name is highlighted/editable
   - Space is saved to database

### Test 4: Space Deletion (Backend Mode)

**Steps:**
1. Ensure in backend mode
2. Right-click on any space
3. Click "Delete"
4. **Expected console output:**
   ```
   handleDeleteSpace: <uuid>
   deleteSpace called: {id: '<uuid>', isMockMode: false, currentSpaces: X}
   Deleted space via API: {before: X, after: X-1}
   ```
5. **Expected UI:**
   - Space disappears
   - Database updated (persists on refresh)

### Test 5: Space Rename (Sidebar)

**Steps:**
1. Right-click on an space
2. Click "Rename"
3. Type new name
4. Press Enter
5. **Expected:** Space name updates in both sidebar and main pane

### Test 6: Space Rename (Main Pane)

**Steps:**
1. Click an space to select it
2. Double-click the space title in the main pane
3. Type new name
4. Press Enter
5. **Expected:** Space name updates in both sidebar and main pane

## Troubleshooting

### Spaces don't appear
- Check console for errors
- Verify `focusDataMode.get()` returns expected mode
- Check Network tab for API calls (backend mode)

### '+' button doesn't work
- Check console for "handleAddSpace clicked" message
- Check for JavaScript errors
- Verify store is initialized

### Delete doesn't work
- Check console for "handleDeleteSpace" message
- Verify context menu appears on right-click
- Check for JavaScript errors

## Success Criteria

✅ Can create spaces in both mock and backend modes
✅ Can delete spaces in both mock and backend modes
✅ Can rename spaces from sidebar
✅ Can rename spaces from main pane
✅ Spaces persist in database (backend mode)
✅ UI updates immediately on all operations
✅ Console logs show expected flow
