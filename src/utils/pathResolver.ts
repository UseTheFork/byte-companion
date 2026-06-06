import * as fs from 'fs';
import * as path from 'path';

export function findByteDir(startPath: string): string | null {
  let currentPath = startPath;

  while (currentPath !== path.dirname(currentPath)) {
    const byteDir = path.join(currentPath, '.byte');
    if (fs.existsSync(byteDir) && fs.statSync(byteDir).isDirectory()) {
      return byteDir;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}
