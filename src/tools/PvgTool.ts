import {
  CancellationToken,
  Disposable,
  DocumentSemanticTokensProvider,
  ExtensionContext,
  languages,
  SemanticTokens,
  TextDocument,
} from 'vscode'
import { Tool } from './Tool'
// eslint-disable-next-line @typescript-eslint/naming-convention
import child_process from 'child_process'
import { Output } from '../global'

export interface PvgTokenizerToken {
  l: number
  c: number
  t: string
  m: string[]
  len: number
}

export class PvgTool extends Tool implements DocumentSemanticTokensProvider {
  // onDidChangeSemanticTokens?: Event<void> | undefined

  static tokenTypes = [
    'keyword',
    'parameter',
    'label',
    'number',
    'function',
    'property',
    'variable',
    'enumMember',
    'comment',
    'operator',
    'string',
  ]
  static tokenModifiers = ['declaration', 'definition']

  static builtins = ['circ', 'rect', 'line']

  constructor() {
    super('PvgTool', 'pvg')
  }

  private async getTokenizerOutput(
    source: string,
  ): Promise<{ code: number | null; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const serverPath = this.getConfig<string>('serverPath', '')
      if (serverPath === '') {
        Output.warn('PVG language server path is not configured')
        return
      }

      Output.trace('Spawning tokenizer')

      let stdout = ''
      let stderr = ''

      const ps = child_process.spawn(
        `${serverPath}/pvg`,
        ['src', 'tok', '-s', '-f', 'vscode'],
        {
          stdio: 'pipe',
          shell: true,
          cwd: serverPath
        },
      )

      ps.stdin.write(source)
      ps.stdin.end()

      ps.stdout.on('data', (chunk) => {
        stdout += chunk
      })

      ps.stderr.on('data', (chunk) => {
        stderr += chunk
      })

      ps.on('error', (error) => {
        Output.error(error)
        reject()
      })

      // ps.on('spawn', () => {
      //   Output.info('tokenizer spawned')
      // })

      ps.on('close', (code, signal) => {
        resolve({ code, stdout, stderr })
      })
    })
  }

  async provideDocumentSemanticTokens(
    document: TextDocument,
    token: CancellationToken,
  ): Promise<SemanticTokens | null> {
    if (!this.enabled) {
      return null
    }

    const content = document.getText()
    const data: number[] = []

    const { code, stderr, stdout } = await this.getTokenizerOutput(content)

    Output.trace(`tokenizer exited with code ${code}`)
    Output.trace(`stdout: ${stdout}`)
    Output.trace(`stderr: ${stderr}`)

    if (code === 0) {
      const tokens = JSON.parse(stdout) as PvgTokenizerToken[]

      for (const token of tokens) {
        const tokenId = PvgTool.tokenTypes.indexOf(token.t)
        let modifier = 0
        const modmap = token.m.map((mod) => PvgTool.tokenModifiers.indexOf(mod)).filter(i => i > -1)
        for (const shift of modmap) {
          modifier |= (1 << shift) >>> 0;
        }

        if (tokenId > -1) {
          Output.trace(`TOKEN Δ${token.l}:${token.c} ${token.t} ${token.m}`)

          data.push(
            token.l, // line delta
            token.c, // char delta
            token.len, // token length
            tokenId, // token id
            modifier, // modifier bitmask
          )
        }
      }

      return { resultId: undefined, data: new Uint32Array(data) }
    }

    return null
  }

  // provideDocumentSemanticTokensEdits?(
  //   document: TextDocument,
  //   previousResultId: string,
  //   token: CancellationToken,
  // ): ProviderResult<SemanticTokens | SemanticTokensEdits> {
  //   return null
  //   // throw new Error('Method not implemented.')
  // }

  protected disposables: Disposable[] = []

  register(context: ExtensionContext): Disposable[] {
    Output.debug('Registering PvgTool')

    return [
      languages.registerDocumentSemanticTokensProvider(
        { language: 'pvg' },
        this,
        {
          tokenModifiers: PvgTool.tokenModifiers,
          tokenTypes: PvgTool.tokenTypes,
        },
      ),
    ]
  }
}
