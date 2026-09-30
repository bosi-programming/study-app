import { ACCENT_HEX, MUTED_HEX } from '../../output/color.ts'
import {
  type StyledText,
  joinText,
  padStyled,
  paintIf,
  plainText,
  styledText,
  width,
} from './format.ts'

type BoxChars = {
  readonly tl: string
  readonly tr: string
  readonly bl: string
  readonly br: string
  readonly h: string
  readonly v: string
}

const BOX_UTF8: BoxChars = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
const BOX_ASCII: BoxChars = { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' }

export type BoxOptions = {
  readonly columns: number
  readonly rows: number
  readonly utf8: boolean
  readonly color: boolean
  readonly banner: string | null
}

export function renderBox(title: string, body: readonly StyledText[], options: BoxOptions): string[] {
  const chars = options.utf8 ? BOX_UTF8 : BOX_ASCII
  const inner = options.columns - 2
  const capacity = Math.max(0, options.rows - 2)
  const content = options.banner === null
    ? body
    : [joinText([plainText(' '), styledText(options.banner, ACCENT_HEX, options.color)]), ...body]
  const visible = content.slice(0, capacity)
  const head = `${chars.tl}${chars.h} ${paintIf(MUTED_HEX, title, options.color, true)} ${chars.h.repeat(Math.max(0, inner - 3 - width(title)))}${chars.tr}`
  const lines = [head]
  for (const line of visible) lines.push(`${chars.v}${padStyled(line, inner).painted}${chars.v}`)
  for (let index = visible.length; index < capacity; index += 1) lines.push(`${chars.v}${' '.repeat(inner)}${chars.v}`)
  lines.push(`${chars.bl}${chars.h.repeat(inner)}${chars.br}`)
  return lines
}
