import { clamp } from './clamp.ts'
import type { FrameWidths } from './types.ts'

const FIXED_WIDTH = 14
const SUBJECT_RATIO = 0.22
const SUBJECT_MIN = 9
const SUBJECT_MAX = 15
const DUE_GAP = 12
const DUE_MIN = 23
const DUE_MAX = 28

export function frameWidths(columns: number): FrameWidths {
  const free = columns - FIXED_WIDTH
  const subject = clamp(Math.floor(free * SUBJECT_RATIO), SUBJECT_MIN, SUBJECT_MAX)
  const due = clamp(free - subject - DUE_GAP, DUE_MIN, DUE_MAX)
  return { subject, title: free - subject - due, due }
}
