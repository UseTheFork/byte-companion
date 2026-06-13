import * as vscode from 'vscode';
import * as gateway from './domains/gateway';

class Companion implements vscode.Disposable {
  private output = vscode.window.createOutputChannel('Byte Companion');
  private statusBarItem: vscode.StatusBarItem;
  private workspaceFolder: vscode.WorkspaceFolder | undefined;

  constructor(private context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  }

  dispose(): void {
    this.output.dispose();
    this.statusBarItem.dispose();
    gateway.disconnect();
  }

  async initialize(): Promise<void> {
    if (!this.workspaceFolder) {
      return;
    }

    gateway.setLogCallback((msg) => this.output.appendLine(msg));
    this.setupStatusCallback();
    this.registerCommands();
    this.registerEventListeners();

    try {
      await this.connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.output.appendLine(`Failed to connect to Byte gateway: ${message}`);
      this.updateStatusBar('disconnected');
    }
  }

  async connect(): Promise<void> {
    if (!this.workspaceFolder) {
      return;
    }

    try {
      await gateway.connect(this.workspaceFolder.uri.fsPath);
      vscode.commands.executeCommand('setContext', 'byte-companion.connected', true);
      this.output.appendLine('Connected to Byte gateway');
    } catch (error) {
      vscode.commands.executeCommand('setContext', 'byte-companion.connected', false);
      throw error;
    }
  }

  async reconnect(): Promise<void> {
    if (!this.workspaceFolder) {
      return;
    }

    try {
      gateway.disconnect();
      await this.connect();
      this.output.appendLine('Reconnected to Byte gateway');
    } catch (error) {
      vscode.commands.executeCommand('setContext', 'byte-companion.connected', false);
    }
  }

  disconnect(): void {
    gateway.disconnect();
    vscode.commands.executeCommand('setContext', 'byte-companion.connected', false);
  }

  private setupStatusCallback(): void {
    gateway.setStatusCallback((status: 'connected' | 'connecting' | 'disconnected') => {
      this.updateStatusBar(status);
    });
  }

  private updateStatusBar(status: 'connected' | 'connecting' | 'disconnected'): void {
    if (status === 'connected') {
      this.statusBarItem.text = '(⁠   ^⁠‿⁠^⁠)';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = 'Byte: Connected';
    } else if (status === 'disconnected') {
      this.statusBarItem.text = '(メ -_-).｡oO ( $(debug-disconnect) Disconnected )';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.tooltip = 'Byte: Disconnected — click to reconnect';
    } else if (status === 'connecting') {
      this.statusBarItem.text = '(⁠   ^⁠‿⁠^⁠).｡oO ( $(sync~spin) Connecting...)';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = 'Byte: Connecting...';
    }

    this.statusBarItem.command = 'byte-companion.reconnect';
    this.statusBarItem.show();
  }

  private registerCommands(): void {
    this.context.subscriptions.push(
      vscode.commands.registerCommand('byte-companion.reconnect', async () => {
        await this.reconnect();
      }),
      vscode.commands.registerCommand('byte-companion.folderAction', (uri: vscode.Uri) => {
        this.onFolderAction(uri);
      }),
      vscode.commands.registerCommand('byte-companion.folderRemoveAction', (uri: vscode.Uri) => {
        this.onFolderRemoveAction(uri);
      }),
      vscode.commands.registerCommand('byte-companion.fileContextAction', (uri: vscode.Uri) => {
        this.onFileContextAction(uri);
      }),
      vscode.commands.registerCommand('byte-companion.fileContextDropAction', (uri: vscode.Uri) => {
        this.onFileContextDropAction(uri);
      }),
    );
  }

  private registerEventListeners(): void {
    this.context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((document) => {
        this.onDidOpenTextDocument(document);
      }),
      vscode.workspace.onDidCloseTextDocument((document) => {
        this.onDidCloseTextDocument(document);
      }),
      vscode.window.tabGroups.onDidChangeTabs(async (e) => {
        for (const tab of e.opened) {
          if (tab.input instanceof vscode.TabInputText) {
            const document = await vscode.workspace.openTextDocument(tab.input.uri);
            this.onDidOpenTextDocument(document);
          }
        }
      }),
    );
  }

  private onFolderAction(uri: vscode.Uri): void {
    const folderPath = uri.fsPath;
    gateway.sendRequest('add_file', { file_path: `${folderPath}/**` });
  }

  private onFolderRemoveAction(uri: vscode.Uri): void {
    const folderPath = uri.fsPath;
    gateway.sendRequest('drop_file', { file_path: `${folderPath}/**` });
  }

  private onFileContextAction(uri: vscode.Uri): void {
    gateway.sendRequest('context_add_file', { file_path: uri.fsPath });
  }

  private onFileContextDropAction(uri: vscode.Uri): void {
    gateway.sendRequest('context_drop_file', { input: uri.fsPath });
  }

  private onDidOpenTextDocument(document: vscode.TextDocument): void {
    if (!this.workspaceFolder) {
      return;
    }

    const filePath = document.uri.fsPath;
    const rootPath = this.workspaceFolder.uri.fsPath;

    if (document.uri.scheme !== 'file' || !filePath.startsWith(rootPath)) {
      return;
    }

    gateway.sendRequest('add_file', { file_path: filePath });
  }

  private onDidCloseTextDocument(document: vscode.TextDocument): void {
    if (!this.workspaceFolder) {
      return;
    }

    const filePath = document.uri.fsPath;
    const rootPath = this.workspaceFolder.uri.fsPath;

    if (document.uri.scheme !== 'file' || !filePath.startsWith(rootPath)) {
      return;
    }

    gateway.sendRequest('drop_file', { file_path: filePath });
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const companion = new Companion(context);
  context.subscriptions.push(companion);
  await companion.initialize();
}

export function deactivate(): void {
  vscode.commands.executeCommand('setContext', 'byte-companion.connected', false);
}
