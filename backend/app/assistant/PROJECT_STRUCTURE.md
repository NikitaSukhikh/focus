# Alfy Project Structure & IPC Protocol

## Project Structure

```
alfy/                                 # Root monorepo
│
├── ui/                          # Tauri + React frontend
│   │
│   ├── src/                          # React application (TypeScript)
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── InputBar.tsx
│   │   │   │   ├── ModelSelector.tsx
│   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Sidebar/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── ConversationList.tsx
│   │   │   │   ├── DomainShortcuts.tsx
│   │   │   │   ├── QuickActions.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Widgets/
│   │   │   │   ├── CalendarWidget.tsx
│   │   │   │   ├── FinanceWidget.tsx
│   │   │   │   ├── FocusWidget.tsx
│   │   │   │   ├── SubscriptionsWidget.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Settings/
│   │   │   │   ├── SettingsModal.tsx
│   │   │   │   ├── GeneralSettings.tsx
│   │   │   │   ├── IntegrationsSettings.tsx
│   │   │   │   ├── LLMSettings.tsx
│   │   │   │   ├── PrivacySettings.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── Common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Dropdown.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Loading.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── Layout/
│   │   │       ├── MainLayout.tsx
│   │   │       ├── TitleBar.tsx
│   │   │       └── index.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts       # WebSocket connection management
│   │   │   ├── useAlfy.ts            # Main Alfy API interface
│   │   │   ├── useChat.ts            # Chat state and operations
│   │   │   ├── useNotifications.ts   # Desktop notifications
│   │   │   └── useSettings.ts        # Settings management
│   │   │
│   │   ├── stores/
│   │   │   ├── conversationStore.ts  # Zustand store for conversations
│   │   │   ├── settingsStore.ts      # App settings
│   │   │   ├── uiStore.ts            # UI state (modals, sidebar, etc.)
│   │   │   └── index.ts
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts                # REST API client
│   │   │   ├── websocket.ts          # WebSocket client class
│   │   │   └── storage.ts            # Local storage helpers
│   │   │
│   │   ├── types/
│   │   │   ├── chat.ts               # Message, Conversation types
│   │   │   ├── api.ts                # API request/response types
│   │   │   ├── domain.ts             # Domain-specific types
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── formatters.ts         # Date, currency formatters
│   │   │   ├── validators.ts
│   │   │   └── constants.ts
│   │   │
│   │   ├── styles/
│   │   │   └── globals.css           # Tailwind base styles
│   │   │
│   │   ├── App.tsx                   # Root component
│   │   ├── main.tsx                  # React entry point
│   │   └── vite-env.d.ts
│   │
│   ├── src-tauri/                    # Tauri shell (minimal Rust — ~50-100 lines)
│   │   ├── src/
│   │   │   └── main.rs               # System tray, hotkeys, window mgmt
│   │   │
│   │   ├── icons/                    # App icons
│   │   ├── tauri.conf.json           # Tauri configuration
│   │   └── Cargo.toml
│   │
│   ├── public/
│   │   └── assets/
│   │
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
│
├── backend/                     # Python FastAPI backend (project root)
│   │
│   ├── alfy/                         # Python package (all source code)
│   │   │                             # Enables: "from alfy.core.router import Router"
│   │   │
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app entry
│   │   ├── config.py                 # Settings and configuration
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── router.py             # Tier 0 + Tier 1 routing
│   │   │   ├── orchestrator.py       # Multi-domain coordination
│   │   │   ├── llm.py                # LLM wrapper (Qwen models)
│   │   │   ├── prompts.py            # System prompts for all domains
│   │   │   └── tool_registry.py      # Tool definitions and registry
│   │   │
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # BaseAgent class
│   │   │   ├── files.py
│   │   │   ├── email.py
│   │   │   ├── calendar.py
│   │   │   ├── finance.py
│   │   │   ├── productivity.py
│   │   │   ├── messaging.py
│   │   │   ├── system.py
│   │   │   ├── external_llm.py
│   │   │   └── general.py
│   │   │
│   │   ├── tools/
│   │   │   ├── __init__.py
│   │   │   ├── files/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── search.py
│   │   │   │   ├── operations.py
│   │   │   │   ├── parsing.py
│   │   │   │   └── indexer.py
│   │   │   │
│   │   │   ├── email/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── imap_client.py
│   │   │   │   ├── gmail_client.py
│   │   │   │   ├── outlook_client.py
│   │   │   │   └── parser.py
│   │   │   │
│   │   │   ├── calendar/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── google_calendar.py
│   │   │   │   └── internal.py
│   │   │   │
│   │   │   ├── finance/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── open_banking.py
│   │   │   │   ├── csv_import.py
│   │   │   │   ├── categorizer.py
│   │   │   │   ├── subscriptions.py
│   │   │   │   └── invoices.py
│   │   │   │
│   │   │   ├── productivity/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── activity_monitor.py
│   │   │   │   ├── focus.py
│   │   │   │   └── reminders.py
│   │   │   │
│   │   │   ├── messaging/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── telegram_bot.py
│   │   │   │   └── whatsapp_helper.py
│   │   │   │
│   │   │   └── system/
│   │   │       ├── __init__.py
│   │   │       ├── app_launcher.py
│   │   │       └── window_manager.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── database.py           # SQLite async connection
│   │   │   ├── embeddings.py         # Local embeddings for RAG
│   │   │   ├── external_llm.py       # Claude/ChatGPT clients
│   │   │   └── notifications.py      # Desktop notifications
│   │   │
│   │   ├── models/                   # Pydantic models (data schemas)
│   │   │   ├── __init__.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   ├── commitment.py
│   │   │   ├── transaction.py
│   │   │   ├── subscription.py
│   │   │   ├── invoice.py
│   │   │   └── activity.py
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── chat.py           # Chat endpoints
│   │   │   │   ├── conversations.py  # Conversation CRUD
│   │   │   │   ├── files.py
│   │   │   │   ├── calendar.py
│   │   │   │   ├── finance.py
│   │   │   │   ├── settings.py
│   │   │   │   └── health.py
│   │   │   │
│   │   │   ├── websocket.py          # WebSocket handler
│   │   │   ├── dependencies.py       # FastAPI dependencies
│   │   │   └── middleware.py         # CORS, logging
│   │   │
│   │   └── db/
│   │       ├── __init__.py
│   │       ├── schema.sql            # Initial schema
│   │       ├── migrations/           # Database migrations
│   │       └── repositories/         # Data access layer
│   │           ├── __init__.py
│   │           ├── conversations.py
│   │           ├── commitments.py
│   │           ├── transactions.py
│   │           └── files.py
│   │
│   ├── tests/                        # Tests (outside the alfy/ package)
│   │   ├── __init__.py
│   │   ├── test_router.py
│   │   ├── test_agents/
│   │   └── test_tools/
│   │
│   ├── data/                         # Runtime data (outside the alfy/ package)
│   │   └── alfy.db                   # SQLite database (created at runtime)
│   │
│   ├── llm_models/                   # Downloaded LLM files
│   │   ├── qwen3-1.7b-q4_k_m.gguf    # Router model (~1.2 GB)
│   │   └── qwen3-8b-q4_k_m.gguf      # Agent model (~5 GB)
│   │
│   ├── logs/
│   │   └── alfy.log
│   │
│   ├── pyproject.toml                # Project config (not used yet; ok to omit for now)
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── .env.example
│
│
├── shared/                           # Shared type definitions
│   ├── schemas/
│   │   ├── chat.json                 # JSON Schema for IPC messages
│   │   ├── events.json
│   │   └── api.json
│   └── README.md
│
│
├── scripts/
│   ├── setup.ps1                     # Windows setup script
│
│
├── docs/
│   ├── README.md
│   ├── Stack.md
│   ├── IPC.md
│   ├── API.md
│   └── architecture/
│       └── diagrams/
│
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
│
├── .gitignore
├── LICENSE
└── README.md
```

