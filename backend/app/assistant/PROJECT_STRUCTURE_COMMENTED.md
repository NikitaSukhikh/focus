# Alfy Project Structure - Fully Commented

## Overview
This document provides detailed explanations for every folder and file in the Alfy project, including their purpose, functionality, and when they become necessary.

---

## Root Directory Structure

```
alfy/                                 # Root monorepo - contains all project components
│
├── .claude/                          # Claude IDE configuration folder
│   └── settings.local.json           # Local Claude Code settings (user-specific preferences)
│                                     # Purpose: Configures Claude's behavior in this workspace
│
├── .github/                          # GitHub-specific configuration
│   └── workflows/                    # GitHub Actions CI/CD workflows
│       └── ci.yml                    # Continuous Integration pipeline definition
│                                     # Purpose: Automates testing, linting, building on push/PR
│                                     # Becomes necessary: When team collaboration starts or #deployment automation needed
│
├── .venv/                            # Root-level Python virtual environment (duplicate)
├── venv/                             # Another virtual environment (duplicate - should #consolidate)
│                                     # Purpose: Python dependency isolation
│                                     # Note: Having multiple venvs is unnecessary - use backend/venv only
│
├── backend/                          # Python FastAPI backend (detailed below)
│                                     # Purpose: Core AI engine, API server, database, tool #execution
│
├── ui/                               # Tauri + React frontend (detailed below)
│                                     # Purpose: Desktop application interface
│
├── docs/                             # Project documentation (detailed below)
│                                     # Purpose: API specs, architecture diagrams, guides
│
├── scripts/                          # Setup and utility scripts (detailed below)
│                                     # Purpose: Development environment setup automation
│
├── shared/                           # Shared resources between frontend/backend (detailed #below)
│                                     # Purpose: Type definitions, schemas for consistency
│
├── PROJECT_STRUCTURE.md              # Original project structure documentation (46KB)
│                                     # Purpose: Reference architecture and IPC protocol #specification
│
├── PROJECT_STRUCTURE_COMMENTED.md    # This file - detailed explanations
│                                     # Purpose: Learning resource, onboarding documentation
│
├── README.md                         # Project overview and quick start guide (23KB)
│                                     # Purpose: First entry point for new developers
│
├── TECH_STACK.md                     # Technology choices and justifications (29KB)
│                                     # Purpose: Explains why Python/FastAPI, React/Tauri, Qwen #models chosen
│
├── TAURI_RUST_SKETCH.md              # Tauri implementation design notes (13.5KB)
│                                     # Purpose: Architectural decisions for native shell #integration
│
├── .gitignore                        # Git ignore patterns (MISSING - should be added)
│                                     # Purpose: Prevent committing venv/, node_modules/, .env, #__pycache__/
│                                     # Becomes necessary: Immediately (prevents accidental #sensitive data commits)
│
└── LICENSE                           # Software license (MISSING - should be added)
                                      # Purpose: Legal terms for code usage
                                      # Becomes necessary: Before public release or sharing
```

---

## Backend Directory (`/backend/`)

