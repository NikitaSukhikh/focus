# Google Drive OAuth 2.0 Setup Guide

This guide will help you set up OAuth 2.0 authentication for Google Drive, allowing Alfy to access your private and shared Google Drive files.

## Why OAuth Authentication?

**Without OAuth:** Alfy can only access publicly shared Google Drive files (files with "Anyone with the link" permission).

**With OAuth:** Alfy can access:
- Your private files
- Files shared with you by others
- Files in shared drives
- All files in your Google Drive account (with your permission)

## Setup Steps

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top
3. Click "New Project"
4. Enter a project name (e.g., "Alfy Google Drive Integration")
5. Click "Create"

### Step 2: Enable Google Drive API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: Select "External" (unless you have a Google Workspace)
   - Click "Create"
   - Fill in required fields:
     - App name: "Alfy"
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Skip this step (click "Save and Continue")
   - Test users: Add your Gmail address
   - Click "Save and Continue"

4. Back to "Create OAuth client ID":
   - Application type: Select "Desktop app"
   - Name: "Alfy Desktop Client"
   - Click "Create"

5. A dialog will appear with your Client ID and Client Secret
   - **IMPORTANT:** Copy these values - you'll need them!

### Step 4: Configure Alfy

You have two options for configuring OAuth credentials:

#### Option A: Using Environment Variables (Recommended)

1. Open your `.env` file in the root directory
2. Add the following configuration:

```env
# Google Drive OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_DRIVE_SCOPES=https://www.googleapis.com/auth/drive.readonly
```

3. Replace `your-client-id-here` and `your-client-secret-here` with the values from Step 3

#### Option B: Using Credentials JSON File

1. In the Google Cloud Console, on the Credentials page, find your OAuth client
2. Click the download icon (⬇) to download the credentials JSON
3. Save it somewhere secure (e.g., `backend/config/google_credentials.json`)
4. Add this to your `.env` file:

```env
# Google Drive OAuth 2.0 Configuration
GOOGLE_CREDENTIALS_PATH=backend/config/google_credentials.json
GOOGLE_DRIVE_SCOPES=https://www.googleapis.com/auth/drive.readonly
```

### Step 5: Configure OAuth Scopes

The `GOOGLE_DRIVE_SCOPES` environment variable controls what permissions Alfy requests. Options:

- `https://www.googleapis.com/auth/drive.readonly` (Recommended)
  - Read-only access to all your files
  - Cannot modify or delete anything
  - Most secure option

- `https://www.googleapis.com/auth/drive.file`
  - Access only to files created by Alfy
  - Limited scope

- `https://www.googleapis.com/auth/drive`
  - Full access to all files
  - Can read, write, and delete
  - Use with caution

**Recommendation:** Use `drive.readonly` for maximum security. Alfy only needs to read files, not modify them.

### Step 6: Authenticate with Google

Once configured, you need to authenticate Alfy with your Google account:

#### Through Alfy Chat:

1. Start a conversation with Alfy
2. Say: "Authenticate with Google Drive"
3. Alfy will call the `authenticate_gdrive` tool
4. A browser window will open automatically
5. Sign in with your Google account
6. Review and grant the requested permissions
7. You'll see a success message
8. Close the browser window

#### Checking Authentication Status:

You can check if you're authenticated by asking Alfy:
- "Am I authenticated with Google Drive?"
- "Check my Google Drive authentication status"

## Using OAuth Authentication

### Accessing Private Files

Once authenticated, Alfy can automatically access private files:

```
You: "Read this document: https://docs.google.com/document/d/YOUR_PRIVATE_DOC_ID"
Alfy: [Reads the private document using OAuth authentication]
```

### Accessing Shared Files

Files shared with you by others are also accessible:

```
You: "Download this spreadsheet: https://docs.google.com/spreadsheets/d/SHARED_FILE_ID"
Alfy: [Downloads the shared file using OAuth]
```

### Fallback to Public Access

If OAuth authentication fails or is not configured, Alfy automatically falls back to public access for publicly shared files.

## Token Storage

OAuth access tokens are stored locally in:
```
backend/data/gdrive_tokens/token.json
```

**Important:**
- This file contains sensitive credentials
- It's automatically added to `.gitignore`
- Never share this file
- Tokens are refreshed automatically when they expire

## Revoking Authentication

To disconnect your Google account from Alfy:

