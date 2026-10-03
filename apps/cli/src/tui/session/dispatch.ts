import { type Item } from '@study/core'
import { type ContextHookTarget } from '../../context.ts'
import { COLD_ARCHIVE_AFTER_DAYS, readColdArchiveWindow } from '../../model/config.ts'
import { backspaceField, deleteForward, insertText, moveFieldCursor, startField } from '../field.ts'
import { type TextField } from '../fieldTypes.ts'
import { checkIn } from './checkIn.ts'
import { emptyForm, formOfItem, moveFormFocus, withField } from './forms.ts'
import { messageOf } from './messageOf.ts'
import { moveFocus } from './moveFocus.ts'
import { reevaluate } from './reevaluate.ts'
import { startReevaluation } from './startReevaluation.ts'
import { type ConfirmationState, type SessionAction, type SessionState } from './types.ts'
import {
  archiveTarget,
  exportArchive,
  exportBlockedAsDatabase,
  exportExists,
  id8,
  importArchive,
  purgeCold,
  removeTarget,
  restoreColdItem,
  setConfigValue,
  submitForm,
  unarchiveTarget,
} from './writes.ts'
import { withFocus } from './withFocus.ts'

const LAST_FORM_FIELD = 'link'

export function dispatch(
  target: ContextHookTarget,
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.kind) {
    case 'focus-next':
      return withFocus(state, moveFocus(state.queue, state.focusId, 'next'))
    case 'focus-prev':
      return withFocus(state, moveFocus(state.queue, state.focusId, 'prev'))
    case 'focus-first':
      return withFocus(state, moveFocus(state.queue, state.focusId, 'first'))
    case 'focus-last':
      return withFocus(state, moveFocus(state.queue, state.focusId, 'last'))
    case 'open-detail':
      return state.focusId === null
        ? state
        : { ...state, screen: 'detail', detailItemId: state.focusId }
    case 'close-detail':
      return { ...state, screen: 'queue', detailItemId: null }
    case 'start-reevaluate':
      return startReevaluation(state)
    case 'cancel-reevaluate':
      return { ...state, screen: 'queue', reevaluation: null }
    case 'toggle-help':
      return { ...state, screen: state.screen === 'help' ? 'queue' : 'help' }
    case 'check-in': {
      const reevaluation = checkIn(target, state)
      return reevaluation === null
        ? state
        : { ...state, screen: 'reevaluate', reevaluation }
    }
    case 'reevaluate':
      return reevaluate(target, state, action.difficulty)
    case 'open-add':
      return { ...state, screen: 'form', form: emptyForm(), banner: null }
    case 'open-edit': {
      const item = focusItem(target, state)
      if (item === null) return state
      return { ...state, screen: 'form', form: formOfItem(item), banner: null }
    }
    case 'archive':
      return withWrite(target, state, (item) => {
        const archived = archiveTarget(target, item)
        return info(state, `Item arquivado: ${archived.title} (${id8(archived.id)})`)
      })
    case 'unarchive':
      return withWrite(target, state, (item) => {
        const unarchived = unarchiveTarget(target, item)
        return info(state, `Item desarquivado: ${unarchived.title} (${id8(unarchived.id)})`)
      })
    case 'request-remove': {
      const item = focusItem(target, state)
      if (item === null) return state
      return confirm(state, { kind: 'remove', itemId: item.id }, `Remover ${item.title}? (y/n)`, state.screen)
    }
    case 'open-cold': {
      const items = target.store.listItems({ status: 'cold' })
      return { ...state, screen: 'cold', cold: { focusId: items[0]?.id ?? null }, banner: null }
    }
    case 'close-cold':
      return { ...state, screen: 'queue', cold: null }
    case 'cold-focus-prev':
      return { ...state, cold: { focusId: moveCold(target, state.cold?.focusId ?? null, -1) } }
    case 'cold-focus-next':
      return { ...state, cold: { focusId: moveCold(target, state.cold?.focusId ?? null, 1) } }
    case 'cold-restore':
      return withColdWrite(target, state, (item) => {
        const restored = restoreColdItem(target, item)
        return { state: info(state, `Item restaurado: ${restored.title} (${id8(restored.id)})`), focusId: null }
      })
    case 'cold-purge': {
      const item = coldItem(target, state)
      if (item === null) return state
      return confirm(state, { kind: 'purge', itemId: item.id }, 'Remover do arquivo morto? (y/n)', 'cold')
    }
    case 'open-config':
      return { ...state, screen: 'config', config: configState(target, false), banner: null }
    case 'open-export':
      return { ...state, screen: 'path', path: { mode: 'export', field: startField('') }, banner: null }
    case 'open-import':
      return { ...state, screen: 'path', path: { mode: 'import', field: startField('') }, banner: null }
    case 'form-enter':
      return formEnter(target, state)
    case 'form-cancel':
      return formCancel(target, state)
    case 'form-previous-field':
      return state.form === null ? state : { ...state, form: moveFormFocus(state.form, -1) }
    case 'form-next-field':
      return state.form === null ? state : { ...state, form: moveFormFocus(state.form, 1) }
    case 'field-insert':
      return editField(state, (field) => insertText(field, action.text))
    case 'field-backspace':
      return editField(state, backspaceField)
    case 'field-delete':
      return editField(state, deleteForward)
    case 'field-left':
      return editField(state, (field) => moveFieldCursor(field, 'left'))
    case 'field-right':
      return editField(state, (field) => moveFieldCursor(field, 'right'))
    case 'field-home':
      return editField(state, (field) => moveFieldCursor(field, 'home'))
    case 'field-end':
      return editField(state, (field) => moveFieldCursor(field, 'end'))
    case 'confirm-yes':
      return confirmYes(target, state)
    case 'confirm-no':
      return state.confirmation === null
        ? state
        : { ...state, screen: state.confirmation.returnTo, confirmation: null }
  }
}

