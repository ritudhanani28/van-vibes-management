/**
 * Centralized QR Menu URL and Target Origin Resolution Utility
 * Single Source of Truth for generating customer-facing menu links,
 * standee URLs, and QR codes across the Management Portal.
 */

// Memory cache for server-detected LAN info
let cachedLanIp: string | null = null;
let cachedCustomerPort: number = 4000;

export async function fetchServerNetworkInfo(): Promise<{ lanIp: string | null; customerPort: number }> {
  if (typeof window === 'undefined') {
    return { lanIp: cachedLanIp, customerPort: cachedCustomerPort };
  }
  try {
    const res = await fetch('/api/network-info', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.lanIp) cachedLanIp = data.lanIp;
      if (data.customerPort) cachedCustomerPort = data.customerPort;
      return { lanIp: data.lanIp, customerPort: data.customerPort };
    }
  } catch {
    // ignore
  }
  return { lanIp: cachedLanIp, customerPort: cachedCustomerPort };
}

export function setCachedLanIp(ip: string | null) {
  cachedLanIp = ip;
}

export function getCachedLanIp(): string | null {
  return cachedLanIp;
}

export interface ResolveBaseUrlOptions {
  customOverride?: string | null;
  preferLanOnLocal?: boolean;
}

/**
 * Resolves the customer frontend base URL dynamically and deployment-independently.
 *
 * Priority order:
 * 1. Explicit parameter override (e.g. user selected custom domain in UI)
 * 2. User stored preference in localStorage ('vv_qr_base_override')
 * 3. Explicitly configured NEXT_PUBLIC_CUSTOMER_APP_URL / NEXT_PUBLIC_CUSTOMER_FRONTEND_URL
 * 4. Browser active origin resolution:
 *    - If hostname is loopback (localhost / 127.0.0.1):
 *      Uses server-detected LAN IP (e.g. http://192.168.10.9:4000) so phones on Wi-Fi can reach it!
 *      Falls back to http://localhost:{customerPort}.
 *    - If hostname is a public IP or custom domain:
 *      Uses current protocol and hostname.
 *      If standard port (80/443 or reverse proxy), does NOT append custom port.
 *      If port 4001, uses 4000. If port 3001, uses 3000.
 * 5. Fallback: http://localhost:4000
 */
export function getCustomerFrontendBaseUrl(options?: ResolveBaseUrlOptions): string {
  // 1. Explicit parameter override
  if (options?.customOverride && options.customOverride.trim()) {
    return options.customOverride.trim().replace(/\/+$/, '');
  }

  // 2. User stored preference
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('vv_qr_base_override');
      if (stored && stored.trim() && (stored.startsWith('http://') || stored.startsWith('https://'))) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch {
      // ignore
    }
  }

  // 3. Explicit environment variable (if non-empty and not generic localhost)
  const envUrl =
    process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_FRONTEND_URL ||
    process.env.CUSTOMER_FRONTEND_URL;

  // If user explicitly configured a remote domain or IP:
  if (envUrl && envUrl.trim() && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 4. Browser dynamic resolution
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    const isLoopback =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0';

    if (isLoopback) {
      if (options?.preferLanOnLocal !== false && cachedLanIp) {
        return `http://${cachedLanIp}:${cachedCustomerPort || 4000}`;
      }
      return `${protocol}//${hostname}:${cachedCustomerPort || 4000}`;
    }

    // Remote server, public IP or custom domain:
    if (!port || port === '80' || port === '443') {
      return `${protocol}//${hostname}`;
    }

    if (port === '4001') {
      return `${protocol}//${hostname}:4000`;
    }
    if (port === '3001') {
      return `${protocol}//${hostname}:3000`;
    }

    return `${protocol}//${hostname}:${port}`;
  }

  // 5. SSR / Node.js fallback
  if (cachedLanIp) {
    return `http://${cachedLanIp}:4000`;
  }

  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return 'http://localhost:4000';
}

export interface BuildMenuUrlOptions {
  tableId: string;
  token: string;
  cafeSlug?: string;
  customBaseUrl?: string;
}

/**
 * Builds the complete customer menu URL with safe encoding and query parameters.
 * E.g. https://cafe.example.com/cafe/van-vibes/menu?table=T01&token=vv_sec_t01_6834
 */
export function buildCustomerMenuUrl({
  tableId,
  token,
  cafeSlug = 'van-vibes',
  customBaseUrl,
}: BuildMenuUrlOptions): string {
  const baseUrl = getCustomerFrontendBaseUrl({ customOverride: customBaseUrl });
  try {
    const url = new URL(`${baseUrl}/cafe/${cafeSlug}/menu`);
    url.searchParams.set('table', tableId);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    return `${cleanBase}/cafe/${cafeSlug}/menu?table=${encodeURIComponent(tableId)}&token=${encodeURIComponent(token)}`;
  }
}