### Key Folder Explanations

| Folder | Purpose |
|--------|---------|
| `alfy/` | Root monorepo containing all projects |
| `ui/` | Tauri + React frontend application |
| `ui/src/` | React/TypeScript code (all UI logic) |
| `ui/src-tauri/` | Minimal Rust code (~50-100 lines) for native shell |
| `backend/` | Python project root (configs, tests, data) |
| `backend/alfy/` | Python package (all source code) — enables clean imports like `from alfy.core.router import Router` |
| `backend/llm_models/` | Downloaded GGUF model files |
| `backend/data/` | SQLite database (created at runtime) |

**Why `alfy/` inside `backend/`?**

This is standard Python packaging convention. The nested structure separates:
- Project-level files (tests, configs, data, models)
- Source code (the importable `alfy` package)

This enables clean imports instead of messy relative paths.

---

## IPC Protocol

### Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ALFY IPC ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐                           ┌──────────────────────┐
│                  │   WebSocket (streaming)   │                      │
│   Tauri + React  │ ════════════════════════► │   Python Backend     │
│       UI         │ ◄════════════════════════ │   (FastAPI)          │
│                  │                           │                      │
│   Port: N/A      │   REST API (CRUD ops)     │   Port: 8420         │
│   (native app)   │ ──────────────────────►   │                      │
│                  │ ◄──────────────────────   │                      │
└──────────────────┘                           └──────────────────────┘
        │                                               │
        │ Tauri Commands                                │
        ▼                                               ▼
