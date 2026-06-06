import WebSocket from 'ws';

let client: WebSocket | null = null;
let nextId: number = 2;

export function createWebSocketConnection(host: string, port: number, token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const url = `ws://${host}:${port}`;
    const ws = new WebSocket(url);

    console.log(url);

    ws.on('open', () => {
      // Send authentication with token
      ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'auth', params: { token }, id: 1 }));
    });

    ws.on('message', (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString());
      if (message.result !== undefined && !message.error) {
        client = ws;
        resolve(ws);
      } else if (message.error) {
        ws.close();
        reject(new Error(message.error.message));
      }
    });

    ws.on('error', (error: Error) => {
      reject(error);
    });

    ws.on('close', () => {
      client = null;
    });
  });
}

export function getWebSocketClient(): WebSocket | null {
  return client;
}

export function closeWebSocketConnection(): void {
  if (client) {
    client.close();
    client = null;
  }
}

export function sendRequest(method: string, params: Record<string, unknown>): void {
  if (!client) {
    console.error('WebSocket client is not connected');
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
