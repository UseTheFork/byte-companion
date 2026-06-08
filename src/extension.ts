import * as vscode from 'vscode';
import * as gateway from './domains/gateway';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
      // Create status bar item
      const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
      statusBarItem.text = '(メ -_-).｡oO ( $(debug-disconnect) Disconnected )';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      statusBarItem.tooltip = 'Byte: Disconnected — click to reconnect';
      statusBarItem.command = 'byte-companion.reconnect';
      statusBarItem.show();
      context.subscriptions.push(statusBarItem);

      // Set up status callback
      gateway.setStatusCallback((status: 'connected' | 'connecting' | 'disconnected') => {
        if (status === 'connected') {
          statusBarItem.text = '(⁠   ^⁠‿⁠^⁠)';
          statusBarItem.backgroundColor = undefined;
          statusBarItem.tooltip = 'Byte: Connected';
        } else if (status === 'disconnected') {
          statusBarItem.text = '(メ -_-).｡oO ( $(debug-disconnect) Disconnected )';
          statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
          statusBarItem.tooltip = 'Byte: Disconnected — click to reconnect';
        } else if (status === 'connecting') {
          statusBarItem.text = '(⁠   ^⁠‿⁠^⁠).｡oO ( $(sync~spin) Connecting...)';
          statusBarItem.backgroundColor = undefined;
          statusBarItem.tooltip = 'Byte: Connecting...';
        }
      });

      // Register reconnect command
      const reconnectDisposable = vscode.commands.registerCommand('byte-companion.reconnect', async () => {
        try {
          gateway.disconnect();
          await gateway.connect(workspaceFolder.uri.fsPath);
          vscode.commands.executeCommand('setContext', 'byte-companion.connected', true);
          console.log('Reconnected to Byte gateway');
        } catch (error) {
          vscode.commands.executeCommand('setContext', 'byte-companion.connected', false);
        }
      });
      context.subscriptions.push(reconnectDisposable);

      try {
        await gateway.connect(workspaceFolder.uri.fsPath);
        vscode.commands.executeCommand('setContext', 'byte-companion.connected', true);
        console.log('Connected to Byte gateway');
      } catch (connectionError) {
        statusBarItem.text = '$(debug-disconnect) Byte: Disconnected';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      }

      const folderActionDisposable = vscode.commands.registerCommand('byte-companion.folderAction', (uri: vscode.Uri) => {
        const folderPath = uri.fsPath;
        gateway.sendRequest('add_file', { file_path: `${folderPath}/**` });
      });
      context.subscriptions.push(folderActionDisposable);

      const folderRemoveActionDisposable = vscode.commands.registerCommand('byte-companion.folderRemoveAction', (uri: vscode.Uri) => {
        const folderPath = uri.fsPath;
        gateway.sendRequest('drop_file', { file_path: `${folderPath}/**` });
      });
      context.subscriptions.push(folderRemoveActionDisposable);

      const fileContextActionDisposable = vscode.commands.registerCommand('byte-companion.fileContextAction', (uri: vscode.Uri) => {
        gateway.sendRequest('context_add_file', { file_path: uri.fsPath });
      });
      context.subscriptions.push(fileContextActionDisposable);

      const fileContextDropActionDisposable = vscode.commands.registerCommand('byte-companion.fileContextDropAction', (uri: vscode.Uri) => {
        gateway.sendRequest('context_drop_file', { input: uri.fsPath });
      });
      context.subscriptions.push(fileContextDropActionDisposable);

      const onOpenDisposable = vscode.workspace.onDidOpenTextDocument((document) => {
        const filePath = document.uri.fsPath;
        const rootPath = workspaceFolder.uri.fsPath;

        if (document.uri.scheme !== 'file' || !filePath.startsWith(rootPath)) {
          return;
        }

        gateway.sendRequest('add_file', { file_path: filePath });
      });
      context.subscriptions.push(onOpenDisposable);

      const onCloseDisposable = vscode.workspace.onDidCloseTextDocument((document) => {
        const filePath = document.uri.fsPath;
        const rootPath = workspaceFolder.uri.fsPath;

        if (document.uri.scheme !== 'file' || !filePath.startsWith(rootPath)) {
          return;
        }

        gateway.sendRequest('drop_file', { file_path: filePath });
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
