# Focus (Desktop) — Developer README

Focus is a desktop application that lets users collect “objects” (links and files) onto customizable workspaces called **Spaces** for fast access. The UI is a three-pane layout:

- **Left sidebar**: Spaces list (usually folded by default).
- **Central pane**: The active Space canvas containing object tiles (thumbnails for files/links, or first lines for plain text).
- **Right sidebar**: A wide preview/inspector panel showing details and preview of the currently focused object (single click).

Focus also supports storing **Gmail** and **Google Drive** entry points as objects. Users connect via **Google OAuth** through a dedicated “Connect Google” flow.

Tech stack:
- **Frontend/UI**: Tauri + React + TypeScript
- **Backend**: Python (venv) + Uvicorn (FastAPI assumed)

---

## Contents

- [Key Concepts](#key-concepts)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Google OAuth (Gmail + Drive)](#google-oauth-gmail--drive)
- [Development Workflow](#development-workflow)
- [Build & Packaging](#build--packaging)
- [Quality: Linting, Formatting, Tests](#quality-linting-formatting-tests)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Contributing](#contributing)

---

## Key Concepts

### Space
An **Space** is a user-created workspace. Multiple Spaces exist and are listed in the left sidebar. Selecting an Space updates the central pane.

### Object
An **Object** is a unit stored on an Space (displayed as a tile/card):

- **Link**: stored with title, optional favicon/thumbnail, URL, optional tags.
- **File**: stored as a reference to a local file path (and optional cached thumbnail/preview).
- **Plain text file preview**: show first lines as the tile preview.
- **Service object (Google)**: Gmail/Drive entry points can appear as objects, but require OAuth to be usable.

### Focus & Preview
A single click focuses an object on the Space canvas (right to the central pane). Canvas shows a larger preview and metadata (file details, link preview, Drive/Gmail details if connected).



The far right sidebar is a conversation with AI assistant, integrated via API. 

---

## Architecture

Focus runs as a desktop shell (Tauri) hosting a React UI. A local Python backend provides:

- persistence (Spaces, object metadata)
- file preview / thumbnail generation (optional, depending on implementation)
- Google integrations (Drive and Gmail APIs)
- any heavy processing best kept out of the UI thread
- AI assistant API implementation

### Suggested communication model
- UI ↔ backend over `http://127.0.0.1:<PORT>` using JSON APIs.
- The backend is started by Tauri during dev/runtime (or run separately for local development).

> If you use a different model (Tauri `invoke` commands / IPC), keep this README’s “API base URL” approach as a reference and adjust accordingly.

---

## Repository Structure

Recommended layout:

focus/ ## Root folder. We are already inside it.
  README.md
  .gitignore
  LICENSE

  ui/
    README.md
    package.json
    package-lock.json            # or pnpm-lock.yaml / yarn.lock
    tsconfig.json
    tsconfig.node.json           # we use Vite
    vite.config.ts               # also for Vite (recommended for Tauri)
    index.html                   # also for Vite
    public/
      icons/
      images/

    src/
      main.tsx
      app/
        App.tsx
        routes/                  # if you use routing
          index.tsx

      assets/
        styles/
          globals.css

      components/
        layout/
          LeftSidebar/
            LeftSidebar.tsx
            LeftSidebar.styles.ts
            index.ts
          CenterPane/
            CenterPane.tsx
            CenterPane.styles.ts
            index.ts
          Canvas/
            Canvas.tsx
            Canvas.styles.ts
            index.ts
          RightSidebar/
            RightSidebar.tsx
            RightSidebar.styles.ts
            index.ts
          TopBar/
            TopBar.tsx
            TopBar.styles.ts
            index.ts

        common/
          Button/
            Button.tsx
            index.ts
          Icon/
            Icon.tsx
            index.ts
          Spinner/
            Spinner.tsx
            index.ts

      features/
        spaces/
          api/
            spacesApi.ts         # fetch spaces, create, rename, reorder, delete
          components/
            SpaceList/
              SpaceList.tsx
              index.ts
            SpaceItem/
              SpaceItem.tsx
              index.ts
          hooks/
            useSpaces.ts
          models/
            space.ts
          state/
            spacesSlice.ts       # if Redux/Zustand/Context-based state
          index.ts

        objects/
          api/
            objectsApi.ts         # CRUD objects on an space
          components/
            ObjectGrid/
              ObjectGrid.tsx
              index.ts
            ObjectTile/
              ObjectTile.tsx
              index.ts
          hooks/
            useObjects.ts
          models/
            object.ts
          state/
            objectsSlice.ts
          index.ts

        preview/
          api/
            previewApi.ts         # get preview payload for focused object
          components/
            PreviewPanel/
              PreviewPanel.tsx
              index.ts
            PreviewHeader/
              PreviewHeader.tsx
              index.ts
            PreviewBody/
              PreviewBody.tsx
              index.ts
          models/
            preview.ts
          state/
            previewSlice.ts
          index.ts

        google/
          api/
            googleApi.ts          # connect/disconnect/status, list drive/gmail objects
          components/
            GoogleConnectButton/
              GoogleConnectButton.tsx
              index.ts
            GoogleStatusBadge/
              GoogleStatusBadge.tsx
              index.ts
          models/
            google.ts
          state/
            googleSlice.ts
          index.ts

        settings/
          components/
            SettingsDialog/
              SettingsDialog.tsx
              index.ts
          index.ts

      services/
        http/
          client.ts               # fetch wrapper, base URL, interceptors
          endpoints.ts
        tauri/
          window.ts               # Tauri window helpers (optional)
          fs.ts                   # if using Tauri FS APIs (optional)

      state/
        store.ts                  # Redux store / Zustand root / Context provider
        index.ts

      types/
        common.ts

      utils/
        debounce.ts
        id.ts
        time.ts

    src-tauri/
      tauri.conf.json
      Cargo.toml
      build.rs
      icons/
      src/
        main.rs                   # bootstraps Tauri + backend process (if applicable)
        commands.rs               # optional Tauri commands
        backend.rs                # spawn/manage python backend (optional)

    .env.example                  # UI env (VITE_API_BASE_URL, etc.)
    .eslintrc.cjs
    .prettierrc
    postcss.config.js
    tailwind.config.js            # if used

  backend/
    README.md
    pyproject.toml                # recommended
    requirements.txt              # optional fallback
    .env.example
    app/
      __init__.py
      main.py                     # FastAPI app + router include
      core/
        config.py                 # env loading, settings
        logging.py
        security.py               # token encryption helpers, keychain adapters (optional)

      api/
        __init__.py
        routes/
          health.py
          spaces.py
          objects.py
          preview.py
          google_oauth.py
        deps.py                   # dependencies (db, auth, etc.)

      assistant/ # AI assistant via API (Claude/ChatGPT). I pasted here my previously written Alfy assistant 
                   (all folders and files as they are under alfy/ directory). It has both ui and backend and supposed to worked on its own in the first place, but here shall be changed drastically to be implemented correctly and smartly into this project(especially all UI functionality is to be changed, incorporated into main UI logic (ui/) as the right side-bar component, not the full window. then alfy/ui/ shall be removed completely and safely).  



      models/
        __init__.py
        space.py                 # Pydantic models
        object.py
        preview.py
        google.py

      services/
        __init__.py
        spaces_service.py
        objects_service.py
        preview_service.py
        thumbnails/
          __init__.py
          text_preview.py
          file_thumbnail.py
        google/
          __init__.py
          oauth_flow.py
          token_store.py
          drive_client.py
          gmail_client.py

      storage/
        __init__.py
        db.py                     # SQLite connection / session
        migrations/               # if using Alembic
        repositories/
          spaces_repo.py
          objects_repo.py
          google_repo.py          # if persisting connection state
        local_files/
          cache/                  # thumbnails, extracted previews
          data/                   # app db, user data (configurable)

      tests/
        test_health.py
        test_spaces.py
        test_objects.py

    scripts/
      dev_run.sh                  # optional: start uvicorn with env
      dev_run.ps1

  scripts/
    dev.sh                        # optional: start backend + ui dev
    dev.ps1
