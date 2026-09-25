import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { errorPayload, exitCodeFor } from '../src/errors.ts'
import { SPAWN_SWEEP_TIMEOUT_MS, errorOf, runStudy, seed } from './commands/helpers.ts'
import { makeItem } from './persistence/helpers.ts'
import { withDb } from './persistence/helpers/db.ts'

const CLI_DOC = resolve(import.meta.dirname, '../../../docs/especificacao/CLI.md')
const ITEM_ID = '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60'
const SECOND_ID = 'bbbb2222-0000-0000-0000-000000000000'
const REF8 = '2f1c9c1e'
const UNKNOWN_REF = '9f9f9f9f'

const EMPTY_DUMP = {
  schema_version: 1,
  exported_at: '2026-09-23T12:00:00Z',
  meta: {},
  items: [],
  review_logs: [],
  cold_archive: [],
}

type DocRow = {
  readonly situation: string
  readonly code: string
  readonly exit: number
  readonly message: string
}

function errorRows(): readonly DocRow[] {
  const section = readFileSync(CLI_DOC, 'utf8').split('\n## Erros\n')[1] ?? ''
  const rows = section.split('\n').filter((line) => line.startsWith('| '))
  return rows.slice(2).map((line) => {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim().replaceAll('`', ''))
    return {
      situation: cells[0] ?? '',
      code: cells[1] ?? '',
      exit: Number(cells[2] ?? ''),
      message: cells[3] ?? '',
    }
  })
}

type Ctx = {
  readonly dbPath: string
  readonly dir: string
}

type MessageCheck =
  | { readonly exact: (ctx: Ctx) => string }
  | { readonly contains: (ctx: Ctx) => readonly string[] }

type Spec = {
  readonly message: MessageCheck
  readonly prepare?: (ctx: Ctx) => void
  readonly argv: (ctx: Ctx) => readonly string[]
}

