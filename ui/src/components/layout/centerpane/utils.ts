export const isGmailUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'mail.google.com' || urlObj.hostname === 'gmail.com';
  } catch {
    return false;
  }
};
