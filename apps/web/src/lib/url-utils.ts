const LOCALHOST_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];

/**
 * Detects if a URL points to a local address (localhost, 127.x, 0.0.0.0, [::1]).
 * Handles both full URLs and partial input (e.g. "localhost:3000").
 */
export function isLocalhostUrl(url: string): boolean {
  if (!url) return false;

  // Try parsing as-is first, then with a protocol prefix for bare host:port
  let hostname: string | null = null;

  try {
    const parsed = new URL(url);
    hostname = parsed.hostname || null;
  } catch {
    // noop — will try fallback below
  }

  // Fallback: try prepending http:// for bare inputs like "localhost:3000"
  if (!hostname) {
    try {
      const parsed = new URL(`http://${url}`);
      hostname = parsed.hostname || null;
    } catch {
      return false;
    }
  }

  if (!hostname) return false;

  return LOCALHOST_HOSTS.includes(hostname);
}

/**
 * Extracts the port from a URL string, or returns null.
 */
export function extractPort(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.port || null;
  } catch {
    try {
      const parsed = new URL(`http://${url}`);
      return parsed.port || null;
    } catch {
      return null;
    }
  }
}
