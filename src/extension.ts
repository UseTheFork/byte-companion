import * as vscode from 'vscode';
import * as gateway from './domains/gateway';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
      await gateway.connect(workspaceFolder.uri.fsPath);
      vscode.commands.executeCommand('setContext', 'byte-companion.connected', true);
      console.log('Connected to Byte gateway');

      const folderActionDisposable = vscode.commands.registerCommand('byte-companion.folderAction', (uri: vscode.Uri) => {
        const folderPath = uri.fsPath;
        gateway.sendRequest('execute', { input: `/add ${folderPath}/**` });
      });
      context.subscriptions.push(folderActionDisposable);

      const folderRemoveActionDisposable = vscode.commands.registerCommand('byte-companion.folderRemoveAction', (uri: vscode.Uri) => {
        const folderPath = uri.fsPath;
        gateway.sendRequest('execute', { input: `/drop ${folderPath}/**` });
      });
      context.subscriptions.push(folderRemoveActionDisposable);

      const fileContextActionDisposable = vscode.commands.registerCommand('byte-companion.fileContextAction', (uri: vscode.Uri) => {
        gateway.sendRequest('execute', { input: `/ctx:file ${uri.fsPath}` });
      });
      context.subscriptions.push(fileContextActionDisposable);

      const fileContextDropActionDisposable = vscode.commands.registerCommand('byte-companion.fileContextDropAction', (uri: vscode.Uri) => {
        gateway.sendRequest('execute', { input: `/ctx:drop ${uri.fsPath}` });
      });
      context.subscriptions.push(fileContextDropActionDisposable);

      const onOpenDisposable = vscode.workspace.onDidOpenTextDocument((document) => {
        const filePath = document.uri.fsPath;
        const rootPath = workspaceFolder.uri.fsPath;

        console.log(filePath);
        console.log(document.uri.scheme);

        if (document.uri.scheme !== 'file' || !filePath.startsWith(rootPath)) {
          return;
        }

        gateway.sendRequest('execute', { input: `/add ${filePath}` });
      });
      context.subscriptions.push(onOpenDisposable);

      const onCloseDisposable = vscode.workspace.onDidCloseTextDocument((document) => {
        const filePath = document.uri.fsPath;
        const rootPath = workspaceFolder.uri.fsPath;

        if (document.uri.scheme !== 'file' || !filePath.startsWith(rootPath)) {
          return;
        }

        gateway.sendRequest('execute', { input: `/remove ${filePath}` });
      });
      context.subscriptions.push(onCloseDisposable);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to connect to Byte gateway:', message);
  }
}

export function deactivate(): void {
  vscode.commands.executeCommand('setContext', 'byte-companion.connected', false);
  gateway.disconnect();
}