function focusItem(target: ContextHookTarget, state: SessionState): Item | null {
  const id = state.focusId ?? state.detailItemId
  return id === null ? null : target.store.getItem(id)
}

function coldItem(target: ContextHookTarget, state: SessionState): Item | null {
  const id = state.cold?.focusId
  return id === null || id === undefined ? null : target.store.getItem(id)
}

function withWrite(
  target: ContextHookTarget,
  state: SessionState,
  run: (item: Item) => SessionState,
): SessionState {
  const item = focusItem(target, state)
  if (item === null) return state
  try {
    return run(item)
  } catch (error) {
    return warning(state, error)
  }
}

function withColdWrite(
  target: ContextHookTarget,
  state: SessionState,
  run: (item: Item) => { readonly state: SessionState; readonly focusId: string | null },
): SessionState {
  const item = coldItem(target, state)
  if (item === null) return state
  try {
    const result = run(item)
    return { ...result.state, cold: { focusId: result.focusId ?? firstColdId(target) } }
  } catch (error) {
    return warning(state, error)
  }
}

function firstColdId(target: ContextHookTarget): string | null {
  return target.store.listItems({ status: 'cold' })[0]?.id ?? null
}

function moveCold(target: ContextHookTarget, focusId: string | null, step: 1 | -1): string | null {
  const items = target.store.listItems({ status: 'cold' })
  if (items.length === 0) return null
  const index = items.findIndex((item) => item.id === focusId)
  const current = index < 0 ? 0 : index
  const next = Math.max(0, Math.min(items.length - 1, current + step))
  return items[next]?.id ?? null
}

function configState(target: ContextHookTarget, editing: boolean): SessionState['config'] {
  return { editing, field: startField(String(readColdArchiveWindow(target.store))) }
}

function editField(state: SessionState, update: (field: TextField) => TextField): SessionState {
  if (state.screen === 'config' && state.config !== null) {
    if (!state.config.editing) return state
    return { ...state, config: { ...state.config, field: update(state.config.field) } }
  }
  if (state.screen === 'path' && state.path !== null) {
    return { ...state, path: { ...state.path, field: update(state.path.field) } }
  }
  if (state.screen === 'form' && state.form !== null) {
    return { ...state, form: withField(state.form, state.form.focus, update) }
  }
  return state
}

function formEnter(target: ContextHookTarget, state: SessionState): SessionState {
  if (state.screen === 'config') return configEnter(target, state)
  if (state.screen === 'path') return pathEnter(target, state)
  const form = state.form
  if (state.screen !== 'form' || form === null) return state
  if (form.focus !== LAST_FORM_FIELD) return { ...state, form: moveFormFocus(form, 1) }
  try {
    const { item, created } = submitForm(target, form)
    const label = created ? 'Item criado' : 'Item atualizado'
    return { ...state, screen: 'queue', form: null, banner: { kind: 'info', message: `${label}: ${item.title} (${id8(item.id)})` } }
  } catch (error) {
    return warning(state, error)
  }
}

