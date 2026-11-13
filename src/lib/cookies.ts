/** Tiny typed cookie helper for the browser (replaces universal-cookie). */

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

interface WriteCookieOptions {
  /** Seconds. Omit for a session cookie (matches the old app's behaviour for access_token). */
  maxAge?: number;
}

export function writeCookie(name: string, value: string, options: WriteCookieOptions = {}): void {
  if (typeof document === 'undefined') return;
  const parts = [`${name}=${encodeURIComponent(value)}`, 'path=/', 'SameSite=Lax'];
  if (options.maxAge !== undefined) parts.push(`max-age=${options.maxAge}`);
  if (window.location.protocol === 'https:') parts.push('Secure');
  document.cookie = parts.join('; ');
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}
