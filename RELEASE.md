# Release Guide

This guide ensures release artifacts correspond to tagged commits.

## Prerequisites

1. **Clean Git State**: Ensure your working directory is clean
2. **Updated Version**: Update version in `ui/package.json`
3. **GitHub Repository**: Push access to the repository
4. **Optional**: GPG key for signing tags

## Creating a Release

### 1. Prepare the Release

```bash
# Ensure you're on main branch with latest changes
git checkout main
git pull origin main

# Verify clean state
git status

# Update version in ui/package.json if not already done
```

### 2. Create a Signed Tag

**With GPG Signing (Recommended):**
```bash
# Create signed tag
git tag -s v1.0.0 -m "Release v1.0.0"

# Verify the signature
git tag -v v1.0.0
```

**Without GPG Signing:**
```bash
# Create annotated tag
git tag -a v1.0.0 -m "Release v1.0.0"
```

### 3. Push the Tag

```bash
# Push the tag to GitHub (this triggers the release workflow)
git push origin v1.0.0
```

### 4. Monitor the Build

1. Go to GitHub Actions: `https://github.com/YOUR_ORG/YOUR_REPO/actions`
2. Watch the "Release Build" workflow
3. The workflow will:
   - ✓ Verify the tag points to the correct commit
   - ✓ Build the backend binary
   - ✓ Build the Electron app
   - ✓ Generate SHA256 checksums
   - ✓ Create a GitHub release with artifacts

## Verification for Certificate Authorities

Certificate authorities can verify your release artifacts correspond to tagged commits:

### 1. Clone Repository and Verify Tag
```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO
git tag -v v1.0.0  # If GPG signed
git checkout v1.0.0
```

### 2. Check Commit SHA
```bash
git rev-parse HEAD
# Should match the commit SHA in the release notes
```

### 3. Verify Build is Reproducible
The GitHub Actions workflow ensures:
- Builds only occur from tagged commits
- The exact commit SHA is recorded in release notes
- Checksums are generated for all artifacts
- Build environment is documented (Node version, Python version, etc.)

## Setting Up GPG Signing (Optional but Recommended)

### 1. Generate GPG Key
```bash
gpg --full-generate-key
# Choose: RSA and RSA, 4096 bits, expiration as needed
# Use your GitHub email address
```

### 2. List Keys
```bash
gpg --list-secret-keys --keyid-format=long
```

### 3. Configure Git
```bash
# Use the key ID from the previous command
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

### 4. Add GPG Key to GitHub
```bash
# Export your public key
gpg --armor --export YOUR_KEY_ID

# Go to GitHub Settings > SSH and GPG keys > New GPG key
# Paste the exported key
```

## Release Workflow Details

The `.github/workflows/release.yml` ensures:

1. **Tag Verification**: Confirms the tag points to the correct commit
2. **Commit Pinning**: All builds use the exact tagged commit
3. **Artifact Provenance**: SHA256 checksums prove artifact integrity
4. **Build Metadata**: Records Node/Python versions and build timestamp
5. **Immutable Records**: GitHub releases provide permanent record of commit ↔ artifact mapping

## Version Numbering

Use Semantic Versioning (semver):
- `v1.0.0` - Major release
- `v1.1.0` - Minor release (new features, backward compatible)
- `v1.1.1` - Patch release (bug fixes)

## Code Signing Certificates

For Windows code signing:

### Free Certificates
Many certificate authorities offer free code signing certificates if you can prove:
1. ✓ Release artifacts correspond to tagged commits (this workflow ensures this)
2. ✓ Your repository is public and source code is available
3. ✓ You follow secure development practices

### Popular Providers
- **SignPath Foundation**: Free for open-source projects
- **Let's Encrypt** (future): Working on code signing support
- **Platform-specific**: Windows Store, Mac App Store

### Adding Code Signing
When you obtain a certificate, add secrets to GitHub:
- `WINDOWS_PFX_PATH`: Path to certificate file
- `WINDOWS_PFX_PASSWORD`: Certificate password
- `WINDOWS_SIGN_PARAMS`: Additional signing parameters

## Troubleshooting

### Tag Verification Fails
```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0

# Recreate tag on correct commit
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### Build Fails
Check GitHub Actions logs for specific errors. Common issues:
- Missing dependencies in package.json
- Backend binary not found (ensure PyInstaller builds successfully)
- Node/Python version mismatches

## Example: Complete Release Process

```bash
# 1. Update version
cd ui
# Edit package.json, change version to "1.0.0"
git add package.json
git commit -m "Bump version to 1.0.0"
git push origin main

# 2. Create and push tag
git tag -s v1.0.0 -m "Release v1.0.0: Initial stable release"
git push origin v1.0.0

# 3. Wait for GitHub Actions to complete

# 4. Verify release
# Go to GitHub Releases page and verify:
# - Artifacts are present
# - Checksums.txt is included
# - Commit SHA matches your local commit
```
