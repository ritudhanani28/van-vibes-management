export type WebSocketEventType =
  | 'ORDER_PLACED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_SERVED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_UPDATED'
  | 'PAYMENT_SETTLED'
  | 'TABLE_STATUS_UPDATED'
  | 'MENU_AVAILABILITY_CHANGED'
  | 'MENU_ITEM_UPDATED'
  | 'MENU_ITEM_DELETED'
  | 'CONNECT'
  | 'DISCONNECT';

export type EventCallback = (data: any) => void;

class WebSocketManagerService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private isExplicitDisconnect = false;

  public connect(token?: string) {
    if (typeof window === 'undefined') return;

    // Avoid duplicate connections if already open or connecting
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitDisconnect = false;
    const wsToken = token || localStorage.getItem('vv_mgmt_token') || '';
    const wsUrl = `ws://127.0.0.1:8000/api/v1/ws/orders?token=${encodeURIComponent(wsToken)}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[WebSocket] Connected to Vaan Vibes live order stream');
        this.reconnectAttempts = 0;
        this.emit('CONNECT', { connected: true });

        // Start heartbeat ping
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event) {
            this.emit(parsed.event, parsed.data);
          }
        } catch {
          // ignore non-json messages
        }
      };

      this.socket.onclose = () => {
        console.log('[WebSocket] Connection closed');
        this.stopHeartbeat();
        this.emit('DISCONNECT', { connected: false });
        if (!this.isExplicitDisconnect) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[WebSocket] Error encountered:', err);
      };
    } catch (err) {
      console.error('[WebSocket] Failed to initialize socket:', err);
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.isExplicitDisconnect = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public on(event: WebSocketEventType | string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: WebSocketEventType | string, callback: EventCallback) {
    const subs = this.listeners.get(event);
    if (subs) {
      subs.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const subs = this.listeners.get(event);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[WebSocket] Error in subscriber for '${event}':`, err);
        }
      });
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitDisconnect) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocket] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log(`[WebSocket] Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ action: 'PING' }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

export const wsManager = new WebSocketManagerService();
