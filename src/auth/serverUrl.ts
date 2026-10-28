export const HOSTED_SERVER_URL = 'https://homeaccounting.com';

export type ServerUrlResult =
  { ok: true; url: string } | { ok: false; reason: 'invalid' | 'insecure' };

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

function ipv4(host: string): number[] | null {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return nums.every((n) => n >= 0 && n <= 255) ? nums : null;
}

// Hosts where plain http is acceptable: loopback, RFC 1918 and mDNS names.
function isPrivateHost(host: string): boolean {
  if (host === 'localhost' || host === '[::1]') return true;
  if (host.endsWith('.local') && host.length > '.local'.length) return true;
  const ip = ipv4(host);
  if (!ip) return false;
  const [a, b] = ip as [number, number, number, number];
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function parseServerUrl(input: string): ServerUrlResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: 'invalid' };
  let url: URL;
  try {
    url = new URL(SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    return { ok: false, reason: 'invalid' };
  if (!url.hostname || url.username || url.password || url.hostname === '0.0.0.0') {
    return { ok: false, reason: 'invalid' };
  }
  if (url.protocol === 'http:' && !isPrivateHost(url.hostname))
    return { ok: false, reason: 'insecure' };
  const path = url.pathname.replace(/\/+$/, '');
  return { ok: true, url: `${url.protocol}//${url.host}${path}` };
}

export function displayHost(url: string): string {
  return url.replace(/^https?:\/\//, '');
}