```
backend/                              # Python FastAPI backend - project root
│                                     # Purpose: Contains both the Python package (alfy/) and project files
│
├── alfy/                             # Python package (all importable source code)
│   │                                 # Purpose: Enables clean imports like "from alfy.core.#router import Router"
│   │                                 # This nested structure is standard Python packaging #convention
│   │
│   ├── __init__.py                   # Makes alfy/ a Python package
│   │                                 # Purpose: Package initialization, version exports
│   │
│   ├── main.py                       # FastAPI application entry point
│   │                                 # Purpose: Creates FastAPI app, registers routes, starts #server
│   │                                 # Functionality: App initialization, CORS setup, route #mounting
│   │
│   ├── config.py                     # Application settings and configuration
│   │                                 # Purpose: Centralized config management (API keys, paths, #model settings)
│   │                                 # Functionality: Environment variables, Pydantic #BaseSettings
│   │
│   │
│   ├── core/                         # Core AI routing and orchestration logic
│   │   │                             # Purpose: The "brain" - decides which agent handles #requests
│   │   │
│   │   ├── __init__.py               # Makes core/ a Python package
│   │   │
│   │   ├── router.py                 # Tier 0 + Tier 1 routing
│   │   │                             # Purpose: Analyzes user input, determines domain (files/email/calendar/etc)
│   │   │                             # Functionality: Uses small Qwen 1.7B model for fast classification
│   │   │                             # Example: "What's my balance?" → routes to finance agent
│   │   │
│   │   ├── orchestrator.py           # Multi-domain coordination
│   │   │                             # Purpose: Handles complex queries spanning multiple #domains
│   │   │                             # Functionality: Chains agent calls, aggregates results
│   │   │                             # Example: "Find Acme invoice and check if it's paid" → #files + finance
│   │   │
│   │   ├── llm.py                    # LLM wrapper (Qwen models via llama.cpp)
│   │   │                             # Purpose: Unified interface for local LLM inference
│   │   │                             # Functionality: Model loading, token generation, streaming
│   │   │                             # Uses: Qwen3-1.7B (router) and Qwen3-8B (agents)
│   │   │
│   │   ├── prompts.py                # System prompts for all domains
│   │   │                             # Purpose: Defines personality, capabilities for each agent
│   │   │                             # Functionality: Template management, context injection
│   │   │                             # Example: Finance agent prompt includes transaction #analysis skills
│   │   │
│   │   └── tool_registry.py          # Tool definitions and registry
│   │       │                         # Purpose: Centralized catalog of available tools (functions agents can call)
│   │       │                         # Functionality: Tool metadata, parameter schemas, execution mapping
│   │       │                         # Example: Registers get_balance(), search_files(), send_email()
│   │
│   │
│   ├── agents/                       # Domain-specific agents (AI assistants)
│   │   │                             # Purpose: Specialized handlers for different task categories
│   │   │                             # Each agent has domain expertise and tool access
│   │   │
│   │   ├── __init__.py               # Package initialization
│   │   │
│   │   ├── base.py                   # BaseAgent abstract class
│   │   │                             # Purpose: Common agent interface and functionality
│   │   │                             # Functionality: Tool calling, context management, response formatting
│   │   │
│   │   ├── files.py                  # File system agent
│   │   │                             # Purpose: Searches, reads, analyzes local files and documents
│   │   │                             # Tools: search_files(), read_file(), parse_pdf()
│   │   │                             # When needed: For "Find my invoice", "What's in report.pdf"
│   │   │
│   │   ├── email.py                  # Email agent
│   │   │                             # Purpose: Reads, searches, sends emails
│   │   │                             # Tools: gmail_client, imap_client, email_parser
│   │   │                             # When needed: For "Check my inbox", "Email John about meeting"
│   │   │
│   │   ├── calendar.py               # Calendar agent
│   │   │                             # Purpose: Manages events, schedules, reminders
│   │   │                             # Tools: google_calendar, internal_calendar
│   │   │                             # When needed: For "What's my schedule?", "Book meeting tomorrow at 3pm"
│   │   │
│   │   ├── finance.py                # Finance agent
│   │   │                             # Purpose: Analyzes transactions, subscriptions, invoices, budgets
│   │   │                             # Tools: get_balance(), categorize_transactions(), track_subscriptions()
│   │   │                             # When needed: For "How much did I spend?", "When is Netflix due?"
│   │   │
│   │   ├── productivity.py           # Productivity agent
│   │   │                             # Purpose: Activity tracking, focus sessions, time management
│   │   │                             # Tools: activity_monitor, focus_timer, reminders
│   │   │                             # When needed: For "Start focus session", "How productive was I today?"
│   │   │
│   │   ├── messaging.py              # Messaging agent
│   │   │                             # Purpose: Integrates with Telegram, WhatsApp
│   │   │                             # Tools: telegram_bot, whatsapp_helper
│   │   │                             # When needed: For "Send Telegram to @user", "Check WhatsApp messages"
│   │   │                             # Not needed if: User doesn't use these messaging platforms
│   │   │
│   │   ├── system.py                 # System control agent
│   │   │                             # Purpose: Launches apps, manages windows, system commands
│   │   │                             # Tools: app_launcher, window_manager
│   │   │                             # When needed: For "Open Chrome", "Close all browser tabs"
│   │   │
│   │   ├── external_llm.py           # External LLM agent (Claude, ChatGPT)
│   │   │                             # Purpose: Handles requests requiring cloud AI models
│   │   │                             # Functionality: Proxies to Anthropic/OpenAI APIs
│   │   │                             # When needed: For complex reasoning beyond local model capabilities
│   │   │                             # Not needed if: User only uses local models
│   │   │
│   │   └── general.py                # General purpose agent (fallback)
│   │       │                         # Purpose: Handles general conversation, questions without specific domain
│   │       │                         # Functionality: Chat, explanations, general knowledge
│   │       │                         # When needed: For "Tell me a joke", "Explain quantum physics"
│   │
│   │
│   ├── tools/                        # Tool implementations (functions agents call)
│   │   │                             # Purpose: Actual code that performs actions (vs agents that decide what to do)
│   │   │
│   │   ├── __init__.py               # Package initialization
│   │   │
│   │   ├── files/                    # File system tools
│   │   │   ├── __init__.py
│   │   │   ├── search.py             # File search and indexing
│   │   │   │                         # Purpose: Fast file search using indexes, regex, content search
│   │   │   │                         # Functionality: Builds searchable index, fuzzy matching
│   │   │   │
│   │   │   ├── operations.py         # File operations (read, write, move, delete)
│   │   │   │                         # Purpose: Safe file manipulation with validation
│   │   │   │                         # Functionality: Permission checks, path validation, atomic operations
│   │   │   │
│   │   │   ├── parsing.py            # Document parsing (PDF, DOCX, etc)
│   │   │   │                         # Purpose: Extracts text from various document formats
│   │   │   │                         # Functionality: PDF parsing, DOCX reading, OCR integration
│   │   │   │
│   │   │   └── indexer.py            # File indexing for fast search (MISSING - not implemented yet)
│   │   │       │                     # Purpose: Would build and maintain file content index
│   │   │       │                     # When needed: For very fast searches across large file collections
│   │   │       │                     # Currently: search.py handles this functionality
│   │   │
│   │   ├── email/                    # Email integration tools
│   │   │   ├── __init__.py
│   │   │   ├── imap_client.py        # IMAP email client (generic)
│   │   │   │                         # Purpose: Connects to any IMAP email server
│   │   │   │                         # Functionality: Fetch, search, read emails via IMAP protocol
│   │   │   │
│   │   │   ├── gmail_client.py       # Gmail-specific client (uses Gmail API)
│   │   │   │                         # Purpose: Advanced Gmail features (labels, threads, OAuth)
│   │   │   │                         # Functionality: Gmail API integration, OAuth2 authentication
│   │   │   │                         # When needed: If user has Gmail and wants advanced features
│   │   │   │
│   │   │   ├── outlook_client.py     # Outlook/Office 365 client (MISSING - not implemented)
│   │   │   │                         # Purpose: Would integrate with Outlook/Office 365
│   │   │   │                         # When needed: If user has Outlook email
│   │   │   │                         # Not needed if: User only uses Gmail or other IMAP providers
│   │   │   │
│   │   │   └── parser.py             # Email parsing and extraction
│   │   │       │                     # Purpose: Parses email content, extracts attachments, metadata
│   │   │       │                     # Functionality: MIME parsing, header extraction, HTML to text
│   │   │
│   │   ├── calendar/                 # Calendar tools
│   │   │   ├── __init__.py
│   │   │   ├── google_calendar.py    # Google Calendar integration
│   │   │   │                         # Purpose: Syncs with Google Calendar
│   │   │   │                         # Functionality: OAuth2, event CRUD, calendar queries
│   │   │   │                         # When needed: If user has Google Calendar
│   │   │   │
│   │   │   └── internal.py           # Internal calendar (local SQLite)
│   │   │       │                     # Purpose: Local event storage without cloud dependency
│   │   │       │                     # Functionality: Event creation, reminders, local storage
│   │   │       │                     # When needed: Always (fallback if no Google Calendar)
│   │   │
│   │   ├── finance/                  # Finance tools
│   │   │   ├── __init__.py
│   │   │   ├── open_banking.py       # Open Banking API integration
│   │   │   │                         # Purpose: Fetches real bank account data (UK/EU)
│   │   │   │                         # Functionality: Secure bank API connection, transaction sync
│   │   │   │                         # When needed: If user wants automated bank syncing
│   │   │   │                         # Not needed if: Manual CSV import is sufficient
│   │   │   │
│   │   │   ├── csv_import.py         # CSV transaction import
│   │   │   │                         # Purpose: Imports bank statements from CSV files
│   │   │   │                         # Functionality: CSV parsing, transaction normalization
│   │   │   │                         # When needed: Always (baseline functionality)
│   │   │   │
│   │   │   ├── categorizer.py        # Transaction categorization
│   │   │   │                         # Purpose: Auto-categorizes expenses (groceries, utilities, etc)
│   │   │   │                         # Functionality: ML-based categorization, rule engine
│   │   │   │
│   │   │   ├── subscriptions.py      # Subscription tracking
│   │   │   │                         # Purpose: Detects recurring charges, tracks subscription renewals
│   │   │   │                         # Functionality: Pattern detection, renewal reminders
│   │   │   │
│   │   │   └── invoices.py           # Invoice management
│   │   │       │                     # Purpose: Creates, tracks, manages invoices
│   │   │       │                     # Functionality: PDF generation, payment tracking
│   │   │       │                     # When needed: If user is freelancer/business owner
│   │   │       │                     # Not needed if: User is employee with no invoicing needs
│   │   │
│   │   ├── productivity/             # Productivity tools
│   │   │   ├── __init__.py
│   │   │   ├── activity_monitor.py   # Activity tracking
│   │   │   │                         # Purpose: Monitors app usage, website visits, typing activity
│   │   │   │                         # Functionality: Window tracking, time logging
│   │   │   │                         # Privacy: Local only, user controls what's tracked
│   │   │   │
│   │   │   ├── focus.py              # Focus/Pomodoro sessions
│   │   │   │                         # Purpose: Timed work sessions, break reminders
│   │   │   │                         # Functionality: Timer, notifications, app blocking
│   │   │   │
│   │   │   └── reminders.py          # Task reminders
│   │   │       │                     # Purpose: Creates time-based or event-based reminders
│   │   │       │                     # Functionality: Notification scheduling, reminder persistence
│   │   │
│   │   ├── messaging/                # Messaging platform integrations
│   │   │   ├── __init__.py
│   │   │   ├── telegram_bot.py       # Telegram bot integration
│   │   │   │                         # Purpose: Send/receive Telegram messages via bot
│   │   │   │                         # Functionality: Telegram Bot API, message handling
│   │   │   │                         # When needed: If user wants Telegram integration
│   │   │   │                         # Not needed if: User doesn't use Telegram
│   │   │   │
│   │   │   └── whatsapp_helper.py    # WhatsApp integration helper
│   │   │       │                     # Purpose: WhatsApp message automation
│   │   │       │                     # Functionality: WhatsApp Web API (unofficial) or Business API
│   │   │       │                     # When needed: If user wants WhatsApp automation
│   │   │       │                     # Not needed if: User doesn't use WhatsApp or prefers manual
│   │   │
│   │   └── system/                   # System control tools
│   │       ├── __init__.py
│   │       ├── app_launcher.py       # Application launcher
│   │       │                         # Purpose: Launches desktop applications by name
│   │       │                         # Functionality: Cross-platform app detection and launching
│   │       │
│   │       └── window_manager.py     # Window management
│   │           │                     # Purpose: Controls app windows (minimize, maximize, close)
│   │           │                     # Functionality: OS-specific window manipulation APIs
│   │
│   │
│   ├── services/                     # Business logic services (higher-level than tools)
│   │   │                             # Purpose: Orchestrates tools, handles business rules
│   │   │
│   │   ├── __init__.py
│   │   ├── database.py               # SQLite database connection and management
│   │   │                             # Purpose: Async database connection pool, query helpers
│   │   │                             # Functionality: aiosqlite wrapper, connection management
│   │   │
│   │   ├── embeddings.py             # Local embeddings for RAG (Retrieval-Augmented Generation)
│   │   │                             # Purpose: Generates text embeddings for semantic search
│   │   │                             # Functionality: Local embedding model (e.g., sentence-transformers)
│   │   │                             # When needed: For semantic file search, context retrieval
│   │   │                             # Not needed if: Simple keyword search is sufficient
│   │   │
│   │   ├── external_llm.py           # External LLM API clients (Claude, ChatGPT)
│   │   │                             # Purpose: Communicates with cloud AI services
│   │   │                             # Functionality: API key management, request handling, streaming
│   │   │                             # When needed: If user enables cloud model fallback
│   │   │
│   │   └── notifications.py          # Desktop notification service
│   │       │                         # Purpose: Sends system notifications (toasts)
│   │       │                         # Functionality: Cross-platform notification API
│   │
│   │
│   ├── models/                       # Pydantic data models (schemas)
│   │   │                             # Purpose: Type-safe data validation and serialization
│   │   │
│   │   ├── __init__.py
│   │   ├── conversation.py           # Conversation model
│   │   │                             # Purpose: Defines conversation structure (ID, title, metadata)
│   │   │
│   │   ├── message.py                # Message model
│   │   │                             # Purpose: Defines message structure (role, content, attachments)
│   │   │
│   │   ├── commitment.py             # Commitment model
│   │   │                             # Purpose: Tracks promises/commitments made by user or to user
│   │   │                             # Example: "Remind me to call John tomorrow"
│   │   │
│   │   ├── transaction.py            # Financial transaction model
│   │   │                             # Purpose: Defines transaction structure (amount, date, category)
│   │   │
│   │   ├── subscription.py           # Subscription model
│   │   │                             # Purpose: Defines subscription structure (service, amount, cycle)
│   │   │
│   │   ├── invoice.py                # Invoice model
│   │   │                             # Purpose: Defines invoice structure (items, totals, status)
│   │   │
│   │   └── activity.py               # Activity log model
│   │       │                         # Purpose: Defines activity tracking structure (app, duration)
│   │
│   │
│   ├── api/                          # REST API and WebSocket layer
│   │   │                             # Purpose: Exposes backend functionality via HTTP/WebSocket
│   │   │
│   │   ├── __init__.py
│   │   ├── middleware.py             # FastAPI middleware
│   │   │                             # Purpose: CORS, logging, error handling, request timing
│   │   │                             # Functionality: Intercepts all requests/responses
│   │   │
│   │   ├── websocket.py              # WebSocket handler for real-time chat
│   │   │                             # Purpose: Streams LLM responses token-by-token to UI
│   │   │                             # Functionality: Connection management, message routing, streaming
│   │   │
│   │   ├── dependencies.py           # FastAPI dependency injection (MISSING - not implemented yet)
│   │   │                             # Purpose: Would provide shared dependencies (DB session, auth)
│   │   │                             # When needed: For code reuse across routes
│   │   │
│   │   └── routes/                   # REST API endpoint modules
│   │       ├── __init__.py
│   │       ├── chat.py               # Chat endpoints
│   │       │                         # Purpose: POST /chat - send message, POST /chat/regenerate
│   │       │
│   │       ├── conversations.py      # Conversation CRUD endpoints
│   │       │                         # Purpose: GET/POST/PUT/DELETE /conversations
│   │       │
│   │       ├── files.py              # File endpoints
│   │       │                         # Purpose: GET /files/search, POST /files/index
│   │       │
│   │       ├── calendar.py           # Calendar endpoints
│   │       │                         # Purpose: GET/POST/PUT/DELETE /calendar/events
│   │       │
│   │       ├── finance.py            # Finance endpoints
│   │       │                         # Purpose: GET /finance/balance, /transactions, /subscriptions
│   │       │
│   │       ├── settings.py           # Settings endpoints
│   │       │                         # Purpose: GET/PUT /settings, integration management
│   │       │
│   │       └── health.py             # Health check endpoints (MISSING - not implemented yet)
│   │           │                     # Purpose: Would provide GET /health, GET /status
│   │           │                     # When needed: For monitoring, deployment health checks
│   │
│   │
│   └── db/                           # Database layer
│       │                             # Purpose: Schema, migrations, data access
│       │
│       ├── __init__.py
│       ├── schema.sql                # Initial database schema (SQLite)
│       │                             # Purpose: Creates tables for conversations, messages, transactions, etc.
│       │                             # Functionality: Run once on first startup
│       │
│       ├── migrations/               # Database migrations (version control for schema changes)
│       │   └── .gitkeep              # Empty folder placeholder
│       │                             # Purpose: Would contain migration scripts for schema updates
│       │                             # When needed: When schema needs to change after initial release
│       │                             # Example: Adding new column, creating new table
│       │
│       └── repositories/             # Data access layer (Repository pattern)
│           │                         # Purpose: Abstracts database queries from business logic
│           │
│           ├── __init__.py
│           ├── conversations.py      # Conversation data access
│           │                         # Purpose: CRUD operations for conversations table
│           │                         # Functionality: get_by_id(), create(), update(), delete()
│           │
│           ├── commitments.py        # Commitment data access
│           │                         # Purpose: CRUD operations for commitments/reminders
│           │
│           ├── transactions.py       # Transaction data access
│           │                         # Purpose: CRUD operations for financial transactions
│           │                         # Functionality: Complex queries (filter by date, category, amount)
│           │
│           └── files.py              # File index data access
│               │                     # Purpose: CRUD operations for file index
│               │                     # Functionality: Search queries, index updates
│
│
├── tests/                            # Test suite (pytest)
│   │                                 # Purpose: Ensures code quality and correctness
│   │
│   ├── __init__.py
│   ├── test_router.py                # Tests for core routing logic
│   │                                 # Purpose: Verifies domain classification works correctly
│   │                                 # Status: Implemented
│   │
│   ├── test_agents/                  # Agent tests (EMPTY - not implemented yet)
│   │   └── __init__.py               # Purpose: Would test each agent's tool calling and responses
│   │                                 # When needed: Before production release for reliability
│   │
│   └── test_tools/                   # Tool tests (EMPTY - not implemented yet)
│       └── __init__.py               # Purpose: Would test each tool's functionality
│                                     # When needed: Critical for tools that modify data (files, emails)
│
├── data/                             # Runtime data storage
│   └── .gitkeep                      # Folder placeholder
│                                     # Purpose: SQLite database file (alfy.db) created here at runtime
│                                     # Should be in .gitignore to avoid committing user data
│
├── llm_models/                       # Downloaded LLM model files (GGUF format)
│   ├── .cache/                       # Hugging Face download cache
│   │   └── huggingface/download/
│   │                                 # Purpose: Temporary storage during model downloads
│   │
│   ├── qwen3-1.7b-q4_k_m.gguf        # Small router model (~1.2 GB)
│   │                                 # Purpose: Fast domain classification (Tier 0 routing)
│   │                                 # When downloaded: On first run via download_models.py
│   │
│   └── qwen3-8b-q4_k_m.gguf          # Larger agent model (~5 GB)
│       │                             # Purpose: Agent task execution, response generation
│       │                             # When downloaded: On first run via download_models.py
│
├── logs/                             # Application logs
│   └── .gitkeep                      # Folder placeholder
│                                     # Purpose: alfy.log file created here for debugging
│                                     # Should be in .gitignore
│
├── venv/                             # Backend Python virtual environment
│   └── ...                           # Purpose: Isolated Python dependencies for backend
│                                     # Created by: python -m venv venv
│
├── requirements.txt                  # Production Python dependencies
│                                     # Purpose: Specifies packages needed to run backend
│                                     # Install with: pip install -r requirements.txt
│
├── requirements-dev.txt              # Development Python dependencies
│                                     # Purpose: Specifies dev tools (pytest, black, mypy)
│                                     # Install with: pip install -r requirements-dev.txt
│                                     # Not needed for: Production deployment
│
├── download_models.py                # LLM model download utility
│                                     # Purpose: Downloads Qwen models from Hugging Face
│                                     # Run once: python download_models.py
│
├── pyproject.toml                    # Python project configuration (MISSING - not implemented yet)
│                                     # Purpose: Would define project metadata, build system
│                                     # When needed: For packaging as installable Python package
│                                     # Not needed for: Local development
│
└── .env.example                      # Example environment variables (MISSING - should be added)
    │                                 # Purpose: Template for .env file (API keys, secrets)
    │                                 # When needed: Before configuring integrations
    │                                 # Example contents: OPENAI_API_KEY=, GMAIL_CLIENT_ID=
```

