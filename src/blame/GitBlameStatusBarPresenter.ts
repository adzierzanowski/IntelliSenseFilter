import { Disposable, StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { GitBlamePresenter } from './GitBlamePresenter';
import { GitBlameInfo } from './GitBlameInfo';

export class GitBlameStatusBarPresenter implements GitBlamePresenter {
  private disposables: Disposable[] = [];
  private sbItem?: StatusBarItem = undefined;

  constructor() {
    this.sbItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
    this.sbItem.text = '$(git-pull-request-new-changes) blame';
    this.sbItem.show();
  }

  dispose(): void {
    for (const item of this.disposables) {
      item.dispose();
    }
    this.sbItem?.dispose();
  }

  async present(blame?: GitBlameInfo): Promise<void> {
    if (this.sbItem !== undefined) {
      this.sbItem.text = blame?.toString() ?? 'undefined';
    }
  }
}
