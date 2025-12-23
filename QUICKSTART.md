# Ocean - Quick Start Guide

## Two Ways to Run Ocean UI

### Option 1: Desktop App (Recommended) 🖥️

Run Ocean as a **standalone desktop application** using Tauri.

#### Prerequisites
- **Rust** must be installed:
  - Windows: [https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install)
  - Linux/Mac: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

#### Steps

1. **Install dependencies:**
```bash
cd ui
npm install
```

2. **Run the desktop app:**
```bash
npm run tauri:dev
```

Or use the helper script:
```bash
# Windows
.\run-desktop.ps1

# Linux/Mac
./run-desktop.sh
```

This will launch Ocean in a **native desktop window** (no browser needed)!

### Option 2: Browser Mode (Development) 🌐

Run the UI in your browser for quick development/testing.

#### Steps

1. **Install dependencies:**
```bash
cd ui
npm install
```

2. **Start development server:**
```bash
npm run dev
```

The UI will be available at **http://localhost:5173**

Or use the helper script:
```bash
# Windows
.\run-ui.ps1

# Linux/Mac
./run-ui.sh
```

## What You'll See

A three-pane layout:

- **Left Sidebar** (dark theme): Islands list with sample data
  - Click the chevron icon to collapse/expand
  - Resizable by dragging the edge
  
- **Center Pane** (main canvas): Grid of object tiles
  - Sample links and files displayed as cards
  - Hover effects on tiles
  
- **Right Sidebar** (preview panel): Shows object details
  - Metadata, description, and action buttons
  - Click X to close

## Project Structure

```
ocean/
├── backend/              # Python FastAPI backend
│   ├── requirements.txt  # Python dependencies (updated)
│   └── app/             # Backend application code
│
└── ui/                   # React + TypeScript UI
    ├── package.json      # Node dependencies
    ├── vite.config.ts    # Vite configuration
    ├── tailwind.config.js # Tailwind CSS config
    ├── src/
    │   ├── App.tsx       # Main application
    │   ├── main.tsx      # Entry point
    │   ├── components/
    │   │   └── layout/   # Layout components
    │   │       ├── TopBar.tsx
    │   │       ├── LeftSidebar.tsx
    │   │       ├── CenterPane.tsx
    │   │       └── RightSidebar.tsx
    │   └── styles/
    │       └── globals.css # Global styles
    └── README.md         # UI documentation
```

## Features Implemented

✅ Three-pane layout as per README.md
✅ Resizable left sidebar
✅ Visual styling matching assistant UI theme
✅ Sample Islands and Objects
✅ Preview panel with metadata
✅ Responsive hover effects
✅ Custom scrollbars

## Next Steps

To connect the UI to the backend:

1. Set up Python backend:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

2. Configure API URL in `ui/.env`:
   ```
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```

3. Implement state management and API calls in the UI

## Styling Theme

The UI uses the same styling as the assistant:
- **Dark sidebar**: slate-900 to slate-800 gradient
- **Main area**: Clean white/slate-50
- **Accents**: Blue-600 for primary actions
- **Smooth transitions**: 200ms duration
- **Custom scrollbars**: Thin, rounded

## Technologies

- **Tauri 1.7** - Desktop app framework (Rust-based)
- **React 18** - UI library
- **TypeScript 5** - Type safety
- **Vite 7** - Build tool
- **Tailwind CSS 3** - Styling
- **Lucide React** - Icons
- **Zustand 4** - State management (not yet implemented)

## Building for Production

To create a distributable desktop application:

```bash
cd ui
npm run tauri:build
```

This will create platform-specific installers in `ui/src-tauri/target/release/bundle/`:
- **Windows**: `.msi` and `.exe` installers
- **macOS**: `.dmg` and `.app` bundle
- **Linux**: `.deb`, `.AppImage`, and others

Enjoy exploring Ocean! 🌊