---

## UI Directory (`/ui/`)

```
ui/                                   # Tauri + React frontend application
│                                     # Purpose: Desktop UI that communicates with backend
│
├── src/                              # React application source code (TypeScript)
│   │
│   ├── components/                   # React UI components
│   │   │
│   │   ├── Chat/                     # Chat interface components
│   │   │   │                         # Purpose: Main conversation UI
│   │   │   │
│   │   │   ├── ChatWindow.tsx        # Main chat container
│   │   │   │                         # Purpose: Orchestrates message list, input, toolbar
│   │   │   │
│   │   │   ├── MessageList.tsx       # Scrollable message history
│   │   │   │                         # Purpose: Renders all messages in conversation
│   │   │   │                         # Functionality: Auto-scroll, virtualization for performance
│   │   │   │
│   │   │   ├── MessageBubble.tsx     # Individual message component
│   │   │   │                         # Purpose: Renders single message (user or assistant)
│   │   │   │                         # Functionality: Markdown rendering, code highlighting
│   │   │   │
│   │   │   ├── InputBar.tsx          # Message input field
│   │   │   │                         # Purpose: Text input with send button
│   │   │   │                         # Functionality: Multi-line support, file attachments, hotkeys
│   │   │   │
│   │   │   ├── ModelSelector.tsx     # Model selection dropdown
│   │   │   │                         # Purpose: Switch between local/Claude/ChatGPT
│   │   │   │                         # Functionality: Shows available models, current selection
│   │   │   │
│   │   │   ├── TypingIndicator.tsx   # "AI is typing..." animation
│   │   │   │                         # Purpose: Shows when assistant is generating response
│   │   │   │                         # Functionality: Animated dots, streaming token display
│   │   │   │
│   │   │   └── index.ts              # Barrel export for Chat components
│   │   │
│   │   ├── Sidebar/                  # Navigation sidebar components
│   │   │   │                         # Purpose: Conversation history and shortcuts
│   │   │   │
│   │   │   ├── Sidebar.tsx           # Main sidebar container
│   │   │   │                         # Purpose: Left panel with conversations and shortcuts
│   │   │   │
│   │   │   ├── ConversationList.tsx  # List of past conversations
│   │   │   │                         # Purpose: Shows conversation history, search
│   │   │   │                         # Functionality: Click to load, delete, rename
│   │   │   │
│   │   │   ├── DomainShortcuts.tsx   # Quick access to domains
│   │   │   │                         # Purpose: Buttons for "Files", "Finance", "Calendar", etc.
│   │   │   │                         # Functionality: Opens domain-specific view or starts conversation
│   │   │   │
│   │   │   ├── QuickActions.tsx      # Common action buttons
│   │   │   │                         # Purpose: "New Conversation", "Settings", "Help"
│   │   │   │                         # Functionality: Quick access to frequent tasks
│   │   │   │
│   │   │   └── index.ts              # Barrel export
│   │   │
│   │   ├── Widgets/                  # Dashboard widgets (optional views)
│   │   │   │                         # Purpose: Domain-specific data displays
│   │   │   │                         # When shown: Dashboard view or domain-specific screens
│   │   │   │
│   │   │   ├── CalendarWidget.tsx    # Upcoming events widget
│   │   │   │                         # Purpose: Shows next 3-5 calendar events
│   │   │   │                         # When needed: If user uses calendar features
│   │   │   │
│   │   │   ├── FinanceWidget.tsx     # Financial summary widget
│   │   │   │                         # Purpose: Shows balance, recent transactions
│   │   │   │                         # When needed: If user uses finance features
│   │   │   │
│   │   │   ├── FocusWidget.tsx       # Focus session widget
│   │   │   │                         # Purpose: Shows active/recent focus sessions
│   │   │   │                         # When needed: If user uses productivity tracking
│   │   │   │
│   │   │   ├── SubscriptionsWidget.tsx # Subscription reminders widget
│   │   │   │                         # Purpose: Shows upcoming subscription renewals
│   │   │   │                         # When needed: If user tracks subscriptions
│   │   │   │
│   │   │   └── index.ts              # Barrel export
│   │   │
│   │   ├── Settings/                 # Settings modal components
│   │   │   │                         # Purpose: App configuration UI
│   │   │   │
│   │   │   ├── SettingsModal.tsx     # Settings dialog container
│   │   │   │                         # Purpose: Modal overlay with settings tabs
│   │   │   │
│   │   │   ├── GeneralSettings.tsx   # General app settings
│   │   │   │                         # Purpose: Theme, language, startup preferences
│   │   │   │
│   │   │   ├── IntegrationsSettings.tsx # Integration configuration
│   │   │   │                         # Purpose: Connect/disconnect Gmail, Google Calendar, etc.
│   │   │   │                         # Functionality: OAuth flows, API key input
│   │   │   │
│   │   │   ├── LLMSettings.tsx       # LLM model configuration
│   │   │   │                         # Purpose: Select default model, configure API keys for cloud models
│   │   │   │
│   │   │   ├── PrivacySettings.tsx   # Privacy and data settings
│   │   │   │                         # Purpose: Activity tracking consent, data retention
│   │   │   │
│   │   │   └── index.ts              # Barrel export
│   │   │
│   │   ├── Common/                   # Reusable UI components
│   │   │   │                         # Purpose: Shared components used across app
│   │   │   │
│   │   │   ├── Button.tsx            # Button component
│   │   │   │                         # Purpose: Consistent button styling, variants
│   │   │   │
│   │   │   ├── Modal.tsx             # Modal dialog component
│   │   │   │                         # Purpose: Overlay dialogs for confirmations, forms
│   │   │   │
│   │   │   ├── Dropdown.tsx          # Dropdown menu component
│   │   │   │                         # Purpose: Select menus, context menus
│   │   │   │
│   │   │   ├── Toast.tsx             # Toast notification component
│   │   │   │                         # Purpose: Temporary success/error messages
│   │   │   │
│   │   │   ├── Loading.tsx           # Loading spinner component
│   │   │   │                         # Purpose: Shows loading state
│   │   │   │
│   │   │   └── index.ts              # Barrel export
│   │   │
│   │   └── Layout/                   # Layout components
│   │       │                         # Purpose: App shell structure
│   │       │
│   │       ├── MainLayout.tsx        # Main app layout
│   │       │                         # Purpose: Defines overall structure (sidebar + main content)
│   │       │
│   │       ├── TitleBar.tsx          # Custom title bar
│   │       │                         # Purpose: Window controls (minimize, maximize, close)
│   │       │                         # Functionality: Tauri window API integration
│   │       │
│   │       └── index.ts              # Barrel export
│   │
│   ├── hooks/                        # React custom hooks
│   │   │                             # Purpose: Reusable React logic, state management
│   │   │
│   │   ├── useWebSocket.ts           # WebSocket connection hook
│   │   │                             # Purpose: Manages WebSocket connection lifecycle
│   │   │                             # Functionality: Connect, disconnect, reconnect, message handling
│   │   │
│   │   ├── useAlfy.ts                # Main Alfy API interface hook
│   │   │                             # Purpose: High-level API for all Alfy operations
│   │   │                             # Functionality: Combines chat, settings, data fetching
│   │   │
│   │   ├── useChat.ts                # Chat state and operations hook
│   │   │                             # Purpose: Manages chat state, send message, streaming
│   │   │                             # Functionality: Message list, send, cancel, regenerate
│   │   │
│   │   ├── useNotifications.ts       # Desktop notifications hook
│   │   │                             # Purpose: Shows native desktop notifications
│   │   │                             # Functionality: Tauri notification API wrapper
│   │   │
│   │   └── useSettings.ts            # Settings management hook
│   │       │                         # Purpose: Loads, saves, updates app settings
│   │       │                         # Functionality: Local storage persistence
│   │
│   ├── stores/                       # Zustand state management
│   │   │                             # Purpose: Global app state (alternative to Redux)
│   │   │
│   │   ├── conversationStore.ts      # Conversation state store
│   │   │                             # Purpose: Manages current conversation, message history
│   │   │                             # State: currentConversation, messages, loading
│   │   │
│   │   ├── settingsStore.ts          # App settings store
│   │   │                             # Purpose: Persists user preferences
│   │   │                             # State: theme, defaultModel, integrationStatus
│   │   │
│   │   ├── uiStore.ts                # UI state store
│   │   │                             # Purpose: Manages UI state (modals, sidebar visibility)
│   │   │                             # State: isSettingsOpen, isSidebarCollapsed
│   │   │
│   │   └── index.ts                  # Barrel export, store composition
│   │
│   ├── services/                     # API and utility services
│   │   │                             # Purpose: Business logic, API communication
│   │   │
│   │   ├── api.ts                    # REST API client
│   │   │                             # Purpose: HTTP requests to backend API
│   │   │                             # Functionality: GET/POST/PUT/DELETE with error handling
│   │   │
│   │   ├── websocket.ts              # WebSocket client class
│   │   │                             # Purpose: Manages WebSocket connection
│   │   │                             # Functionality: Event-driven message handling, reconnection
│   │   │
│   │   └── storage.ts                # Local storage helpers
│   │       │                         # Purpose: Wrapper for localStorage/sessionStorage
│   │       │                         # Functionality: Type-safe get/set, JSON serialization
│   │
│   ├── types/                        # TypeScript type definitions
│   │   │                             # Purpose: Shared types for type safety
│   │   │
│   │   ├── chat.ts                   # Chat-related types
│   │   │                             # Purpose: Message, Conversation, Attachment interfaces
│   │   │
│   │   ├── api.ts                    # API request/response types
│   │   │                             # Purpose: Matches backend API contracts
│   │   │
│   │   ├── domain.ts                 # Domain-specific types
│   │   │                             # Purpose: Transaction, Subscription, Event types
│   │   │
│   │   └── index.ts                  # Barrel export, re-exports all types
│   │
│   ├── utils/                        # Utility functions
│   │   │                             # Purpose: Pure helper functions
│   │   │
│   │   ├── formatters.ts             # Formatting utilities
│   │   │                             # Purpose: Format dates, currency, numbers
│   │   │                             # Functionality: Intl API wrappers, custom formatters
│   │   │
│   │   ├── validators.ts             # Input validation
│   │   │                             # Purpose: Validate email, phone, date formats
│   │   │
│   │   └── constants.ts              # App constants
│   │       │                         # Purpose: API URLs, config values, enums
│   │
│   ├── styles/                       # CSS styles
│   │   └── globals.css               # Global Tailwind CSS styles
│   │       │                         # Purpose: Base styles, Tailwind imports, custom classes
│   │
│   ├── App.tsx                       # Root React component
│   │                                 # Purpose: App entry, routing, providers
│   │
│   ├── main.tsx                      # React entry point
│   │                                 # Purpose: Renders App into DOM, React 18 setup
│   │
│   └── vite-env.d.ts                 # Vite TypeScript definitions
│       │                             # Purpose: Type definitions for Vite-specific features
│
├── src-tauri/                        # Tauri Rust shell (minimal ~50-100 lines)
│   │                                 # Purpose: Native OS integration layer
│   │
│   ├── src/
│   │   └── main.rs                   # Tauri entry point
│   │       │                         # Purpose: System tray, global hotkeys, window management
│   │       │                         # Functionality: Tauri app builder, command handlers
│   │       │                         # Note: Intentionally minimal - backend does heavy lifting
│   │
│   ├── icons/                        # Application icons
│   │   └── ...                       # Purpose: App icons for Windows, macOS, Linux
│   │                                 # Generated from: Icon source file (PNG/SVG)
│   │
│   ├── tauri.conf.json               # Tauri configuration
│   │                                 # Purpose: App metadata, window settings, permissions
│   │                                 # Defines: App name, version, window size, allowed APIs
│   │
│   └── Cargo.toml                    # Rust dependencies (MISSING - should exist)
│       │                             # Purpose: Would define Rust crate dependencies
│       │                             # When needed: Always (required for Tauri Rust build)
│       │                             # Note: Might be auto-generated by Tauri CLI
│
├── public/                           # Static assets
│   ├── index.html                    # HTML entry point
│   │                                 # Purpose: Root HTML file loaded by Vite
│   │
│   └── assets/                       # Static assets (images, fonts)
│       └── ...                       # Purpose: Images, logos, fonts not bundled by Vite
│
├── node_modules/                     # npm dependencies
│   └── ...                           # Purpose: Installed packages (React, Tauri, etc.)
│                                     # Generated by: npm install
│
├── package.json                      # Node.js project configuration
│                                     # Purpose: Defines dependencies, scripts, metadata
│                                     # Scripts: npm run dev, npm run build, npm run tauri
│
├── package-lock.json                 # Dependency lock file
│                                     # Purpose: Ensures consistent dependency versions
│
├── tsconfig.json                     # TypeScript configuration
│                                     # Purpose: TypeScript compiler options, paths
│
├── vite.config.ts                    # Vite build configuration
│                                     # Purpose: Build settings, plugins, dev server config
│
├── tailwind.config.js                # Tailwind CSS configuration
│                                     # Purpose: Theme customization, plugin configuration
│
├── postcss.config.js                 # PostCSS configuration
│                                     # Purpose: CSS processing (autoprefixer, Tailwind)
│
├── .prettierrc                       # Prettier code formatter config
│                                     # Purpose: Code style rules (indentation, quotes)
│
├── .prettierignore                   # Prettier ignore patterns
│                                     # Purpose: Files to skip formatting
│
├── .eslintrc.cjs                     # ESLint configuration
│                                     # Purpose: JavaScript/TypeScript linting rules
│
├── index.html                        # HTML entry point (duplicate - can be in public/)
│
└── README.md                         # UI documentation
    │                                 # Purpose: How to run UI, development guide
```

