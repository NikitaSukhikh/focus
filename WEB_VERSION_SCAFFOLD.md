# Web Version Scaffolding

## What stays the same
- Entire FastAPI backend (no changes)
- All React UI components
- All Zustand stores, hooks, API clients

---

## What changes

### 1. Build Target (`ui/`)

New scripts in `package.json`:
```
dev:web     → vite dev (no Electron Forge)
build:web   → vite build (outputs static dist/)
```

New `vite.web.config.ts` — strips Electron-specific aliases, targets browser.

### 2. Platform Abstraction (already has `platform.ts`)

`desktopAPI` (IPC bridge) needs web adapters. Create `ui/src/platform/webAdapter.ts`:

| IPC call | Web replacement |
|---|---|
| `desktop:open-dialog` | `<input type="file">` |
| `desktop:open-external` | `window.open(url, '_blank')` |
| `desktop:open-file-path` | no-op / download |
| `desktop:write-file-to-clipboard` | `navigator.clipboard` |
| `desktop:open-auth-window` | redirect or popup |
| `window:minimize/maximize/close` | remove (browser handles) |
| `desktop:arrange-windows-side-by-side` | remove |

The existing `platform.ts` becomes the switch: `isElectron() ? desktopAdapter : webAdapter`.

### 3. Auth Flow

Replace `desktop:open-auth-window` (native Electron window) with:
- OAuth redirect flow **or** `window.open` popup + `postMessage`
- Session via `httpOnly` cookies or JWT in `localStorage`

Backend: add session/token endpoint if not already present.

### 4. Backend: CORS + Serving

Add env-based CORS origins in `backend/app/core/config.py`:
```python
ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "https://yourdomain.com"]
```

Two deployment options:
- **Option A**: Nginx reverse proxy (serves static `dist/` + proxies `/api/*` to uvicorn)
- **Option B**: FastAPI serves static files via `StaticFiles` mount

### 5. New Files to Scaffold

```
ui/
├── vite.web.config.ts           # web-only vite config
├── src/
│   └── platform/
│       ├── index.ts             # platform switch (already platform.ts, refactor)
│       ├── desktopAdapter.ts    # current IPC calls
│       └── webAdapter.ts        # browser API equivalents

deploy/
├── nginx.conf                   # reverse proxy config
├── Dockerfile.backend           # FastAPI container
├── Dockerfile.frontend          # Nginx + static build
└── docker-compose.yml           # orchestration
```

### 6. Backend: No Auto-Spawn

The Electron main process currently spawns the backend binary. For web, backend runs independently (process manager, Docker, systemd). No code change needed — just deployment.

---

## What gets dropped (Electron-only)
- `src-electron/` entire directory
- Splash screen
- `forge.config.ts`
- `vite.main.config.ts`, `vite.preload.config.ts`
- Window controls (minimize/maximize/close)
- `desktop:arrange-windows-side-by-side`

---

## Scope summary

| Layer | Effort |
|---|---|
| Backend | Near zero — CORS config only |
| React UI | Minimal — platform adapter swap |
| Auth flow | Medium — redirect/popup OAuth |
| DevOps | New — Docker/Nginx configs |
| Electron removal | Straightforward — strip `src-electron/` |
