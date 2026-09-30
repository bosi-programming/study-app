import { ACCENT_HEX, MUTED_HEX, paint } from '../../output/color.ts'
import { joinText } from './joinText.ts'
import { padStyled } from './padStyled.ts'
import { plainText } from './plainText.ts'
import { styledText } from './styledText.ts'
import type { BoxChars, BoxOptions, StyledText } from './types.ts'
import { width } from './width.ts'

const TITLE_CHROME = 3
const BOX_UTF8: BoxChars = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
const BOX_ASCII: BoxChars = { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' }

export function renderBox(title: string, body: readonly StyledText[], options: BoxOptions): string[] {
  const chars = options.utf8 ? BOX_UTF8 : BOX_ASCII
  const inner = options.columns - 2
  const capacity = Math.max(0, options.rows - 2)
  const content = options.banner === null
    ? body
    : [joinText([plainText(' '), styledText(options.banner, ACCENT_HEX, options.color)]), ...body]
  const visible = content.slice(0, capacity)
  const head = `${chars.tl}${chars.h} ${paint(MUTED_HEX, title, options.color, true)} ${chars.h.repeat(Math.max(0, inner - TITLE_CHROME - width(title)))}${chars.tr}`
  const lines = [head]
  for (const line of visible) lines.push(`${chars.v}${padStyled(line, inner).painted}${chars.v}`)
  for (let index = visible.length; index < capacity; index += 1) lines.push(`${chars.v}${' '.repeat(inner)}${chars.v}`)
  lines.push(`${chars.bl}${chars.h.repeat(inner)}${chars.br}`)
  return lines
}
