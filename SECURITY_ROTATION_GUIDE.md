# 🔒 Security Credential Rotation Guide

## ⚠️ CRITICAL: Exposed Credentials

The following credentials were exposed in Git history and **MUST BE REVOKED IMMEDIATELY**:

### 1. Google OAuth 2.0 Client Credentials

**Location:** `backend/.env`

**Exposed in commits:**
- `205c2c0f` (committed Dec 23, 2025)
- Multiple log files in `backend/app/assistant/backend/logs/`

**Exposed Values:**
- Client ID: `29879173672-dlbfg0ea9cvmr69afembebpi1reqbg55.apps.googleusercontent.com`
- Client Secret: `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`
- Multiple OAuth access tokens and refresh tokens in log files
- Anthropic API Key: `sk-ant-api03-eg7ynmRtSx0JF8ShcB9f...` (in commit 205c2c0f)

**Action Required:**

1. **Revoke the OAuth Client:**
   - Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
   - Find OAuth 2.0 Client ID: `29879173672-dlbfg0ea9cvmr69afembebpi1reqbg55.apps.googleusercontent.com`
   - Delete this client completely

2. **Revoke the Anthropic API Key:**
   - Go to [Anthropic Console - API Keys](https://console.anthropic.com/settings/keys)
   - Find and delete the API key starting with `sk-ant-api03-eg7yn...`
   - Create a new API key

3. **Create New OAuth Credentials:**
   - In Google Cloud Console, create a new OAuth 2.0 Client ID
   - Application type: **Desktop app**
   - Copy the new Client ID and Client Secret

4. **Update `backend/.env` and `backend/app/assistant/.env`:**
   ```bash
   # backend/.env
   GOOGLE_CLIENT_ID=<new_client_id>
   GOOGLE_CLIENT_SECRET=<new_client_secret>

   # backend/app/assistant/.env
   ANTHROPIC_API_KEY=<new_anthropic_key>
   ```

5. **Re-authenticate:**
   - Delete existing tokens: `rm -rf backend/app/assistant/backend/data/gdrive_tokens/`
   - Restart the application
   - Complete OAuth flow to generate new tokens

### 2. Verify Token Revocation

All OAuth refresh tokens and access tokens in the logs should automatically become invalid once you delete the OAuth client. To verify:

1. Check [Google Account Security - Third-party apps](https://myaccount.google.com/permissions)
2. Revoke access for any entries related to the old Client ID
3. Monitor for any suspicious activity

---

## ✅ Completed Security Actions

### Git History Cleanup

- ✅ Removed all log files from Git history using `git filter-branch`
- ✅ Created `backend/.gitignore` to prevent future commits of sensitive data
- ✅ Root `.gitignore` already configured with `logs/` and `*.log`

### Files Removed from History:

- `backend/app/assistant/backend/logs/` (84 log files)
- `backend/logs/` (2 log files)
- `logs/` (1 log file)

**Total secrets removed:**
- 11+ OAuth access tokens (all expired/invalid)
- 6+ OAuth refresh tokens
- 3+ Base64 Basic Authentication headers
- Google OAuth Client credentials

---

## 🚀 Next Steps

### 1. Force Push to Remote (REQUIRED)

⚠️ **WARNING:** This rewrites public history. Notify all collaborators first!

```bash
# Force push the cleaned history
git push --force --all origin

# Force push tags if any
git push --force --tags origin
```

### 2. Notify Collaborators

All team members must:
```bash
# Backup their local changes
git stash

# Fetch the rewritten history
git fetch origin

# Reset to the new history
git reset --hard origin/main

# Restore their changes
git stash pop
```

Or simply re-clone the repository:
```bash
cd ..
rm -rf focus
git clone git@github.com:davincilab-soft/focus.git
```

### 3. Configure Logging to Exclude Secrets

Update your logging configuration to exclude sensitive headers:

**File:** `backend/app/assistant/backend/logs/` (or wherever logging is configured)

Ensure OAuth requests don't log:
- `Authorization` headers
- Full request/response bodies containing tokens
- Any environment variables

### 4. Enable Git Secrets Protection

Install and configure `git-secrets`:

```bash
# Install git-secrets
pip install git-secrets

# Setup hooks in the repository
cd /path/to/focus
git secrets --install
git secrets --register-aws

# Add custom patterns for Google OAuth
git secrets --add 'GOCSPX-[A-Za-z0-9_-]{28}'
git secrets --add '[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com'
git secrets --add 'ya29\.[A-Za-z0-9_-]+'
git secrets --add '1//[A-Za-z0-9_-]+'
```

### 5. Add Pre-commit Hook (Optional)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
# Prevent committing log files
if git diff --cached --name-only | grep -q '\.log$'; then
    echo "ERROR: Attempting to commit log files!"
    echo "Log files may contain secrets and should never be committed."
    exit 1
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 📋 Security Checklist

- [ ] Revoked old Google OAuth Client ID
- [ ] Created new Google OAuth credentials
- [ ] Updated `backend/.env` with new credentials
- [ ] Deleted old token files
- [ ] Re-authenticated and verified app works
- [ ] Force pushed cleaned history to remote
- [ ] Notified all collaborators
- [ ] Configured logging to exclude secrets
- [ ] Set up git-secrets or pre-commit hooks
- [ ] Verified no secrets in current working tree: `git secrets --scan`

---

## 🔍 Monitoring

After completing these steps:

1. Monitor GitGuardian dashboard for any remaining alerts
2. Check Google Cloud Console audit logs for unauthorized access
3. Review application logs for any authentication failures
4. Consider enabling 2FA for Google accounts with API access

---

## 📞 Questions?

If you need assistance with any of these steps, refer to:
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitGuardian Remediation Guide](https://docs.gitguardian.com/internal-repositories-monitoring/remediate/secrets)
