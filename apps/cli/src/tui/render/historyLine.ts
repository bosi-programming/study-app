import { ACCENT_HEX, DIM_HEX, SUCCESS_HEX } from '../../output/color.ts'
import { joinText } from './joinText.ts'
import { plainText } from './plainText.ts'
import { styledText } from './styledText.ts'
import type { RenderDetail, StyledText } from './types.ts'

export function historyLine(log: RenderDetail['history'][number], color: boolean): StyledText {
  const outcome = log.late ? 'atrasado' : 'no prazo'
  return joinText([
    plainText('  '),
    styledText(log.reviewed_at.slice(0, 10), DIM_HEX, color),
    plainText(`  n=${log.review_count_after}  intervalo ${log.interval_after}d  `),
    styledText(outcome, log.late ? ACCENT_HEX : SUCCESS_HEX, color),
  ])
}
