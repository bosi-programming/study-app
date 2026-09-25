import { BASE_INTERVAL_DAYS } from '@study/core'
import { describe, expect, it } from 'vitest'
import { withDb } from '../persistence/helpers/db.ts'
import { errorOf, expectedDue, itemOf, itemsOf, runStudy } from './helpers.ts'

describe('AC2 — add cria com vencimento inicial (RF-01)', () => {
  it('add-happy: trima os textos e calcula o vencimento inicial', () => {
    withDb((dbPath) => {
      const result = runStudy([
        'add',
        '  Derivadas parciais  ',
        '-s',
        '  Cálculo ',
        '-d',
        '4',
        '-n',
        'cap. 3',
        '--db',
        dbPath,
        '--json',
      ])

      expect(result.status).toBe(0)
      const item = itemOf(result, 'add')
      expect(item.title).toBe('Derivadas parciais')
      expect(item.subject).toBe('Cálculo')
      expect(item.difficulty).toBe(4)
      expect(item.interval_days).toBe(BASE_INTERVAL_DAYS[4])
      expect(item.due_date).toBe(expectedDue(4))
      expect(item.note).toBe('cap. 3')
      expect(item.status).toBe('active')
      expect(item.review_count).toBe(0)

      const listed = runStudy(['list', '--db', dbPath, '--json'])
      expect(itemsOf(listed, 'list').map((entry) => entry.id)).toEqual([item.id])
    })
  })

  it('add-sem-nota-e-link: ausentes viram null', () => {
    withDb((dbPath) => {
      const result = runStudy(['add', 'Phrasal verbs', '-s', 'Inglês', '-d', '3', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'add')).toMatchObject({ note: null, link: null })
    })
  })

  it('add-titulo-longo: sai 2 com a mensagem do domínio e nada é persistido', () => {
    withDb((dbPath) => {
      const result = runStudy([
        'add',
        'a'.repeat(201),
        '-s',
        'Cálculo',
        '-d',
        '4',
        '--db',
        dbPath,
        '--json',
      ])

      expect(result.status).toBe(2)
      expect(errorOf(result)).toEqual({
        code: 'invalid-field',
        message: 'título deve ter no máximo 200 caracteres',
      })
      expect(itemsOf(runStudy(['list', '--db', dbPath, '--json']), 'list')).toEqual([])
    })
  })

  it('add-dificuldade-invalida: -d 7 sai 2 e nada é persistido', () => {
    withDb((dbPath) => {
      const result = runStudy(['add', 'Derivadas', '-s', 'Cálculo', '-d', '7', '--db', dbPath, '--json'])

      expect(result.status).toBe(2)
      expect(errorOf(result)).toEqual({
        code: 'invalid-difficulty',
        message: 'dificuldade inválida: use 1 a 5',
      })
      expect(itemsOf(runStudy(['list', '--db', dbPath, '--json']), 'list')).toEqual([])
    })
  })

  it('add-sem-titulo: sai 1 de uso', () => {
    withDb((dbPath) => {
      const result = runStudy(['add', '-s', 'Cálculo', '-d', '4', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result).code).toBe('usage')
    })
  })

  it('add-sem-materia: sai 1 de uso e não pergunta a matéria', () => {
    withDb((dbPath) => {
      const result = runStudy(['add', 'Derivadas', '-d', '4', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result).code).toBe('usage')
      expect(result.stderr).not.toContain('Dificuldade')
    })
  })
})

describe('AC9 — prompt desligado sem terminal (T-23)', () => {
  it('add-sem-d-sem-terminal: stdin pipeado sai 1 sem persistir', () => {
    withDb((dbPath) => {
      const result = runStudy(['add', 'Derivadas', '-s', 'Cálculo', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(result.stderr).not.toContain('Dificuldade (1–5):')
      expect(errorOf(result)).toEqual({
        code: 'usage',
        message: '-d é obrigatório sem terminal interativo',
      })
      expect(itemsOf(runStudy(['list', '--db', dbPath, '--json']), 'list')).toEqual([])
    })
  })

  it('add-sem-d-com-no-input: --no-input desliga o prompt pelo mesmo caminho', () => {
    withDb((dbPath) => {
      const result = runStudy([
        'add',
        'Derivadas',
        '-s',
        'Cálculo',
        '--no-input',
        '--db',
        dbPath,
      ])

      expect(result.status).toBe(1)
      expect(result.stderr).not.toContain('Dificuldade (1–5):')
      expect(result.stderr).toContain('-d é obrigatório sem terminal interativo')
    })
  })

  it('add-sem-d-com-json: o erro sai no envelope de usage', () => {
    withDb((dbPath) => {
      const result = runStudy(['add', 'Derivadas', '-s', 'Cálculo', '--json', '--db', dbPath])

      expect(result.status).toBe(1)
      expect(result.stderr).not.toContain('Dificuldade (1–5):')
      expect(errorOf(result)).toMatchObject({ code: 'usage' })
    })
  })
})
