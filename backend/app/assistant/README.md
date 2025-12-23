# Alfy

**100% Local AI Personal Assistant for Windows**

Alfy is a privacy-first desktop AI assistant that runs entirely on your laptop. Your data stays local, your conversations stay private, and you stay in control.

---

## Overview

Alfy combines a local LLM brain with a powerful tools layer to help you manage files, emails, finances, calendar, productivity, and more—all without sending your personal data to the cloud.

**Key Principles:**
- **Local-first**: Core logic and data processing happen on your machine
- **Privacy by design**: Secrets and sensitive data never exposed directly to the LLM
- **Offline capable**: Most features work without internet connection
- **Human-in-the-loop**: All financial transactions and sensitive actions require your confirmation

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 12 GB | 16 GB |
| Storage | 256 GB SSD | 512 GB SSD |
| OS | Windows 10 | Windows 11 |
| CPU | 4 cores | 8 cores |
| GPU | Not required | Optional (CUDA for faster inference) |

---

## Architecture

Alfy uses a two-tier LLM architecture optimized for speed and accuracy on consumer hardware.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INPUT                                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     TIER 0: HEURISTICS                              │
│                                                                     │
│  Fast keyword matching (~1ms)                                       │
│  Routes obvious requests directly to domain agents                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼ (ambiguous requests only)
┌─────────────────────────────────────────────────────────────────────┐
│                     TIER 1: ROUTER                                  │
│                                                                     │
│  Model: Qwen3-1.7B (Q4_K_M)                                         │
│  RAM: ~1.5 GB                                                       │
│  Latency: ~200-400ms                                                │
│                                                                     │
│  Classifies requests into domains when heuristics are uncertain     │
│                                                                     │
│  Domains: files, email, calendar, finance, productivity,            │
│           messaging, system, external_llm, general                  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     TIER 2: DOMAIN AGENTS                           │
│                                                                     │
│  Model: Qwen3-8B (Q4_K_M)                                           │
│  RAM: ~6 GB                                                         │
│  Latency: 1-5 seconds                                               │
│                                                                     │
│  Single model with domain-specific prompts and toolsets             │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Two Models?

- **Speed**: The tiny router (1.7B) handles classification in ~200ms, avoiding the latency of running the full 8B model for simple routing decisions
- **Accuracy**: Each domain agent receives only 5-10 relevant tools, dramatically improving tool selection compared to presenting 40+ tools at once
- **Memory efficiency**: Both models fit comfortably in 16GB RAM with room for the application and OS

### Heuristic Routing

Before invoking any LLM, Alfy checks for obvious keywords:

| Pattern | Domain |
|---------|--------|
| `balance`, `spent`, `transaction`, `subscription`, `payment`, `invoice` | finance |
| `file`, `folder`, `document`, `pdf`, `open.*file` | files |
| `email`, `mail`, `inbox`, `send.*message` | email |
| `calendar`, `schedule`, `meeting`, `appointment` | calendar |
| `remind`, `timer`, `alarm`, `focus`, `break` | productivity |
| `telegram`, `whatsapp`, `chat with` | messaging |
| `ask claude`, `ask chatgpt`, `start.*conversation.*claude`, `start.*conversation.*chatgpt` | external_llm |

This catches ~70-80% of requests with zero LLM latency.

### Multi-Domain Requests

When a task spans multiple domains, Alfy uses sequential chaining:

```
User: "Find the invoice I sent to Acme Corp and check if they paid"

1. Router identifies primary domain: finance
2. Finance agent recognizes it needs the invoice file
3. Finance agent delegates to files agent: "find invoice for Acme Corp"
4. Files agent returns: /docs/invoices/acme-march-2025.pdf
5. Finance agent checks transactions for matching payment
6. User receives complete answer
```

---

## Features

### Files & Documents

Manage your local files with natural language commands.