---

## Documentation Directory (`/docs/`)

```
docs/                                 # Project documentation
│
├── architecture/                     # Architecture documentation
│   └── diagrams/                     # Architecture diagrams folder
│       └── ...                       # Purpose: System diagrams, flow charts
│                                     # When needed: For complex features, onboarding
│
├── README.md                         # Documentation index (32 bytes - placeholder)
│                                     # Purpose: Would provide documentation navigation
│
├── API.md                            # API documentation (44 bytes - placeholder)
│                                     # Purpose: Would document all REST API endpoints
│                                     # When needed: For frontend developers, API consumers
│
├── IPC.md                            # IPC protocol documentation (44 bytes - placeholder)
│                                     # Purpose: Would document WebSocket message format
│                                     # When needed: For understanding UI ↔ Backend communication
│                                     # Note: Currently in PROJECT_STRUCTURE.md
│
└── Stack.md                          # Tech stack overview (41 bytes - placeholder)
    │                                 # Purpose: Would explain technology choices
    │                                 # Note: Currently in TECH_STACK.md at root
```

---

## Shared Resources Directory (`/shared/`)

```
shared/                               # Shared resources between frontend/backend
│                                     # Purpose: Ensures frontend and backend use same types
│
├── schemas/                          # JSON Schema definitions
│   │                                 # Purpose: Type contracts for IPC messages
│   │
│   ├── chat.json                     # Chat message schemas
│   │                                 # Purpose: Defines WebSocket message structure
│   │                                 # When needed: For validating messages, code generation
│   │
│   ├── events.json                   # Event schemas
│   │                                 # Purpose: Defines notification/event structure
│   │
│   └── api.json                      # API schemas
│       │                             # Purpose: Defines REST API request/response schemas
│       │                             # When needed: For OpenAPI spec generation
│
└── README.md                         # Shared resources documentation
    │                                 # Purpose: Explains how to use shared schemas
```

