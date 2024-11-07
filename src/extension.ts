import {
  commands,
  env,
  ExtensionContext,
  ExtensionMode,
  QuickPickItem,
  ThemeIcon,
  window,
  workspace,
} from 'vscode';
import { Output } from './global';
import { GitBlameTool } from './blame/GitBlameTool';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('doublefloat.inspector.quickPick', showQuickPick),
    commands.registerCommand(
      'doublefloat.inspector.inspectCommands',
      inspectCommands,
    ),
    commands.registerCommand(
      'doublefloat.inspector.inspectSettings',
      inspectSettings,
    ),
    commands.registerCommand(
      'doublefloat.inspector.runInTerminal',
      runInTerminal,
    ),
    new GitBlameTool(),
  );

  if (context.extensionMode === ExtensionMode.Development) {
  }

  Output.info('Inspector Gadget');
}

export async function runInTerminal(args: string[]) {
  window.activeTerminal?.sendText(args.join(' '), true);
}

export async function showQuickPick() {
  const quickPick = window.createQuickPick<QuickPickItem>();

  quickPick.items = [
    {
      detail: 'doublefloat.inspector.inspectCommands',
      label: 'Inspect VSCode Commands',
      iconPath: new ThemeIcon('terminal'),
    },
    {
      detail: 'doublefloat.inspector.inspectSettings',
      label: 'Inspect Settings',
      iconPath: new ThemeIcon('settings'),
    },
  ];

  quickPick.onDidAccept(async (e) => {
    try {
      await commands.executeCommand(quickPick.selectedItems[0].detail!);
    } catch (err) {
      Output.error(`${err}`);
      Output.show();
    }
  });

  quickPick.show();
}

export async function inspectCommands() {
  const allCommands = await commands.getCommands();
  const quickPick = window.createQuickPick<QuickPickItem>();

  quickPick.items = allCommands.map((cmd) => ({
    label: cmd,
    buttons: [{ iconPath: new ThemeIcon('copy'), tooltip: 'Copy Command ID' }],
  }));

  quickPick.onDidTriggerItemButton(async (e) => {
    if (e.button.tooltip === 'Copy Command ID') {
      await env.clipboard.writeText(quickPick.selectedItems[0].label);
    }
  });

  quickPick.onDidAccept(async (e) => {
    const commandID = quickPick.selectedItems[0].label;
    await commands.executeCommand(commandID);
  });

  quickPick.show();
}

export async function inspectSettings() {
  const config = workspace.getConfiguration();
  let configKeys: string[] = [];

  const getKeys = (topKey?: string) => {
    const obj = topKey ? config.get(topKey) : config;
    const keys = Object.keys(obj as Object);

    for (const key of keys) {
      const resultingKey = topKey ? `${topKey}.${key}` : key;
      const value = config.get(resultingKey);

      if (['has', 'get', 'update', 'inspect'].includes(key)) {
        continue;
      }

      if (value?.constructor === Object) {
        if (config.has(resultingKey)) {
          getKeys(resultingKey);
        } else if (topKey) {
          configKeys.push(topKey);
          return;
        }
      } else {
        configKeys.push(resultingKey);
      }
    }
  };

  getKeys();

  const configKey = await window.showQuickPick(configKeys, {
    canPickMany: false,
    placeHolder: 'Select a config key',
  });

  if (configKey === undefined) {
    return;
  }

  const configValue = workspace.getConfiguration().get(configKey);
  if (configValue === undefined) {
    window.showErrorMessage('Config value is undefined');
    return;
  }

  const inspected = workspace.getConfiguration().inspect(configKey);
  if (inspected) {
    Output.show();
    Object.entries(inspected).forEach(([key, value]) => {
      Output.appendLine(
        `${value === configKey ? '' : '        '}${key}: ${value}`,
      );
    });

    Output.appendLine(`======= Final Value: ${configValue}`);
  }
}

export function deactivate() {}