**Capabilities:**
- Search files by name, content, or date
- Open, rename, move, change and organize files
- Summarize PDFs, DOCX, and text files
- Tag and categorize documents
- Local RAG (Retrieval-Augmented Generation) over your document library

**Example commands:**
- "Find the contract I worked on last week"
- "Summarize this PDF"
- "Move all invoices from Downloads to my Invoices folder"
- "What documents mention the Johnson project?"
- "Fill this invoice with my actual data and png signature"


**Tools:** `search_files`, `open_file`, `move_file`, `rename_file`, `summarize_doc`, `tag_file`,`change_file` 

| Connectivity | Local/Offline |
|--------------|---------------|
| File operations | ✅ Fully offline |
| Document parsing | ✅ Fully offline |
| RAG search | ✅ Fully offline |

---

### Email

Read, parse, and draft emails without leaving Alfy.

**Capabilities:**
- Connect via IMAP or Gmail/Outlook APIs
- Parse emails for actionable items:
  - Subscriptions and renewals
  - Flight and hotel bookings
  - Meeting invitations
  - Invoices and receipts
- Draft replies locally
- Send via your email provider

**Example commands:**
- "Show me unread emails from this week"
- "Find the booking confirmation from Hilton"
- "Draft a reply to Sarah's email about the project deadline"
- "What subscriptions have I signed up for via email?"

**Tools:** `fetch_emails`, `search_inbox`, `parse_email`, `draft_reply`, `send_email`, `notify_email`

| Connectivity | Requirement |
|--------------|-------------|
| Sync emails | 🌐 Internet required |
| Parse/analyze | ✅ Offline (after sync) |
| Send emails | 🌐 Internet required |

---

### Calendar

Manage your schedule and commitments.

**Capabilities:**
- Google Calendar integration (OAuth)
- Create, update, and delete events
- Find free time slots
- Auto-create events from parsed emails (flights, meetings, bookings)
- Internal calendar view in Alfy UI

**Event types tracked:**
- Meetings and appointments
- Flights and travel
- Hotel check-in/check-out
- Focus blocks and deadlines
- Job/freelance sessions

**Example commands:**
- "What's on my calendar tomorrow?"
- "Schedule a focus block for 2 hours this afternoon"
- "Find a free slot for a 30-minute call next week"
- "Add the flight from my confirmation email to my calendar"

**Tools:** `get_events`, `create_event`, `update_event`, `delete_event`, `find_free_slot`

| Connectivity | Requirement |
|--------------|-------------|
| Google Calendar sync | 🌐 Internet required |
| Internal calendar | ✅ Fully offline |
| Event creation/logic | ✅ Offline (syncs when online) |

---

### Finance

Track spending, manage subscriptions, and stay on top of your money.

**Data Sources:**
- **Open Banking** (recommended): Read-only access to balances and transactions via aggregator APIs
- **Manual import**: Drop CSV/PDF statements from your bank

**Capabilities:**
- Automatic transaction categorization
- Spending summaries and trends
- Subscription detection and tracking
- Income tracking and P&L views
- Invoice creation and payment tracking
- Link payments to jobs/projects

**Example commands:**
- "What did I spend on groceries this month?"
- "Show me all my active subscriptions"
- "Have I been paid for the Acme project?"
- "Create an invoice for 10 hours of consulting at £75/hour"
- "Alert me if any subscription renews over £50"

**Tools:** `get_balance`, `get_transactions`, `categorize`, `detect_subscriptions`, `spending_summary`, `create_invoice`, `list_invoices`, `track_invoice_payment`

| Connectivity | Requirement |
|--------------|-------------|
| Open Banking sync | 🌐 Internet required |
| CSV import | ✅ Fully offline |
| Analysis & categorization | ✅ Fully offline |
| Alerts (desktop) | ✅ Offline |
| Alerts (Telegram) | 🌐 Internet required |

---

### Subscriptions

Never get caught by unwanted renewals again.

