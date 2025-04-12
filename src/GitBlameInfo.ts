import { spawn } from 'child_process';
import { TextDocument, workspace } from 'vscode';
import { Output } from './global';

export class GitBlameInfo {
  document: TextDocument;
  line: number = 0;
  commitHash: string = '';
  author: string = '';
  authorMail: string = '';
  authorTime: number = 0;
  authorTz: string = '';
  committer: string = '';
  committerMail: string = '';
  committerTime: number = 0;
  committerTz: string = '';
  summary: string = '';
  commitCount: number = 0;

  get committed(): boolean {
    return this.authorMail !== '<not.committed.yet>';
  }

  constructor(document: TextDocument, line: number) {
    this.document = document;
    this.line = line;
  }

  static async fetch(
    document: TextDocument,
    line: number,
  ): Promise<GitBlameInfo> {
    return new Promise((resolve, reject) => {
      const path = document.fileName;
      const cwd = workspace.workspaceFolders?.[0]?.uri.fsPath;

      if (cwd === undefined) {
        reject('Could not get working directory');
      }

      const ps = spawn(
        `git blame ${path} -L${line + 1},${line + 1} -p --show-stats`,
        {
          shell: true,
          cwd,
        },
      );

      let stdout = '';
      let stderr = '';

      ps.stdout.on('data', (chunk) => (stdout += chunk));
      ps.stderr.on('data', (chunk) => (stderr += chunk));
      ps.on('exit', (exitCode) => {
        if (exitCode === 0) {
          resolve(GitBlameInfo.parse(stdout, document, line));
        } else {
          reject(stderr);
        }
      });
    });
  }

  static parse(
    stdout: string,
    document: TextDocument,
    line: number,
  ): GitBlameInfo {
    Output.debug(`${stdout}`);
    const out = new GitBlameInfo(document, line);

    const lines = stdout.split('\n');
    out.commitHash = lines[0].split(' ')[0];

    for (const line of lines.slice(1)) {
      if (line.startsWith('num commits')) {
        out.commitCount = parseInt(line.split(': ')[1]);
        continue;
      }
      const [key, ...rest] = line.split(' ');
      switch (key) {
        case 'author':
          out.author = rest.join(' ');
          break;
        case 'author-mail':
          out.authorMail = rest.join(' ');
          break;
        case 'author-time':
          out.authorTime = parseInt(rest[0]);
          break;
        case 'committer':
          out.committer = rest.join(' ');
          break;
        case 'committer-mail':
          out.committerMail = rest.join(' ');
          break;
        case 'committer-time':
          out.committerTime = parseInt(rest[0]);
          break;
        case 'summary':
          out.summary = rest.join(' ');
          break;
      }
    }

    return out;
  }

  get relativeTime() {
    const date = new Date(this.authorTime * 1000);
    if (date === undefined) {
      return '';
    }

    const units: { [key: string]: number } = {
      year: 24 * 60 * 60 * 1000 * 365,
      month: (24 * 60 * 60 * 1000 * 365) / 12,
      day: 24 * 60 * 60 * 1000,
      hour: 60 * 60 * 1000,
      minute: 60 * 1000,
      second: 1000,
    };

    const timeDiff = date.getTime() - new Date().getTime();

    for (const [unit, value] of Object.entries(units)) {
      if (Math.abs(timeDiff) > value || unit === 'second') {
        return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
          Math.round(timeDiff / units[unit]),
          unit as Intl.RelativeTimeFormatUnit,
        );
      }
    }

    return '';
  }
}
