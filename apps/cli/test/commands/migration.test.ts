import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { addDays } from '@study/core'
import { describe, expect, it } from 'vitest'
import { makeItem, makeLog } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { itemsOf, jsonOf, queueOf, runStudy, seed, todayLocalDate, withStore } from './helpers.ts'

function stamp(days: number): string {
  return `${addDays(todayLocalDate(), days)}T12:00:00Z`
}

function exportDirOf(dbPath: string): string {
  return join(dirname(dbPath), 'exports')
}

function exportPathOf(dbPath: string): string {
  return join(exportDirOf(dbPath), `cold-archive-${todayLocalDate()}.json`)
}

function readDump(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

function statusOf(dbPath: string, id: string): string | null {
  return withStore(dbPath, (store) => store.getItem(id)?.status ?? null)
}

describe('AC5 — o gancho antes da ação, só onde há banco (critério 3)', () => {
  it('migracao-migra-antes-da-acao: a migração roda antes da consulta pedida', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })

      const archived = runStudy(['list', '--status', 'archived', '--db', dbPath, '--json'])
      const cold = runStudy(['list', '--status', 'cold', '--db', dbPath, '--json'])

      expect(itemsOf(archived, 'list')).toEqual([])
      expect(itemsOf(cold, 'list').map((item) => item.id)).toEqual(['a'])
    })
  })

  it('migracao-nao-bloqueia-a-acao: a saída do comando em execução continua normal', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) }),
          makeItem({ id: 'ativo', title: 'Ativo', due_date: todayLocalDate() }),
        ],
      })

      const list = runStudy(['list', '--db', dbPath, '--json'])
      const due = runStudy(['due', '--db', dbPath, '--json'])
      const queue = queueOf(due)
      const overdue = queue['overdue'] as { id: string }[]
      const today = queue['today'] as { id: string }[]

      expect(itemsOf(list, 'list').map((item) => item.id)).toEqual(['ativo'])
      expect([...overdue, ...today].map((entry) => entry.id)).toEqual(['ativo'])
    })
  })

  it('migracao-help-nao-migra: --help não abre banco', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })

      const result = runStudy(['--help', '--db', dbPath])

      expect(result.stdout).toContain('Uso:')
      expect(statusOf(dbPath, 'a')).toBe('archived')
    })
  })

  it('migracao-flag-desconhecida-nao-migra: erro de parseArgs não abre banco', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })

      const result = runStudy(['list', '--nope', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(statusOf(dbPath, 'a')).toBe('archived')
    })
  })

  it('migracao-sem-argumento-nao-migra: study sozinho não abre banco', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })

      const result = runStudy([], { env: { STUDY_DB: dbPath } })

      expect(result.status).toBe(1)
      expect(statusOf(dbPath, 'a')).toBe('archived')
    })
  })
})

describe('AC6 — o predicado: estritamente maior, em data local (RF-16, RN-10, CA-09, CA-19)', () => {
  it('migracao-181-migra: 181 dias com janela 180 vira cold', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })

      runStudy(['list', '--db', dbPath, '--json'])

      const item = withStore(dbPath, (store) => store.getItem('a'))
      expect(item?.status).toBe('cold')
      expect(item?.cold_archived_at).not.toBeNull()
    })
  })

  it('migracao-180-fica: 180 dias exatos continua archived', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-180) })] })

      runStudy(['list', '--db', dbPath, '--json'])

      expect(statusOf(dbPath, 'a')).toBe('archived')
    })
  })

  it('migracao-sem-archived-at: archived sem data de arquivamento não migra', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: null })] })

      runStudy(['list', '--db', dbPath, '--json'])

      expect(statusOf(dbPath, 'a')).toBe('archived')
    })
  })

  it('migracao-janela-90: com a janela em 90, 91 migra e 89 fica', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'noventa-e-um', status: 'archived', archived_at: stamp(-91) }),
          makeItem({ id: 'oitenta-e-nove', status: 'archived', archived_at: stamp(-89) }),
        ],
      })
      withStore(dbPath, (store) => store.setMeta('cold_archive_after_days', '90'))

      runStudy(['list', '--db', dbPath, '--json'])

      expect(statusOf(dbPath, 'noventa-e-um')).toBe('cold')
      expect(statusOf(dbPath, 'oitenta-e-nove')).toBe('archived')
    })
  })

  it('migracao-archived-at-invalido: um instante que não parseia não derruba o comando', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: 'nao-e-data' })] })

      const list = runStudy(['list', '--status', 'archived', '--db', dbPath, '--json'])
      const due = runStudy(['due', '--db', dbPath, '--json'])

      expect(list.status).toBe(0)
      expect(itemsOf(list, 'list').map((item) => item.id)).toEqual(['a'])
      expect(due.status).toBe(0)
      expect(statusOf(dbPath, 'a')).toBe('archived')
    })
  })
})

describe('AC7 — o snapshot do arquivo morto (RF-16)', () => {
  it('migracao-snapshot: a linha de cold_archive guarda o item no estado cold', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })

      runStudy(['list', '--db', dbPath, '--json'])

      const entries = withStore(dbPath, (store) => store.listColdArchive())
      expect(entries.map((entry) => entry.id)).toEqual(['a'])
      const payload = JSON.parse(entries[0]?.payload ?? '{}') as Record<string, unknown>
      expect((payload['item'] as { status: string }).status).toBe('cold')
      expect(payload['review_logs']).toEqual([])
    })
  })

  it('migracao-logs-do-item: o payload leva só os logs daquele item', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) }),
          makeItem({ id: 'b', status: 'archived', archived_at: null }),
        ],
        logs: [
          makeLog({ id: 'log-a', item_id: 'a' }),
          makeLog({ id: 'log-b', item_id: 'b' }),
        ],
      })

      runStudy(['list', '--db', dbPath, '--json'])

      const entries = withStore(dbPath, (store) => store.listColdArchive())
      const payload = JSON.parse(entries[0]?.payload ?? '{}') as Record<string, unknown>
      const logs = payload['review_logs'] as { id: string; item_id: string }[]
      expect(logs.map((log) => log.id)).toEqual(['log-a'])
      expect(logs.every((log) => log.item_id === 'a')).toBe(true)
    })
  })
})

