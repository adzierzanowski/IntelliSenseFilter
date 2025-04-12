import { Disposable, ExtensionContext, workspace } from 'vscode';

export abstract class Tool implements Disposable {
  protected name: string;
  protected id: string;
  protected abstract disposables: Disposable[];

  protected getConfig<T>(section: string, defaultValue: T): T | undefined {
    const sectionChunks = section.split('.');
    const key = sectionChunks.pop();
    if (key === undefined) {
      throw new Error('key is undefined');
    }
    section = sectionChunks.join('.');

    const sectionPath = section === '' ? this.id : `${this.id}.${section}`;

    return workspace.getConfiguration(sectionPath).get<T>(key, defaultValue);
  }

  get enabled(): boolean {
    const result = this.getConfig<boolean>('enabled', false);

    return result === undefined ? false : result;
  }

  constructor(name: string, id: string) {
    this.name = name;
    this.id = `doublefloat.inspector.${id}`;
  }

  dispose() {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  idWith(...parts: string[]) {
    return [this.id, ...parts].join('.');
  }

  abstract register(context: ExtensionContext): Disposable[];
}
