import type { ClientMessage, ServerMessage } from './protocol';

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting';

const INITIAL_DELAY_MS = 500;
const MAX_DELAY_MS = 5000;

interface GameSocketHandlers {
  onStatus: (status: ConnectionStatus) => void;
  /** Called every time a connection opens, including after a reconnect. */
  onOpen: () => void;
  onMessage: (message: ServerMessage) => void;
}

/** A WebSocket that reconnects by itself. It knows nothing about React. */
export class GameSocket {
  private readonly handlers: GameSocketHandlers;
  private socket: WebSocket | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private delay = INITIAL_DELAY_MS;
  private disposed = false;

  constructor(handlers: GameSocketHandlers) {
    this.handlers = handlers;
  }

  connect(): void {
    if (this.disposed) return;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${location.host}/ws`);
    this.socket = socket;

    socket.onopen = () => {
      if (this.disposed) {
        socket.close();
        return;
      }
      this.delay = INITIAL_DELAY_MS;
      this.handlers.onStatus('online');
      this.handlers.onOpen();
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      if (this.disposed) return;
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return; // ignore frames that are not JSON
      }
      this.handlers.onMessage(message);
    };

    socket.onclose = () => {
      if (this.disposed) return;
      this.handlers.onStatus('reconnecting');
      this.retryTimer = setTimeout(() => this.connect(), this.delay);
      this.delay = Math.min(this.delay * 2, MAX_DELAY_MS);
    };

    socket.onerror = () => socket.close();
  }

  /** Returns false when the socket is not open, so the caller can tell the user. */
  send(message: ClientMessage): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  /** Drop the current connection; the socket then reconnects with a clean server-side state. */
  reconnect(): void {
    this.socket?.close();
  }

  dispose(): void {
    this.disposed = true;
    clearTimeout(this.retryTimer);
    this.socket?.close();
  }
}