---

## Scripts Directory (`/scripts/`)

```
scripts/                              # Setup and utility scripts
│
└── setup.ps1                         # Windows PowerShell setup script (4.8 KB)
    │                                 # Purpose: Automates development environment setup
    │                                 # Functionality: Installs Python, Node.js, downloads models
    │                                 # Usage: Run once on new machine for Windows users
    │                                 # Not needed for: Manual setup, Linux/macOS (need .sh script)
```

---

## .github Directory (`/.github/`)

```
.github/                              # GitHub-specific configuration
│
└── workflows/                        # GitHub Actions CI/CD workflows
    └── ci.yml                        # Continuous Integration workflow
        │                             # Purpose: Runs on every push/PR
        │                             # Functionality: Linting, testing, building
        │                             # When needed: For automated quality checks
        │                             # Not needed for: Solo development without GitHub
```

---

## Missing But Important Files

These files are mentioned in PROJECT_STRUCTURE.md or are standard practice but don't exist yet:

### Root Level
1. **`.gitignore`** - CRITICAL MISSING
   - Purpose: Prevents committing sensitive/large files
   - Should ignore: `venv/`, `node_modules/`, `.env`, `__pycache__/`, `*.log`, `data/*.db`, `llm_models/*.gguf`
   - When needed: IMMEDIATELY (before first git commit)

