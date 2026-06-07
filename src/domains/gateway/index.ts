import { readGatewayConfig } from './configReader';
import { readToken } from './tokenReader';
import { createWebSocketConnection, closeWebSocketConnection, setStatusCallback } from './websocketClient';

export { sendRequest, setStatusCallback } from './websocketClient';

export async function connect(startPath: string): Promise<void> {
  const config = readGatewayConfig(startPath);
  const token = readToken(config.token_file);
  await createWebSocketConnection(config.host, config.port, token);
}

export function disconnect(): void {
  closeWebSocketConnection();
}
