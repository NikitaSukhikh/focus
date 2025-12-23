<!-- UI project overview and quick start. -->

# Alfy UI

React + TypeScript + Tailwind CSS + Tauri frontend for Alfy.

## Development

### Prerequisites
- Node.js 20+
- npm 9+

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Run with Tauri (Desktop App)
```bash
npm run tauri dev
```

## UI Features

### Top Navigation Bar
The ChatWindow includes a domain-focused navigation bar with:
- **Mail** - Email domain (blue)
- **Finances** - Finance domain (green)
- **Calendar** - Calendar domain (purple)
- **Claude** - External Claude LLM (orange)
- **ChatGPT** - External ChatGPT LLM (teal)

### Chat Interface
- Clean, modern design with Tailwind CSS
- Responsive layout that adapts to window size
- Domain-specific context indicators
- Auto-expanding textarea for user input
- Send button with visual feedback

### State Management
- Active domain tracking
- Context switching between domains
- Clear visual indicators for active state

## Tech Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Vite** - Build tool
- **Zustand** - State management (to be integrated)