┌──────────────────┐                           ┌──────────────────────┐
│  System Tray     │                           │  SQLite Database     │
│  Global Hotkeys  │                           │  LLM Models          │
│  Notifications   │                           │  File System         │
└──────────────────┘                           └──────────────────────┘
```

### Communication Channels

| Channel | Protocol | Purpose | Use Cases |
|---------|----------|---------|-----------|
| Chat | WebSocket | Real-time streaming | Conversations, typing indicators |
| API | REST HTTP | CRUD operations | Settings, history, data queries |
| Events | WebSocket | Backend → UI push | Notifications, status updates |

---

## WebSocket Protocol

### Connection

```
Endpoint: ws://localhost:8420/ws
```

### Message Format

All WebSocket messages follow this envelope structure:

```typescript
interface WSMessage {
  id: string;           // Unique message ID (UUID)
  type: WSMessageType;  // Message type enum
  payload: any;         // Type-specific payload
  timestamp: string;    // ISO 8601 timestamp
}

type WSMessageType =
  // Client → Server
  | "chat.message"           // User sends message
  | "chat.cancel"            // Cancel current generation
  | "chat.regenerate"        // Regenerate last response
  | "typing.start"           // User started typing
  | "typing.stop"            // User stopped typing
  | "ping"                   // Keep-alive ping
  
  // Server → Client
  | "chat.token"             // Streaming token
  | "chat.complete"          // Generation complete
  | "chat.error"             // Error occurred
  | "chat.tool_call"         // Tool being executed
  | "chat.tool_result"       // Tool execution result
  | "status.update"          // Backend status change
  | "notification"           // Push notification
  | "pong";                  // Keep-alive pong
