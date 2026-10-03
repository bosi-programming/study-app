import { type Store } from '../../persistence/index.ts'
import { tryLocalDateOf } from '../../deps.ts'
import { COLD_ARCHIVE_AFTER_DAYS, readColdArchiveWindow } from '../../model/config.ts'
import { listableItems } from '../items.ts'
import {
  type RenderCold,
  type RenderConfig,
  type RenderReevaluation,
  type RenderState,
  type RenderViewport,
} from '../render/index.ts'
import {
  type ConfirmationState,
  type FormState,
  type ReevaluationState,
  type SessionState,
} from '../session/index.ts'
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
    form: resolveForm(state.form),
    cold: resolveCold(store, state),
    items: resolveItems(store, state),
    config: resolveConfig(store, state),
    path: state.path,
    confirm: resolveConfirm(state.confirmation),
    streak: state.streak,
    banner: state.banner?.message ?? null,
    fatal: state.fatal?.message ?? null,
    viewport: input.viewport,
    color: input.color,
    utf8: input.utf8,
  }
}

function resolveForm(form: FormState | null): RenderState['form'] {
  return form === null ? null : { mode: form.mode, fields: form.fields, focus: form.focus }
}

function resolveCold(store: Store, state: SessionState): RenderCold | null {
  if (state.cold === null) return null
  return {
    items: store.listItems({ status: 'cold' }).map((item) => ({
      item,
      archivedOn: item.cold_archived_at === null ? null : tryLocalDateOf(item.cold_archived_at),
      focused: item.id === state.cold?.focusId,
    })),
  }
}

function resolveItems(store: Store, state: SessionState): RenderState['items'] {
  const itemsState = state.items
  if (itemsState === null) return null
  const items = listableItems(store.listItems())
  const focusId = items.some((item) => item.id === itemsState.focusId) ? itemsState.focusId : items[0]?.id ?? null
  return { focusId, items: items.map((item) => ({ item, focused: item.id === focusId })) }
}

function resolveConfig(store: Store, state: SessionState): RenderConfig | null {
  if (state.config === null) return null
  return {
    key: COLD_ARCHIVE_AFTER_DAYS,
    value: String(readColdArchiveWindow(store)),
    editing: state.config.editing,
    field: state.config.field,
  }
}

function resolveConfirm(confirmation: ConfirmationState | null): RenderState['confirm'] {
  return confirmation === null ? null : { message: confirmation.message }
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
