import { paint } from '../../output/color.ts'

export type StyledText = {
  readonly plain: string
  readonly painted: string
}

const RULE_UTF8 = '─'
const RULE_ASCII = '-'
const ELLIPSIS = '…'

export function paintIf(hex: string, text: string, color: boolean, bold = false): string {
  return paint(hex, text, color, bold)
}

export function width(text: string): number {
  return [...text].length
}

export function truncate(text: string, limit: number): string {
  if (limit <= 0) return ''
  const points = [...text]
  if (points.length <= limit) return text
  return `${points.slice(0, limit - 1).join('')}${ELLIPSIS}`
}

export function padCell(text: string, limit: number): string {
  const clipped = truncate(text, limit)
  return clipped + ' '.repeat(limit - width(clipped))
}

export function paintCell(text: string, limit: number, hex: string, color: boolean, bold = false): string {
  const clipped = truncate(text, limit)
  return paintIf(hex, clipped, color, bold) + ' '.repeat(limit - width(clipped))
}

export function centerLine(text: string, limit: number): string {
  const clipped = truncate(text, limit)
  const left = Math.max(0, Math.floor((limit - width(clipped)) / 2))
  return ' '.repeat(left) + padCell(clipped, limit - left)
}

export function ruleLine(columns: number, utf8: boolean): string {
  return (utf8 ? RULE_UTF8 : RULE_ASCII).repeat(columns)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function plainText(text: string): StyledText {
  return { plain: text, painted: text }
}

export function styledText(text: string, hex: string, color: boolean, bold = false): StyledText {
  return { plain: text, painted: paintIf(hex, text, color, bold) }
}

export function joinText(parts: readonly StyledText[]): StyledText {
  return {
    plain: parts.map((part) => part.plain).join(''),
    painted: parts.map((part) => part.painted).join(''),
  }
}

export function padStyled(line: StyledText, limit: number): StyledText {
  const clipped = truncate(line.plain, limit)
  const painted = width(clipped) === width(line.plain) ? line.painted : clipped
  return { plain: clipped, painted: painted + ' '.repeat(limit - width(clipped)) }
}
