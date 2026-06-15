import WebSocket from 'ws';

export class WebSocketClient {
  private client: WebSocket | null = null;
  private nextId: number = 2;
  private statusCallback: ((status: 'connected' | 'connecting' | 'disconnected') => void) | null = null;
  private logCallback: ((msg: string) => void) | null = null;

  setStatusCallback(callback: (status: 'connected' | 'connecting' | 'disconnected') => void): void {
    this.statusCallback = callback;
  }

  setLogCallback(callback: (msg: string) => void): void {
    this.logCallback = callback;
  }

  private logError(msg: string): void {
    this.logCallback?.(msg);
    console.error(msg);
  }

  async connect(host: string, port: number, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://${host}:${port}`;
      this.statusCallback?.('connecting');
      const ws = new WebSocket(url);

      ws.on('open', () => {
        // Send authentication with token
        ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'auth', params: { token }, id: 1 }));
      });

      ws.on('message', (data: WebSocket.Data) => {
        let message: unknown;
        try {
          message = JSON.parse(data.toString());
        } catch (error) {
          this.logError(`Failed to parse WebSocket message: ${error}`);
          return;
        }

        const parsedMessage = message as { id?: number; result?: unknown; error?: { message: string } };

        // Only handle the auth response (id: 1) for connection state
        if (parsedMessage.id === 1) {
          if (parsedMessage.result !== undefined && !parsedMessage.error) {
            this.client = ws;
            this.statusCallback?.('connected');
            resolve();
          } else if (parsedMessage.error) {
            ws.close();
            reject(new Error(parsedMessage.error.message));
          }
        }
      });

      ws.on('error', (error: Error) => {
        this.statusCallback?.('disconnected');
        reject(error);
      });

      ws.on('close', () => {
        this.client = null;
        this.statusCallback?.('disconnected');
      });
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }

  sendRequest(method: string, params: Record<string, unknown>): void {
    if (!this.client) {
      this.logError('WebSocket client is not connected');
      return;
    }

    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.nextId++,
    };

    this.client.send(JSON.stringify(request));
  }
}
