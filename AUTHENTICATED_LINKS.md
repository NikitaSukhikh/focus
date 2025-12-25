# Authenticated Links - Seamless Link Opening

Ocean now supports seamless opening of authenticated links across multiple cloud services and platforms. This feature prevents blocking pages when clicking on private links that require authentication.

## How It Works

1. **Service Detection**: When you double-click a link, Ocean automatically detects which service it belongs to
2. **Token Validation**: Checks if you have valid OAuth tokens for that service
3. **Account Selection**: If multiple accounts are available, shows a selection dialog
4. **Seamless Opening**: Opens the link with the correct authentication context

## Supported Services

### ✅ Fully Implemented

#### Google Services
- **Gmail** - `mail.google.com`, `gmail.com`
- **Google Drive** - `drive.google.com`
- **Google Docs** - `docs.google.com`
- **Google Sheets** - `sheets.google.com`
- **Google Slides** - `slides.google.com`

**Features:**
- Multi-account support
- Automatic token refresh
- Account selection dialog
- Seamless OAuth integration

### 🔜 Coming Soon (Infrastructure Ready)

#### Microsoft Services
- **OneDrive** - `onedrive.live.com`, `1drv.ms`
- **SharePoint** - `*.sharepoint.com`
- **Office Online** - `office.live.com`
- **Outlook Web** - `outlook.live.com/owa`

#### Cloud Storage
- **Dropbox** - `dropbox.com`, `db.tt`, `paper.dropbox.com`
- **Box** - `box.com`, `app.box.com`
- **iCloud** - `icloud.com`, `iclouddrive.com`

#### Development Platforms
- **GitHub** - `github.com`
- **GitLab** - `gitlab.com`

#### SaaS Applications
- **Notion** - `notion.so`, `notion.site`
- **Atlassian** - `atlassian.net`, `jira.com`, `confluence.com`

## Usage

### Opening Links

Simply double-click any link in Ocean. The system will:

1. Detect if the link requires authentication
2. Check your stored credentials
3. Open the link seamlessly if authenticated
4. Show account selection if multiple accounts exist
5. Trigger OAuth flow if authentication is needed

### Multi-Account Support

For Google services, you can connect multiple accounts:

1. Click the Google icon in the top bar
2. Sign in with each account you want to add
3. When opening links, choose which account to use
4. Ocean remembers your preference

## Technical Details

### Backend Components

- **Service**: `backend/app/services/authenticated_links.py`
- **API Endpoint**: `POST /api/google/authenticated-link`
- **Models**: `backend/app/models/google.py` (AuthenticatedLinkRequest, AuthenticatedLinkResponse)

### Frontend Components

- **Service**: `ui/src/services/authenticatedLinks.ts`
- **Integration**: `ui/src/components/layout/centerpane/IconTile.tsx`
- **Dialog**: `ui/src/components/dialogs/AccountSelectionDialog.tsx`

### Architecture

```
User clicks link
    ↓
Service Detection (Gmail/Drive/OneDrive/etc.)
    ↓
Token Validation (Check stored OAuth tokens)
    ↓
    ├─→ Valid Token Found
    │       ↓
    │   Open Link Seamlessly
    │
    ├─→ Multiple Accounts Available
    │       ↓
    │   Show Account Selection Dialog
    │       ↓
    │   Open with Selected Account
    │
    └─→ No Valid Token
            ↓
        Trigger OAuth Flow
            ↓
        Retry Link Opening
```

## Adding New Services

To add OAuth support for a new service:

1. **Add Detection Pattern** in `ServiceDetector` class
2. **Create Handler Method** (e.g., `_prepare_service_link`)
3. **Implement OAuth Flow** (similar to Google OAuth)
4. **Update Frontend** detection in `authenticatedLinks.ts`
5. **Test** multi-account scenarios

## Benefits

- ✅ No more blocking authentication pages
- ✅ Seamless multi-account switching
- ✅ Automatic token refresh
- ✅ Consistent experience across services
- ✅ Privacy-focused (tokens stored encrypted locally)

## Future Enhancements

- [ ] Microsoft OAuth integration
- [ ] Dropbox OAuth integration
- [ ] GitHub OAuth integration
- [ ] Per-link account preferences
- [ ] Browser cookie synchronization
- [ ] Session sharing with system browser
