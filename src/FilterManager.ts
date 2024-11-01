import { commands, ConfigurationTarget, window, workspace } from 'vscode';
import { CompletionItemNames, ItemKind, ItemKindQPItem } from './ItemKind';

export class FilterManager {
  items: ItemKind[];

  constructor() {
    this.items = [...CompletionItemNames.keys()].map((k) => new ItemKind(k));
  }

  async onDidApplyFilter() {
    const config = workspace.getConfiguration('intellisensefilter');
    if (config.get<boolean>('triggerOnApply')) {
      await commands.executeCommand('hideSuggestWidget');
      await commands.executeCommand('editor.action.triggerSuggest');
    }
  }

  async toggle(names: string[]) {
    await Promise.allSettled(
      this.items
        .filter((item) => names.includes(item.name))
        .map((item) => item.toggle()),
    );
    await this.onDidApplyFilter();
  }

  async singleOut(names: string[]) {
    const config = workspace.getConfiguration('editor.suggest');

    await Promise.allSettled(
      this.items.map((item) =>
        config.update(item.configKey, names.includes(item.name)),
      ),
    );
    await this.onDidApplyFilter();
  }

  async enableAll() {
    const config = workspace.getConfiguration('editor.suggest');
    await Promise.allSettled(
      this.items.map((item) => config.update(item.configKey, true)),
    );
    await this.onDidApplyFilter();
  }

  async showQuickPick() {
    const qp = window.createQuickPick<ItemKindQPItem>();
    const items: ItemKindQPItem[] = [];
    const selectedItems: ItemKindQPItem[] = [];

    for (const item of this.items) {
      const enabled = await item.enabled();
      const qpItem: ItemKindQPItem = await item.asQuickPickItem();

      items.push(qpItem);
      if (enabled) {
        selectedItems.push(qpItem);
      }
    }

    qp.title = 'IntelliSense Suggestion Filter';
    qp.items = items;
    qp.selectedItems = selectedItems;
    qp.canSelectMany = true;

    qp.onDidAccept(() => {
      qp.busy = true;

      const config = workspace.getConfiguration('editor.suggest');
      const updates = qp.items.map((item) =>
        config.update(item.itemKind.configKey, qp.selectedItems.includes(item)),
      );

      Promise.allSettled(updates)
        .then(async () => {
          await this.onDidApplyFilter();
        })
        .finally(() => qp.dispose());
    });

    qp.onDidTriggerItemButton((e) => {
      if (e.button.tooltip === 'Single Out') {
        qp.selectedItems = [e.item];
      }
    });

    qp.show();
  }
}
