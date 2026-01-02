# Focus UI

React + TypeScript + Vite frontend for Focus desktop application.

## Features

- **Three-pane layout**: 
  - Left sidebar (Spaces list, usually folded by default)
  - Center pane (Active Space canvas with object tiles)
  - Right sidebar (Preview/inspector panel for focused objects)
- Tailwind CSS styling matching the assistant UI theme
- Resizable left sidebar
- Responsive design
- TypeScript for type safety

## Development

### Prerequisites

- Node.js >= 20
- npm >= 9

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

3. Run with Electron:
```bash
npm run dev
```

This launches Focus as a **native desktop application** (no browser needed).

## Available Scripts

**Desktop App:**
- `npm run dev` - Run as desktop app (development)
- `npm run build` - Build desktop app for production
- `npm run preview` - Preview production build

**Code Quality:**
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run sync-tokens` - Sync design tokens

## Project Structure

```
src/
├── components/
│   ├── layout/          # Layout components (TopBar, LeftSidebar, CenterPane, RightSidebar)
│   ├── common/          # Reusable UI components (Button, Icon, Spinner, etc.)
│   └── features/        # Feature-specific components
│       ├── spaces/     # Spaces management
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
- **LeftSidebar**: Collapsible sidebar showing Spaces list with resize handle
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
