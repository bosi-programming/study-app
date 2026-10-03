import { renderDetail } from './renderDetail.ts'
import { renderEmpty } from './renderEmpty.ts'
import { renderHelp } from './renderHelp.ts'
import { renderCold } from './renderCold.ts'
import { renderConfig } from './renderConfig.ts'
import { renderConfirm } from './renderConfirm.ts'
import { renderForm } from './renderForm.ts'
import { renderPath } from './renderPath.ts'
import { renderQueue } from './renderQueue.ts'
import { renderReevaluate } from './renderReevaluate.ts'
import { renderSmall } from './renderSmall.ts'
import type { RenderState } from './types.ts'

const MIN_COLUMNS = 60
const MIN_ROWS = 15

export function render(state: RenderState): string {
  if (state.fatal !== null) return ''

  const { columns, rows } = state.viewport
  if (columns < MIN_COLUMNS || rows < MIN_ROWS) return renderSmall(columns)

  switch (state.screen) {
    case 'detail':
      return renderDetail(state).join('\n')
    case 'help':
      return renderHelp(state).join('\n')
    case 'reevaluate':
      return renderReevaluate(state).join('\n')
    case 'form':
      return renderForm(state).join('\n')
    case 'cold':
      return renderCold(state).join('\n')
    case 'config':
      return renderConfig(state).join('\n')
    case 'path':
      return renderPath(state).join('\n')
    case 'confirm':
      return renderConfirm(state).join('\n')
    case 'queue':
      return (state.queue.length === 0 ? renderEmpty(state) : renderQueue(state)).join('\n')
  }
}
