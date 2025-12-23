# Alfy Technology Stack

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ALFY STACK                              │
├─────────────────────────────────────────────────────────────────┤
│  UI            Tauri (Rust shell) + React + TypeScript          │
│  Backend       Python (FastAPI) — all business logic            │
│  Database      SQLite                                           │
│  LLM Engine    llama-cpp-python (or Ollama)                     │
│  Models        Qwen3-1.7B (Router) + Qwen3-8B (Agent)           │
│  IPC           HTTP/WebSocket (localhost)                       │
│  Rust Helpers  Optional, only if performance requires           │
└─────────────────────────────────────────────────────────────────┘
```

## Language Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│                    LANGUAGE BREAKDOWN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Python (95% of codebase)                                       │
│  ─────────────────────────                                      │
│  • LLM inference and orchestration                              │
│  • All domain agents (files, email, finance, etc.)              │
│  • All tools and integrations                                   │
│  • Database operations                                          │
│  • REST API and WebSocket server                                │
│  • External API clients (Claude, ChatGPT, Gmail, etc.)          │
│                                                                 │
│  TypeScript/React (UI logic)                                    │
│  ──────────────────────────                                     │
│  • Chat interface                                               │
│  • Settings and configuration                                   │
│  • Widgets (calendar, finance, focus)                           │
│  • State management                                             │
│  • WebSocket client                                             │
│                                                                 │
│  Rust (minimal — Tauri shell only)                              │
│  ─────────────────────────────────                              │
│  • Window creation and management                               │
│  • System tray icon and menu                                    │
│  • Global hotkeys                                               │
│  • Native OS integration                                        │
│  • ~50-100 lines of code total                                  │
│                                                                 │
│  Rust Helpers (future, if needed)                               │
│  ────────────────────────────────                               │
│  • Activity monitor daemon (if Python polling too heavy)        │
│  • File indexer (if initial scan too slow)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Why This Split?

| Concern | Decision | Rationale |
|---------|----------|-----------|
| **LLM ecosystem** | Python | Best library support (llama-cpp-python, langchain) |
| **Tool integrations** | Python | Mature libs for email, calendar, banking, docs |
| **Development speed** | Python | 3-5x faster iteration than Rust |
| **UI framework** | React | Fast to build, huge ecosystem, easy to hire |
| **Native app wrapper** | Tauri (Rust) | Lightweight (15MB vs Electron's 180MB) |
| **Performance hotspots** | Rust (later) | Only if profiling shows bottlenecks |

---

## Architecture

```
┌────────────────────┐       HTTP/WebSocket       ┌────────────────────┐
│                    │      localhost:8420        │                    │
│    Tauri App       │ ◄────────────────────────► │   Python Backend   │
│    (React UI)      │                            │   (FastAPI + LLM)  │
│                    │                            │                    │
└────────────────────┘                            └────────────────────┘
      ~40 MB RAM                                       ~8-10 GB RAM
      
      Handles:                                    Handles:
      • Chat interface                            • LLM inference
      • System tray                               • Tool execution
      • Notifications                             • Database operations
      • Global hotkeys                            • External API calls
      • Window management                         • File processing
```

---

## UI Layer

### Tauri (Rust Shell) + React (UI Logic)

Tauri provides a lightweight native wrapper. The Rust code is minimal—just window management and system integration. All UI logic lives in React/TypeScript.

**Rust code you'll actually write (~50-100 lines):**

```rust
// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, Manager};

