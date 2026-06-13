import * as vscode from 'vscode';
import * as command from './command';
import * as gateway from './gateway';
import * as status from './status';

class Companion implements vscode.Disposable {
  private output = vscode.window.createOutputChannel('Byte Companion');
  private workspaceFolder: vscode.WorkspaceFolder | undefined;
  private didConnect = new vscode.EventEmitter<void>();
  private didDisconnect = new vscode.EventEmitter<void>();
  private connectionFailed = new vscode.EventEmitter<Error>();

  constructor(
    private context: vscode.ExtensionContext,
    private statusItem: status.Item
  ) {
    this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    this.didConnect.event(() => this.onDidConnect());
    this.didDisconnect.event(() => this.onDidDisconnect());
    this.connectionFailed.event((e) => this.onConnectionFailed(e));
  }

  dispose(): void {
    this.output.dispose();
    this.statusItem.dispose();
    this.didConnect.dispose();
    this.didDisconnect.dispose();
    this.connectionFailed.dispose();
    gateway.disconnect();
  }

  async initialize(): Promise<void> {
    if (!this.workspaceFolder) {
      return;
    }

    gateway.setLogCallback((msg) => this.output.appendLine(msg));
    this.setupStatusCallback();

    this.statusItem.update(status.State.disconnected);
  }

  async connect(): Promise<void> {
    if (!this.workspaceFolder) {
      return;
    }

    try {
      await gateway.connect(this.workspaceFolder.uri.fsPath);
      this.didConnect.fire();
    } catch (error) {
      this.connectionFailed.fire(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  disconnect(): void {
    gateway.disconnect();
    this.didDisconnect.fire();
  }

  private onDidConnect(): void {
    vscode.commands.executeCommand('setContext', 'byte-companion.connected', true);
    this.statusItem.update(status.State.connected);
    this.output.appendLine('Connected to Byte gateway');
  }

  private onDidDisconnect(): void {
    vscode.commands.executeCommand('setContext', 'byte-companion.connected', false);
    this.statusItem.update(status.State.disconnected);
  }

  private onConnectionFailed(error: Error): void {
    vscode.commands.executeCommand('setContext', 'byte-companion.connected', false);
    this.output.appendLine(`Connection failed: ${error.message}`);
  }

  private setupStatusCallback(): void {
    gateway.setStatusCallback((gatewayStatus: 'connected' | 'connecting' | 'disconnected') => {
      if (gatewayStatus === 'connected') {
        this.didConnect.fire();
      } else if (gatewayStatus === 'disconnected') {
        this.didDisconnect.fire();
      } else if (gatewayStatus === 'connecting') {
        this.statusItem.update(status.State.connecting);
      }
    });
  }

  onFolderAction(uri: vscode.Uri): void {
    const folderPath = uri.fsPath;
    this.output.appendLine(`added: ${folderPath}/**`);
    gateway.sendRequest('add_file', { file_path: `${folderPath}/**` });
  }

  onFolderRemoveAction(uri: vscode.Uri): void {
    const folderPath = uri.fsPath;
    this.output.appendLine(`removed: ${folderPath}/**`);
    gateway.sendRequest('drop_file', { file_path: `${folderPath}/**` });
  }

  onFileContextAction(uri: vscode.Uri): void {
    this.output.appendLine(`context added: ${uri.fsPath}`);
    gateway.sendRequest('context_add_file', { file_path: uri.fsPath });
  }

  onFileContextDropAction(uri: vscode.Uri): void {
    this.output.appendLine(`context dropped: ${uri.fsPath}`);
    gateway.sendRequest('context_drop_file', { input: uri.fsPath });
  }

  onDidOpenTextDocument(document: vscode.TextDocument): void {
    if (!this.workspaceFolder) {
      return;
    }

    const filePath = document.uri.fsPath;
    const rootPath = this.workspaceFolder.uri.fsPath;

    if (document.uri.scheme !== 'file' || !filePath.startsWith(rootPath)) {
      return;
    }

    this.output.appendLine(`added: ${filePath}`);
    gateway.sendRequest('add_file', { file_path: filePath });
  }

  onDidCloseTextDocument(document: vscode.TextDocument): void {
    if (!this.workspaceFolder) {
      return;
    }

    const filePath = document.uri.fsPath;
    const rootPath = this.workspaceFolder.uri.fsPath;

    if (document.uri.scheme !== 'file' || !filePath.startsWith(rootPath)) {
      return;
    }

    this.output.appendLine(`removed: ${filePath}`);
    gateway.sendRequest('drop_file', { file_path: filePath });
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const statusItem = new status.Item(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100));
  const companion = new Companion(context, statusItem);
  context.subscriptions.push(companion);
  await companion.initialize();

  context.subscriptions.push(
    vscode.commands.registerCommand(command.Companion.reconnect, async () => {
      await companion.reconnect();
    }),
    vscode.commands.registerCommand(command.Companion.folderAction, (uri: vscode.Uri) => {
      companion.onFolderAction(uri);
    }),
    vscode.commands.registerCommand(command.Companion.folderRemoveAction, (uri: vscode.Uri) => {
      companion.onFolderRemoveAction(uri);
    }),
    vscode.commands.registerCommand(command.Companion.fileContextAction, (uri: vscode.Uri) => {
      companion.onFileContextAction(uri);
    }),
    vscode.commands.registerCommand(command.Companion.fileContextDropAction, (uri: vscode.Uri) => {
      companion.onFileContextDropAction(uri);
    }),
    vscode.workspace.onDidOpenTextDocument((document) => {
      companion.onDidOpenTextDocument(document);
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      companion.onDidCloseTextDocument(document);
    }),
    vscode.window.tabGroups.onDidChangeTabs(async (e) => {
      for (const tab of e.opened) {
        if (tab.input instanceof vscode.TabInputText) {
          const document = await vscode.workspace.openTextDocument(tab.input.uri);
          companion.onDidOpenTextDocument(document);
        }
      }
    })
  );
}

export function deactivate(): void {
  vscode.commands.executeCommand('setContext', 'byte-companion.connected', false);
}
