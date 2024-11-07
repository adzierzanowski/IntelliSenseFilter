import { TextDocument, workspace } from 'vscode';
import { Output } from '../global';
import { spawn } from 'child_process';
import { GitBlameInfo } from './GitBlameInfo';

export class GitBlameProvider {
  async provideBlame(
    document: TextDocument,
    line: number,
  ): Promise<GitBlameInfo> {
    Output.info(`providing blame for ${document.fileName}:${line}`);

    return new Promise((resolve, reject) => {
      const path = workspace.asRelativePath(document.fileName);
      const l = line + 1;
      const ps = spawn(`git blame ${path} -L${l},${l} -p`, {
        shell: true,
        cwd: workspace.workspaceFolders?.[0].uri.fsPath,
      });
      let stdout = '';
      let stderr = '';

      ps.stderr.on('data', (chunk) => (stderr += chunk));
      ps.stdout.on('data', (chunk) => (stdout += chunk));
      ps.on('exit', (exitCode) => {
        if (exitCode === 0) {
          resolve(GitBlameInfo.parse(stdout, document, line));
        } else {
          Output.error(stderr);
          reject(undefined);
        }
      });
    });
  }
}