2. **`LICENSE`** - Should be added before public release
   - Purpose: Legal terms for code usage
   - Options: MIT, Apache 2.0, GPL, proprietary
   - When needed: Before sharing code publicly

3. **`.env.example`** - Should be added
   - Purpose: Template for environment variables
   - Contents: `OPENAI_API_KEY=`, `ANTHROPIC_API_KEY=`, `GMAIL_CLIENT_ID=`, etc.
   - When needed: Before configuring integrations

### Backend
1. **`backend/pyproject.toml`** - Mentioned but not implemented
   - Purpose: Modern Python project configuration
   - When needed: For packaging, publishing to PyPI
   - Not needed for: Local development

2. **`backend/alfy/api/dependencies.py`** - Mentioned but missing
   - Purpose: FastAPI dependency injection
   - When needed: For code reuse across routes

3. **`backend/alfy/api/routes/health.py`** - Mentioned but missing
   - Purpose: Health check endpoints
   - When needed: For monitoring, deployment

4. **`backend/alfy/tools/files/indexer.py`** - Mentioned but missing
   - Purpose: File indexing for fast search
   - Note: Functionality likely in search.py

5. **`backend/alfy/tools/email/outlook_client.py`** - Mentioned but missing
   - Purpose: Outlook integration
   - When needed: If user has Outlook email

