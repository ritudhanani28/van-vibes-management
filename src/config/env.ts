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
   * - Checks process.env.NEXT_PUBLIC_API_URL
   * - Prevents mixed-content errors by matching browser protocol (https vs http)
   * - In browser, falls back dynamically to current hostname on port 9000
   * - In SSR, checks FASTAPI_BACKEND_URL or falls back to localhost:9000
   */
  getApiBaseUrl(): string {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && envUrl.trim()) {
      let resolved = envUrl.trim();
      // Upgrade http:// to https:// if the portal is loaded over https:// to prevent mixed-content errors
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && resolved.startsWith('http://')) {
        resolved = resolved.replace(/^http:\/\//, 'https://');
      }
      return resolved.replace(/\/+$/, '');
    }

    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
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
   * - Automatically selects wss:// on https: and ws:// on http:
   * - Matches host dynamically if not explicitly hardcoded
   * - Appends token query param safely
   */
  getWebSocketUrl(token?: string): string {
    const wsToken =
      token ||
      (typeof window !== 'undefined' ? localStorage.getItem('vv_mgmt_token') : '') ||
      '';
    const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;

    let baseWsUrl = '';
    if (envWsUrl && envWsUrl.trim()) {
      baseWsUrl = envWsUrl.trim();
      // Upgrade ws:// to wss:// if loaded over https
      if (
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        baseWsUrl.startsWith('ws://')
      ) {
        baseWsUrl = baseWsUrl.replace(/^ws:\/\//, 'wss://');
      }
    } else if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      baseWsUrl = `${protocol}//${hostname}:9000/api/v1/ws/orders`;
    } else {
      baseWsUrl = 'ws://127.0.0.1:9000/api/v1/ws/orders';
    }

    // Attach token query param if not already present
    if (wsToken && !baseWsUrl.includes('token=')) {
      const separator = baseWsUrl.includes('?') ? '&' : '?';
      return `${baseWsUrl}${separator}token=${encodeURIComponent(wsToken)}`;
    }

    return baseWsUrl;
  },

  /**
   * Resolves the customer-facing QR menu base URL for table QR links.
   * Customer frontend runs on port 4000.
   */
  getCustomerFrontendUrl(): string {
    const envUrl = process.env.NEXT_PUBLIC_CUSTOMER_FRONTEND_URL;
    if (envUrl && envUrl.trim()) {
      return envUrl.trim().replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:4000`;
    }
    return 'http://localhost:4000';
  },
};