**Detection Sources:**
- Email parsing (welcome emails, receipts, renewal notices)
- Bank transactions (recurring charges)

**Tracked Information:**
- Service name and provider
- Price and billing cycle
- Next renewal date
- Trial end date (with reminders)

**Capabilities:**
- Trial end reminders (3 days, 1 day before)
- Renewal alerts and monthly summaries
- Cancellation assistance:
  - App Store/Play Store: Opens subscription settings
  - Web services: Automated browser navigation to cancellation page
  - Guided instructions for complex cancellations
  - Bank-level block (direct debit cancellation) as last resort

**Example commands:**
- "What subscriptions do I have?"
- "Remind me before my Netflix trial ends"
- "Help me cancel my Spotify subscription"
- "How much am I spending on subscriptions monthly?"

| Connectivity | Requirement |
|--------------|-------------|
| Detection & tracking | ✅ Offline (after email/bank sync) |
| Reminders (desktop) | ✅ Offline |
| Reminders (Telegram) | 🌐 Internet required |
| Cancellation flows | 🌐 Internet required |

---

### Online Purchases

Alfy can assist with online shopping while keeping you in control.

**Capabilities:**
- Open checkout pages for specific products
- Virtual card management suggestions
- Price tracking assistance
- Purchase history from email parsing

**Safety Features:**
- **Human-in-the-loop**: Alfy never completes purchases automatically
- **No stored payment details**: Payment credentials stay in your browser/bank
- **Confirmation required**: All purchase actions require explicit user approval

**Example commands:**
- "Open the Amazon page for AirPods Pro"
- "Track the price of this laptop"
- "What did I buy from Amazon last month?"

**Tools:** `open_purchase_url`, `track_price`, `get_purchase_history`

| Connectivity | Requirement |
|--------------|-------------|
| Browse/purchase | 🌐 Internet required |
| Purchase history | ✅ Offline (from parsed emails) |

---

### Productivity

Stay focused and track how you spend your time.

**Activity Tracking:**
- Active application and window title
- Idle vs active time detection
- Optional: domain tracking for browsers

**Time Classification:**
- Deep work
- Administrative tasks
- Breaks
- Distraction/waste

**Features:**
- Break reminders (customizable intervals)
- Focus sessions with stricter nudges
- Procrastination alerts for defined distraction sites
- Daily/weekly activity reports

**Example commands:**
- "Start a 90-minute focus session on the proposal"
- "How much deep work did I do today?"
- "Remind me to take a break every 45 minutes"
- "What apps did I use most this week?"

**Tools:** `set_reminder`, `start_focus`, `end_focus`, `get_activity_log`, `break_reminder`

| Connectivity | Requirement |
|--------------|-------------|
| All features | ✅ Fully offline |
| Telegram notifications | 🌐 Internet required |

---

### Messaging

Interact with messaging apps through Alfy.

**Telegram (Full Integration):**
- Receive commands from your phone
- Send messages and attachments
- Notifications for any Alfy alert

**WhatsApp (Personal Account):**
- Open WhatsApp Desktop
- Navigate to specific chats
- No message reading or auto-sending (privacy preserved)

**Example commands:**
- "Open my WhatsApp chat with Anna"
- "Send my daily spending summary to Telegram"
- "Message the project update to my Telegram saved messages"

**Tools:** `open_whatsapp_chat`, `send_telegram`, `get_telegram_messages`

| Connectivity | Requirement |
|--------------|-------------|
| Telegram | 🌐 Internet required |
| WhatsApp (open chat) | ✅ Offline (app must be installed) |

---

### System Control

Control your desktop with natural language.

**Capabilities:**
- Launch applications
- Position and focus windows
- Basic system commands

**Example commands:**
- "Open VS Code"
- "Launch Chrome and put it on the right half of the screen"
- "Close Spotify"
- "Put the laptop to sleep"

**Tools:** `open_app`, `close_app`, `position_window`, `system_info`, `shutdown`, `sleep`

