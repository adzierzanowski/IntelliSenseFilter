import {
  CompletionItemKind,
  QuickPickItem,
  ThemeIcon,
  workspace,
} from 'vscode';

export interface ItemKindQPItem extends QuickPickItem {
  itemKind: ItemKind;
}

export const CompletionItemNames = Object.freeze(
  new Map(
    (Object.entries(CompletionItemKind) as Array<[string, CompletionItemKind]>)
      .filter(([k, v]) => k.match(/^\d+/gm) === null)
      .map(([k, v]) => [v, k]),
  ),
);

export class ItemKind {
  completionKind: CompletionItemKind;
  name: string;

  constructor(completionKind: CompletionItemKind) {
    this.completionKind = completionKind;
    this.name = CompletionItemNames.get(completionKind)!;
  }

  get configKey(): string {
    switch (this.completionKind) {
      case CompletionItemKind.Class:
        return `show${this.name}es`;
      case CompletionItemKind.Property:
        return 'showProperties';
      case CompletionItemKind.Text:
        return 'showWords';
      default:
        return `show${this.name}s`;
    }
  }

  get iconId(): string {
    switch (this.completionKind) {
      case CompletionItemKind.EnumMember:
        return 'symbol-enum-member';
      case CompletionItemKind.TypeParameter:
        return 'symbol-type-parameter';
      case CompletionItemKind.User:
        return 'symbol-text';
      default:
        return `symbol-${this.name.toLowerCase()}`;
    }
  }

  async enabled(): Promise<boolean> {
    const config = workspace.getConfiguration('editor.suggest');
    return (await config.get(this.configKey)) ?? false;
  }

  async setEnabled(enabled: boolean) {
    const config = workspace.getConfiguration('editor.suggest');
    await config.update(this.configKey, enabled);
  }

  async toggle() {
    const enabled = await this.enabled();
    await this.setEnabled(!enabled);
  }

  async asQuickPickItem(): Promise<ItemKindQPItem> {
    return {
      itemKind: this,
      label: this.name,
      iconPath: new ThemeIcon(this.iconId),
      buttons: [{ iconPath: new ThemeIcon('gather'), tooltip: 'Single Out' }],
    };
  }
}
