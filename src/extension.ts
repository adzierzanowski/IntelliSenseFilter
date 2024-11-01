import { commands, ExtensionContext } from 'vscode';
import { FilterManager } from './FilterManager';
import { Output } from './global';

const fm = new FilterManager();

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand(
      'intellisensefilter.pick',
      fm.showQuickPick.bind(fm),
    ),
    commands.registerCommand('intellisensefilter.toggle', fm.toggle.bind(fm)),
    commands.registerCommand(
      'intellisensefilter.singleOut',
      fm.singleOut.bind(fm),
    ),
    commands.registerCommand(
      'intellisensefilter.enableAll',
      fm.enableAll.bind(fm),
    ),
  );

  Output.info('Intellisense Filter active');
}

export function deactivate() {}