```

---

### Client → Server Messages

#### chat.message

User sends a new message.

```typescript
// Client sends:
{
  "id": "msg_abc123",
  "type": "chat.message",
  "payload": {
    "conversation_id": "conv_xyz789",      // null for new conversation
    "content": "What's my balance?",
    "model": "local",                       // "local" | "claude" | "chatgpt"
    "attachments": [                        // Optional
      {
        "type": "file",
        "path": "C:/Users/nikita/docs/report.pdf",
        "name": "report.pdf"
      }
    ]
  },
  "timestamp": "2025-12-08T14:30:00.000Z"
}
```

#### chat.cancel

Cancel the current generation.

```typescript
{
  "id": "cancel_abc123",
  "type": "chat.cancel",
  "payload": {
    "message_id": "msg_abc123"             // ID of message being generated
  },
  "timestamp": "2025-12-08T14:30:05.000Z"
}
```

#### chat.regenerate

Regenerate the last assistant response.

```typescript
{
  "id": "regen_abc123",
  "type": "chat.regenerate",
  "payload": {
    "conversation_id": "conv_xyz789",
    "message_id": "msg_assistant_456"      // Message to regenerate
  },
  "timestamp": "2025-12-08T14:30:10.000Z"
}
```

#### typing.start / typing.stop

Typing indicators (optional, for UI feedback).

```typescript
{
  "id": "typing_abc123",
  "type": "typing.start",
  "payload": {
    "conversation_id": "conv_xyz789"
  },
  "timestamp": "2025-12-08T14:30:00.000Z"
}
```

#### ping

Keep-alive ping (sent every 30 seconds).

```typescript
{
  "id": "ping_abc123",
  "type": "ping",
  "payload": {},
  "timestamp": "2025-12-08T14:30:00.000Z"
}
```

---

### Server → Client Messages

#### chat.token

Streaming token during generation.

```typescript
{
  "id": "token_001",
  "type": "chat.token",
  "payload": {
    "message_id": "msg_response_789",
    "conversation_id": "conv_xyz789",
    "token": "Your",                        // Single token or small chunk
    "index": 0                              // Token position
  },
  "timestamp": "2025-12-08T14:30:01.000Z"
}

// Subsequent tokens:
{ ..., "payload": { "token": " current", "index": 1 } }
{ ..., "payload": { "token": " balance", "index": 2 } }
{ ..., "payload": { "token": " is", "index": 3 } }
{ ..., "payload": { "token": " £", "index": 4 } }
{ ..., "payload": { "token": "4,250", "index": 5 } }
```

#### chat.tool_call

Notifies UI that a tool is being executed.

```typescript
{
  "id": "tool_abc123",
  "type": "chat.tool_call",
  "payload": {
    "message_id": "msg_response_789",
    "tool_name": "get_balance",
    "tool_args": {
      "account": "main"
    },
    "status": "executing"                   // "executing" | "completed" | "failed"
  },
  "timestamp": "2025-12-08T14:30:01.500Z"
}
```

#### chat.tool_result

Result of tool execution (optional, for transparency).

```typescript
{
  "id": "tool_result_abc123",
  "type": "chat.tool_result",
  "payload": {
    "message_id": "msg_response_789",
    "tool_name": "get_balance",
    "result": {
      "balance": 4250.00,
      "currency": "GBP",
      "account_name": "Main Account"
    },
    "status": "completed",
    "duration_ms": 150
  },
  "timestamp": "2025-12-08T14:30:01.650Z"
}
```

#### chat.complete

Generation finished.

```typescript
{
  "id": "complete_abc123",
  "type": "chat.complete",
  "payload": {
    "message_id": "msg_response_789",
    "conversation_id": "conv_xyz789",
    "content": "Your current balance is £4,250.00 in your Main Account.",
    "domain": "finance",
    "tools_used": ["get_balance"],
    "tokens": {
      "prompt": 245,
      "completion": 18,
      "total": 263
    },
    "duration_ms": 1850
  },
  "timestamp": "2025-12-08T14:30:02.850Z"
}
```

#### chat.error

Error during generation.

```typescript
{
  "id": "error_abc123",
  "type": "chat.error",
  "payload": {
    "message_id": "msg_response_789",
    "error_code": "TOOL_EXECUTION_FAILED",
    "error_message": "Could not connect to bank API",
    "recoverable": true,
    "suggestion": "Check your internet connection and try again"
  },
  "timestamp": "2025-12-08T14:30:02.000Z"
}
```

#### status.update

Backend status changes.

```typescript
{
  "id": "status_abc123",
  "type": "status.update",
  "payload": {
    "status": "ready",                      // "starting" | "loading_models" | "ready" | "busy" | "error"
    "models_loaded": ["qwen3-1.7b", "qwen3-8b"],
    "memory_usage_mb": 8500,
    "active_tasks": 0
  },
  "timestamp": "2025-12-08T14:30:00.000Z"
}
```

#### notification

Push notification from backend.

```typescript
{
  "id": "notif_abc123",
  "type": "notification",
  "payload": {
    "title": "Subscription Reminder",
    "body": "Netflix trial ends in 2 days (Dec 10)",
    "category": "subscription",
    "priority": "normal",                   // "low" | "normal" | "high"
    "action": {                             // Optional click action
      "type": "open_domain",
      "domain": "finance",
      "query": "Show my Netflix subscription"
    }
  },
  "timestamp": "2025-12-08T14:30:00.000Z"
}
```

#### pong

Response to ping.

```typescript
{
  "id": "pong_abc123",
  "type": "pong",
  "payload": {
    "server_time": "2025-12-08T14:30:00.123Z"
  },
  "timestamp": "2025-12-08T14:30:00.123Z"
}
```

---

## REST API

### Base URL

```
http://localhost:8420/api/v1
```

### Endpoints

#### Health & Status

```
GET /health
GET /status
```

#### Conversations

```
GET    /conversations                    # List conversations
POST   /conversations                    # Create new conversation
GET    /conversations/{id}               # Get conversation with messages
DELETE /conversations/{id}               # Delete conversation
PUT    /conversations/{id}               # Update conversation (title, etc.)
GET    /conversations/{id}/messages      # Get messages (paginated)
```

#### Calendar

```
GET    /calendar/events                  # List events (with date filters)
POST   /calendar/events                  # Create event
PUT    /calendar/events/{id}             # Update event
DELETE /calendar/events/{id}             # Delete event
POST   /calendar/sync                    # Trigger Google Calendar sync
```

#### Finance

```
GET    /finance/balance                  # Get current balance(s)
GET    /finance/transactions             # List transactions (with filters)
POST   /finance/transactions/import      # Import CSV
GET    /finance/subscriptions            # List subscriptions
GET    /finance/spending/summary         # Spending summary
POST   /finance/sync                     # Trigger Open Banking sync

