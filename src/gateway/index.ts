import { readGatewayConfig } from './configReader';
import { readToken } from './tokenReader';
import { WebSocketClient } from './websocketClient';

export class Gateway {
  private wsClient: WebSocketClient;

  constructor(private startPath: string) {
    this.wsClient = new WebSocketClient();
  }

  setStatusCallback(callback: (status: 'connected' | 'connecting' | 'disconnected') => void): void {
    this.wsClient.setStatusCallback(callback);
  }

  setLogCallback(callback: (msg: string) => void): void {
    this.wsClient.setLogCallback(callback);
  }

  async connect(): Promise<void> {
    const config = readGatewayConfig(this.startPath);
    const token = readToken(config.token_file);
    await this.wsClient.connect(config.host, config.port, token);
  }

  disconnect(): void {
    this.wsClient.disconnect();
  }

  sendRequest(method: string, params: Record<string, unknown>): void {
    this.wsClient.sendRequest(method, params);
  }
}
