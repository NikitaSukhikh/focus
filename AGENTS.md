# AGENTS.md — Files Agent

## Project Overview
(to do)
### Key Capabilities
(to do)


### Tech Stack
Backend:
- **Python 3.12+**
- **uv** — package and project manager (replaces pip/venv)
- **pytest** — testing

Frontend:
- Typescript + React/Node + Electron


## Comment rules
- Always comment module at the top by default. 
- Clarify ‘Why’ Over ‘What’
- Keep Comments Relevant and Updated
- Avoid redundant comments (do not use comments for self-explanatory code) 
---

## Build and Test Commands

All commands assume **Windows** with **VS Code terminal** (PowerShell).

### Prerequisites

- Python 3.12+
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) installed and on PATH (for scanned PDF support)
- Poppler for Windows (required by `pdf2image`) — add `bin/` to PATH

### Initial Setup

```powershell
# Install uv (if not already installed)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Clone and enter project
cd files-agent

# Create virtual environment and install all dependencies
uv venv
uv sync

# Activate the virtual environment
.venv\Scripts\activate

# Copy environment template and fill in API keys
cp .env.example .env
```

### Adding Dependencies

```powershell
# Runtime dependency
uv add polars openpyxl pdfplumber pymupdf pdf2image pytesseract typer langgraph

# Dev dependency
uv add --dev pytest pytest-cov pytest-asyncio ruff mypy respx
```

### Running the Agent

```powershell
# Interactive CLI mode
uv run python -m files_agent chat



### Running Tests

```powershell
# Run all tests
uv run pytest


### Linting and Formatting

```powershell
# Lint
uv run ruff check src/

# Lint and auto-fix
uv run ruff check src/ --fix

# Format
uv run ruff format src/

# Type checking
uv run mypy src/
```

---

## Project Structure

(to do)
## Code Style Guidelines

### General Rules

- **Python 3.12+** features encouraged (`type X = ...` aliases, `match`, `X | Y` unions)
- **Ruff** for all linting and formatting — no Black, isort, or flake8
- Max line length: **120 characters**
- **Type hints** on all function signatures including return types
- `from __future__ import annotations` at the top of every module

### Naming Conventions

- `snake_case` — functions, methods, variables, modules
- `PascalCase` — classes
- `UPPER_SNAKE_CASE` — constants and environment variable names
- Prefix private internals with `_`
- Tools exposed to the agent use descriptive verb-noun names: `read_rows`, `update_column`, `extract_pdf_tables`

### Imports

- Standard library → third-party → local, separated by blank lines
- Absolute imports from `files_agent` package, no relative imports
- Ruff handles import sorting


### Docstrings

- Google-style docstrings on all public functions, classes, and tools
- Tool functions must include a `Tool Description:` section in their docstring — this is what the agent sees
- Include `Args`, `Returns`, `Raises` sections

### Error Handling

- Use `logging` module exclusively — never `print()`

### Ruff Configuration (pyproject.toml)

```toml
[tool.ruff]
line-length = 120
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "SIM", "TCH", "RUF", "ASYNC"]

[tool.ruff.format]
quote-style = "double"
```

---

## Security Considerations

### API Keys and Secrets

- LLM API keys, database credentials, and any tokens live in `.env` — **never in code or config files**
- `.env` is in `.gitignore` — only `.env.example` with placeholder values is committed
- Use `pydantic-settings` or `python-dotenv` for env loading with validation
- Fail loudly on startup if required keys are missing — don't fall back to empty strings

### Dependency Security

- All versions pinned via `uv.lock`
- Audit periodically: `uv pip audit` or integrate with Dependabot
- Tesseract and Poppler are system-level dependencies — pin versions in documentation and CI

### .gitignore Essentials

```gitignore
.env
