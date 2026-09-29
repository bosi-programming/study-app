const RESET = '\u001b[0m'
const BOLD = '\u001b[1m'
const RGB_PREFIX = '\u001b[38;2;'
const RGB_SUFFIX = 'm'

const MUTED_HEX = '909BA6'
const DIM_HEX = '5F6977'
const ACCENT_HEX = 'E8A13B'
const SUCCESS_HEX = '64C889'
const DANGER_HEX = 'E06C75'

export type ColorOptions = {
  readonly json: boolean
  readonly noColor: boolean
}

let enabled = false

export function setColorEnabled(value: boolean): void {
  enabled = value
}

export function colorEnabled(): boolean {
  return enabled
}

export function resolveColorEnabled(
  env: NodeJS.ProcessEnv,
  isTty: boolean,
  options: ColorOptions,
): boolean {
  if (options.json || options.noColor) return false
  if (isForced(env.FORCE_COLOR)) return true
  if (isSet(env.NO_COLOR)) return false
  if (env.TERM === 'dumb') return false
  return isTty
}

function isForced(value: string | undefined): boolean {
  return isSet(value) && value !== '0'
}

function isSet(value: string | undefined): boolean {
  return value !== undefined && value !== ''
}

export function muted(text: string): string {
  return paint(MUTED_HEX, text, false)
}

export function dim(text: string): string {
  return paint(DIM_HEX, text, false)
}

export function heading(text: string): string {
  return paint(MUTED_HEX, text, true)
}

export function accent(text: string): string {
  return paint(ACCENT_HEX, text, false)
}

export function accentStrong(text: string): string {
  return paint(ACCENT_HEX, text, true)
}

export function success(text: string): string {
  return paint(SUCCESS_HEX, text, false)
}

export function successStrong(text: string): string {
  return paint(SUCCESS_HEX, text, true)
}

export function danger(text: string): string {
  return paint(DANGER_HEX, text, true)
}

function paint(hex: string, text: string, bold: boolean): string {
  if (!enabled || text.length === 0) return text
  const [red, green, blue] = rgbOf(hex)
  const prefix = bold ? BOLD : ''
  return `${prefix}${RGB_PREFIX}${red};${green};${blue}${RGB_SUFFIX}${text}${RESET}`
}

function rgbOf(hex: string): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}