GET    /finance/invoices                 # List invoices
POST   /finance/invoices                 # Create invoice
PUT    /finance/invoices/{id}            # Update invoice
GET    /finance/invoices/{id}/pdf        # Download invoice PDF
```

#### Files

```
GET    /files/search                     # Search indexed files
POST   /files/index                      # Index a directory
GET    /files/recent                     # Recently accessed files
```

#### Productivity

```
GET    /productivity/activity            # Activity log (with date filters)
GET    /productivity/focus/current       # Current focus session
POST   /productivity/focus/start         # Start focus session
POST   /productivity/focus/end           # End focus session
GET    /productivity/stats               # Productivity stats
```

#### Settings

```
GET    /settings                         # Get all settings
PUT    /settings                         # Update settings
GET    /settings/integrations            # Integration status
POST   /settings/integrations/{name}/connect     # Connect integration
DELETE /settings/integrations/{name}/disconnect  # Disconnect integration
```

---

## REST API Response Format

### Success Response

```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
  };
}
```

Example:

```json
{
  "success": true,
  "data": {
    "balance": 4250.00,
    "currency": "GBP",
    "account_name": "Main Account",
    "last_updated": "2025-12-08T14:00:00.000Z"
  }
}
```

### Error Response

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

Example:

```json
{
  "success": false,
  "error": {
    "code": "INTEGRATION_NOT_CONNECTED",
    "message": "Open Banking integration is not connected",
    "details": {
      "integration": "open_banking",
      "setup_url": "/settings/integrations/open_banking/connect"
    }
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [
    { "id": "tx_001", "amount": -45.00, "description": "Grocery Store" },
    { "id": "tx_002", "amount": -12.99, "description": "Netflix" }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `INTEGRATION_NOT_CONNECTED` | 400 | Required integration not set up |
| `INTEGRATION_ERROR` | 502 | External service error |
| `LLM_ERROR` | 500 | LLM inference failed |
| `TOOL_EXECUTION_FAILED` | 500 | Tool execution error |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## TypeScript Types (Frontend)

```typescript
// types/chat.ts

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  domain?: string;
  tools_used?: string[];
  attachments?: Attachment[];
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: "local" | "claude" | "chatgpt";
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  type: "file" | "image";
  path: string;
  name: string;
  size?: number;
  mime_type?: string;
}

// types/api.ts

export interface BalanceResponse {
  balance: number;
  currency: string;
  account_name: string;
  last_updated: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: string;
  account_id: string;
}

export interface Subscription {
  id: string;
  service_name: string;
  amount: number;
  currency: string;
  cycle: "monthly" | "yearly" | "weekly";
  next_renewal: string;
  trial_end?: string;
  status: "active" | "cancelled" | "paused";
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  type: "meeting" | "flight" | "hotel" | "job" | "focus" | "reminder";
  source: "manual" | "email" | "google_calendar";
}
```

---

## Python Models (Backend)

```python
# alfy/models/message.py

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal
from enum import Enum

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class Attachment(BaseModel):
    type: Literal["file", "image"]
    path: str
    name: str
    size: Optional[int] = None
    mime_type: Optional[str] = None

class Message(BaseModel):
    id: str
    conversation_id: str
    role: MessageRole
    content: str
    domain: Optional[str] = None
    tools_used: Optional[list[str]] = None
    attachments: Optional[list[Attachment]] = None
    created_at: datetime

class Conversation(BaseModel):
    id: str
    title: str
    model: Literal["local", "claude", "chatgpt"] = "local"
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

# alfy/models/websocket.py

from pydantic import BaseModel
from typing import Any, Literal
from datetime import datetime

class WSMessageType(str, Enum):
    # Client → Server
    CHAT_MESSAGE = "chat.message"
    CHAT_CANCEL = "chat.cancel"
    CHAT_REGENERATE = "chat.regenerate"
    TYPING_START = "typing.start"
    TYPING_STOP = "typing.stop"
    PING = "ping"
    
    # Server → Client
    CHAT_TOKEN = "chat.token"
    CHAT_COMPLETE = "chat.complete"
    CHAT_ERROR = "chat.error"
    CHAT_TOOL_CALL = "chat.tool_call"
    CHAT_TOOL_RESULT = "chat.tool_result"
    STATUS_UPDATE = "status.update"
    NOTIFICATION = "notification"
    PONG = "pong"

class WSMessage(BaseModel):
    id: str
    type: WSMessageType
    payload: dict[str, Any]
    timestamp: datetime

class ChatMessagePayload(BaseModel):
    conversation_id: Optional[str] = None
    content: str
    model: Literal["local", "claude", "chatgpt"] = "local"
    attachments: Optional[list[Attachment]] = None

class ChatTokenPayload(BaseModel):
    message_id: str
    conversation_id: str
    token: str
    index: int

class ChatCompletePayload(BaseModel):
    message_id: str
    conversation_id: str
    content: str
    domain: str
    tools_used: list[str]
    tokens: dict[str, int]
    duration_ms: int
```

---

## Sequence Diagrams

### Simple Chat Flow

```
┌────────┐          ┌─────────────┐          ┌─────────────┐
│   UI   │          │  WebSocket  │          │   Backend   │
└───┬────┘          └──────┬──────┘          └──────┬──────┘
    │                      │                        │
    │  chat.message        │                        │
    │─────────────────────►│  chat.message          │
    │                      │───────────────────────►│
    │                      │                        │
    │                      │        [Route + Process]
    │                      │                        │
    │                      │  chat.token (stream)   │
    │  chat.token          │◄───────────────────────│
    │◄─────────────────────│                        │
    │                      │  chat.token            │
    │  chat.token          │◄───────────────────────│
    │◄─────────────────────│                        │
    │                      │         ...            │
    │                      │                        │
    │                      │  chat.complete         │
    │  chat.complete       │◄───────────────────────│
    │◄─────────────────────│                        │
    │                      │                        │
```

### Chat with Tool Execution

```
┌────────┐          ┌─────────────┐          ┌─────────────┐
│   UI   │          │  WebSocket  │          │   Backend   │
└───┬────┘          └──────┬──────┘          └──────┬──────┘
    │                      │                        │
    │  "What's my balance?"│                        │
    │─────────────────────►│───────────────────────►│
    │                      │                        │
    │                      │    [Route → finance]   │
    │                      │                        │
    │                      │  chat.tool_call        │
    │  chat.tool_call      │  (get_balance)         │
    │◄─────────────────────│◄───────────────────────│
    │                      │                        │
    │  [Show "Checking     │    [Execute tool]      │
    │   balance..." UI]    │                        │
    │                      │                        │
    │                      │  chat.tool_result      │
    │  chat.tool_result    │◄───────────────────────│
    │◄─────────────────────│                        │
    │                      │                        │
    │                      │  chat.token (stream)   │
    │◄─────────────────────│◄───────────────────────│
    │                      │         ...            │
    │                      │                        │
    │  chat.complete       │  chat.complete         │
    │◄─────────────────────│◄───────────────────────│
    │                      │                        │
```

### Multi-Domain Request

```
┌────────┐          ┌─────────────┐          ┌─────────────┐
│   UI   │          │  WebSocket  │          │   Backend   │
└───┬────┘          └──────┬──────┘          └──────┬──────┘
    │                      │                        │
    │  "Find Acme invoice  │                        │
    │   and check payment" │                        │
    │─────────────────────►│───────────────────────►│
    │                      │                        │
    │                      │   [Route → finance]    │
    │                      │   [Orchestrator detects│
    │                      │    multi-domain]       │
    │                      │                        │
    │  chat.tool_call      │  chat.tool_call        │
    │  (search_files)      │  (files agent)         │
    │◄─────────────────────│◄───────────────────────│
    │                      │                        │
    │  chat.tool_result    │  chat.tool_result      │
    │  (invoice found)     │◄───────────────────────│
    │◄─────────────────────│                        │
    │                      │                        │
    │  chat.tool_call      │  chat.tool_call        │
    │  (get_transactions)  │  (finance agent)       │
    │◄─────────────────────│◄───────────────────────│
    │                      │                        │
    │  chat.tool_result    │  chat.tool_result      │
    │  (payment found)     │◄───────────────────────│
    │◄─────────────────────│                        │
    │                      │                        │
    │  chat.token...       │  [Generate response]   │
    │◄─────────────────────│◄───────────────────────│
    │                      │                        │
    │  chat.complete       │  chat.complete         │
    │◄─────────────────────│◄───────────────────────│
    │                      │                        │
```

---

## Frontend WebSocket Implementation

```typescript
// services/websocket.ts

type MessageHandler = (message: WSMessage) => void;

class AlfyWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pingInterval: number | null = null;

  constructor(private url: string = "ws://localhost:8420/ws") {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        this.startPingInterval();
        resolve();
      };

      this.ws.onmessage = (event) => {
        const message: WSMessage = JSON.parse(event.data);
        this.dispatch(message);
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.stopPingInterval();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };
    });
  }

  send(type: string, payload: any): string {
    const id = crypto.randomUUID();
    const message: WSMessage = {
      id,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.ws?.send(JSON.stringify(message));
    return id;
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }

  private dispatch(message: WSMessage): void {
    const handlers = this.handlers.get(message.type) || [];
    handlers.forEach((handler) => handler(message));

    // Also dispatch to wildcard handlers
    const wildcardHandlers = this.handlers.get("*") || [];
    wildcardHandlers.forEach((handler) => handler(message));
  }

  private startPingInterval(): void {
    this.pingInterval = window.setInterval(() => {
      this.send("ping", {});
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    }
  }

  disconnect(): void {
    this.stopPingInterval();
    this.ws?.close();
  }
}

export const alfyWS = new AlfyWebSocket();
```

---

## Backend WebSocket Implementation

```python
# alfy/api/websocket.py

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio
from datetime import datetime
import uuid

from alfy.models.websocket import WSMessage, WSMessageType
from alfy.core.orchestrator import Orchestrator

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.orchestrator = Orchestrator()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        
        # Send initial status
        await self.send_status(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def send_message(self, websocket: WebSocket, msg_type: WSMessageType, payload: dict):
        message = WSMessage(
            id=str(uuid.uuid4()),
            type=msg_type,
            payload=payload,
            timestamp=datetime.utcnow()
        )
        await websocket.send_json(message.model_dump(mode="json"))

    async def send_status(self, websocket: WebSocket):
        await self.send_message(websocket, WSMessageType.STATUS_UPDATE, {
            "status": "ready",
            "models_loaded": ["qwen3-1.7b", "qwen3-8b"],
            "memory_usage_mb": self._get_memory_usage(),
            "active_tasks": 0
        })

    async def handle_message(self, websocket: WebSocket, data: dict):
        msg_type = data.get("type")
        payload = data.get("payload", {})
        
        if msg_type == "chat.message":
            await self.handle_chat_message(websocket, data["id"], payload)
        elif msg_type == "chat.cancel":
            await self.handle_cancel(payload)
        elif msg_type == "chat.regenerate":
            await self.handle_regenerate(websocket, payload)
        elif msg_type == "ping":
            await self.send_message(websocket, WSMessageType.PONG, {
                "server_time": datetime.utcnow().isoformat()
            })

    async def handle_chat_message(self, websocket: WebSocket, msg_id: str, payload: dict):
        conversation_id = payload.get("conversation_id") or str(uuid.uuid4())
        response_id = f"msg_{uuid.uuid4().hex[:12]}"
        
        try:
            # Stream response tokens
            full_response = ""
            token_index = 0
            
            async for event in self.orchestrator.process_stream(
                user_input=payload["content"],
                conversation_id=conversation_id,
                model=payload.get("model", "local"),
                attachments=payload.get("attachments")
            ):
                if event["type"] == "token":
                    await self.send_message(websocket, WSMessageType.CHAT_TOKEN, {
                        "message_id": response_id,
                        "conversation_id": conversation_id,
                        "token": event["token"],
                        "index": token_index
                    })
                    full_response += event["token"]
                    token_index += 1
                    
                elif event["type"] == "tool_call":
                    await self.send_message(websocket, WSMessageType.CHAT_TOOL_CALL, {
                        "message_id": response_id,
                        "tool_name": event["tool_name"],
                        "tool_args": event["tool_args"],
                        "status": "executing"
                    })
                    
                elif event["type"] == "tool_result":
                    await self.send_message(websocket, WSMessageType.CHAT_TOOL_RESULT, {
                        "message_id": response_id,
                        "tool_name": event["tool_name"],
                        "result": event["result"],
                        "status": "completed",
                        "duration_ms": event.get("duration_ms", 0)
                    })

            # Send completion
            await self.send_message(websocket, WSMessageType.CHAT_COMPLETE, {
                "message_id": response_id,
                "conversation_id": conversation_id,
                "content": full_response,
                "domain": event.get("domain", "general"),
                "tools_used": event.get("tools_used", []),
                "tokens": event.get("tokens", {}),
                "duration_ms": event.get("duration_ms", 0)
            })

        except Exception as e:
            await self.send_message(websocket, WSMessageType.CHAT_ERROR, {
                "message_id": response_id,
                "error_code": "PROCESSING_ERROR",
                "error_message": str(e),
                "recoverable": True
            })

    def _get_memory_usage(self) -> int:
        import psutil
        process = psutil.Process()
        return int(process.memory_info().rss / 1024 / 1024)


manager = ConnectionManager()


# FastAPI route
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.handle_message(websocket, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

---

## Security Considerations

1. **Localhost only**: Backend binds to `127.0.0.1`, not accessible from network
2. **No authentication needed**: Single-user local app
3. **File access**: Backend validates file paths are within allowed directories
4. **API keys**: Stored in environment variables or encrypted config, never exposed to UI
5. **External LLM calls**: User explicitly opts in, content clearly marked as leaving device