const SPECS: Record<string, Spec> = {
  'Item não encontrado': {
    argv: () => ['show', UNKNOWN_REF],
    message: { exact: () => `item não encontrado: ${UNKNOWN_REF}` },
  },
  'Referência ambígua': {
    prepare: ({ dbPath }) =>
      seed(dbPath, {
        items: [
          makeItem({ id: ITEM_ID, title: 'Duplicado' }),
          makeItem({ id: SECOND_ID, title: 'Duplicado' }),
        ],
      }),
    argv: () => ['show', 'Duplicado'],
    message: {
      contains: () => [
        'referência ambígua: Duplicado',
        '2f1c9c1e [Cálculo] vence 2026-09-12',
        'bbbb2222 [Cálculo] vence 2026-09-12',
      ],
    },
  },
  'Dificuldade fora de 1–5': {
    argv: () => ['add', 'Título', '-s', 'Matéria', '-d', '9'],
    message: { exact: () => 'dificuldade inválida: use 1 a 5' },
  },
  'Data fora de YYYY-MM-DD': {
    prepare: ({ dbPath, dir }) => {
      const dumpPath = join(dir, 'due-date.json')
      writeFileSync(
        dumpPath,
        JSON.stringify({ ...EMPTY_DUMP, items: [makeItem({ due_date: 'nao-e-data' })] }),
      )
      runStudy(['import', dumpPath, '--db', dbPath])
    },
    argv: () => ['show', REF8],
    message: { exact: () => 'data inválida: use YYYY-MM-DD' },
  },
  'Referência curta demais e sem correspondência': {
    argv: () => ['show', 'abc'],
    message: {
      exact: () =>
        'referência inválida: use um UUID, um prefixo de 4 ou mais caracteres ou o título exato',
    },
  },
  'Check-in em arquivado': {
    prepare: ({ dbPath }) => seed(dbPath, { items: [makeItem({ status: 'archived' })] }),
    argv: () => ['review', REF8, '-d', '4'],
    message: { exact: () => 'item arquivado; use study unarchive <ref>' },
  },
  'Check-in em item do arquivo morto': {
    prepare: ({ dbPath }) => seed(dbPath, { items: [makeItem({ status: 'cold' })] }),
    argv: () => ['review', REF8, '-d', '4'],
    message: { exact: () => 'item no arquivo morto; use study cold restore <ref>' },
  },
  'archive repetido': {
    prepare: ({ dbPath }) => seed(dbPath, { items: [makeItem({ status: 'archived' })] }),
    argv: () => ['archive', REF8],
    message: { exact: () => `item já está arquivado: ${REF8}` },
  },
  'unarchive em item ativo': {
    prepare: ({ dbPath }) => seed(dbPath, { items: [makeItem()] }),
    argv: () => ['unarchive', REF8],
    message: { exact: () => `item já está ativo: ${REF8}` },
  },
  'archive/unarchive em item do arquivo morto': {
    prepare: ({ dbPath }) => seed(dbPath, { items: [makeItem({ status: 'cold' })] }),
    argv: () => ['archive', REF8],
    message: { exact: () => `item no arquivo morto; use study cold restore ${REF8}` },
  },
  'cold restore/cold purge fora do arquivo morto': {
    prepare: ({ dbPath }) => seed(dbPath, { items: [makeItem()] }),
    argv: () => ['cold', 'restore', REF8],
    message: { exact: () => `item não está no arquivo morto: ${REF8}` },
  },
  '--status inválido': {
    argv: () => ['list', '--status', 'bogus'],
    message: { exact: () => 'status inválido: use active, archived ou cold' },
  },
  'Chave de config desconhecida': {
    argv: () => ['config', 'get', 'bogus'],
    message: { exact: () => 'chave desconhecida: bogus' },
  },
  'Valor de config fora do domínio': {
    argv: () => ['config', 'set', 'cold_archive_after_days', 'abc'],
    message: { exact: () => 'valor inválido para cold_archive_after_days: abc' },
  },
  'Valor negativo cru em config set': {
    argv: () => ['config', 'set', 'cold_archive_after_days', '-1'],
    message: { exact: () => 'flag desconhecida: -1' },
  },
  'Flag de confirmação ausente': {
    prepare: ({ dbPath }) => seed(dbPath, { items: [makeItem()] }),
    argv: () => ['remove', REF8],
    message: { exact: () => 'remove exige --yes' },
  },
  'Confirmação ausente na purga': {
    prepare: ({ dbPath }) => seed(dbPath, { items: [makeItem()] }),
    argv: () => ['cold', 'purge', REF8],
    message: { exact: () => 'cold purge exige --yes' },
  },
  'Valor faltando sem terminal': {
    argv: () => ['add', 'Título', '-s', 'Matéria'],
    message: { exact: () => '-d é obrigatório sem terminal interativo' },
  },
  'Export sobre arquivo existente': {
    prepare: ({ dir }) => writeFileSync(join(dir, 'backup.json'), '{}'),
    argv: ({ dir }) => ['export', join(dir, 'backup.json')],
    message: { exact: () => 'arquivo já existe; use --yes para sobrescrever' },
  },
  'Arquivo de import ausente ou ilegível': {
    argv: ({ dir }) => ['import', join(dir, 'missing.json')],
    message: { exact: ({ dir }) => `arquivo não encontrado: ${join(dir, 'missing.json')}` },
  },
  'Arquivo de import fora do contrato': {
    prepare: ({ dir }) => writeFileSync(join(dir, 'bad.json'), '{}'),
    argv: ({ dir }) => ['import', join(dir, 'bad.json')],
    message: { exact: ({ dir }) => `arquivo inválido: ${join(dir, 'bad.json')}` },
  },
  'Export sobre o próprio banco': {
    prepare: ({ dbPath }) => seed(dbPath, { items: [makeItem()] }),
    argv: ({ dbPath }) => ['export', dbPath],
    message: { exact: ({ dbPath }) => `arquivo de export é o banco: ${dbPath}` },
  },
  'Import com schema futuro': {
    prepare: ({ dir }) =>
      writeFileSync(
        join(dir, 'future.json'),
        JSON.stringify({ ...EMPTY_DUMP, schema_version: 2 }),
      ),
    argv: ({ dir }) => ['import', join(dir, 'future.json')],
    message: { exact: () => 'schema_version 2 não suportado' },
  },
  'Banco que existe e não abre como SQLite': {
    prepare: ({ dbPath }) => writeFileSync(dbPath, 'nao-e-sqlite'),
    argv: () => ['list'],
    message: { exact: ({ dbPath }) => `banco corrompido: ${dbPath}` },
  },
  'Backup do init falhou': {
    prepare: ({ dbPath, dir }) => {
      runStudy(['init', '--db', dbPath])
      writeFileSync(join(dir, 'backups'), 'nao-e-diretorio')
    },
    argv: () => ['init', '--reset', '--yes'],
    message: { exact: () => 'backup falhou; banco não foi alterado' },
  },
}

