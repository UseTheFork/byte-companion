import * as fs from 'fs';
import * as path from 'path';
import { GatewayConfig } from './types';
import { findByteDir } from '../utils/pathResolver';

export function readGatewayConfig(startPath: string): GatewayConfig {
  const byteDir = findByteDir(startPath);
  if (!byteDir) {
    throw new Error('Could not find .byte directory');
  }

  const configPath = path.join(byteDir, 'cache', 'gateway.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Gateway config file not found at ${configPath}`);
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: GatewayConfig = JSON.parse(configContent);

  if (!config.host || !config.port || !config.pid || !config.token_file) {
    throw new Error('Invalid gateway config: missing required fields (host, port, pid, token_file)');
  }

  return config;
}
