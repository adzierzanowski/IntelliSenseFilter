import { CodeLens, TextDocument } from 'vscode';
import { Output } from '../global';

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

  constructor(document: TextDocument, line: number) {
    this.document = document;
    this.line = line;
  }

  static parse(
    stdout: string,
    document: TextDocument,
    line: number,
  ): GitBlameInfo {
    const out = new GitBlameInfo(document, line);

    const lines = stdout.split('\n');
    out.commitHash = lines[0].split(' ')[0];

    for (const line of lines.slice(1)) {
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
          out.author = rest.join(' ');
          break;
        case 'committer-mail':
          out.authorMail = rest.join(' ');
          break;
        case 'committer-time':
          out.authorTime = parseInt(rest[0]);
          break;
        case 'summary':
          out.summary = rest.join(' ');
          break;
      }
    }

    return out;
  }

  toString(fmt?: string) {
    return `$(zap) ${this.commitHash.slice(0, 8)} ${this.summary} ${this.authorMail} ${this.authorTime} ${new Date(this.authorTime * 1000).toISOString().slice(0, 10)}`;
  }

  toCodeLens(): CodeLens {
    return new CodeLens(this.document.lineAt(this.line).range, {
      command: 'doublefloat.inspector.quickPick',
      title: this.toString(),
    });
  }
}