### UI
1. **`ui/src-tauri/Cargo.toml`** - Expected for Tauri but missing
   - Purpose: Rust dependencies
   - Note: Might be auto-generated by Tauri CLI

2. **`ui/src-tauri/Cargo.lock`** - Expected for Tauri
   - Purpose: Rust dependency lock file
   - Note: Auto-generated

### Tests
1. **`backend/tests/test_agents/*.py`** - Empty folder
   - Purpose: Would test each agent
   - When needed: Before production release

2. **`backend/tests/test_tools/*.py`** - Empty folder
   - Purpose: Would test each tool
   - When needed: Critical for tools that modify data

---

## Summary

### Implementation Status
- ✅ **Fully Implemented**: Core architecture (router, orchestrator, agents, tools)
- ✅ **Fully Implemented**: Frontend components (React, Tauri structure)
- ⚠️ **Partially Implemented**: Tests (only router tested)
- ⚠️ **Partially Implemented**: Documentation (mostly placeholders)
- ❌ **Missing**: Some tools (Outlook client, file indexer)
- ❌ **Missing**: Critical files (.gitignore, .env.example)

### When Components Become Necessary

#### Immediately Needed
- `.gitignore` - Prevents committing secrets/large files
- Backend core (router, orchestrator, agents) - Already implemented
- UI components - Already implemented
- Local model files - Downloaded via download_models.py