| Connectivity | Requirement |
|--------------|-------------|
| All features | ✅ Fully offline |

---

### External LLMs (Claude / ChatGPT)

Access powerful cloud models for complex tasks while keeping Alfy as your local orchestrator.

**Why Use External LLMs?**

The local Qwen3-8B handles most tasks excellently, but sometimes you need more:
- Complex reasoning or analysis
- Creative writing (long-form content, storytelling)
- Advanced coding assistance
- Research and synthesis across many topics
- Tasks requiring latest knowledge (with web search)

**Supported Providers:**

| Provider | Models | Requirements |
|----------|--------|--------------|
| Anthropic Claude | Claude Sonnet, Claude Opus | API key or Claude Pro subscription |
| OpenAI ChatGPT | GPT-4o, GPT-4 Turbo, o1 | API key or ChatGPT Plus subscription |

**Integration Modes:**

**1. Direct Conversation**

Start a dedicated chat session with Claude or ChatGPT directly from Alfy's UI.

```
┌─────────────────────────────────────┐
│  Alfy Chat                      ▼   │
├─────────────────────────────────────┤
│  ○ Alfy (Local)                     │
│  ○ Claude (Anthropic)               │
│  ○ ChatGPT (OpenAI)                 │
└─────────────────────────────────────┘
```

Your conversation goes directly to the selected provider. Useful for:
- Long creative writing sessions
- Deep research questions
- Complex code review
- Extended brainstorming

**2. Alfy-Delegated Queries**

Alfy remains in control but delegates specific questions to external models.

```
User: "Ask Claude to review this code for security issues"

Alfy:
  1. Loads the code file locally
  2. Sends code + review request to Claude API
  3. Receives and presents Claude's analysis
  4. Stores response locally for future reference
```

**3. Hybrid Workflows**

Combine local tools with cloud intelligence:

```
User: "Summarize my emails from this week and ask Claude to draft responses"

Alfy:
  1. Fetches emails locally (email agent)
  2. Summarizes with local LLM
  3. Sends summaries to Claude for response drafting
  4. Presents drafts for your review
  5. Sends via your email provider (with confirmation)
```

**Example Commands:**

- "Start a conversation with Claude"
- "Ask ChatGPT to explain quantum computing"
- "Have Claude review this document for tone"
- "Ask Claude to write a blog post about [topic]"
- "Use ChatGPT to help me debug this Python script"

**Tools:** `start_external_chat`, `ask_claude`, `ask_chatgpt`, `delegate_to_external`

**Configuration:**

```yaml
# alfy-config.yaml
external_llms:
  claude:
    enabled: true
    api_key: ${ANTHROPIC_API_KEY}  # or anthropic_api_key.txt
    default_model: claude-sonnet-4-20250514
    max_tokens: 4096
  
  chatgpt:
    enabled: true
    api_key: ${OPENAI_API_KEY}
    default_model: gpt-4o
    max_tokens: 4096

  # Optional: route certain query types automatically
  auto_delegate:
    creative_writing: claude
    code_review: claude
    research: chatgpt
```

**Privacy Considerations:**

- **Explicit opt-in**: External LLMs are never called without your explicit request or pre-configured rules
- **Data visibility**: When you delegate to Claude/ChatGPT, that specific content leaves your machine
- **No persistent memory**: External providers don't retain your Alfy context between sessions
- **Local fallback**: If API is unavailable, Alfy offers to handle the request locally

**Cost Awareness:**

Alfy can track your API usage:
- Token count per request
- Estimated cost per conversation
- Monthly usage summary
- Alerts when approaching budget limits

| Connectivity | Requirement |
|--------------|-------------|
| Direct conversation | 🌐 Internet required |
| Delegated queries | 🌐 Internet required |
| Usage tracking | ✅ Offline (logs stored locally) |

---

### Travel & Bookings

Automatically track your travel from confirmation emails.

