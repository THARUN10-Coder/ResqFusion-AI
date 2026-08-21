import { ActivityEvent } from '../types';

type EventCallback = (event: ActivityEvent) => void;
type StatusCallback = (connected: boolean) => void;

const getWebSocketUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use current host — Vite proxy forwards /ws/* to ws://localhost:8000
  return `${protocol}//${window.location.host}/ws/dashboard`;
};

class DashboardWebSocket {
  private ws: WebSocket | null = null;
  private listeners: EventCallback[] = [];
  private statusListeners: StatusCallback[] = [];
  private isConnecting = false;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30000;
  public isConnected = false;

  public connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
    this.isConnecting = true;

    try {
      const url = getWebSocketUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`✅ ResQFusion WebSocket connected at ${url}`);
        this.isConnecting = false;
        this.isConnected = true;
        this.reconnectDelay = 2000; // Reset backoff on success
        this.notifyStatus(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Normalise to ActivityEvent shape
          const activityEvent: ActivityEvent = {
            id: `${Date.now()}-${Math.random()}`,
            type: data.type || 'INCIDENT_UPDATED',
            message: data.message || JSON.stringify(data),
            timestamp: data.timestamp || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            details: data,
          };
          this.notifyListeners(activityEvent);
        } catch (e) {
          console.error('[WS] Failed to parse message', e);
        }
      };

      this.ws.onclose = (event) => {
        console.warn(`[WS] Disconnected (code: ${event.code}). Reconnecting in ${this.reconnectDelay / 1000}s...`);
        this.ws = null;
        this.isConnecting = false;
        this.isConnected = false;
        this.notifyStatus(false);

        setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
          this.connect();
        }, this.reconnectDelay);
      };

      this.ws.onerror = () => {
        console.error('[WS] Connection error — backend may be offline');
        this.ws?.close();
      };
    } catch (err) {
      console.error('[WS] Failed to establish connection:', err);
      this.isConnecting = false;
    }
  }

  public disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  public subscribe(callback: EventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.push(callback);
    // Immediately notify current status
    callback(this.isConnected);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(event: ActivityEvent) {
    this.listeners.forEach((l) => l(event));
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((l) => l(connected));
  }
}

export const dashboardWS = new DashboardWebSocket();
