import * as vscode from 'vscode';
import * as gateway from './domains/gateway';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Congratulations, your extension "byte-companion" is now active!');

  const disposable = vscode.commands.registerCommand('byte-companion.helloWorld', () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    vscode.window.showInformationMessage('Hello World from byte-companion!');
  });

  context.subscriptions.push(disposable);

  // Establish WebSocket connection to Byte gateway
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
      await gateway.connect(workspaceFolder.uri.fsPath);
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

      const onOpenDisposable = vscode.workspace.onDidOpenTextDocument((document) => {
        const filePath = document.uri.fsPath;
        const rootPath = workspaceFolder.uri.fsPath;

        if (!filePath.startsWith(rootPath)) {
          return;
        }

        gateway.sendRequest('execute', { input: `/add ${filePath}` });
      });
      context.subscriptions.push(onOpenDisposable);

      const onCloseDisposable = vscode.workspace.onDidCloseTextDocument((document) => {
        const filePath = document.uri.fsPath;
        const rootPath = workspaceFolder.uri.fsPath;

        if (!filePath.startsWith(rootPath)) {
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

// This method is called when your extension is deactivated
export function deactivate(): void {
  gateway.disconnect();
}
