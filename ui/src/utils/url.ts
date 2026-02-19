// URL helpers keep user-provided URLs unchanged for open/navigation actions.
export const normalizeUrl = (value: string): string => value;

const hasLikelyWebHostname = (hostname: string): boolean => {
  if (!hostname) return false;

  // Require at least one dot and a letter-based TLD (e.g., example.com)
  const parts = hostname.split('.');
  if (parts.length < 2) return false;

  const tld = parts[parts.length - 1];
  if (!/^[a-z]{2,}$/i.test(tld)) return false;

  return parts.every((part) => /^[a-z0-9-]+$/i.test(part) && !part.startsWith('-') && !part.endsWith('-'));
};

export const isLikelyHttpUrl = (value: string, options?: { allowEmpty?: boolean }): boolean => {
  const trimmed = value.trim();
  if (!trimmed) {
    return options?.allowEmpty ?? false;
  }

  // Quick reject for whitespace inside the value
  if (/\s/.test(trimmed)) {
    return false;
  }

  const normalized = normalizeUrl(trimmed);

  try {
    const urlObj = new URL(normalized);
    const protocolOk = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    const hostnameOk = hasLikelyWebHostname(urlObj.hostname);
    return protocolOk && hostnameOk;
  } catch {
    return false;
  }
};

export const validateUrlOnSubmit = (value: string) => {
  const normalizedUrl = normalizeUrl(value);
  const isValid = isLikelyHttpUrl(normalizedUrl, { allowEmpty: false });

  return { normalizedUrl, isValid };
};
