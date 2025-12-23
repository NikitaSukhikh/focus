# Ocean UI

React + TypeScript + Vite frontend for Ocean desktop application.

## Features

- **Three-pane layout**: 
  - Left sidebar (Islands list, usually folded by default)
  - Center pane (Active Island canvas with object tiles)
  - Right sidebar (Preview/inspector panel for focused objects)
- Tailwind CSS styling matching the assistant UI theme
- Resizable left sidebar
- Responsive design
- TypeScript for type safety

## Development

### Prerequisites

- Node.js >= 20
- npm >= 9
- **Rust** (for desktop app): [Install Rust](https://www.rust-lang.org/tools/install)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

### Running as Desktop App (Recommended)

3. Run with Tauri:
```bash
npm run tauri:dev
```

This launches Ocean as a **native desktop application** (no browser needed).

### Running in Browser (Development)

3. Start Vite dev server:
```bash
npm run dev
```

The app will be available at http://localhost:5173

## Available Scripts

**Desktop App:**
- `npm run tauri:dev` - Run as desktop app (development)
- `npm run tauri:build` - Build desktop app for production
- `npm run tauri` - Run Tauri CLI commands

**Web Development:**
- `npm run dev` - Start Vite development server (browser mode)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Code Quality:**
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── components/
│   ├── layout/          # Layout components (TopBar, LeftSidebar, CenterPane, RightSidebar)
│   ├── common/          # Reusable UI components (Button, Icon, Spinner, etc.)
│   └── features/        # Feature-specific components
│       ├── islands/     # Islands management
│       ├── objects/     # Objects (links, files) management
│       ├── preview/     # Preview panel components
│       ├── google/      # Google OAuth integration
│       └── settings/    # Settings dialog
├── services/            # API clients and services
├── state/              # State management (Zustand)
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── styles/             # Global styles
└── App.tsx             # Root component
```

## Styling

This project uses Tailwind CSS with a custom configuration matching the assistant UI theme:
- Dark sidebar with gradient background (slate-900 to slate-800)
- Clean white main content area (slate-50 background)
- Smooth transitions and hover effects
- Custom scrollbar styling

## Components Overview

### Layout Components

- **TopBar**: Top navigation bar with app logo, sidebar toggle, and action buttons
- **LeftSidebar**: Collapsible sidebar showing Islands list with resize handle
- **CenterPane**: Main canvas displaying object tiles in a grid layout
- **RightSidebar**: Preview panel showing focused object details and metadata

### Object Types

- **Link**: URL with title, optional favicon/thumbnail, and tags
- **File**: Local file reference with cached thumbnail/preview
- **Text file**: Shows first lines as tile preview
- **Google**: Gmail/Drive entry points (requires OAuth)

## Future Integration

Currently, this is a standalone visual UI. Future work includes:
- Connecting to Python backend API
- Implementing state management with Zustand
- Adding Google OAuth flow
- File upload and preview generation
- Drag-and-drop support
- Keyboard shortcuts
