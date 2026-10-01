import { type Store } from '../../persistence/index.ts'
import {
  type RenderReevaluation,
  type RenderState,
  type RenderViewport,
} from '../render/index.ts'
import { type ReevaluationState, type SessionState } from '../session/index.ts'
import { resolveDetail } from './resolveDetail.ts'

export type BuildRenderStateInput = {
  readonly state: SessionState
  readonly store: Store
  readonly confirmed: boolean
  readonly viewport: RenderViewport
  readonly color: boolean
  readonly utf8: boolean
}

export function buildRenderState(input: BuildRenderStateInput): RenderState {
  const { state, store } = input
  const reevaluation = resolveReevaluation(store, state.reevaluation)
  return {
    today: state.today,
    screen: state.screen,
    queue: state.queue,
    focusId: state.focusId,
    detail: resolveDetail(store, state.detailItemId),
    reevaluation,
    confirmation: input.confirmed && reevaluation !== null ? reevaluation.item.title : null,
    streak: state.streak,
    banner: state.banner?.message ?? null,
    fatal: state.fatal?.message ?? null,
    viewport: input.viewport,
    color: input.color,
    utf8: input.utf8,
  }
}

function resolveReevaluation(
  store: Store,
  reevaluation: ReevaluationState | null,
): RenderReevaluation | null {
  if (reevaluation === null) return null
  const item = store.getItem(reevaluation.itemId)
  if (item === null) return null
  return { item, currentDifficulty: reevaluation.currentDifficulty }
}
