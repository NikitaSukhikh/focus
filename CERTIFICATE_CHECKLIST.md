# Code Signing Certificate Application Checklist

This document provides evidence that your Focus application meets code signing certificate requirements.

## ✅ Requirements Met

### 1. Release Artifacts Correspond to Tagged Commits ✓

**Evidence:**
- Automated workflow: [.github/workflows/release.yml](.github/workflows/release.yml)
- Release guide: [RELEASE.md](RELEASE.md)
- Verification script: [scripts/verify-release.ps1](scripts/verify-release.ps1)

**How it works:**
1. Releases only build from Git tags (e.g., `v1.0.0`)
2. GitHub Actions verifies tag points to correct commit SHA
3. All artifacts include checksums and commit information
4. Build process is deterministic and documented

**Verification process:**
```bash
# Anyone can verify a release
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO
git checkout v1.0.0
git rev-parse HEAD  # Compare with release notes
```

### 2. Source Code Publicly Available ✓

**Evidence:**
- Repository: GitHub (public)
- License: Apache-2.0 (open-source)
- Full source code in repository

### 3. Transparent Build Process ✓

**Evidence:**
- Build configuration: [ui/forge.config.ts](ui/forge.config.ts)
- Package definition: [ui/package.json](ui/package.json)
- GitHub Actions logs (public)
- Reproducible builds from tagged commits

**Build environment:**
- Node.js: 20+
- Python: 3.13
- Electron Forge: 7.4.0
- Platform: Windows (GitHub Actions)

### 4. Security Best Practices ✓

**Evidence:**
- Dependency management with package-lock.json
- No hardcoded secrets in repository
- Environment variables for sensitive data
- Regular dependency updates
- Code review via pull requests (recommended)

## 📋 Application Materials

### For SignPath Foundation

When applying to [SignPath Foundation](https://signpath.org/), provide:

1. **Project Information:**
   - Project name: Focus
   - License: Apache-2.0
   - Repository URL: `https://github.com/YOUR_ORG/YOUR_REPO`
   - Project description: Desktop application for organizing links, files, and workspaces

2. **Build Process Documentation:**
   - Release workflow: `.github/workflows/release.yml`
   - Build instructions: `RELEASE.md`
   - Latest release with checksums

3. **Evidence of Tag-Based Releases:**
   - Point to any existing release in GitHub Releases
   - Show release notes include commit SHA
   - Demonstrate checksums are provided

### For Other Certificate Providers

Most providers require similar information:

1. **Proof of Open Source:**
   - Link to repository
   - Copy of Apache-2.0 license
   - Evidence of community/public use

2. **Build Reproducibility:**
   - Automated build pipeline (GitHub Actions)
   - Tag-based versioning
   - Published checksums

3. **Project Legitimacy:**
   - Active development (commit history)
   - Documentation (README.md)
   - Issue tracker (GitHub Issues)

## 🔧 Implementation Details

### Release Workflow Overview

```
Developer creates tag → GitHub Actions triggered
                     ↓
              Tag verification
                     ↓
           Backend build (Python)
                     ↓
          Frontend build (Electron)
                     ↓
          Generate checksums
                     ↓
         Create GitHub Release
                     ↓
    Artifacts with commit provenance
```

### Key Security Features

1. **Tag Verification:**
   - Workflow checks tag points to expected commit
   - Optional GPG signature verification
   - Fails build if tag is compromised

2. **Build Isolation:**
   - Fresh GitHub Actions runner for each build
   - No cached dependencies between releases
   - Consistent environment across builds

3. **Artifact Integrity:**
   - SHA256 checksums for all binaries
   - Checksums included in release assets
   - Commit SHA recorded in release notes

## 📄 Sample Evidence for Applications

### Example Release Notes

```markdown
## Release v1.0.0

**Commit:** abc123def456789...
**Built:** 2026-01-03 12:34:56 UTC

### Verification
This release was built from tagged commit abc123...

To verify the build:
git verify-tag v1.0.0
git checkout v1.0.0

### Checksums
See checksums.txt in the release assets.
```

### Example Verification Command Output

```powershell
PS> .\scripts\verify-release.ps1 -Tag v1.0.0

[1/5] Checking if tag exists...
✓ Tag v1.0.0 exists

[2/5] Getting tag information...
✓ Tag points to commit: abc123d

[3/5] Checking tag signature...
✓ GPG signature valid

[4/5] Commit Details
─────────────────────────────────────────────────────
  Author:    Developer Name <dev@example.com>
  Date:      2026-01-03
  Commit:    abc123def456...
  Message:   Release v1.0.0
─────────────────────────────────────────────────────

[5/5] Verifying package.json version...
✓ package.json version (1.0.0) matches tag
```

## 🎯 Next Steps

1. **Create your first release:**
   ```powershell
   .\scripts\create-release.ps1 -Version 1.0.0 -Sign
   ```

2. **Verify the release was successful:**
   - Check GitHub Actions completed
   - Verify release appears in GitHub Releases
   - Download and verify checksums

3. **Apply to certificate provider:**
   - Choose provider (SignPath recommended)
   - Fill application with evidence from this document
   - Provide links to your repository and releases

4. **Configure certificates:**
   - Once approved, add secrets to GitHub
   - Future releases will be automatically signed
   - Distribute signed binaries to users

## 📚 References

- SignPath Foundation: https://signpath.org/
- GitHub Actions Documentation: https://docs.github.com/en/actions
- Code Signing Best Practices: https://docs.microsoft.com/en-us/windows-hardware/drivers/install/code-signing-best-practices

## 🔒 Continuous Compliance

To maintain certificate validity:

1. **Keep following tag-based releases**
   - Never bypass the release workflow
   - Always create releases from tags
   - Include commit SHA in release notes

2. **Maintain public repository**
   - Keep source code public
   - Accept community contributions
   - Respond to security issues

3. **Regular updates**
   - Keep dependencies updated
   - Address security vulnerabilities
   - Maintain active development

4. **Transparency**
   - Document all changes in commits
   - Use semantic versioning
   - Maintain changelog (optional but recommended)
