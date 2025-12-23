<!-- Overview of frontend architecture. -->

# Alfy UI Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER                                           │
│                                                                             │
│  Interactions:                                                              │
│  • Click system tray icon                                                   │
│  • Press Ctrl+Shift+Space                                                   │
│  • Type in chat window                                                      │
│  • Click UI buttons                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ALFY DESKTOP APP (Tauri)                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PRESENTATION LAYER                               │   │
│  │                    (React + TypeScript)                             │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│  │  │   TitleBar   │  │   Sidebar    │  │  ChatWindow  │             │   │
│  │  │              │  │              │  │              │             │   │
│  │  │ • Minimize   │  │ • Convos     │  │ • Messages   │             │   │
│  │  │ • Maximize   │  │ • Shortcuts  │  │ • Input      │             │   │
│  │  │ • Close      │  │ • Actions    │  │ • Typing     │             │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │   │
│  │                                                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │              Widgets Layer                                   │  │   │
│  │  │  • Calendar  • Finance  • Focus  • Subscriptions            │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ Tauri Commands (invoke)                │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     INTEGRATION LAYER                               │   │
│  │                     (TypeScript Services)                           │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│  │  │  tauri.ts    │  │  api.ts      │  │ websocket.ts │             │   │
│  │  │              │  │              │  │              │             │   │
│  │  │ TauriCommands│  │ HTTP Client  │  │ WS Client    │             │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ FFI / IPC                              │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       NATIVE LAYER                                  │   │
│  │                       (Rust + Tauri)                                │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│  │  │   main.rs    │  │   tray.rs    │  │  hotkeys.rs  │             │   │
│  │  │              │  │              │  │              │             │   │
│  │  │ • Setup      │  │ • Icon       │  │ • Ctrl+Shift │             │   │
│  │  │ • Init       │  │ • Menu       │  │   +Space     │             │   │
│  │  │ • Events     │  │ • Click      │  │ • Register   │             │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐                               │   │
│  │  │  window.rs   │  │ commands.rs  │                               │   │
│  │  │              │  │              │                               │   │
│  │  │ • Position   │  │ • API Bridge │                               │   │
│  │  │ • Size       │  │ • HTTP Calls │                               │   │
│  │  │ • Focus      │  │ • Serialize  │                               │   │
│  │  └──────────────┘  └──────────────┘                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP / WebSocket
                                    │ localhost:8420
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PYTHON BACKEND (FastAPI)                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        API Layer                                    │   │
│  │  • /chat - Chat endpoint                                            │   │
│  │  • /health - Health check                                           │   │
│  │  • /ws - WebSocket for real-time updates                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Router (LLM)                                   │   │
│  │  Model: Qwen3-1.7B                                                  │   │
│  │  • Classify user intent                                             │   │
│  │  • Route to domain agent                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   Domain Agents (LLM)                               │   │
│  │  Model: Qwen3-8B                                                    │   │
│  │  • Files  • Email  • Calendar  • Finance  • Productivity            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Tools Layer                                  │   │
│  │  • File operations  • Email parsing  • Bank API                     │   │
│  │  • Calendar sync    • System control                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Data Layer (SQLite)                            │   │
│  │  • Conversations  • Commitments  • Transactions                     │   │
│  │  • File index     • Activity logs                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### Example 1: User Sends Chat Message

```
1. User types message in ChatWindow component
   │
   ▼
2. InputBar calls api.sendMessage()
   │
   ▼
3. api.ts makes HTTP POST to http://localhost:8420/chat
   │
   ▼
4. Python backend receives request
   │
   ├──▶ Router LLM classifies intent
   │
   ├──▶ Domain agent processes with tools
   │
   └──▶ Returns response
   │
   ▼
5. Response flows back through api.ts
   │
   ▼
6. ChatWindow updates with new message
```

### Example 2: User Presses Ctrl+Shift+Space

```
1. Windows OS captures global hotkey
   │
   ▼
2. hotkeys.rs receives event
   │
   ▼
3. Checks window visibility via window.rs
   │
   ├──▶ If visible: window.hide()
   │
   └──▶ If hidden: window.show() + window.set_focus()
   │
   ▼
4. Window state changes
   │
   ▼
5. React components re-render based on visibility
```

### Example 3: User Clicks System Tray Icon

```
1. Windows system tray click event
   │
   ▼
2. tray.rs receives LeftClick event
   │
   ▼
3. Calls window.is_visible()
   │
   ├──▶ If visible: window.hide()
   │
   └──▶ If hidden: window.show() + set_focus()
   │
   ▼
4. Window toggles visibility
```

### Example 4: Backend Health Check

```
1. UI component calls TauriCommands.pingBackend()
   │
   ▼
2. tauri.ts invokes 'ping_backend' command
   │
   ▼
3. commands.rs receives command in Rust
   │
   ▼
4. Makes HTTP GET to http://localhost:8420/health
   │
   ▼
5. Python backend /health endpoint responds
   │
   ▼
6. Result flows back through commands.rs
   │
   ▼
7. tauri.ts receives boolean result
   │
   ▼
8. UI updates status indicator
```

## Technology Stack by Layer

### Presentation Layer
- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State**: Zustand
- **Build**: Vite

### Integration Layer
- **Tauri API**: @tauri-apps/api
- **HTTP Client**: Fetch API / axios
- **WebSocket**: Native WebSocket
- **Storage**: localStorage / Tauri Store