1. Say to Alfy: "Revoke my Google Drive authentication"
2. Or: "Disconnect my Google account"

This will:
- Revoke the OAuth token with Google
- Delete the local token file
- Require re-authentication for private files

You can also revoke access from your Google Account:
1. Go to [Google Account Security](https://myaccount.google.com/permissions)
2. Find "Alfy" in the list
3. Click "Remove Access"

## Troubleshooting

### "OAuth is not enabled for this client"

**Solution:** Make sure you've added the OAuth credentials to your `.env` file and restarted the backend server.

### "Invalid client" error during authentication

**Solution:**
- Check that your Client ID and Secret are correct in `.env`
- Ensure there are no extra spaces or quotes
- Verify the credentials in Google Cloud Console

### "Access blocked: This app's request is invalid"

**Solution:**
- Make sure you enabled the Google Drive API in your project
- Check that the OAuth consent screen is configured
- Add your email as a test user

### "403 Forbidden" when accessing files

**Solution:**
- Ensure you're authenticated (check with `check_gdrive_auth`)
- The file might not be accessible even with authentication
- Try re-authenticating

### Browser doesn't open during authentication

**Solution:**
- Look in the terminal/logs for an authentication URL
- Manually copy and paste the URL into your browser
- Complete the authentication flow
- The success message will appear in the browser

## Security Best Practices

1. **Use readonly scope:** Unless you need write access, stick with `drive.readonly`
2. **Keep credentials secure:** Never commit `.env` or `token.json` to version control
3. **Limit test users:** Only add trusted email addresses as test users
4. **Regular audits:** Periodically review connected apps in your Google Account
5. **Revoke when not needed:** If you stop using Alfy, revoke the access

## OAuth Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  User asks Alfy to access private Google Drive file        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ Is user authenticated? │
        └───────┬───────────────┘
                │
        ┌───────┴────────┐
        │                │
       YES              NO
        │                │
        │                ▼
        │    ┌────────────────────────┐
        │    │ Prompt user to         │
        │    │ authenticate           │
        │    └────────┬───────────────┘
        │             │
        │             ▼
        │    ┌────────────────────────┐
        │    │ Open browser for OAuth │
        │    └────────┬───────────────┘
        │             │
        │             ▼
        │    ┌────────────────────────┐
        │    │ User grants permission │
        │    └────────┬───────────────┘
        │             │
        │             ▼
        │    ┌────────────────────────┐
        │    │ Save token locally     │
        │    └────────┬───────────────┘
        │             │
        └─────────────┘
                │
                ▼
    ┌──────────────────────────┐
    │ Access file with         │
    │ authenticated request    │
    └──────────────────────────┘
```

## Supported File Types

With OAuth authentication, you can access:

### Google Workspace Files
- Google Docs → Export as TXT, DOCX, PDF
- Google Sheets → Export as CSV, XLSX, PDF
- Google Slides → Export as PDF, PPTX
- Google Forms → Export as PDF

### Regular Files
- PDFs
- Images (PNG, JPG, GIF, etc.)
- Videos (MP4, AVI, etc.)
- Archives (ZIP, RAR, etc.)
- Any file stored in Google Drive

## API Quotas and Limits

Google Drive API has usage quotas:
- **Queries per day:** 1,000,000,000
- **Queries per 100 seconds per user:** 1,000

For normal Alfy usage, you'll never hit these limits. If you do:
1. Check the [Google Cloud Console Quotas page](https://console.cloud.google.com/apis/api/drive.googleapis.com/quotas)
2. Request a quota increase if needed (rarely necessary)

## Privacy and Data Handling

- **Local processing:** All OAuth tokens are stored locally on your machine
- **No third-party sharing:** Alfy never shares your credentials or file data with third parties
- **Minimal permissions:** By default, Alfy only requests read-only access
- **User control:** You can revoke access at any time

## Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [OAuth 2.0 Overview](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Manage Google Account Permissions](https://myaccount.google.com/permissions)

## Example Commands

Once authenticated, try these commands:

```
"Read this private document: [paste Google Doc link]"
"Download this shared spreadsheet as Excel"
"What's in this file?" [paste private Google Drive link]
"Get the content of my planning document"
"Export this presentation as PDF"
```

---

**Need Help?**

If you encounter issues not covered in this guide, check the logs at:
- `backend/logs/alfy_[date].log`

Look for messages containing "gdrive", "oauth", or "auth" for debugging information.
