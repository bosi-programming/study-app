import { DIFFICULTY_LABELS } from '@study/core'
import { SUCCESS_HEX } from '../../output/color.ts'
import { joinText } from './joinText.ts'
import { plainText } from './plainText.ts'
import { styledText } from './styledText.ts'
import type { RenderState, StyledText } from './types.ts'

const EN_DASH = '–'
const REEVALUATE_CANCEL = 'Esc cancela · Enter mantém · 1–5 recalcula'
const CONFIRMATION_PREFIX = '✓ Check-in registrado:'
const CHOICES = `  1 ${DIFFICULTY_LABELS[1]}   2 ${DIFFICULTY_LABELS[2]}   3 ${DIFFICULTY_LABELS[3]}   4 ${DIFFICULTY_LABELS[4]}   5 ${DIFFICULTY_LABELS[5]}`

export function reevaluateFooter(state: RenderState): StyledText[] {
  const difficulty = state.reevaluation?.currentDifficulty ?? 1
  const lines: StyledText[] = []
  if (state.confirmation !== null) {
    lines.push(joinText([
      styledText(CONFIRMATION_PREFIX, SUCCESS_HEX, state.color, true),
      plainText(` ${state.confirmation}`),
    ]))
  }
  lines.push(plainText(`Dificuldade atual: ${difficulty} — ${DIFFICULTY_LABELS[difficulty]}  ·  Enter mantém, ou escolha 1${EN_DASH}5:`))
  lines.push(plainText(CHOICES))
  lines.push(plainText(REEVALUATE_CANCEL))
  return lines
}
