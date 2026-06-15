import vscode from 'vscode';
import * as command from './command';

export class State {
  private constructor(
    readonly text: string,
    readonly tooltip: string,
    readonly command?: command.Companion,
    readonly backgroundColor?: vscode.ThemeColor
  ) {}

  static disconnected = new State(
    '(メ -_-)',
    'Byte: Disconnected — click to reconnect',
    command.Companion.reconnect,
    new vscode.ThemeColor('statusBarItem.warningBackground')
  );

  static connecting = new State('(⁠   ^⁠‿⁠^⁠).｡oO ( $(sync~spin) Connecting...)', 'Byte: Connecting...');

  static connected = new State('(⁠   ^⁠‿⁠^⁠)', 'Byte: Connected');

  static connectedWithCount(fileCount: number, contextCount: number): State {
    return new State(`(⁠   ^⁠‿⁠^⁠) | ${fileCount} files | ${contextCount} context`, 'Byte: Connected');
  }
}

export class Item implements vscode.Disposable {
  private state: State = State.disconnected;

  constructor(private item: vscode.StatusBarItem) {
    this.update(State.disconnected);
    item.show();
  }

  dispose(): void {
    this.item.dispose();
  }

  update(state: State): void {
    this.state = state;
    this.item.text = state.text;
    this.item.tooltip = state.tooltip;
    this.item.command = state.command;
    this.item.backgroundColor = state.backgroundColor;
  }

  refresh(): void {
    this.update(this.state);
  }
}
