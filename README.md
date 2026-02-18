# Focus (Desktop) — Developer README

Focus is a desktop application that lets users collect “objects” (links and files, more than 320 file formats in total) onto customizable workspaces called **Spaces** for fast access. The UI is a three-pane layout:


If you're looking for an end-user guide, see `USER_GUIDE.md`.

- **Left sidebar**: Spaces list (usually folded by default).
- **Central pane**: The active Space canvas containing tiles (thumbnails for files/links, or first lines for plain text).
- **Right sidebar**: A wide preview/inspector panel showing details and preview of the currently focused object (single click).

Focus also supports storing **Gmail** and **Google Drive** entry points as objects. Users connect via **Google OAuth** through a dedicated “Connect Google” flow.

Tech stack:
- **Frontend/UI**: Electron + React + TypeScript
- **Backend**: Python (uv) + Uvicorn (FastAPI assumed)

## License
Apache-2.0

### Attribution
Application icon: [Target icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/target)

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
- [Releases & Code Signing](#releases--code-signing)
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
- **Web Article**: embedded url with wider view and scrolling for quick access and readability
- **Plain text**: text notes that user can type anywhere on the space.


### Focus & Preview
A single click focuses an object on the Space canvas (right to the central pane). Canvas shows a larger preview and metadata (file details, link preview, Drive/Gmail details if connected).

#### Supported File Types for Preview
See full list (320+ file types) in [FILES_SUPPORTED.md]
Few examples: 
**Documents:**
- Word: `.docx`, `.doc`, `.odt`
- Excel: `.xlsx`, `.xls`, `.xlsm`, `.ods`
- PDF: `.pdf`
- HTML: `.html`, `.htm` (rendered as interactive webpages)

**Ebooks:**
- EPUB: `.epub` (with table of contents navigation, images, and metadata extraction)
- FictionBook: `.fb2` (with metadata support)
- Mobipocket: `.mobi`, `.azw`, `.azw3` (limited preview support)
- Comic Books: `.cbz`, `.cbr`
- Palm Database: `.pdb`
- DjVu: `.djvu`

Features:
- Interactive reading experience with smooth scrolling
- Table of contents navigation
- Metadata display (title, author)
- Image support (cover images, illustrations)
- Tile displays book title and author instead of filename

**Media:**
- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.webp`, `.svg`, `.tiff`, `.ico`, `.heic`, `.heif`
- Audio: `.mp3`, `.wav`, `.flac`, `.ogg`, `.m4a`, `.aac`, `.wma`, `.opus`, `.aiff`, `.alac`, `.ape`, `.wv`, `.mka`
- Video: YouTube and Vimeo embeds

**Text/Code:**
- `.txt`, `.md`, `.json`, `.xml`, `.css`, `.js`, `.ts`, `.tsx`, `.jsx`, `.py`, `.java`, `.c`, `.cpp`, `.h`, `.cs`, `.go`, `.rs`, `.php`, `.rb`, `.swift`, `.kt`, `.yaml`, `.yml`, `.toml`, `.ini`, `.cfg`, `.conf`, `.sh`, `.bash`, `.log`



The far right sidebar is a conversation with AI assistant, integrated via API. 

---

## Architecture

Focus runs as a desktop shell (Electron) hosting a React UI. A local Python backend provides:

- persistence (Spaces, object metadata)
- file preview / thumbnail generation (optional, depending on implementation)
- Google integrations (Drive and Gmail APIs)
- any heavy processing best kept out of the UI thread
- AI assistant API implementation

### Suggested communication model
- UI ↔ backend over `http://127.0.0.1:<PORT>` using JSON APIs.
- The backend is started by Electron during dev/runtime (or run separately for local development).

---

## Repository Structure

Current layout (abridged):

```text
focus/
|-- backend/
|   |-- app/
|   |   |-- api/routes/                # backend HTTP API endpoints
|   |   |-- core/                      # config, logging, security
|   |   |-- models/                    # domain models
|   |   |-- services/                  # object/space/preview/document services
|   |   |-- storage/                   # DB access, migrations, repositories
|   |   |-- tests/                     # backend tests
|   |   |-- utils/
|   |   `-- assistant/                 # embedded assistant backend project
|   |       `-- assist-backend/assist-app/
|   |-- alembic/                       # alembic migration runner
|   |-- scripts/                       # backend dev scripts
|   |-- pyproject.toml
|   |-- uv.lock
|   `-- start.bat
|-- ui/
|   |-- src/
|   |   |-- app/routes/
|   |   |-- api/
|   |   |-- components/layout/
|   |   |   |-- assistantpane/
|   |   |   |-- centerpane/
|   |   |   |-- fullwindowpreview/
|   |   |   |-- leftsidebar/
|   |   |   |-- previewpane/
|   |   |   `-- topbar/
|   |   |-- features/                  # spaces, objects, preview, assistant, etc.
|   |   |-- hooks/
|   |   |-- i18n/
|   |   |-- stores/
|   |   |-- styles/
|   |   |-- types/
|   |   `-- utils/
|   |-- src-electron/                  # electron main + preload
|   |-- public/
|   |-- scripts/
|   |-- package.json
|   |-- forge.config.ts
|   |-- vite.config.ts
|   |-- vite.main.config.ts
|   `-- vite.preload.config.ts
|-- installer/                         # Inno Setup scripts and installer metadata
|-- scripts/                           # repo-level dev/release helpers
|-- tests/                             # repo-level integration tests
|-- .github/workflows/                 # CI/CD workflows
|-- release/                           # local release build artifacts
|-- storage/                           # app data/cache used at runtime
|-- README.md
|-- FILES_SUPPORTED.md
|-- RELEASE.md
`-- USER_GUIDE.md
```

Notes:
- `ui/node_modules`, `ui/dist`, `ui/out`, `ui/.vite`, `backend/build`, and `backend/dist` are generated artifacts.
- Runtime caches are under `storage/` and `backend/storage/local_files/cache/`.
- The assistant project under `backend/app/assistant/assist-backend/` contains its own docs, tests, and tooling.

---

## Releases & Code Signing

Focus uses a verified release process ensuring **release artifacts correspond to tagged commits**.

### Creating a Release

Use the provided helper script:

```powershell
# Create a release (interactive)
.\scripts\create-release.ps1 -Version 1.0.0

# Create a signed release (requires GPG)
.\scripts\create-release.ps1 -Version 1.0.0 -Sign

# Dry run (preview without making changes)
.\scripts\create-release.ps1 -Version 1.0.0 -DryRun
```

Or manually:
```bash
# Update version in ui/package.json
# Commit the version change
git add ui/package.json
git commit -m "Bump version to 1.0.0"

# Create and push tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main
git push origin v1.0.0
```

### Automated Build Process

When you push a tag (e.g., `v1.0.0`), GitHub Actions automatically:
1. ✓ Verifies the tag points to the correct commit
2. ✓ Builds the backend binary (PyInstaller)
3. ✓ Builds the Electron app
4. ✓ Generates SHA256 checksums for all artifacts
5. ✓ Creates a GitHub Release with build metadata
6. ✓ Records the exact commit SHA in release notes

### Verifying Releases

Certificate authorities or users can verify artifacts:

```powershell
# Verify a release tag and commit
.\scripts\verify-release.ps1 -Tag v1.0.0

# Verify artifact integrity
.\scripts\verify-release.ps1 -Tag v1.0.0 -ArtifactPath path\to\focus.exe
```

### Code Signing Certificates

For obtaining **free code signing certificates**:

1. **Your repository now meets the requirements**:
   - ✓ Release artifacts correspond to tagged commits
   - ✓ Build process is transparent and reproducible
   - ✓ Checksums verify artifact integrity
   - ✓ GitHub Actions provides immutable build logs

2. **Apply to certificate providers**:
   - [SignPath Foundation](https://signpath.org/) - Free for open-source
   - Platform stores (Windows Store, Mac App Store)

3. **Add certificates to GitHub Secrets**:
   ```
   WINDOWS_PFX_PATH - Certificate file path
   WINDOWS_PFX_PASSWORD - Certificate password
   WINDOWS_SIGN_PARAMS - Additional signing parameters
   ```

The workflow in [.github/workflows/release.yml](.github/workflows/release.yml) will automatically sign builds when certificates are configured.

For detailed instructions, see [RELEASE.md](RELEASE.md).