### Native Layer
- **Framework**: Tauri 1.5
- **Language**: Rust
- **Async**: Tokio
- **HTTP**: reqwest
- **Serialization**: serde, serde_json
- **Windows API**: windows crate

### Backend Layer
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **LLM**: Qwen3 (1.7B router, 8B agents)
- **Database**: SQLite
- **Async**: asyncio

## File Organization

```
alfy/
├── ui/                                 # Tauri desktop app
│   ├── src/                            # React frontend
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── TitleBar.tsx       # Custom window controls
│   │   │   │   └── MainLayout.tsx     # App layout
│   │   │   ├── Chat/                  # Chat components
│   │   │   ├── Sidebar/               # Sidebar components
│   │   │   └── Widgets/               # Widget components
│   │   ├── services/
│   │   │   ├── tauri.ts               # Tauri command wrapper
│   │   │   ├── api.ts                 # Backend API client
│   │   │   └── websocket.ts           # WebSocket client
│   │   ├── stores/                    # Zustand stores
│   │   ├── hooks/                     # React hooks
│   │   └── types/                     # TypeScript types
│   │
│   └── src-tauri/                      # Rust backend
│       ├── src/
│       │   ├── main.rs                # Entry point
│       │   ├── tray.rs                # System tray
│       │   ├── hotkeys.rs             # Global shortcuts
│       │   ├── window.rs              # Window management
│       │   └── commands.rs            # Tauri commands
│       ├── Cargo.toml                 # Rust dependencies
│       └── tauri.conf.json            # Tauri config
│
└── backend/                            # Python backend
    ├── main.py                        # FastAPI app
    ├── router/                        # LLM router
    ├── agents/                        # Domain agents
    ├── tools/                         # Tool implementations
    └── db/                            # Database layer
```

## Data Flow Patterns

### 1. Command Pattern (UI → Rust)
```typescript
// UI (TypeScript)
import { TauriCommands } from '@/services/tauri';
await TauriCommands.minimizeToTray();

// ↓ invoke('minimize_to_tray')

// Rust
#[tauri::command]
pub fn minimize_to_tray(window: Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}
```

### 2. Event Pattern (Rust → UI)
```rust
// Rust
app.emit_all("backend-status", payload);

// ↓ Event emission

// UI (TypeScript)
import { listen } from '@tauri-apps/api/event';
listen('backend-status', (event) => {
    console.log('Backend status:', event.payload);
});
```

### 3. HTTP Pattern (UI → Backend)
```typescript
// UI
const response = await fetch('http://localhost:8420/chat', {
    method: 'POST',
    body: JSON.stringify({ message: 'Hello' })
});

// ↓ HTTP POST

// Backend (Python)
@app.post("/chat")
async def chat(request: ChatRequest):
    response = await process_message(request.message)
    return {"response": response}
```

### 4. WebSocket Pattern (Real-time)
```typescript
// UI
const ws = new WebSocket('ws://localhost:8420/ws');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Update UI in real-time
};

// Backend (Python)
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        response = await process_message(data)
        await websocket.send_json(response)
```

## Security Considerations

### Tauri Allowlist
- Only approved APIs are accessible from frontend
- Shell commands restricted to `open` only
- Window APIs limited to necessary functions
- No filesystem access from frontend (goes through Rust)

### Backend Communication
- All communication over localhost
- No external connections required
- Backend API keys managed by Python, never exposed to frontend
- Human-in-the-loop for sensitive actions

### System Integration
- Global hotkeys don't conflict with system shortcuts
- Window management respects OS behavior
- System tray follows Windows conventions

## Performance Characteristics

| Component | Latency | Notes |
|-----------|---------|-------|
| Tauri command | ~1-5ms | Fast FFI calls |
| Window show/hide | ~50ms | Native OS operation |
| Backend HTTP | ~10-100ms | Depends on LLM processing |
| Router LLM | ~200-400ms | Qwen3-1.7B inference |
| Agent LLM | ~1-5s | Qwen3-8B inference |
| System tray click | ~10ms | Native event handling |
| Global hotkey | ~5ms | System-level capture |

## Build Pipeline

```
Development:
npm run dev         →  Vite dev server (hot reload)
npm run dev:tauri   →  Tauri dev mode (Rust + React)

Production:
npm run build       →  Build React to dist/
npm run build:tauri →  Compile Rust + bundle app
                    →  Output: alfy.exe
```

## Deployment

### Desktop App
- **Executable**: `src-tauri/target/release/alfy.exe`
- **Installer**: Can be configured via Tauri bundler
- **Updates**: Tauri updater (not yet configured)

### Backend
- Runs locally on user's machine
- Port: 8420
- Auto-start possible via Windows Task Scheduler

## Future Enhancements

1. **Auto-updater**: Tauri's built-in updater for seamless updates
2. **Notifications**: Native OS notifications via Tauri
3. **Clipboard**: System clipboard access for copy/paste features
4. **Multi-window**: Separate windows for settings, widgets
5. **Custom protocols**: `alfy://` protocol handler
6. **Splash screen**: Loading screen while backend initializes

---

For detailed implementation guides, see:
- [TAURI_IMPLEMENTATION_SUMMARY.md](../TAURI_IMPLEMENTATION_SUMMARY.md)
- [TAURI_FEATURES.md](TAURI_FEATURES.md)
- [src-tauri/README.md](src-tauri/README.md)