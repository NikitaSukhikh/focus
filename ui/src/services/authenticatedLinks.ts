/**
 * Authenticated Links Service
 *
 * Handles seamless opening of links that require authentication.
 * Supports Google services (Gmail, Drive, Docs, Sheets, Slides) and other OAuth providers.
 */

interface AccountInfo {
  email: string;
  scopes?: string[];
}

interface AuthenticatedLinkResponse {
  authenticated_url: string;
  needs_auth: boolean;
  service: string | null;
  accounts: AccountInfo[];
  selected_account: string | null;
  hint?: string;
}

interface PrepareLinkoptions {
  url: string;
  linkId?: string;
  accountEmail?: string;
}

class AuthenticatedLinksService {
  private apiBaseUrl = '/api/google';

  /**
   * Prepare a link for authenticated opening
   */
  async prepareLink(options: PrepareLinkoptions): Promise<AuthenticatedLinkResponse> {
    const response = await fetch(`${this.apiBaseUrl}/authenticated-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: options.url,
        link_id: options.linkId,
        account_email: options.accountEmail,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to prepare authenticated link');
    }

    return response.json();
  }

  /**
   * Open a link with authentication handling
   *
   * @param url - URL to open
   * @param linkId - Optional link ID
   * @param onNeedsAuth - Callback when OAuth is needed
   * @param onAccountSelection - Callback when multiple accounts are available
   * @returns Promise that resolves when link is opened or action is taken
   */
  async openLink(
    url: string,
    linkId?: string,
    onNeedsAuth?: (_service: string) => void | Promise<void>,
    onAccountSelection?: (_accounts: AccountInfo[], _service: string) => Promise<string | null>
  ): Promise<void> {
    try {
      // Prepare the link
      const result = await this.prepareLink({ url, linkId });

      // Check if OAuth is needed
      if (result.needs_auth) {
        if (onNeedsAuth && result.service) {
          await onNeedsAuth(result.service);
        } else {
          // No handler - just open the original URL
          window.open(url, '_blank');
        }
        return;
      }

      // Check if multiple accounts are available and no account was selected
      if (
        result.accounts.length > 1 &&
        !result.selected_account &&
        onAccountSelection &&
        result.service
      ) {
        // Let user select account
        const selectedEmail = await onAccountSelection(result.accounts, result.service);

        if (selectedEmail) {
          // Retry with selected account
          const retryResult = await this.prepareLink({
            url,
            linkId,
            accountEmail: selectedEmail,
          });
          window.open(retryResult.authenticated_url, '_blank');
        } else {
          // User cancelled - open original URL
          window.open(url, '_blank');
        }
        return;
      }

      // Open the authenticated URL
      window.open(result.authenticated_url, '_blank');

      // Log hint if present
      if (result.hint) {
        console.log(`[AuthLinks] ${result.hint}`);
      }
    } catch (error) {
      console.error('[AuthLinks] Failed to open authenticated link:', error);
      // Fallback to opening original URL
      window.open(url, '_blank');
    }
  }

  /**
   * Check if a URL requires authentication
   */
  requiresAuth(url: string): boolean {
    return this.detectService(url) !== null;
  }

  /**
   * Detect which service a URL belongs to
   */
  detectService(url: string): string | null {
    const urlLower = url.toLowerCase();

    // Gmail
    if (urlLower.includes('mail.google.com') || urlLower.includes('gmail.com')) {
      return 'gmail';
    }

    // Google Drive (includes Docs, Sheets, Slides)
    if (
      urlLower.includes('drive.google.com') ||
      urlLower.includes('docs.google.com') ||
      urlLower.includes('sheets.google.com') ||
      urlLower.includes('slides.google.com')
    ) {
      return 'gdrive';
    }

    // OneDrive (includes SharePoint, Office Online)
    if (
      urlLower.includes('onedrive.live.com') ||
      urlLower.includes('1drv.ms') ||
      urlLower.includes('sharepoint.com') ||
      urlLower.includes('office.live.com') ||
      (urlLower.includes('outlook.live.com') && urlLower.includes('/owa'))
    ) {
      return 'onedrive';
    }

    // Dropbox
    if (
      urlLower.includes('dropbox.com') ||
      urlLower.includes('db.tt') ||
      urlLower.includes('paper.dropbox.com')
    ) {
      return 'dropbox';
    }

    // Box
    if (urlLower.includes('box.com') || urlLower.includes('app.box.com')) {
      return 'box';
    }

    // iCloud
    if (urlLower.includes('icloud.com') || urlLower.includes('iclouddrive.com')) {
      return 'icloud';
    }

    // Notion
    if (urlLower.includes('notion.so') || urlLower.includes('notion.site')) {
      return 'notion';
    }

    // GitHub
    if (urlLower.includes('github.com')) {
      return 'github';
    }

    // GitLab
    if (urlLower.includes('gitlab.com')) {
      return 'gitlab';
    }

    // Atlassian (Jira, Confluence)
    if (
      urlLower.includes('atlassian.net') ||
      urlLower.includes('jira.com') ||
      urlLower.includes('confluence.com')
    ) {
      return 'atlassian';
    }

    return null;
  }

  /**
   * Trigger OAuth flow for a service
   */
  async triggerOAuth(service: string): Promise<void> {
    if (service === 'gmail' || service === 'gdrive') {
      // Trigger Google OAuth
      const response = await fetch(`${this.apiBaseUrl}/auth/url`);
      const data = await response.json();

      if (data.auth_url) {
        window.open(data.auth_url, '_blank', 'width=500,height=600');
      }
    } else if (service === 'github') {
      console.warn('[AuthLinks] GitHub OAuth not yet implemented');
    }
  }
}

// Export singleton instance
export const authenticatedLinksService = new AuthenticatedLinksService();

export type { AccountInfo, AuthenticatedLinkResponse };
