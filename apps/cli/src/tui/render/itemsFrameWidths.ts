import { frameWidths } from './frameWidths.ts'
import type { FrameWidths } from './types.ts'

export const ITEM_STATUS_WIDTH = 8
const STATUS_GAP = 1

export function itemsFrameWidths(columns: number): FrameWidths {
  return frameWidths(columns - ITEM_STATUS_WIDTH - STATUS_GAP)
}
