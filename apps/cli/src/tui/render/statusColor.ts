import { DIM_HEX, SUCCESS_HEX } from '../../output/color.ts'
import type { Item } from '@study/core'

export function statusColor(status: Item['status']): string {
  return status === 'active' ? SUCCESS_HEX : DIM_HEX
}
