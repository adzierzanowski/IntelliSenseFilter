import {
  ConfigurationChangeEvent,
  Disposable,
  TextDocument,
  TextEditor,
  TextEditorSelectionChangeEvent,
  window,
  workspace,
  WorkspaceConfiguration,
} from 'vscode';
import { GitBlameInfo } from './GitBlameInfo';
import { GitBlameProvider } from './GitBlameProvider';
import { Output } from '../global';
import { GitBlamePresenter } from './GitBlamePresenter';
import { GitBlameStatusBarPresenter } from './GitBlameStatusBarPresenter';
import { GitBlameCodeLensPresenter } from './GitBlameCodeLensPresenter';

export enum GitBlameToolPlacement {
  Inline = 'Inline',
  StatusBar = 'StatusBar',
  CodeLens = 'CodeLens',
}

export class GitBlameTool implements Disposable {
  static ConfigSection = 'doublefloat.inspector.blame';

  private disposables: Disposable[] = [];

  private lastLine?: number = undefined;
  private lastDocument?: TextDocument = undefined;
  private presenter?: GitBlamePresenter = undefined;
  private _currentBlame?: GitBlameInfo = undefined;

  get currentBlame(): GitBlameInfo | undefined {
    return this._currentBlame;
  }

  private set currentBlame(value: GitBlameInfo | undefined) {
    this._currentBlame = value;
    this.onDidChangeCurrentBlame(value);
  }

  private blameProvider: GitBlameProvider = new GitBlameProvider();

  get config(): WorkspaceConfiguration {
    return workspace.getConfiguration(GitBlameTool.ConfigSection);
  }

  get enabled(): boolean {
    return this.config.get<boolean>('enabled', false);
  }

  get placement(): GitBlameToolPlacement {
    return this.config.get<GitBlameToolPlacement>(
      'placement',
      GitBlameToolPlacement.StatusBar,
    );
  }

  constructor() {
    Output.info('GitBlameTool constructor');

    this.updatePresenter();

    workspace.onDidChangeConfiguration(
      this.onDidChangeConfiguration,
      this,
      this.disposables,
    );

    window.onDidChangeTextEditorSelection(
      this.onDidChangeTextEditorSelection,
      this,
      this.disposables,
    );
  }

  private async updatePresenter() {
    Output.info('updatePresenter');
    this.presenter?.dispose();

    switch (this.placement) {
      case GitBlameToolPlacement.CodeLens:
        this.presenter = new GitBlameCodeLensPresenter();
        break;
      case GitBlameToolPlacement.Inline:
        this.presenter = new GitBlameStatusBarPresenter();
        break;
      case GitBlameToolPlacement.StatusBar:
        this.presenter = new GitBlameStatusBarPresenter();
        break;
    }
  }

  private async onDidChangeTextEditorSelection(
    e: TextEditorSelectionChangeEvent,
  ) {
    if (e.textEditor === window.activeTextEditor) {
      await this.provideBlameForEditor(e.textEditor);
    }
  }

  private async provideBlameForEditor(editor?: TextEditor) {
    if (editor !== undefined) {
      await this.provideBlame(editor.document, editor.selection.active.line);
    }
  }

  private async provideBlame(document: TextDocument, line: number) {
    if (this.enabled) {
      if (line !== this.lastLine || this.lastDocument !== document) {
        this.lastDocument = document;
        this.lastLine = line;
        this.currentBlame = await this.blameProvider.provideBlame(
          document,
          line,
        );
      }
    }
  }

  private async onDidChangeCurrentBlame(blame?: GitBlameInfo) {
    Output.info(`blame change: ${blame?.toString() ?? 'undefined'}`);
    await this.presenter?.present(blame);
  }

  private async onDidChangeConfiguration(e: ConfigurationChangeEvent) {
    if (e.affectsConfiguration(GitBlameTool.ConfigSection)) {
      await this.updatePresenter();
    }
  }

  dispose() {
    this.presenter?.dispose();
    for (const item of this.disposables) {
      item.dispose();
    }
  }
}
