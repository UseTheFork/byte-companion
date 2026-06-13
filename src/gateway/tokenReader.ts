import * as fs from 'fs';

export function readToken(tokenFilePath: string): string {
  if (!fs.existsSync(tokenFilePath)) {
    throw new Error(`Token file not found at ${tokenFilePath}`);
  }

  const token = fs.readFileSync(tokenFilePath, 'utf-8').trim();
  if (!token) {
    throw new Error('Token file is empty');
  }

  return token;
}
