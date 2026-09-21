# Core — Domínio e Regra de Agendamento

Versão: 1 | Data: 2026-09-20 | Base: `docs/especificacao/REQUISITOS.md`

`packages/core` (`@study/core`) é o domínio da fase 1: TypeScript puro, uma
responsabilidade por módulo atrás de um barrel `index.ts`, sem dependências de
runtime e sem importar API de Node ou de browser — para que CLI, web, mobile e
desktop compartilhem uma única implementação da regra de agendamento (ADR-001).
Escrito pela ENG-3 / BOS-28; o PR foi o #3.

## O que o core não faz

- Não persiste, não abre banco e não conhece SQLite — isso é a ENG-5.
- Não ordena a fila nem formata saída. A ordem de exibição e todo o texto de
  prompt são do CLI (ENG-6).
- Não lê relógio nem gera id por conta própria: as duas coisas chegam por `deps`.
- Não converte fuso horário. Não existe timezone dentro do core.
- Não filtra por status na resolução de `<ref>`; quem escolhe o conjunto é o chamador.
- Não valida `link` na V1 (só colapsa em branco para `null`).

## Portas (`Deps`)

Toda operação que depende de tempo ou de id recebe um único objeto `deps`:

| Porta | Tipo | Papel |
| --- | --- | --- |
| `deps.clock.nowUtc()` | `() => string` | timestamp ISO 8601 UTC de eventos (`created_at`, `updated_at`, `last_reviewed_at`, `reviewed_at`) |
| `deps.clock.todayLocalDate()` | `() => string` | data local de hoje em `YYYY-MM-DD`, base de todo o cálculo de vencimento |
| `deps.ids()` | `() => string` | gera um UUID v4; `crypto` está na lista de imports proibidos, então o id é injetado |

```ts
const deps: Deps = {
  clock: {
    nowUtc: () => '2026-09-12T14:03:00.000Z',
    todayLocalDate: () => '2026-09-12',
  },
  ids: () => '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60',
}
```

## Datas

- `due_date` é string local `YYYY-MM-DD`; comparação é lexicográfica, que nessa
  forma coincide com a cronológica.
- Eventos (`created_at`, `updated_at`, `last_reviewed_at`, `reviewed_at`) são ISO 8601 UTC completos.
- Aritmética de data é feita em dias de época ancorados em UTC e devolvida como
  string de data. Nenhum fuso entra no cálculo.

| Helper | Assinatura | Nota |
| --- | --- | --- |
| `isValidLocalDate` | `(value: string) => boolean` | valida formato e existência do dia (rejeita `2026-02-30`) |
| `addDays` | `(date: string, days: number) => string` | aceita `days` negativo |
| `compareDates` | `(left: string, right: string) => -1 \| 0 \| 1` | lança `invalid-field` (campo `date`) se qualquer lado for inválido |
| `daysBetween` | `(from: string, to: string) => number` | pode ser negativo |
| `previousDay` | `(date: string, days = 1) => string` | usado pelo streak |

## `Item`

`Item` espelha a entidade canônica de `docs/especificacao/MODELO-DE-DADOS.md` campo a campo,
**sem chaves derivadas**: `titleKey` e `subjectKey` são helpers puros que quem
chama aplica (a persistência da ENG-5 guarda os valores para os índices).

| Campo | Tipo | Invariante |
| --- | --- | --- |
| `id` | `string` | vem de `deps.ids()` |
| `title` | `string` | 1–200 caracteres, **armazenado com trim** |
| `subject` | `string` | 1–60 caracteres, não pode ser só espaço, armazenado com trim |
| `difficulty` | `1 \| 2 \| 3 \| 4 \| 5` | inteiro; qualquer outro valor é `invalid-difficulty` |
| `note` | `string \| null` | até 10.000 caracteres; `null` quando ausente ou em branco |
| `link` | `string \| null` | livre na V1; `null` quando ausente ou em branco |
| `interval_days` | `number` | nasce no base da dificuldade |
| `due_date` | `string` | nasce em `hoje + base` |
| `review_count` | `number` | nasce em 0 |
| `on_time_streak` | `number` | nasce em 0 |
| `status` | `'active' \| 'archived' \| 'cold'` | nasce `active` |
| `last_reviewed_at` | `string \| null` | ISO UTC |
| `archived_at` / `cold_archived_at` | `string \| null` | ISO UTC |
| `created_at` / `updated_at` | `string` | ISO UTC |

