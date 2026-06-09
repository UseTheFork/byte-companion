import WebSocket from 'ws';

let client: WebSocket | null = null;
let nextId: number = 2;
let statusCallback: ((status: 'connected' | 'connecting' | 'disconnected') => void) | null = null;

// Reconnect state variables
let connectionHost: string = '';
let connectionPort: number = 0;
let connectionToken: string = '';
let intentionalClose: boolean = false;
let reconnectAttempts: number = 0;
const MAX_RECONNECT_ATTEMPTS: number = 5;
const BASE_RECONNECT_DELAY_MS: number = 1000;
let reconnectTimer: NodeJS.Timeout | null = null;
let logCallback: ((msg: string) => void) | null = null;

export function setStatusCallback(callback: (status: 'connected' | 'connecting' | 'disconnected') => void): void {
  statusCallback = callback;
}

export function setLogCallback(callback: (msg: string) => void): void {
  logCallback = callback;
}

function logError(msg: string): void {
  logCallback?.(msg);
  console.error(msg);
}

export function createWebSocketConnection(host: string, port: number, token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    // Save connection parameters for reconnect
    connectionHost = host;
    connectionPort = port;
    connectionToken = token;
    reconnectAttempts = 0;
    intentionalClose = false;

    const url = `ws://${host}:${port}`;
    statusCallback?.('connecting');
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
        logError(`Failed to parse WebSocket message: ${error}`);
        return;
      }

      const parsedMessage = message as { result?: unknown; error?: { message: string } };
      if (parsedMessage.result !== undefined && !parsedMessage.error) {
        reconnectAttempts = 0;
        client = ws;
        statusCallback?.('connected');
        resolve(ws);
      } else if (parsedMessage.error) {
        ws.close();
        reject(new Error(parsedMessage.error.message));
      }
    });

    ws.on('error', (error: Error) => {
      statusCallback?.('disconnected');
      reject(error);
    });

    ws.on('close', () => {
      if (!intentionalClose && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_RECONNECT_DELAY_MS * (2 ** reconnectAttempts);
        reconnectAttempts++;
        statusCallback?.('connecting');
        reconnectTimer = setTimeout(() => {
          createWebSocketConnection(connectionHost, connectionPort, connectionToken).catch(() => {});
        }, delay);
      } else {
        client = null;
        statusCallback?.('disconnected');
      }
    });
  });
}

export function getWebSocketClient(): WebSocket | null {
  return client;
}

export function closeWebSocketConnection(): void {
  intentionalClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (client) {
    client.close();
    client = null;
  }
}

export function sendRequest(method: string, params: Record<string, unknown>): void {
  if (!client) {
    logError('WebSocket client is not connected');
    return;
  }

  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id: nextId++,
  };

  client.send(JSON.stringify(request));
}
