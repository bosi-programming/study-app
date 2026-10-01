export type KeyScreen = 'queue' | 'detail' | 'reevaluate' | 'help'

export type KeyCommand =
  | { readonly kind: 'focus-next' }
  | { readonly kind: 'focus-prev' }
  | { readonly kind: 'focus-first' }
  | { readonly kind: 'focus-last' }
  | { readonly kind: 'open-detail' }
  | { readonly kind: 'close-detail' }
  | { readonly kind: 'start-reevaluate' }
  | { readonly kind: 'cancel-reevaluate' }
  | { readonly kind: 'toggle-help' }
  | { readonly kind: 'check-in' }
  | { readonly kind: 'reevaluate'; readonly difficulty: number }
  | { readonly kind: 'quit' }
  | { readonly kind: 'interrupt' }

export type ParsedKeys = {
  readonly commands: readonly KeyCommand[]
  readonly pending: string
}

type KeyToken =
  | { readonly kind: 'focus-prev' }
  | { readonly kind: 'focus-next' }
  | { readonly kind: 'page-prev' }
  | { readonly kind: 'page-next' }
  | { readonly kind: 'focus-first' }
  | { readonly kind: 'focus-last' }
  | { readonly kind: 'enter' }
  | { readonly kind: 'escape' }
  | { readonly kind: 'open-detail' }
  | { readonly kind: 'toggle-help' }
  | { readonly kind: 'quit' }
  | { readonly kind: 'interrupt' }
  | { readonly kind: 'difficulty'; readonly difficulty: number }
  | { readonly kind: 'inert' }

const ESC = '\u001b'
const CSI = `${ESC}[`
const SS3 = `${ESC}O`
const SS3_LENGTH = 3
const ENTER = '\r'
const CTRL_C = '\u0003'
const FIRST_DIGIT = '1'
const LAST_DIGIT = '5'
const X10_TAIL = 3

const CSI_FINAL_MIN = 0x40
const CSI_FINAL_MAX = 0x7e
const CSI_PARAM_MIN = 0x30
const CSI_PARAM_MAX = 0x3f
const CSI_INTERMEDIATE_MIN = 0x20
const CSI_INTERMEDIATE_MAX = 0x2f

const INERT: KeyToken = { kind: 'inert' }

const KNOWN_CSI = [
  `${CSI}A`, `${CSI}B`, `${CSI}C`, `${CSI}D`, `${CSI}H`, `${CSI}F`,
  `${CSI}1~`, `${CSI}4~`, `${CSI}5~`, `${CSI}6~`, `${CSI}7~`, `${CSI}8~`,
]

const CSI_TOKENS: Readonly<Record<string, KeyToken>> = {
  [`${CSI}A`]: { kind: 'focus-prev' },
  [`${CSI}B`]: { kind: 'focus-next' },
  [`${CSI}5~`]: { kind: 'page-prev' },
  [`${CSI}6~`]: { kind: 'page-next' },
}

const SS3_TOKENS: Readonly<Record<string, KeyToken>> = {
  [`${SS3}A`]: { kind: 'focus-prev' },
  [`${SS3}B`]: { kind: 'focus-next' },
}

const CHAR_TOKENS: Readonly<Record<string, KeyToken>> = {
  j: { kind: 'focus-next' },
  k: { kind: 'focus-prev' },
  g: { kind: 'focus-first' },
  G: { kind: 'focus-last' },
  i: { kind: 'open-detail' },
  '?': { kind: 'toggle-help' },
  q: { kind: 'quit' },
  [ENTER]: { kind: 'enter' },
  [CTRL_C]: { kind: 'interrupt' },
}

type Scan = {
  readonly tokens: readonly KeyToken[]
  readonly pending: string
}

type CsiScan = { readonly length: number; readonly token: KeyToken } | { readonly pending: string }

function isCsiParam(code: number): boolean {
  return code >= CSI_PARAM_MIN && code <= CSI_PARAM_MAX
}

function isCsiIntermediate(code: number): boolean {
  return code >= CSI_INTERMEDIATE_MIN && code <= CSI_INTERMEDIATE_MAX
}

function isCsiFinal(code: number): boolean {
  return code >= CSI_FINAL_MIN && code <= CSI_FINAL_MAX
}

function isKnownCsiPrefix(sequence: string): boolean {
  return KNOWN_CSI.some((known) => known.startsWith(sequence))
}

