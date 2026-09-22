import checkinAntecipadoEDoisNoMesmoDia from '../checkin-antecipado-e-dois-no-mesmo-dia.json' with { type: 'json' }
import checkinAtrasadoNaoPenaliza from '../checkin-atrasado-nao-penaliza.json' with { type: 'json' }
import contadorDePrazoZeraNoAtraso from '../contador-de-prazo-zera-no-atraso.json' with { type: 'json' }
import filaAtrasadosPrimeiro from '../fila-atrasados-primeiro.json' with { type: 'json' }
import normalizacaoDeMateria from '../normalizacao-de-materia.json' with { type: 'json' }
import progressaoAteTeto from '../progressao-ate-teto.json' with { type: 'json' }
import reavaliacaoComNovaBase from '../reavaliacao-com-nova-base.json' with { type: 'json' }
import streakDeFilaZerada from '../streak-de-fila-zerada.json' with { type: 'json' }
import vencimentoInicialPorDificuldade from '../vencimento-inicial-por-dificuldade.json' with { type: 'json' }

export type FixtureKind =
  | 'initial-due'
  | 'progression'
  | 'checkin'
  | 'reevaluate'
  | 'queue-order'
  | 'normalize'
  | 'queue-streak'

type FixtureEnvelope = {
  readonly case: string
  readonly kind: FixtureKind
  readonly requirement: string
}

export type NewItemInput = {
  readonly title: string
  readonly subject: string
}

export type InitialDueCase = {
  readonly difficulty: number
  readonly expected_interval_days: number
  readonly expected_due_date: string
}

export type InitialDueFixture = FixtureEnvelope & {
  readonly kind: 'initial-due'
  readonly new_item: NewItemInput
  readonly created_on: string
  readonly cases: readonly InitialDueCase[]
}

export type ProgressionFixture = FixtureEnvelope & {
  readonly kind: 'progression'
  readonly difficulty: number
  readonly base_interval_days: number
  readonly cap_days: number
  readonly checkins: number
  readonly expected_intervals: readonly number[]
}

export type CheckinState = {
  readonly difficulty: number
  readonly review_count: number
  readonly interval_days: number
  readonly due_date: string
  readonly on_time_streak: number
}

export type CheckinExpectation = CheckinState & {
  readonly late: boolean
}

export type CheckinStep = {
  readonly today: string
  readonly expected: CheckinExpectation
}

export type CheckinFixture = FixtureEnvelope & {
  readonly kind: 'checkin'
  readonly state: CheckinState
  readonly checkins: readonly CheckinStep[]
}

export type ReevaluateState = {
  readonly difficulty: number
  readonly review_count: number
  readonly interval_days: number
  readonly due_date: string
}

export type ReevaluateFixture = FixtureEnvelope & {
  readonly kind: 'reevaluate'
  readonly state: ReevaluateState
  readonly params: { readonly new_difficulty: number; readonly today: string }
  readonly expected: ReevaluateState
}

export type QueueItem = {
  readonly id: string
  readonly title: string
  readonly due_date: string
}

export type QueueOrderFixture = FixtureEnvelope & {
  readonly kind: 'queue-order'
  readonly today: string
  readonly items: readonly QueueItem[]
  readonly expected_order: readonly string[]
}

export type NormalizePair = {
  readonly input: string
  readonly expected_key: string
}

export type NormalizeFixture = FixtureEnvelope & {
  readonly kind: 'normalize'
  readonly pairs: readonly NormalizePair[]
}

export type QueueStreakState = {
  readonly streak_current: number
  readonly streak_last_day: string | null
}

export type QueueStreakDay = {
  readonly day: string
  readonly queue_empty: boolean
  readonly expected: { readonly streak_current: number; readonly streak_last_day: string }
}

export type QueueStreakFixture = FixtureEnvelope & {
  readonly kind: 'queue-streak'
  readonly initial: QueueStreakState
  readonly days: readonly QueueStreakDay[]
}

export type GoldenFixture =
  | InitialDueFixture
  | ProgressionFixture
  | CheckinFixture
  | ReevaluateFixture
  | QueueOrderFixture
  | NormalizeFixture
  | QueueStreakFixture

export const goldenFixtures: readonly GoldenFixture[] = [
  vencimentoInicialPorDificuldade as InitialDueFixture,
  progressaoAteTeto as ProgressionFixture,
  checkinAtrasadoNaoPenaliza as CheckinFixture,
  contadorDePrazoZeraNoAtraso as CheckinFixture,
  checkinAntecipadoEDoisNoMesmoDia as CheckinFixture,
  reavaliacaoComNovaBase as ReevaluateFixture,
  filaAtrasadosPrimeiro as QueueOrderFixture,
  normalizacaoDeMateria as NormalizeFixture,
  streakDeFilaZerada as QueueStreakFixture,
]