fn main() {
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show", "Show Alfy"))
        .add_item(CustomMenuItem::new("quit", "Quit"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            if let SystemTrayEvent::MenuItemClick { id, .. } = event {
                match id.as_str() {
                    "show" => {
                        if let Some(window) = app.get_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                    "quit" => std::process::exit(0),
                    _ => {}
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error running Alfy");
}
```

That's essentially the entire Rust codebase. Everything else is configuration and React.

**Why Tauri over Electron:**

| Aspect | Tauri | Electron |
|--------|-------|----------|
| Bundle size | ~15 MB | ~180 MB |
| RAM usage | ~40 MB | ~150 MB |
| Startup time | Fast | Slower |
| Native feel | Excellent | Good |
| Security | Rust-based, sandboxed | Node.js |

**Key UI Components:**

```
alfy-ui/
├── src/                          # React application (TypeScript)
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── ChatWindow.tsx      # Main conversation view
│   │   │   ├── MessageBubble.tsx   # Individual messages
│   │   │   ├── InputBar.tsx        # User input + send
│   │   │   └── ModelSelector.tsx   # Alfy / Claude / ChatGPT toggle
│   │   ├── Sidebar/
│   │   │   ├── DomainNav.tsx       # Quick access to domains
│   │   │   └── RecentChats.tsx     # Conversation history
│   │   ├── Widgets/
│   │   │   ├── Calendar.tsx        # Mini calendar view
│   │   │   ├── Finance.tsx         # Balance & spending
│   │   │   └── Focus.tsx           # Current focus session
│   │   └── Settings/
│   │       ├── General.tsx
│   │       ├── Integrations.tsx    # Email, calendar, banking
│   │       └── LLMConfig.tsx       # Model settings, API keys
│   ├── hooks/
│   │   ├── useWebSocket.ts         # Real-time backend comms
│   │   └── useAlfy.ts              # Main Alfy interface
│   ├── stores/
│   │   └── conversation.ts         # Zustand state management
│   └── App.tsx
│
├── src-tauri/                    # Tauri/Rust (minimal — ~50-100 lines)
│   ├── src/
│   │   └── main.rs               # System tray, hotkeys, window mgmt
│   ├── icons/                    # App icons
│   ├── tauri.conf.json           # Tauri configuration
│   └── Cargo.toml
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

**UI Libraries:**

| Purpose | Library |
|---------|---------|
| Framework | React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Icons | Lucide React |
| Date/Time | date-fns |
| Markdown | react-markdown |
| Code highlighting | Prism.js |

---

## Backend Layer

### Python + FastAPI

**Why Python:**

1. **LLM ecosystem** — Best library support for local inference
2. **Tool integrations** — Libraries exist for everything (email, banking, file parsing)
3. **Rapid iteration** — Fast to prototype and modify
4. **Single language** — ML code and business logic in one place

**Project Structure:**

```
alfy-backend/                       # Project root (git repo, configs, data)
│
├── alfy/                           # Python package (all source code lives here)
│   │                               # Enables clean imports: "from alfy.core.router import Router"
│   │
│   ├── __init__.py
│   ├── main.py                     # FastAPI app entry point
│   ├── config.py                   # Settings and configuration
│   │
│   ├── core/                       # Core LLM orchestration
│   │   ├── __init__.py
│   │   ├── router.py               # Tier 0 heuristics + Tier 1 LLM router
│   │   ├── orchestrator.py         # Multi-domain task coordination
│   │   ├── llm.py                  # Model loading and inference
│   │   └── prompts.py              # System prompts for all domains
│   │
│   ├── agents/                     # Domain-specific agents
│   │   ├── __init__.py
│   │   ├── base.py                 # Base agent class
│   │   ├── files.py
│   │   ├── email.py
│   │   ├── calendar.py
│   │   ├── finance.py
│   │   ├── productivity.py
│   │   ├── messaging.py
│   │   ├── system.py
│   │   ├── external_llm.py         # Claude / ChatGPT delegation
│   │   └── general.py
│   │
│   ├── tools/                      # Tool implementations per domain
│   │   ├── __init__.py
│   │   ├── files/
│   │   │   ├── __init__.py
│   │   │   ├── search.py
│   │   │   ├── operations.py       # move, rename, open
│   │   │   └── parsing.py          # PDF, DOCX, TXT extraction
│   │   ├── email/
│   │   │   ├── __init__.py
│   │   │   ├── imap_client.py
│   │   │   ├── gmail_client.py
│   │   │   └── parser.py           # Extract bookings, subscriptions
│   │   ├── calendar/
│   │   │   ├── __init__.py
│   │   │   ├── google_calendar.py
│   │   │   └── internal.py
│   │   ├── finance/
│   │   │   ├── __init__.py
│   │   │   ├── open_banking.py
│   │   │   ├── csv_import.py
│   │   │   ├── categorizer.py
│   │   │   └── invoices.py
│   │   ├── productivity/
│   │   │   ├── __init__.py
│   │   │   ├── activity_monitor.py
│   │   │   ├── focus.py
│   │   │   └── reminders.py
│   │   ├── messaging/
│   │   │   ├── __init__.py
│   │   │   ├── telegram_bot.py
│   │   │   └── whatsapp_helper.py
│   │   └── system/
│   │       ├── __init__.py
│   │       ├── app_launcher.py
│   │       └── window_manager.py
│   │
│   ├── services/                   # Shared services
│   │   ├── __init__.py
│   │   ├── database.py             # SQLite async connection
│   │   ├── embeddings.py           # Local embeddings for RAG
│   │   ├── external_llm.py         # Claude, ChatGPT clients
│   │   └── notifications.py        # Desktop notifications
│   │
│   ├── models/                     # Pydantic models (data schemas)
│   │   ├── __init__.py
│   │   ├── conversation.py
│   │   ├── message.py
│   │   ├── commitment.py
│   │   ├── transaction.py
│   │   ├── subscription.py
│   │   └── invoice.py
│   │
│   ├── api/                        # HTTP/WebSocket layer
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py
│   │   │   ├── conversations.py
│   │   │   ├── files.py
│   │   │   ├── calendar.py
│   │   │   ├── finance.py
│   │   │   └── settings.py
│   │   ├── websocket.py            # Real-time chat handler
│   │   └── middleware.py           # CORS, logging
│   │
│   └── db/                         # Database layer
│       ├── __init__.py
│       ├── schema.sql              # Initial schema
│       ├── migrations/             # Schema migrations
│       └── repositories/           # Data access layer
│           ├── __init__.py
│           ├── conversations.py
│           ├── commitments.py
│           └── transactions.py
│
├── tests/                          # Tests (outside the alfy/ package)
│   ├── __init__.py
│   ├── test_router.py
│   └── test_agents/
│
├── data/                           # Runtime data (outside the alfy/ package)
│   └── alfy.db                     # SQLite database (created at runtime)
│
├── llm_models/                     # Downloaded LLM files (outside the alfy/ package)
│   ├── qwen3-1.7b-q4_k_m.gguf      # Router model (~1.2 GB)
│   └── qwen3-8b-q4_k_m.gguf        # Agent model (~5 GB)
│
├── logs/                           # Log files
│   └── alfy.log
│
├── pyproject.toml                  # Project config (name, version, dependencies)
├── requirements.txt                # Pip dependencies
├── requirements-dev.txt            # Dev/test dependencies
└── .env.example                    # Environment variables template
```

**Why the nested `alfy/` folder inside `alfy-backend/`?**

This is standard Python packaging convention:

- `alfy-backend/` = project root (configs, tests, data, models)
- `alfy/` = importable Python package (all source code)

This enables clean imports:

```python
from alfy.core.router import Router
from alfy.agents.finance import FinanceAgent
from alfy.tools.files.search import search_files
from alfy.models.transaction import Transaction
```

Without this structure, you'd have messy relative imports everywhere.

**Key Dependencies:**

```txt
# Core
fastapi>=0.110.0
uvicorn>=0.29.0
websockets>=12.0
pydantic>=2.6.0

# LLM
llama-cpp-python>=0.2.60

# Database
sqlalchemy>=2.0.0
aiosqlite>=0.20.0

# File Processing
pypdf>=4.0.0
python-docx>=1.1.0
openpyxl>=3.1.0

# Email
aiosmtplib>=3.0.0
aioimaplib>=1.0.0

# HTTP Clients (for external APIs)
httpx>=0.27.0
anthropic>=0.21.0          # Claude API
openai>=1.14.0             # ChatGPT API

# Calendar
google-auth>=2.28.0
google-api-python-client>=2.120.0

# Telegram
python-telegram-bot>=21.0

# Activity Monitoring (Windows)
pywin32>=306

# Utilities
python-dotenv>=1.0.0
pydantic-settings>=2.2.0
```

---

## LLM Layer

### Inference Engine: llama-cpp-python

Runs GGUF-quantized models efficiently on CPU (with optional GPU acceleration).

**Model Configuration:**

```python
# alfy/core/llm.py

from llama_cpp import Llama

class AlfyLLM:
    def __init__(self, config: LLMConfig):
        # Router model — small, fast
        self.router = Llama(
            model_path="models/qwen3-1.7b-q4_k_m.gguf",
            n_ctx=4096,           # Context window
            n_threads=4,          # CPU threads
            n_gpu_layers=0,       # CPU only (or set for GPU offload)
            verbose=False
        )
        
        # Agent model — larger, more capable
        self.agent = Llama(
            model_path="models/qwen3-8b-q4_k_m.gguf",
            n_ctx=8192,
            n_threads=6,
            n_gpu_layers=0,
            verbose=False
        )
    
    def route(self, user_input: str) -> str:
        """Classify input into domain using router model."""
        response = self.router.create_chat_completion(
            messages=[
                {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
                {"role": "user", "content": user_input}
            ],
            max_tokens=20,
            temperature=0.1       # Low temp for consistent classification
        )
        return response["choices"][0]["message"]["content"].strip()
    
    def generate(self, system_prompt: str, messages: list, tools: list = None) -> str:
        """Generate response using agent model."""
        response = self.agent.create_chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                *messages
            ],
            max_tokens=2048,
            temperature=0.7,
            tools=tools           # Function calling support
        )
        return response["choices"][0]["message"]["content"]
```

**Models:**

| Model | Purpose | Size (Q4) | RAM | Source |
|-------|---------|-----------|-----|--------|
| Qwen3-1.7B | Router / Classifier | ~1.2 GB | ~1.5 GB | [HuggingFace](https://huggingface.co/Qwen) |
| Qwen3-8B | Domain Agents | ~5 GB | ~6 GB | [HuggingFace](https://huggingface.co/Qwen) |

**Alternative: Ollama**

If you prefer simpler setup, Ollama wraps llama.cpp with a nice API:

```python
import httpx

class OllamaLLM:
    def __init__(self, base_url="http://localhost:11434"):
        self.base_url = base_url
        self.client = httpx.AsyncClient()
    
    async def generate(self, model: str, prompt: str) -> str:
        response = await self.client.post(
            f"{self.base_url}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False}
        )
        return response.json()["response"]
```

```bash
# Setup with Ollama
ollama pull qwen3:1.7b
ollama pull qwen3:8b
```

---

## Database Layer

### SQLite

Simple, embedded, no server needed. Perfect for a local-first app.

**Schema Overview:**

```sql
-- Conversations
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    role TEXT CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT,
    domain TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commitments (calendar events, flights, meetings, etc.)
CREATE TABLE commitments (
    id TEXT PRIMARY KEY,
    type TEXT CHECK(type IN ('meeting', 'flight', 'hotel', 'job', 'focus', 'reminder')),
    title TEXT,
    description TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    location TEXT,
    metadata JSON,          -- Flexible storage for type-specific data
    source TEXT,            -- 'email', 'manual', 'telegram'
    external_id TEXT,       -- Google Calendar ID, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Finance
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT,
    amount REAL,
    currency TEXT DEFAULT 'GBP',
    description TEXT,
    category TEXT,
    date DATE,
    source TEXT,            -- 'open_banking', 'csv_import'
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    service_name TEXT,
    amount REAL,
    currency TEXT DEFAULT 'GBP',
    cycle TEXT CHECK(cycle IN ('monthly', 'yearly', 'weekly')),
    next_renewal DATE,
    trial_end DATE,
    status TEXT DEFAULT 'active',
    detection_source TEXT,  -- 'email', 'transaction'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    client_name TEXT,
    amount REAL,
    currency TEXT DEFAULT 'GBP',
    issued_date DATE,
    due_date DATE,
    paid_date DATE,
    status TEXT CHECK(status IN ('draft', 'sent', 'paid', 'overdue')),
    job_id TEXT,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productivity
CREATE TABLE activity_logs (
    id TEXT PRIMARY KEY,
    app_name TEXT,
    window_title TEXT,
    category TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_seconds INTEGER
);

CREATE TABLE focus_sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    planned_duration INTEGER, -- minutes
    actual_duration INTEGER,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status TEXT CHECK(status IN ('active', 'completed', 'cancelled'))
);

-- File index for RAG
CREATE TABLE file_index (
    id TEXT PRIMARY KEY,
    file_path TEXT UNIQUE,
    file_name TEXT,
    file_type TEXT,
    content_hash TEXT,
    summary TEXT,
    tags JSON,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE file_search USING fts5(
    file_path,
    file_name,
    content,
    summary
);
```

---

## Communication (IPC)

### HTTP REST + WebSocket

**REST API** for CRUD operations:

```
GET    /api/conversations
POST   /api/conversations
GET    /api/calendar/events
POST   /api/finance/transactions/import
GET    /api/settings
PUT    /api/settings
```

**WebSocket** for real-time chat:

```python
# Backend
@app.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_json()
        
        # Stream response tokens
        async for token in alfy.process_stream(data["message"]):
            await websocket.send_json({
                "type": "token",
                "content": token
            })
        
        await websocket.send_json({"type": "done"})
```

```typescript
// Frontend
const ws = new WebSocket("ws://localhost:8420/ws/chat");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "token") {
    appendToResponse(data.content);
  }
};

function sendMessage(content: string) {
  ws.send(JSON.stringify({ message: content }));
}
```

---

## External APIs

### Claude (Anthropic)

```python
from anthropic import Anthropic

client = Anthropic(api_key=settings.anthropic_api_key)

async def ask_claude(prompt: str, context: str = None) -> str:
    messages = []
    if context:
        messages.append({"role": "user", "content": context})
    messages.append({"role": "user", "content": prompt})
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=messages
    )
    return response.content[0].text
```

### ChatGPT (OpenAI)

```python
from openai import OpenAI

client = OpenAI(api_key=settings.openai_api_key)

async def ask_chatgpt(prompt: str, context: str = None) -> str:
    messages = []
    if context:
        messages.append({"role": "user", "content": context})
    messages.append({"role": "user", "content": prompt})
    
    response = client.chat.completions.create(
        model="gpt-4o",
        max_tokens=4096,
        messages=messages
    )
    return response.choices[0].message.content
```

---

## Memory Usage Summary

```
Total System RAM: 16 GB
│
├── Windows + Background Apps    ~4-5 GB
│
├── Alfy Backend                 ~8-10 GB
│   ├── Python process           ~500 MB
│   ├── Qwen3-1.7B (Router)      ~1.5 GB
│   ├── Qwen3-8B (Agent)         ~6 GB
│   ├── SQLite + indexes         ~100-500 MB
│   └── Embeddings cache         ~500 MB
│
├── Alfy UI (Tauri)              ~40-60 MB
│
└── Headroom                     ~2-3 GB
```

---

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- Rust (for Tauri)
- Git

### Backend Setup

```bash
cd alfy-backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Download models
mkdir models
# Download Qwen3-1.7B and Qwen3-8B GGUF files from HuggingFace

# Run
uvicorn alfy.main:app --reload --port 8420
```

### UI Setup

```bash
cd alfy-ui
npm install

# Development
npm run tauri dev

# Build
npm run tauri build
```

---

## Deployment

### Building for Windows

```bash
# Backend: Bundle with PyInstaller
pyinstaller --onedir --name alfy-backend alfy/main.py

# UI: Tauri builds native installer
npm run tauri build
# Output: src-tauri/target/release/bundle/msi/Alfy_x.x.x_x64.msi
```

### Final Package Structure

```
Alfy/
├── Alfy.exe                    # Tauri UI
├── alfy-backend/
│   ├── alfy-backend.exe        # PyInstaller bundle
│   └── models/
│       ├── qwen3-1.7b-q4_k_m.gguf
│       └── qwen3-8b-q4_k_m.gguf
├── data/
│   └── alfy.db
└── config/
    └── settings.yaml
```

---

## Future Considerations

### Optional Rust Helpers (If Performance Requires)

If profiling reveals bottlenecks, these components could be rewritten in Rust:

**Activity Monitor Daemon**

```
alfy-helpers/
└── activity-monitor/
    ├── Cargo.toml
    └── src/main.rs      # Polls active window, outputs JSON to stdout
```

Python reads the daemon's output. Benefits: lower CPU overhead for continuous polling.

**File Indexer (PyO3 Extension)**

```
alfy-helpers/
└── file-indexer/
    ├── Cargo.toml
    └── src/lib.rs       # Parallel file scanning, imported as Python module
```

Called directly from Python via `import alfy_indexer`. Benefits: 10-50x faster initial file scan.

**When to add these:**
- Activity monitor: If Python's `pywin32` polling uses >2% CPU idle
- File indexer: If initial scan of 10,000+ files takes >30 seconds

**For MVP: Skip these entirely.** Python handles both tasks adequately. Optimize only if users complain.

### Performance Optimizations

- **GPU acceleration**: Add CUDA/ROCm support for faster inference
- **Model caching**: Keep frequently-used prompts cached
- **Lazy loading**: Load domain-specific tools on demand

### Scalability

- **Plugin system**: Allow third-party tool integrations
- **Custom models**: Support user-provided fine-tuned models
- **Multi-language UI**: i18n support for international users