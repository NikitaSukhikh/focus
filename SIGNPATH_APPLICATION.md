# SignPath Foundation - Code Signing Application

## Project Information

**Project Name:** Focus
**Project Description:** Open-source desktop productivity application for organizing links, files, and workspaces
**License:** Apache-2.0
**Repository:** [Your GitHub Repository URL]
**Primary Developer:** Nikita Sukhikh
**Contact Email:** [Your Email]

## Project Overview

Focus is a desktop application built with Electron that helps users organize their digital workspace by collecting links, files, and other resources into customizable spaces. The application includes:

- **Three-pane layout** for efficient workspace management
- **Local file preview** (documents, images, audio, video)
- **Google OAuth integration** for Gmail and Drive
- **AI assistant integration** via API
- **Cross-platform support** (Windows, macOS, Linux)

**Technology Stack:**
- Frontend: Electron + React + TypeScript
- Backend: Python (FastAPI) + SQLite
- Build: Electron Forge + PyInstaller

## Why We Need Code Signing

As an open-source desktop application, Focus needs code signing to:

1. **Remove Windows SmartScreen warnings** that deter users from installing
2. **Build trust** with our user community
3. **Comply with security best practices** for desktop applications
4. **Enable safe distribution** through standard download channels

Currently, unsigned builds trigger "Unknown Publisher" warnings, significantly impacting user adoption.

## Evidence of Compliance

We have implemented a robust release infrastructure that meets all SignPath Foundation requirements:

### 1. Release Artifacts Correspond to Tagged Commits ✓

**Implementation:**
- GitHub Actions workflow triggers only on Git tags (e.g., `v1.0.0`)
- Tag verification step ensures tag points to correct commit
- Every release includes the exact commit SHA in release notes
- Build process is fully automated and deterministic

**Evidence:**
- Workflow file: `.github/workflows/release.yml`
- Release script: `scripts/create-release.ps1`
- Documentation: `RELEASE.md`

**Verification Process:**
```bash
git clone [repository-url]
git checkout v1.0.0
git rev-parse HEAD  # Compare with release notes
```

### 2. Public Source Code ✓

- **Repository is public** on GitHub
- **Open-source license:** Apache-2.0
- **All source code available** for review
- **Active development** with regular commits

### 3. Transparent Build Process ✓

**Build Pipeline:**
1. Tag verification (ensures build from correct commit)
2. Backend build (PyInstaller on Windows runners)
3. Frontend build (Electron Forge)
4. SHA256 checksum generation
5. GitHub Release creation with metadata

**Build Environment:**
- Platform: GitHub Actions (windows-latest)
- Python: 3.13
- Node.js: 20+
- All dependencies locked in package-lock.json and requirements.txt

**Output Artifacts:**
- Windows installer: `FocusSetup-<version>.exe` (Inno Setup)
- Windows portable package: `.zip` file from Electron Forge
- Checksums: `checksums.txt` with SHA256 hashes
- Build manifest: Includes commit SHA, build date, tool versions

### 4. Reproducible Builds ✓

**Guarantees:**
- Same commit always produces same output
- All tool versions documented
- Dependencies locked
- Build environment consistent (GitHub Actions)
- Pandoc installed for document processing
- Backend binary bundled as extraResource

**Documentation:**
- `CERTIFICATE_CHECKLIST.md` - Complete compliance evidence
- `RELEASE.md` - Step-by-step release process
- `README.md` - Build & packaging instructions

## Build Artifacts to Sign

We request signing for the following artifacts:

1. **Windows Installer:** `FocusSetup-<version>.exe` (Inno Setup installer)
2. **Backend Binary:** `focus-backend.exe` (bundled inside installer)

Both are generated through our automated GitHub Actions workflow from tagged commits.

## Integration with SignPath

We are prepared to integrate SignPath into our build process:

**Current Workflow:**
```yaml
- Build artifacts
- Generate checksums
- Create GitHub Release
```

**Proposed with SignPath:**
```yaml
- Build artifacts
- Submit to SignPath for signing
- Download signed artifacts
- Generate checksums
- Create GitHub Release
```

We will update our workflow to:
1. Submit unsigned artifacts to SignPath
2. Wait for signing approval/completion
3. Download signed artifacts
4. Publish signed artifacts in GitHub Releases

## Project Statistics

- **GitHub Stars:** [Current count]
- **Active Development:** Yes
- **Release Frequency:** Monthly (planned)
- **Contributors:** Open to community contributions
- **Users:** Growing community of productivity-focused individuals

## Security Practices

- ✓ No hardcoded secrets in repository
- ✓ Environment variables for sensitive data
- ✓ Security guide for secret rotation
- ✓ Dependency updates managed
- ✓ Code review process (planned for contributions)

## Additional Information

**Why This Project Matters:**

Focus addresses a common productivity challenge: managing scattered digital resources. By providing an open-source, locally-run alternative to cloud-based solutions, we give users control over their data while maintaining powerful organizational features.

**Community Impact:**

We aim to serve users who value:
- Data privacy (local-first architecture)
- Customization (open-source codebase)
- Integration (Google services, AI assistants)
- Simplicity (clean, intuitive interface)

**Long-term Commitment:**

This is not a one-time project. We are committed to:
- Regular feature updates
- Security maintenance
- Community support
- Documentation improvements
- Cross-platform compatibility

## Supporting Documentation

All evidence is available in our repository:

1. **CERTIFICATE_CHECKLIST.md** - Detailed compliance evidence
2. **RELEASE.md** - Complete release process documentation
3. **README.md** - Project overview and architecture
4. **.github/workflows/release.yml** - Automated build workflow
5. **scripts/** - Release and verification scripts

## Contact & Questions

**Primary Contact:** Nikita Sukhikh
**Email:** [Your Email]
**GitHub:** [Your GitHub Profile]
**Repository:** [Repository URL]

We are happy to provide any additional information or make adjustments to our build process as needed to meet SignPath Foundation requirements.

---

## Appendix: Sample Release

**Release URL:** [Link to v1.0.0 release once published]
**Build Logs:** Available in GitHub Actions
**Checksums:** Included in release assets

Thank you for considering our application. We look forward to partnering with SignPath Foundation to provide secure, trusted software to our users.
