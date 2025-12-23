// REST API client helpers.

import { BACKEND_URL } from '../config/backend';

export interface UploadResponse {
  success: boolean;
  file_path?: string;
  filename?: string;
  size?: number;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  error?: string;
  session_id?: string;
}

export interface OAuthPollResponse {
  success: boolean;
  status: string;
  completed: boolean;
  authenticated: boolean;
  error?: string;
}

export async function startGDriveAuth(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/gdrive/auth/start`, {
      method: 'POST',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to start Google auth');
    }

    return await response.json();
  } catch (error) {
    console.error('GDrive auth error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start Google auth',
    };
  }
}

export async function pollGDriveAuth(sessionId: string): Promise<OAuthPollResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/gdrive/auth/poll/${sessionId}`);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to poll OAuth status');
    }

    return await response.json();
  } catch (error) {
    console.error('GDrive auth poll error:', error);
    return {
      success: false,
      status: 'error',
      completed: true,
      authenticated: false,
      error: error instanceof Error ? error.message : 'Failed to poll OAuth status',
    };
  }
}

export async function getGDriveAuthUrl(): Promise<AuthResponse & { auth_url?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/gdrive/auth/url`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to get Google auth URL');
    }
    return await response.json();
  } catch (error) {
    console.error('GDrive auth URL error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get Google auth URL',
    };
  }
}

export async function getGDriveAuthStatus(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/gdrive/auth/status`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to get Google auth status');
    }
    return await response.json();
  } catch (error) {
    console.error('GDrive auth status error:', error);
    return {
      success: false,
      authenticated: false,
      error: error instanceof Error ? error.message : 'Failed to get Google auth status',
    };
  }
}

export async function revokeGDriveAuth(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/gdrive/auth/revoke`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to revoke Google auth');
    }
    return await response.json();
  } catch (error) {
    console.error('GDrive auth revoke error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke Google auth',
    };
  }
}

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name?: string;
  use_tls: boolean;
}

export interface EmailConfigStatus {
  success: boolean;
  configured: boolean;
  has_smtp_host?: boolean;
  has_credentials?: boolean;
  from_email?: string;
  from_name?: string;
  smtp_host?: string;
  smtp_port?: number;
  use_tls?: boolean;
  error?: string;
}

export async function saveEmailConfig(config: EmailConfig): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save email config');
    }
    return await response.json();
  } catch (error) {
    console.error('Email config save error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save email config',
    };
  }
}

export async function getEmailConfigStatus(): Promise<EmailConfigStatus> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/config/status`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to get email config status');
    }
    return await response.json();
  } catch (error) {
    console.error('Email config status error:', error);
    return {
      success: false,
      configured: false,
      error: error instanceof Error ? error.message : 'Failed to get email config status',
    };
  }
}

export async function testEmailConnection(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/test`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to test email connection');
    }
    return await response.json();
  } catch (error) {
    console.error('Email connection test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test email connection',
    };
  }
}

// Gmail OAuth API functions
export async function saveGmailClientConfig(
  clientId: string,
  clientSecret: string
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/gmail/client-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save Gmail client config');
    }
    return await response.json();
  } catch (error) {
    console.error('Gmail client config error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save Gmail client config',
    };
  }
}

export async function getGmailAuthUrl(): Promise<AuthResponse & { auth_url?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/gmail/auth/url`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to get Gmail auth URL');
    }
    return await response.json();
  } catch (error) {
    console.error('Gmail auth URL error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get Gmail auth URL',
    };
  }
}

export async function getGmailAuthStatus(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/gmail/auth/status`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to get Gmail auth status');
    }
    return await response.json();
  } catch (error) {
    console.error('Gmail auth status error:', error);
    return {
      success: false,
      authenticated: false,
      error: error instanceof Error ? error.message : 'Failed to get Gmail auth status',
    };
  }
}

export async function revokeGmailAuth(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/email/gmail/auth/revoke`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to revoke Gmail auth');
    }
    return await response.json();
  } catch (error) {
    console.error('Gmail auth revoke error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke Gmail auth',
    };
  }
}

/**
 * Upload a file to the backend.
 */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: 'Upload failed',
      }));
      throw new Error(errorData.detail || 'Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload multiple files to the backend.
 */
export async function uploadMultipleFiles(files: File[]): Promise<{
  success: boolean;
  files: UploadResponse[];
  total: number;
  uploaded: number;
}> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  try {
    const response = await fetch(`${BACKEND_URL}/api/upload/multiple`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      files: [],
      total: 0,
      uploaded: 0,
    };
  }
}

/**
 * List all uploaded files.
 */
export async function listUploads(): Promise<{
  success: boolean;
  files: Array<{
    filename: string;
    path: string;
    size: number;
    created: string;
    modified: string;
  }>;
  total: number;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/uploads`);
    return await response.json();
  } catch (error) {
    console.error('List uploads error:', error);
    return {
      success: false,
      files: [],
      total: 0,
    };
  }
}

/**
 * Delete an uploaded file.
 */
export async function deleteUpload(filename: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/uploads/${filename}`, {
      method: 'DELETE',
    });
    return await response.json();
  } catch (error) {
    console.error('Delete upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

export const apiClient = {
  uploadFile,
  uploadMultipleFiles,
  listUploads,
  deleteUpload,
};
