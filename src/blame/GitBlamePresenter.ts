import { GitBlameInfo } from './GitBlameInfo';
import { Disposable } from 'vscode';

export interface GitBlamePresenter extends Disposable {
  present(blame?: GitBlameInfo): Promise<void>;
}
