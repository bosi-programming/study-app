import { boxOptions } from './boxOptions.ts'
import { fieldInputLine } from './fieldInputLine.ts'
import { plainText } from './plainText.ts'
import { renderBox } from './renderBox.ts'
import type { RenderState } from './types.ts'

const PATH_TITLES = { export: 'Exportar', import: 'Importar' } as const
const PATH_HINT = 'Enter confirma · Esc cancela'

export function renderPath(state: RenderState): string[] {
  const options = boxOptions(state)
  const path = state.path
  if (path === null) return renderBox('Caminho', [], options)

  const line = fieldInputLine('Caminho', path.field, state.viewport.columns - 2, true, state.color)
  return renderBox(PATH_TITLES[path.mode], [line, plainText(''), plainText(` ${PATH_HINT}`)], options)
}