#### Needed for Basic Usage
- At least one agent (e.g., general, files) - Already implemented
- Database schema - Already implemented
- WebSocket for chat - Already implemented

#### Needed for Specific Features
- **Gmail integration**: `tools/email/gmail_client.py` - Already implemented
- **Google Calendar**: `tools/calendar/google_calendar.py` - Already implemented
- **Finance tracking**: `tools/finance/*` - Already implemented
- **Productivity tracking**: `tools/productivity/*` - Already implemented
- **Telegram bot**: `tools/messaging/telegram_bot.py` - Already implemented (only if user wants Telegram)
- **WhatsApp**: `tools/messaging/whatsapp_helper.py` - Already implemented (only if user wants WhatsApp)
- **Outlook email**: `tools/email/outlook_client.py` - NOT implemented (only if user has Outlook)

#### Needed Before Production
- Comprehensive tests (`test_agents/`, `test_tools/`)
- Documentation (API.md, IPC.md, Stack.md)
- CI/CD pipeline - Already setup
- LICENSE file
- Error handling and logging

#### Optional/Advanced
- `pyproject.toml` - For packaging
- Migration system - For schema updates
- Embedding service - For semantic search
- External LLM fallback - For complex queries

---

## Architecture Principles

### Why This Structure?
1. **Separation of Concerns**: Frontend (UI) and Backend (AI/Data) are separate
2. **Modularity**: Each agent/tool is independent
3. **Scalability**: Easy to add new domains/agents
4. **Type Safety**: TypeScript (frontend) + Pydantic (backend)
5. **Local-First**: All data and AI processing on-device
6. **Extensibility**: Cloud LLM fallback available if needed

### Communication Flow
```
User → UI (React/Tauri)
     → WebSocket → Backend (FastAPI)
                 → Router (Qwen 1.7B) → Determines domain
                 → Agent (Qwen 8B) → Executes with tools
                 ← Streams response ← WebSocket ← UI
```

### Data Flow
```
User data → Tools (read/write files, email, calendar)
          → SQLite database (local storage)
          → Never leaves device (except explicit cloud LLM calls)
```

---

This structure supports Alfy's core mission: A private, local-first AI assistant that helps with files, email, calendar, finance, and productivity while keeping all data on your device.
