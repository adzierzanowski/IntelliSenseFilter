import {
  CancellationToken,
  CodeLens,
  CodeLensProvider,
  Disposable,
  Event,
  ProviderResult,
  EventEmitter,
  TextDocument,
  languages,
  window,
  commands,
  TextEditorSelectionChangeEvent,
  env,
  StatusBarItem,
  StatusBarAlignment,
} from 'vscode';
import { GitBlameInfo } from './GitBlameInfo';
import { Output } from './global';

class GitBlameCodeLensProvider implements CodeLensProvider {
  onDidChangeCodeLenses: Event<void>;
  private tool: GitBlameTool;

  constructor(tool: GitBlameTool) {
    this.tool = tool;
    this.onDidChangeCodeLenses = tool.onDidChangeCodeLenses.event;
  }

  provideCodeLenses(
    document: TextDocument,
    token: CancellationToken,
  ): ProviderResult<CodeLens[]> {
    const blame = this.tool.currentBlame;
    if (
      token.isCancellationRequested ||
      document !== window.activeTextEditor?.document ||
      blame === undefined
    ) {
      return;
    }

    return [new CodeLens(document.lineAt(blame.line).range)];
  }

  resolveCodeLens(
    codeLens: CodeLens,
    token: CancellationToken,
  ): ProviderResult<CodeLens> {
    const blame = this.tool.currentBlame;

    if (token.isCancellationRequested || blame === undefined) {
      return null;
    }

    codeLens.command = {
      command: 'doublefloat.inspector.blame.copyCommitId',
      arguments: [blame.commitHash],
      title: blame.committed
        ? [
            `$(account) ${blame.author}`, // ${blame.authorMail}`,
            `$(history) ${blame.relativeTime}`,
            `$(git-commit) ${blame.commitHash.slice(0, 8)} ${blame.summary}`,
            `$(git-pull-request-create) ${blame.commitCount} commit${blame.commitCount > 1 ? 's' : ''}`,
          ].join('$(blank)')
        : '$(git-commit) uncommitted',
      tooltip: `${blame.authorMail}`,
    };
    return codeLens;
  }
}

export class GitBlameTool implements Disposable {
  onDidChangeCodeLenses: EventEmitter<void>;

  currentBlame?: GitBlameInfo = undefined;

  private disposables: Disposable[] = [];
  private codeLensProvider: GitBlameCodeLensProvider;
  private sbItem: StatusBarItem = window.createStatusBarItem(
    StatusBarAlignment.Right,
    100,
  );

  constructor() {
    this.onDidChangeCodeLenses = new EventEmitter<void>();
    this.codeLensProvider = new GitBlameCodeLensProvider(this);

    this.disposables.push(
      languages.registerCodeLensProvider('*', this.codeLensProvider),
      commands.registerCommand(
        'doublefloat.inspector.blame.show',
        this.blame,
        this,
      ),
      commands.registerCommand(
        'doublefloat.inspector.blame.copyCommitId',
        this.copyCommitId,
        this,
      ),
      this.sbItem,
    );
    window.onDidChangeTextEditorSelection(
      this.onDidChangeTextEditorSelection,
      this,
      this.disposables,
    );

    this.sbItem.command = 'doublefloat.inspector.blame.show';
    this.sbItem.show();
  }

  async onDidChangeTextEditorSelection(e: TextEditorSelectionChangeEvent) {
    const blame = await GitBlameInfo.fetch(
      e.textEditor.document,
      e.textEditor.selection.active.line,
    );

    if (blame.committed) {
      this.sbItem.text = `$(git-commit) ${blame.author} ${blame.relativeTime}`;
    } else {
      this.sbItem.text = '$(git-commit) uncommitted';
    }

    this.currentBlame = undefined;
    this.onDidChangeCodeLenses.fire();
  }

  async copyCommitId(hash: string) {
    env.clipboard.writeText(hash);
  }

  async blame() {
    const editor = window.activeTextEditor;
    if (editor === undefined) {
      return;
    }

    const document = editor.document;
    const line = editor.selection.active.line;

    this.currentBlame = await GitBlameInfo.fetch(document, line);
    this.onDidChangeCodeLenses.fire();
  }

  dispose() {
    for (const item of this.disposables) {
      item.dispose();
    }
  }
}