**Parsed from Emails:**
- Flights (airline, flight number, times, airports, booking reference)
- Hotels (property, check-in/out dates, confirmation)
- Train tickets
- Event tickets

**Automatic Actions:**
- Creates calendar events
- Sets reminders (check-in opens, departure warnings)
- Links to relevant documents

**Example commands:**
- "What flights do I have coming up?"
- "When is my hotel check-in?"
- "Remind me 4 hours before my flight"

| Connectivity | Requirement |
|--------------|-------------|
| Email parsing | 🌐 Internet required (for email sync) |
| Reminders & calendar | ✅ Offline |

---

### Jobs & Work Tracking

Track freelance work, link time to money.

**Capabilities:**
- Detect jobs/projects from email and Telegram
- Create job records with client, rate, deadline
- Link time tracking to specific jobs
- Match invoices to payments received

**Example commands:**
- "Log 3 hours on the Acme project"
- "How many hours have I worked for ClientX this month?"
- "Has the payment for the March invoice arrived?"
- "What's my expected income this month?"

| Connectivity | Requirement |
|--------------|-------------|
| Job detection | 🌐 Internet required (email/Telegram) |
| Time tracking | ✅ Fully offline |
| Payment matching | ✅ Offline (after bank sync) |

---

## Data Storage

All data is stored locally in SQLite:

| Data Type | Storage |
|-----------|---------|
| Commitments (events, flights, meetings) | Local DB |
| Subscriptions | Local DB |
| Financial transactions | Local DB |
| Activity/time logs | Local DB |
| Invoices | Local DB |
| File index | Local DB |
| Parsed emails cache | Local DB |

**Optional exports:**
- Finance statements (CSV)
- Activity reports (CSV)
- Invoice PDFs

---

## Optional: Cloud Sentinel

A minimal always-online companion service for when your laptop is off.

**Purpose:**
- Periodic bank sync
- Real-time alerts via Telegram
- Command queue for mobile requests

**What it does NOT have access to:**
- Local files
- Email content
- Full conversation history

**Deployment options:**
- Personal VPS
- Home server
- Raspberry Pi

---

## Memory Usage

```
Total: ~10-11 GB for Alfy
├── Qwen3-1.7B (Router): ~1.5 GB
├── Qwen3-8B (Agent): ~6 GB
├── Alfy application: ~500 MB - 1 GB
├── SQLite + indexes: ~100-500 MB
└── Context/embeddings cache: ~1 GB

Remaining for Windows + other apps: ~5-6 GB (on 16 GB system)
```

---

## Privacy & Security

- **No cloud processing**: All LLM inference runs locally
- **No telemetry**: Alfy doesn't phone home
- **Secrets isolation**: API keys and credentials are managed by the tools layer, never exposed to the LLM
- **Permission system**: Each tool has explicit permissions; the LLM cannot access tools without authorization
- **Human-in-the-loop**: All sensitive actions (sending emails, financial transactions, purchases) require confirmation

---

## Roadmap

**MVP 1 (Foundation)**
- [ ] Files & Documents
- [ ] System Control
- [ ] Basic Calendar
- [ ] Productivity (focus/breaks)

**MVP 2 (Communications)**
- [ ] Email integration
- [ ] Telegram integration
- [ ] WhatsApp helper

**MVP 3 (Finance)**
- [ ] Open Banking connection
- [ ] Transaction categorization
- [ ] Subscription tracking
- [ ] Invoice management

**MVP 4 (Intelligence)**
- [ ] Travel parsing
- [ ] Job tracking
- [ ] Cross-domain workflows
- [ ] Cloud sentinel

**Future**
- [ ] Kids mode & screen time
- [ ] Smart TV control
- [ ] Voice interface
- [ ] Mobile app

---

## License

[To be determined]

---

## Contributing

[To be determined]

---

Project Structure defined in /PROJECT_STRUCTURE.md in the root folder

*Alfy — Your laptop, your data, your assistant.*