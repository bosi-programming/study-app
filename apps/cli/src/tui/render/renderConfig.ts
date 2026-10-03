import { fieldInputLine } from './fieldInputLine.ts'
import { plainText } from './plainText.ts'
import { renderBox } from './renderBox.ts'
import type { BoxOptions, RenderState } from './types.ts'

const CONFIG_TITLE = 'Config'
const CONFIG_HINT_VIEW = 'Enter edita · Esc volta'
const CONFIG_HINT_EDIT = 'Enter grava · Esc cancela'

export function renderConfig(state: RenderState): string[] {
  const options = boxOptions(state)
  const config = state.config
  if (config === null) return renderBox(CONFIG_TITLE, [], options)

  const line = fieldInputLine(config.key, config.field, state.viewport.columns - 2, config.editing, state.color)
  const hint = config.editing ? CONFIG_HINT_EDIT : CONFIG_HINT_VIEW
  return renderBox(CONFIG_TITLE, [line, plainText(''), plainText(` ${hint}`)], options)
}

function boxOptions(state: RenderState): BoxOptions {
  return {
    columns: state.viewport.columns,
    rows: state.viewport.rows,
    utf8: state.utf8,
    color: state.color,
    banner: state.banner,
  }
}