describe('AC8 — o export automático (RF-20, critério 5)', () => {
  it('export-caminho-padrao: o arquivo nasce em <data-dir>/exports', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })

      runStudy(['list', '--db', dbPath, '--json'])

      const path = exportPathOf(dbPath)
      expect(existsSync(path)).toBe(true)
      expect(readDump(path)['schema_version']).toBe(1)
    })
  })

  it('export-dir-flag: --export-dir muda o destino', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })
      const target = join(dirname(dbPath), 'saida')

      runStudy(['list', '--db', dbPath, '--json', '--export-dir', target])

      expect(existsSync(join(target, `cold-archive-${todayLocalDate()}.json`))).toBe(true)
      expect(existsSync(exportPathOf(dbPath))).toBe(false)
    })
  })

  it('export-conteudo-pre-migracao: o dump é o estado anterior à troca de status', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })],
        logs: [makeLog({ id: 'log-a', item_id: 'a' })],
      })

      runStudy(['list', '--db', dbPath, '--json'])

      const dump = readDump(exportPathOf(dbPath))
      expect(Object.keys(dump)).toEqual(
        expect.arrayContaining(['meta', 'items', 'review_logs', 'cold_archive']),
      )
      const items = dump['items'] as { id: string; status: string }[]
      expect(items.map((item) => item.status)).toEqual(['archived'])
    })
  })

  it('export-colisao-do-dia: a segunda migração do dia sobrescreve sem duplicar item', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })
      runStudy(['list', '--db', dbPath, '--json'])

      seed(dbPath, { items: [makeItem({ id: 'b', status: 'archived', archived_at: stamp(-181) })] })
      runStudy(['list', '--db', dbPath, '--json'])

      const items = readDump(exportPathOf(dbPath))['items'] as { id: string }[]
      expect(items.map((item) => item.id).sort()).toEqual(['a', 'b'])
    })
  })

  it('export-sem-candidato: sem item elegível nenhum arquivo nasce', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-10) })] })

      runStudy(['list', '--db', dbPath, '--json'])

      expect(existsSync(exportDirOf(dbPath))).toBe(false)
    })
  })
})

describe('AC9 — o aviso no stderr e a saída intacta (critério 4)', () => {
  it('migracao-aviso-stderr: o aviso traz a contagem e o caminho do export', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })

      const result = runStudy(['list', '--db', dbPath, '--json'])

      expect(result.stderr).toContain(`1 itens migrados para o arquivo morto; export: ${exportPathOf(dbPath)}`)
      expect(itemsOf(result, 'list')).toEqual([])
    })
  })

  it('migracao-json-intacto: com --json o stdout continua um único objeto', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })

      const result = runStudy(['list', '--db', dbPath, '--json'])
      const parsed = jsonOf(result)

      expect(parsed['schema_version']).toBe(1)
      expect(Object.keys(parsed)).toEqual(['schema_version', 'list'])
      expect(result.stdout.trim().split('\n')).toHaveLength(1)
    })
  })

  it('export-falho-nao-migra: o destino inválido avisa no stderr e nada migra', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })
      writeFileSync(exportDirOf(dbPath), 'nao-e-diretorio')

      const result = runStudy(['list', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(result.stderr).toContain(
        `falha ao exportar o arquivo morto (${exportPathOf(dbPath)}); nenhum item foi migrado`,
      )
      expect(statusOf(dbPath, 'a')).toBe('archived')
      expect(itemsOf(result, 'list')).toEqual([])
    })
  })

  it('export-falho-e-recupera: corrigido o destino, a execução seguinte migra', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })
      writeFileSync(exportDirOf(dbPath), 'nao-e-diretorio')
      runStudy(['list', '--db', dbPath, '--json'])

      rmSync(exportDirOf(dbPath))
      runStudy(['list', '--db', dbPath, '--json'])

      expect(statusOf(dbPath, 'a')).toBe('cold')
      expect(existsSync(exportPathOf(dbPath))).toBe(true)
    })
  })

  it('migracao-erro-json-limpo: um comando que falha deixa o stderr só com o erro', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })

      const result = runStudy(['archive', 'deadbeef', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(JSON.parse(result.stderr)).toEqual({
        error: { code: 'not-found', message: 'item não encontrado: deadbeef' },
      })
      expect(statusOf(dbPath, 'a')).toBe('cold')
    })
  })

  it('migracao-erro-aviso-humano: sem --json o aviso sai mesmo quando o comando falha', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived', archived_at: stamp(-181) })] })

      const result = runStudy(['archive', 'deadbeef', '--db', dbPath])

      expect(result.status).toBe(3)
      expect(result.stderr).toContain(
        `1 itens migrados para o arquivo morto; export: ${exportPathOf(dbPath)}`,
      )
      expect(result.stderr).toContain('item não encontrado: deadbeef')
      expect(statusOf(dbPath, 'a')).toBe('cold')
    })
  })
})
