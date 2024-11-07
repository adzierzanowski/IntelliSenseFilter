import { window } from 'vscode';

export const Output = window.createOutputChannel('Inspector Gadget', {
  log: true,
});
