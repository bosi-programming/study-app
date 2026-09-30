import { DIM_HEX, paint } from '../../output/color.ts'
import type { QueueWindow, ScrollBars } from './types.ts'

const SCROLL_UP = '↑'
const SCROLL_DOWN = '↓'

export function scrollBars(window: QueueWindow, color: boolean): ScrollBars {
  return {
    above: window.above > 0 ? [paint(DIM_HEX, `${SCROLL_UP} ${window.above} acima`, color)] : [],
    below: window.below > 0 ? [paint(DIM_HEX, `${SCROLL_DOWN} ${window.below} abaixo`, color)] : [],
  }
}