function configEnter(target: ContextHookTarget, state: SessionState): SessionState {
  const config = state.config
  if (config === null) return state
  if (!config.editing) return { ...state, config: { editing: true, field: startField('') } }
  try {
    const value = setConfigValue(target, config.field.value)
    return {
      ...state,
      config: configState(target, false),
      banner: { kind: 'info', message: `${COLD_ARCHIVE_AFTER_DAYS}: ${value}` },
    }
  } catch (error) {
    return warning(state, error)
  }
}

function pathEnter(target: ContextHookTarget, state: SessionState): SessionState {
  const path = state.path
  if (state.screen !== 'path' || path === null) return state
  const value = path.field.value.trim()
  if (value.length === 0) return warning(state, new Error('caminho é obrigatório'))
  if (path.mode === 'import') return importPath(target, state, value)
  return exportPath(target, state, value)
}

function exportPath(target: ContextHookTarget, state: SessionState, path: string): SessionState {
  try {
    if (exportBlockedAsDatabase(target, path)) throw new Error(`arquivo de export é o banco: ${path}`)
    if (exportExists(path)) {
      return confirm(state, { kind: 'export', path }, `Sobrescrever ${path}? (y/n)`, 'queue')
    }
    exportArchive(target, path)
    return { ...state, screen: 'queue', path: null, banner: { kind: 'info', message: `Exportado: ${path}` } }
  } catch (error) {
    return warning(state, error)
  }
}

function importPath(target: ContextHookTarget, state: SessionState, path: string): SessionState {
  try {
    const counts = importArchive(target, path)
    return {
      ...state,
      screen: 'queue',
      path: null,
      banner: { kind: 'info', message: `Importado: ${counts.written} gravados, ${counts.skipped} ignorados` },
    }
  } catch (error) {
    return warning(state, error)
  }
}

function formCancel(target: ContextHookTarget, state: SessionState): SessionState {
  if (state.screen === 'config' && state.config !== null && state.config.editing) {
    return { ...state, config: configState(target, false) }
  }
  return { ...state, screen: 'queue', form: null, config: null, path: null }
}

function confirmYes(target: ContextHookTarget, state: SessionState): SessionState {
  const confirmation = state.confirmation
  if (confirmation === null) return state
  try {
    return runConfirmation(target, state, confirmation)
  } catch (error) {
    return { ...warning(state, error), screen: confirmation.returnTo, confirmation: null, path: null }
  }
}

function runConfirmation(
  target: ContextHookTarget,
  state: SessionState,
  confirmation: ConfirmationState,
): SessionState {
  const action = confirmation.action
  if (action.kind === 'remove') {
    const item = target.store.getItem(action.itemId)
    if (item === null) return { ...state, screen: confirmation.returnTo, confirmation: null }
    removeTarget(target, item)
    return {
      ...state,
      screen: 'queue',
      confirmation: null,
      banner: { kind: 'info', message: `Item removido: ${item.title} (${id8(item.id)})` },
    }
  }
  if (action.kind === 'purge') {
    const item = target.store.getItem(action.itemId)
    if (item === null) return { ...state, screen: 'cold', confirmation: null }
    purgeCold(target, item)
    return {
      ...state,
      screen: 'cold',
      confirmation: null,
      cold: { focusId: firstColdId(target) },
      banner: { kind: 'info', message: `Removido do arquivo morto: ${item.title}` },
    }
  }
  exportArchive(target, action.path)
  return {
    ...state,
    screen: 'queue',
    confirmation: null,
    path: null,
    banner: { kind: 'info', message: `Exportado: ${action.path}` },
  }
}

function confirm(
  state: SessionState,
  action: ConfirmationState['action'],
  message: string,
  returnTo: SessionState['screen'],
): SessionState {
  return { ...state, screen: 'confirm', confirmation: { action, message, returnTo } }
}

function info(state: SessionState, message: string): SessionState {
  return { ...state, banner: { kind: 'info', message } }
}

function warning(state: SessionState, error: unknown): SessionState {
  return { ...state, banner: { kind: 'warning', message: messageOf(error) } }
}
