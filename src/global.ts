import { window } from 'vscode';

export const Output = window.createOutputChannel('intellisensefilter', {
  log: true,
});