function scanCsi(rest: string): CsiScan | null {
  if (!rest.startsWith(CSI)) return null

  let index = CSI.length
  while (index < rest.length) {
    const code = rest.charCodeAt(index)
    if (isCsiParam(code) || isCsiIntermediate(code)) {
      index += 1
      continue
    }
    if (isCsiFinal(code)) {
      const sequence = rest.slice(0, index + 1)
      const token = CSI_TOKENS[sequence] ?? INERT
      const tail = sequence === `${CSI}M` ? X10_TAIL : 0
      return { length: Math.min(index + 1 + tail, rest.length), token }
    }
    return { length: CSI.length, token: INERT }
  }

  return isKnownCsiPrefix(rest) ? { pending: rest } : { length: rest.length, token: INERT }
}

function scanSs3(rest: string): { readonly length: number; readonly token: KeyToken } | null {
  if (!rest.startsWith(SS3)) return null
  const token = SS3_TOKENS[rest.slice(0, SS3_LENGTH)]
  return token === undefined ? null : { length: SS3_LENGTH, token }
}

function tokenForChar(char: string): KeyToken | null {
  const token = CHAR_TOKENS[char]
  if (token !== undefined) return token
  if (char >= FIRST_DIGIT && char <= LAST_DIGIT) {
    return { kind: 'difficulty', difficulty: Number(char) }
  }
  return null
}

function scan(input: string): Scan {
  const tokens: KeyToken[] = []
  let index = 0

  while (index < input.length) {
    const char = input[index] ?? ''
    if (char === ESC) {
      const rest = input.slice(index)
      const csi = scanCsi(rest)
      if (csi !== null) {
        if ('pending' in csi) return { tokens, pending: csi.pending }
        tokens.push(csi.token)
        index += csi.length
        continue
      }
      const ss3 = scanSs3(rest)
      if (ss3 !== null) {
        tokens.push(ss3.token)
        index += ss3.length
        continue
      }
      if (rest.length === 1) {
        tokens.push({ kind: 'escape' })
        index += 1
        continue
      }
      index += 2
      continue
    }

    const token = tokenForChar(char)
    if (token !== null) tokens.push(token)
    index += 1
  }

  return { tokens, pending: '' }
}

function focusCommands(screen: KeyScreen, kind: 'focus-prev' | 'focus-next'): readonly KeyCommand[] {
  return screen === 'queue' || screen === 'help' ? [{ kind }] : []
}

function enterCommands(screen: KeyScreen): readonly KeyCommand[] {
  if (screen === 'queue') return [{ kind: 'check-in' }]
  if (screen === 'reevaluate') return [{ kind: 'cancel-reevaluate' }]
  return []
}

function escapeCommands(screen: KeyScreen): readonly KeyCommand[] {
  if (screen === 'detail') return [{ kind: 'close-detail' }]
  if (screen === 'reevaluate') return [{ kind: 'cancel-reevaluate' }]
  if (screen === 'help') return [{ kind: 'toggle-help' }]
  return []
}

function detailCommands(screen: KeyScreen): readonly KeyCommand[] {
  if (screen === 'queue') return [{ kind: 'open-detail' }]
  if (screen === 'detail') return [{ kind: 'close-detail' }]
  return []
}

function difficultyCommands(screen: KeyScreen, difficulty: number): readonly KeyCommand[] {
  if (screen === 'queue') return [{ kind: 'start-reevaluate' }, { kind: 'reevaluate', difficulty }]
  if (screen === 'reevaluate') return [{ kind: 'reevaluate', difficulty }]
  return []
}

function commandsFor(screen: KeyScreen, token: KeyToken): readonly KeyCommand[] {
  switch (token.kind) {
    case 'inert':
      return []
    case 'quit':
      return [{ kind: 'quit' }]
    case 'interrupt':
      return [{ kind: 'interrupt' }]
    case 'focus-prev':
      return focusCommands(screen, 'focus-prev')
    case 'focus-next':
      return focusCommands(screen, 'focus-next')
    case 'page-prev':
      return screen === 'queue' ? [{ kind: 'focus-prev' }] : []
    case 'page-next':
      return screen === 'queue' ? [{ kind: 'focus-next' }] : []
    case 'focus-first':
      return screen === 'queue' ? [{ kind: 'focus-first' }] : []
    case 'focus-last':
      return screen === 'queue' ? [{ kind: 'focus-last' }] : []
    case 'enter':
      return enterCommands(screen)
    case 'escape':
      return escapeCommands(screen)
    case 'open-detail':
      return detailCommands(screen)
    case 'toggle-help':
      return screen === 'reevaluate' ? [] : [{ kind: 'toggle-help' }]
    case 'difficulty':
      return difficultyCommands(screen, token.difficulty)
  }
}

export function parseKeys(chunk: string, screen: KeyScreen, pending = ''): ParsedKeys {
  const scanned = scan(`${pending}${chunk}`)
  return {
    commands: scanned.tokens.flatMap((token) => commandsFor(screen, token)),
    pending: scanned.pending,
  }
}
