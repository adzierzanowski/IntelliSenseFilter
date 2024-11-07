import {
  CancellationToken,
  CodeLens,
  CodeLensProvider,
  Event,
  languages,
  ProviderResult,
  TextDocument,
  Disposable,
  EventEmitter,
  window,
} from 'vscode';
import { GitBlameInfo } from './GitBlameInfo';
import { GitBlamePresenter } from './GitBlamePresenter';

class GitBlameCodeLensProvider implements CodeLensProvider {
  private presenter: GitBlameCodeLensPresenter;
  onDidChangeCodeLenses: Event<void>;

  constructor(presenter: GitBlameCodeLensPresenter) {
    this.presenter = presenter;
    this.onDidChangeCodeLenses = presenter.onDidChangeCodeLenses.event;
  }

  provideCodeLenses(
    document: TextDocument,
    token: CancellationToken,
  ): ProviderResult<CodeLens[]> {
    const blame = this.presenter.currentBlame;
    if (
      !token.isCancellationRequested &&
      document === window.activeTextEditor?.document &&
      blame?.document === document
    ) {
      return [
        new CodeLens(
          document.lineAt(window.activeTextEditor.selection.active.line).range,
          {
            command: 'doublefloat.inspector.quickPick',
            title: `$(account) ${blame.author} ${blame.authorMail}`,
          },
        ),
        new CodeLens(
          document.lineAt(window.activeTextEditor.selection.active.line).range,
          {
            command: 'doublefloat.inspector.quickPick',
            title: `$(history) ${new Date(1000 * blame.authorTime).toISOString().slice(0, 10)}`,
          },
        ),
        new CodeLens(
          document.lineAt(window.activeTextEditor.selection.active.line).range,
          {
            command: 'doublefloat.inspector.quickPick',
            title: `$(symbol-constant) ${blame.commitHash.slice(0, 8)} ${blame.summary}`,
          },
        ),
      ];
    }
    return null;
  }

  // resolveCodeLens(
  //   codeLens: CodeLens,
  //   token: CancellationToken,
  // ): ProviderResult<CodeLens> {
  //   if (token.isCancellationRequested) {
  //     return null;
  //   }

  //   codeLens.command = {
  //     title: this.presenter.currentBlame?.toString() ?? '',
  //     command: 'doublefloat.inspector.quickPick',
  //   };

  //   return codeLens;
  // }
}

export class GitBlameCodeLensPresenter implements GitBlamePresenter {
  onDidChangeCodeLenses: EventEmitter<void>;
  currentBlame?: GitBlameInfo = undefined;

  private codeLensProvider: GitBlameCodeLensProvider;
  private disposables: Disposable[] = [];

  constructor() {
    this.onDidChangeCodeLenses = new EventEmitter<void>();
    this.codeLensProvider = new GitBlameCodeLensProvider(this);
    this.disposables.push(
      languages.registerCodeLensProvider('*', this.codeLensProvider),
    );
  }

  async present(blame?: GitBlameInfo): Promise<void> {
    this.currentBlame = blame;
    this.onDidChangeCodeLenses.fire();
  }

  dispose() {
    for (const item of this.disposables) {
      item.dispose();
    }
  }
}
