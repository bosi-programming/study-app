import { fieldInputLine } from './fieldInputLine.ts'
import { plainText } from './plainText.ts'
import { renderBox } from './renderBox.ts'
import type { BoxOptions, RenderState } from './types.ts'

const PATH_TITLES = { export: 'Exportar', import: 'Importar' } as const
const PATH_HINT = 'Enter confirma · Esc cancela'

export function renderPath(state: RenderState): string[] {
  const options = boxOptions(state)
  const path = state.path
  if (path === null) return renderBox('Caminho', [], options)

  const line = fieldInputLine('Caminho', path.field, state.viewport.columns - 2, true, state.color)
  return renderBox(PATH_TITLES[path.mode], [line, plainText(''), plainText(` ${PATH_HINT}`)], options)
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
