import { getCustomerFrontendBaseUrl } from '@/lib/qr-url';
/**
 * Centralized Environment Configuration for Vaan Vibes Management Portal
 * Single Source of Truth for API, WebSocket, Customer URLs, and Port Settings.
 */

export const envConfig = {
  // Application Port (Production: 4001)
  port: parseInt(process.env.PORT || '4001', 10),

  // Environment mode
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  /**
   * Dynamically resolves the Backend REST API base URL.
   * Backend runs on port 9000.
   * - In browser, automatically matches current server hostname
   * - Ignores build-time "localhost" when loaded from a remote host
   * - Prevents mixed-content errors by matching browser protocol (https vs http)
   * - In SSR, checks FASTAPI_BACKEND_URL or falls back to localhost:9000
   */
  getApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const envUrl = process.env.NEXT_PUBLIC_API_URL;

      // If an explicit remote/production URL was configured (not localhost/127.0.0.1), use it:
      if (
        envUrl &&
        envUrl.trim() &&
        !envUrl.includes('localhost') &&
        !envUrl.includes('127.0.0.1')
      ) {
        let resolved = envUrl.trim();
        if (protocol === 'https:' && resolved.startsWith('http://')) {
          resolved = resolved.replace(/^http:\/\//, 'https://');
        }
        return resolved.replace(/\/+$/, '');
      }

      // Dynamically match the current browser host on port 9000
      return `${protocol}//${hostname}:9000/api/v1`;
    }

    const ssrBackend = process.env.FASTAPI_BACKEND_URL;
    if (ssrBackend && ssrBackend.trim()) {
      return ssrBackend.trim().replace(/\/+$/, '');
    }

    return 'http://127.0.0.1:9000/api/v1';
  },

  /**
   * Dynamically resolves the live WebSocket Stream URL with auth token.
   * - In browser, matches current server hostname on port 9000
   * - Automatically selects wss:// on https: and ws:// on http:
   * - Appends token query param safely
   */
  getWebSocketUrl(token?: string): string {
    const wsToken =
      token ||
      (typeof window !== 'undefined' ? localStorage.getItem('vv_mgmt_token') : '') ||
      '';

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;

      let baseWsUrl = '';
      if (
        envWsUrl &&
        envWsUrl.trim() &&
        !envWsUrl.includes('localhost') &&
        !envWsUrl.includes('127.0.0.1')
      ) {
        baseWsUrl = envWsUrl.trim();
        if (protocol === 'wss:' && baseWsUrl.startsWith('ws://')) {
          baseWsUrl = baseWsUrl.replace(/^ws:\/\//, 'wss://');
        }
      } else {
        baseWsUrl = `${protocol}//${hostname}:9000/api/v1/ws/orders`;
      }

      if (wsToken && !baseWsUrl.includes('token=')) {
        const separator = baseWsUrl.includes('?') ? '&' : '?';
        return `${baseWsUrl}${separator}token=${encodeURIComponent(wsToken)}`;
      }

      return baseWsUrl;
    }

    return 'ws://127.0.0.1:9000/api/v1/ws/orders';
  },

  /**
   * Resolves the customer-facing QR menu base URL for table QR links.
   * Customer frontend runs on port 4000.
   */
  getCustomerFrontendUrl(customOverride?: string | null): string {
    return getCustomerFrontendBaseUrl({ customOverride });
  },
};