Detalhe que morde: `note` e `link` guardam o valor **exatamente como digitado**
quando não é em branco — só o teste de branco faz trim. `'  cap. 3  '` continua
com os espaços; `'   '` vira `null`. O trim de armazenamento vale só para `title`
e `subject`.

Operações de item:

- `createItem(input, deps)` — valida tudo e devolve um `Item` novo, `active`.
- `toDifficulty(value)` — estreita um `number` para `Difficulty`; use antes de
  `createItem`/`reevaluateDifficulty` quando o valor vier de um flag do CLI.
- `validateTitle` / `validateSubject` / `validateNote` / `validateLink` — os
  validadores isolados, para o CLI validar entrada de `edit` sem criar um item.

## Regra de agendamento

| Constante | Valor |
| --- | --- |
| `BASE_INTERVAL_DAYS` | d1 = 10, d2 = 7, d3 = 5, d4 = 3, d5 = 2 dias |
| `MAX_INTERVAL_DAYS` | 365 |
| `DIFFICULTY_LABELS` | `1 trivial` … `5 muito difícil` — a cópia única em pt-BR da escala de `FEASIBILITY.md`, para o prompt do CLI e o web |

- `intervalFor(difficulty, n) = min(365, base × 2ⁿ)`.
- `initialDueDate(difficulty, from) = from + base`.
- `nextDueDate(basis, interval) = basis + interval` — a materialização de
  "muda a base na hora" (ADR-004).
- `isDue(item, today)` — **é a definição da fila**: `status === 'active'` e
  `due_date <= today`.
- `isLate(item, today)` / `daysLate(item, today)` — só data, não olham status.
  Um item arquivado e vencido responde `true` em `isLate`.

### `recordReview(item, deps)` → `{ item, log }`

Recusa item não-ativo com `item-not-active`. Não muta: devolve o `Item` novo mais
o `ReviewLog` a persistir.

- `due_date` da base é **o dia do check-in** (`today`), não o vencimento antigo.
- `interval_days = intervalFor(difficulty, review_count + 1)` — o intervalo já
  reflete o check-in que está sendo registrado.
- `on_time_streak` sobe 1 quando o check-in é no dia ou antes; zera quando está atrasado.
- Atraso não reduz intervalo nem dificuldade, e todo check-in incrementa `review_count`.
- `review_count` continua subindo além do teto de 365 dias.

O `ReviewLog` carrega `due_date_at_review`, `interval_after`, `review_count_after`
e `late`, para o histórico ser auditável sem reler o item.

### `reevaluateDifficulty(item, difficulty, deps)`

Troca a dificuldade e reaplica o **mesmo n** (`intervalFor(next, review_count)`),
rebaseando o vencimento em hoje. Se a dificuldade é a mesma, devolve o próprio
item, sem tocar em `review_count`, `on_time_streak` ou `updated_at`. É uma
operação separada de `recordReview` de propósito: o ADR-011 exige gravar o
check-in antes de perguntar a dificuldade.

## Fila e streak de dias

- `hasDueItems(items, today)` — uma passada de `isDue` sobre a lista, para que a
  definição de fila exista no core uma única vez.
- `advanceQueueStreak(state, queueIsEmpty, today)` — quatro ramos, sobre os dois
  campos de `Meta`:

| Estado de hoje | `streak_current` | `streak_last_day` |
| --- | --- | --- |
| fila não vazia | `0` | `today` |
| vazia e `last_day === today` | inalterado | `today` |
| vazia e `last_day === ontem` | `+1` | `today` |
| vazia e qualquer outro | `1` | `today` |

Consequência conhecida: um dia que abre com fila e esvazia no meio do dia credita
o streak na execução seguinte, não na mesma; um app que não abre reinicia em 1,
o que é inevitável para um contador "recalculado a cada execução".

## Resolução de `<ref>`

`resolveRef(ref, items)` avalia três passos **na ordem**, e o primeiro que
encontrar algo vence:

1. `id` exato (sem caixa).
2. prefixo único de `id`, exigindo 4 ou mais caracteres.
3. `title_key` exato (normalizado: trim, sem acentos, sem caixa).

Regras de borda:

- Ambiguidade lança `ambiguous-ref` **no passo onde apareceu**, com a lista de
  candidatos em `context.candidates` — não cai para o passo seguinte.
- Um `<ref>` com menos de 4 caracteres é `invalid-ref` só quando não é um id
  exato nem um título exato; títulos curtos como `Vet` continuam alcançáveis.
- Sem correspondência nenhuma: `not-found`, com a referência já trimada na mensagem.
- O resolver não filtra por status: o chamador entrega o conjunto.

## Erros

Tudo que o core recusa é lançado como subclasse de `CoreError`, com `kind`
discriminante, `context` estruturado e mensagem em pt-BR. O CLI (ENG-6) imprime
`error.message` e mapeia `kind` para o exit code da tabela de `docs/especificacao/CLI.md`.

| `kind` | Quando | Mensagem | Exit |
| --- | --- | --- | --- |
| `invalid-field` | campo fora da invariante | uma por campo, ex. `título é obrigatório`, `matéria deve ter no máximo 60 caracteres`, `nota deve ter no máximo 10000 caracteres` | 2 |
| `invalid-field` (campo `date`) | data fora de `YYYY-MM-DD` ou dia inexistente | `data inválida: use YYYY-MM-DD` | 2 |
| `invalid-difficulty` | dificuldade fora de 1–5 ou não inteira | `dificuldade inválida: use 1 a 5` | 2 |
| `invalid-ref` | `<ref>` curto demais e sem correspondência, ou vazio | `referência inválida: use um UUID, um prefixo de 4 ou mais caracteres ou o título exato` | 2 |
| `not-found` | nenhum item corresponde | `item não encontrado: <ref>` | 3 |
| `ambiguous-ref` | mais de um item no passo | `referência ambígua: <ref>` + candidatos | 3 |
| `item-not-active` | check-in em item `archived` ou `cold` | `item arquivado; use study unarchive <ref>` / `item no arquivo morto; use study cold restore <ref>` | 3 |

As classes exportadas são `CoreError`, `InvalidFieldError`, `InvalidDifficultyError`,
`InvalidRefError`, `NotFoundError`, `AmbiguousRefError` e `ItemNotActiveError`.
`CoreErrorKind` é o union dos seis `kind`. O contexto é `Readonly<Record<string, unknown>>`:
o CLI não deve depender de formato interno além dos campos documentados aqui
(`field`, `ref`, `value`, `status`, `candidates`).

## Fluxo completo

```ts
import {
  advanceQueueStreak,
  createItem,
  hasDueItems,
  recordReview,
  reevaluateDifficulty,
  resolveRef,
} from '@study/core'

const deps = {
  clock: { nowUtc: () => '2026-09-12T14:03:00.000Z', todayLocalDate: () => '2026-09-12' },
  ids: () => '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60',
}

const created = createItem({ title: 'Derivadas parciais', subject: 'Cálculo', difficulty: 4 }, deps)
// created.due_date === '2026-09-15'  (hoje + 3, base do d4)

const { item, log } = recordReview(created, deps)
// item.interval_days === 6   (3 × 2¹)
// item.on_time_streak === 1  (no dia)
// log.due_date_at_review === '2026-09-15'

const harder = reevaluateDifficulty(item, 5, deps)
// harder.interval_days === 4  (base 2 × 2¹, mesmo n)

const found = resolveRef('derivadas parciais', [harder]) // por título normalizado
const streak = advanceQueueStreak({ streak_current: 3, streak_last_day: '2026-09-11' }, !hasDueItems([harder], '2026-09-12'), '2026-09-12')
// streak.streak_current === 4  (ontem → hoje)
```

## Testes

- `packages/core/test/*.test.ts` — um arquivo por preocupação (`normalize`,
  `local-date`, `item`, `schedule`, `streak`, `ref`, `errors`, `predicates`) mais
  `golden.test.ts`, que consome `fixtures/golden` via `@study/golden` como devDependency.
- `core.test.ts` é o scanner de pureza: recusa import de Node/browser em
  qualquer arquivo de `src` e recusa `Date.now`, `new Date()` sem argumento,
  `Math.random`, `crypto` e `performance.now`. Quem adicionar código ao core
  passa por ele (S-01..S-17).
- A progressão de intervalo é provada pelo golden fixture, a fonte única de
  verdade da regra para todos os apps TS.