const VOCABULARY = [
  'usage',
  'invalid-status',
  'invalid-value',
  'invalid-state',
  'unsupported-schema',
  'backup-failed',
  'aborted',
  'internal',
  'invalid-field',
  'invalid-difficulty',
  'invalid-ref',
  'not-found',
  'ambiguous-ref',
  'item-not-active',
]

const ROWS = errorRows()

function expectMessage(actual: string, check: MessageCheck, ctx: Ctx): void {
  if ('exact' in check) {
    expect(actual).toBe(check.exact(ctx))
    return
  }
  for (const line of check.contains(ctx)) expect(actual).toContain(line)
}

function templatePattern(template: string): RegExp {
  const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replace(/<[^>]*>/g, '[\\s\\S]+?')}$`)
}

function expectDocMessage(actual: string, row: DocRow, spec: Spec): void {
  if (!('exact' in spec.message)) return
  if (row.message.includes('<')) {
    expect(actual, row.situation).toMatch(templatePattern(row.message))
    return
  }
  expect(actual, row.situation).toBe(row.message)
}

function withSpec(row: DocRow, run: (ctx: Ctx, spec: Spec) => void): void {
  const spec = SPECS[row.situation]
  expect(spec, `sem spec para: ${row.situation}`).toBeDefined()
  if (spec === undefined) return
  withDb((dbPath) => run({ dbPath, dir: dirname(dbPath) }, spec))
}

describe('AC4 — a varredura da tabela de erros do CLI.md', () => {
  it('tabela-erros-vinte-cinco: cada linha produz mensagem, code e exit documentados', () => {
    expect(ROWS).toHaveLength(25)

    for (const row of ROWS) {
      withSpec(row, (ctx, spec) => {
        spec.prepare?.(ctx)
        const result = runStudy([...spec.argv(ctx), '--db', ctx.dbPath, '--json'])

        expect(errorOf(result).code, row.situation).toBe(row.code)
        expect(result.status, row.situation).toBe(row.exit)
        expectMessage(errorOf(result).message, spec.message, ctx)
        expectDocMessage(errorOf(result).message, row, spec)
      })
    }
  }, SPAWN_SWEEP_TIMEOUT_MS)

  it('tabela-erros-stdout-vazio: toda linha de erro sai com stdout vazio', () => {
    for (const row of ROWS) {
      withSpec(row, (ctx, spec) => {
        spec.prepare?.(ctx)
        const result = runStudy([...spec.argv(ctx), '--db', ctx.dbPath, '--json'])

        expect(result.stdout, row.situation).toBe('')
      })
    }
  }, SPAWN_SWEEP_TIMEOUT_MS)
})

describe('AC2 — o vocabulário fechado de code', () => {
  it('erro-code-no-vocabulario: todo code das linhas pertence aos catorze', () => {
    expect(VOCABULARY).toHaveLength(14)
    expect(new Set(VOCABULARY).size).toBe(14)

    for (const row of ROWS) expect(VOCABULARY, row.situation).toContain(row.code)
  })

  it('erro-interno-code: erro fora de CliError e CoreError vira internal, exit 1', () => {
    const error = new Error('falha inesperada')

    expect(errorPayload(error)).toEqual({
      error: { code: 'internal', message: 'falha inesperada' },
    })
    expect(exitCodeFor(error)).toBe(1)
  })
})
