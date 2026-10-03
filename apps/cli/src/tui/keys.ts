export type KeyScreen = 'queue' | 'detail' | 'reevaluate' | 'help' | 'form' | 'cold' | 'config' | 'path' | 'confirm' | 'items'

export type KeyCommand =
  | { readonly kind: 'focus-next' }
  | { readonly kind: 'focus-prev' }
  | { readonly kind: 'focus-first' }
  | { readonly kind: 'focus-last' }
  | { readonly kind: 'page-next' }
  | { readonly kind: 'page-prev' }
  | { readonly kind: 'open-detail' }
  | { readonly kind: 'close-detail' }
  | { readonly kind: 'start-reevaluate' }
  | { readonly kind: 'cancel-reevaluate' }
  | { readonly kind: 'toggle-help' }
  | { readonly kind: 'check-in' }
  | { readonly kind: 'reevaluate'; readonly difficulty: number }
  | { readonly kind: 'open-add' }
  | { readonly kind: 'open-edit' }
  | { readonly kind: 'archive' }
  | { readonly kind: 'unarchive' }
  | { readonly kind: 'request-remove' }
  | { readonly kind: 'open-cold' }
  | { readonly kind: 'close-cold' }
  | { readonly kind: 'open-items' }
  | { readonly kind: 'close-items' }
  | { readonly kind: 'cold-focus-prev' }
  | { readonly kind: 'cold-focus-next' }
  | { readonly kind: 'cold-restore' }
  | { readonly kind: 'cold-purge' }
  | { readonly kind: 'open-config' }
  | { readonly kind: 'open-export' }
  | { readonly kind: 'open-import' }
  | { readonly kind: 'form-enter' }
  | { readonly kind: 'form-cancel' }
  | { readonly kind: 'form-previous-field' }
  | { readonly kind: 'form-next-field' }
  | { readonly kind: 'field-insert'; readonly text: string }
  | { readonly kind: 'field-backspace' }
  | { readonly kind: 'field-delete' }
  | { readonly kind: 'field-left' }
  | { readonly kind: 'field-right' }
  | { readonly kind: 'field-home' }
  | { readonly kind: 'field-end' }
  | { readonly kind: 'confirm-yes' }
  | { readonly kind: 'confirm-no' }
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
  | { readonly kind: 'text'; readonly char: string }
  | { readonly kind: 'backspace' }
  | { readonly kind: 'delete' }
  | { readonly kind: 'arrow-left' }
  | { readonly kind: 'arrow-right' }
  | { readonly kind: 'home' }
  | { readonly kind: 'end' }
  | { readonly kind: 'add' }
  | { readonly kind: 'edit' }
  | { readonly kind: 'archive' }
  | { readonly kind: 'unarchive' }
  | { readonly kind: 'remove' }
  | { readonly kind: 'cold' }
  | { readonly kind: 'items' }
  | { readonly kind: 'config' }
  | { readonly kind: 'export' }
  | { readonly kind: 'import' }
  | { readonly kind: 'cold-restore' }
  | { readonly kind: 'cold-purge' }
  | { readonly kind: 'confirm-yes' }
  | { readonly kind: 'confirm-no' }
  | { readonly kind: 'inert' }

const ESC = '\u001b'
const CSI = `${ESC}[`
const SS3 = `${ESC}O`
const SS3_LENGTH = 3
const ESCAPE_PAIR_LENGTH = 2
const ENTER = '\r'
const LINE_FEED = '\n'
const CTRL_C = '\u0003'
const BACKSPACE = '\u007f'
const BACKSPACE_ALT = '\u0008'
const FIRST_PRINTABLE = 0x20
const FIRST_DIGIT = '1'
const LAST_DIGIT = '5'
const X10_MOUSE = `${CSI}M`
const X10_MOUSE_LENGTH = 3

const TEXT_SCREENS: readonly KeyScreen[] = ['form', 'path', 'config']

const CSI_FINAL_MIN = 0x40
const CSI_FINAL_MAX = 0x7e
const CSI_PARAM_MIN = 0x30
const CSI_PARAM_MAX = 0x3f
const CSI_INTERMEDIATE_MIN = 0x20
const CSI_INTERMEDIATE_MAX = 0x2f

const INERT: KeyToken = { kind: 'inert' }

const CSI_TOKENS: Readonly<Record<string, KeyToken>> = {
  [`${CSI}A`]: { kind: 'focus-prev' },
  [`${CSI}B`]: { kind: 'focus-next' },
  [`${CSI}C`]: { kind: 'arrow-right' },
  [`${CSI}D`]: { kind: 'arrow-left' },
  [`${CSI}H`]: { kind: 'home' },
  [`${CSI}F`]: { kind: 'end' },
  [`${CSI}1~`]: { kind: 'home' },
  [`${CSI}3~`]: { kind: 'delete' },
  [`${CSI}4~`]: { kind: 'end' },
  [`${CSI}5~`]: { kind: 'page-prev' },
  [`${CSI}6~`]: { kind: 'page-next' },
}

const INERT_CSI = [
  `${CSI}7~`, `${CSI}8~`,
]

const KNOWN_CSI = [...Object.keys(CSI_TOKENS), ...INERT_CSI]

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
  a: { kind: 'add' },
  e: { kind: 'edit' },
  x: { kind: 'archive' },
  X: { kind: 'unarchive' },
  D: { kind: 'remove' },
  c: { kind: 'cold' },
  l: { kind: 'items' },
  C: { kind: 'config' },
  E: { kind: 'export' },
  I: { kind: 'import' },
  R: { kind: 'cold-restore' },
  P: { kind: 'cold-purge' },
  y: { kind: 'confirm-yes' },
  n: { kind: 'confirm-no' },
  [ENTER]: { kind: 'enter' },
  [CTRL_C]: { kind: 'interrupt' },
  [BACKSPACE]: { kind: 'backspace' },
  [BACKSPACE_ALT]: { kind: 'backspace' },
}

type Scan = {
  readonly tokens: readonly KeyToken[]
  readonly pending: string
}

type ScanResult = { readonly length: number; readonly token: KeyToken } | { readonly pending: string }

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

function scanCsi(rest: string): ScanResult | null {
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
      const length = index + 1 + (sequence === X10_MOUSE ? X10_MOUSE_LENGTH : 0)
      if (length > rest.length) return { pending: rest }
      return { length, token }
    }
    return { length: CSI.length, token: INERT }
  }

  return isKnownCsiPrefix(rest) ? { pending: rest } : { length: rest.length, token: INERT }
}

function scanSs3(rest: string): ScanResult | null {
  if (!rest.startsWith(SS3)) return null
  if (rest.length < SS3_LENGTH) return { pending: rest }
  const token = SS3_TOKENS[rest.slice(0, SS3_LENGTH)]
  return token === undefined ? null : { length: SS3_LENGTH, token }
}

function tokenForChar(char: string): KeyToken | null {
  const token = CHAR_TOKENS[char]
  if (token !== undefined) return token
  if (char >= FIRST_DIGIT && char <= LAST_DIGIT) {
    return { kind: 'difficulty', difficulty: Number(char) }
  }
  if (char.charCodeAt(0) >= FIRST_PRINTABLE) return { kind: 'text', char }
  return null
}

function textTokenForChar(char: string): KeyToken | null {
  if (char === CTRL_C) return { kind: 'interrupt' }
  if (char === ENTER || char === LINE_FEED) return { kind: 'enter' }
  if (char === BACKSPACE || char === BACKSPACE_ALT) return { kind: 'backspace' }
  if (char.charCodeAt(0) >= FIRST_PRINTABLE) return { kind: 'text', char }
  return null
}

function scan(input: string, textMode: boolean): Scan {
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
        if ('pending' in ss3) return { tokens, pending: ss3.pending }
        tokens.push(ss3.token)
        index += ss3.length
        continue
      }
      if (rest.length === 1) {
        tokens.push({ kind: 'escape' })
        index += 1
        continue
      }
      index += ESCAPE_PAIR_LENGTH
      continue
    }

    const token = textMode ? textTokenForChar(char) : tokenForChar(char)
    if (token !== null) tokens.push(token)
    index += 1
  }

  return { tokens, pending: '' }
}

function focusCommands(screen: KeyScreen, kind: 'focus-prev' | 'focus-next'): readonly KeyCommand[] {
  return screen === 'queue' || screen === 'help' || screen === 'items' ? [{ kind }] : []
}

function queueCommands(
  screen: KeyScreen,
  kind: 'focus-prev' | 'focus-next' | 'focus-first' | 'focus-last' | 'page-prev' | 'page-next',
): readonly KeyCommand[] {
  return screen === 'queue' || screen === 'items' ? [{ kind }] : []
}

function enterCommands(screen: KeyScreen): readonly KeyCommand[] {
  if (screen === 'queue') return [{ kind: 'check-in' }]
  if (screen === 'items') return [{ kind: 'open-detail' }]
  if (screen === 'reevaluate') return [{ kind: 'cancel-reevaluate' }]
  return []
}

function escapeCommands(screen: KeyScreen): readonly KeyCommand[] {
  if (screen === 'detail') return [{ kind: 'close-detail' }]
  if (screen === 'reevaluate') return [{ kind: 'cancel-reevaluate' }]
  if (screen === 'help') return [{ kind: 'toggle-help' }]
  if (screen === 'cold') return [{ kind: 'close-cold' }]
  if (screen === 'items') return [{ kind: 'close-items' }]
  if (screen === 'confirm') return [{ kind: 'confirm-no' }]
  return []
}

function textCommands(token: KeyToken): readonly KeyCommand[] {
  switch (token.kind) {
    case 'text':
      return [{ kind: 'field-insert', text: token.char }]
    case 'enter':
      return [{ kind: 'form-enter' }]
    case 'escape':
      return [{ kind: 'form-cancel' }]
    case 'backspace':
      return [{ kind: 'field-backspace' }]
    case 'delete':
      return [{ kind: 'field-delete' }]
    case 'arrow-left':
      return [{ kind: 'field-left' }]
    case 'arrow-right':
      return [{ kind: 'field-right' }]
    case 'home':
      return [{ kind: 'field-home' }]
    case 'end':
      return [{ kind: 'field-end' }]
    case 'focus-prev':
      return [{ kind: 'form-previous-field' }]
    case 'focus-next':
      return [{ kind: 'form-next-field' }]
    case 'interrupt':
      return [{ kind: 'interrupt' }]
    default:
      return []
  }
}

function screenCommands(screen: KeyScreen, kind: 'archive' | 'unarchive' | 'remove'): readonly KeyCommand[] {
  if (kind === 'remove') {
    if (screen !== 'queue' && screen !== 'detail') return []
    return [{ kind: 'request-remove' }]
  }
  if (screen !== 'queue' && screen !== 'detail' && screen !== 'items') return []
  if (kind === 'archive') return [{ kind: 'archive' }]
  if (kind === 'unarchive') return [{ kind: 'unarchive' }]
  return []
}

function detailCommands(screen: KeyScreen): readonly KeyCommand[] {
  if (screen === 'queue' || screen === 'items') return [{ kind: 'open-detail' }]
  if (screen === 'detail') return [{ kind: 'close-detail' }]
  return []
}

function difficultyCommands(screen: KeyScreen, difficulty: number): readonly KeyCommand[] {
  if (screen === 'queue') return [{ kind: 'start-reevaluate' }, { kind: 'reevaluate', difficulty }]
  if (screen === 'reevaluate') return [{ kind: 'reevaluate', difficulty }]
  return []
}

function commandsFor(screen: KeyScreen, token: KeyToken): readonly KeyCommand[] {
  if (TEXT_SCREENS.includes(screen)) return textCommands(token)

  switch (token.kind) {
    case 'inert':
      return []
    case 'quit':
      return screen === 'cold' ? [{ kind: 'close-cold' }] : [{ kind: 'quit' }]
    case 'interrupt':
      return [{ kind: 'interrupt' }]
    case 'focus-prev':
      if (screen === 'cold') return [{ kind: 'cold-focus-prev' }]
      return focusCommands(screen, 'focus-prev')
    case 'focus-next':
      if (screen === 'cold') return [{ kind: 'cold-focus-next' }]
      return focusCommands(screen, 'focus-next')
    case 'page-prev':
      return queueCommands(screen, 'page-prev')
    case 'page-next':
      return queueCommands(screen, 'page-next')
    case 'focus-first':
      return queueCommands(screen, 'focus-first')
    case 'focus-last':
      return queueCommands(screen, 'focus-last')
    case 'enter':
      return enterCommands(screen)
    case 'escape':
      return escapeCommands(screen)
    case 'open-detail':
      return detailCommands(screen)
    case 'toggle-help':
      return screen === 'queue' || screen === 'detail' || screen === 'help'
        ? [{ kind: 'toggle-help' }]
        : []
    case 'difficulty':
      return difficultyCommands(screen, token.difficulty)
    case 'add':
      return screen === 'queue' ? [{ kind: 'open-add' }] : []
    case 'edit':
      return screen === 'queue' || screen === 'detail' ? [{ kind: 'open-edit' }] : []
    case 'archive':
      return screenCommands(screen, 'archive')
    case 'unarchive':
      return screenCommands(screen, 'unarchive')
    case 'remove':
      return screenCommands(screen, 'remove')
    case 'cold':
      if (screen === 'queue') return [{ kind: 'open-cold' }]
      return screen === 'cold' ? [{ kind: 'close-cold' }] : []
    case 'items':
      if (screen === 'queue') return [{ kind: 'open-items' }]
      return screen === 'items' ? [{ kind: 'close-items' }] : []
    case 'config':
      return screen === 'queue' ? [{ kind: 'open-config' }] : []
    case 'export':
      return screen === 'queue' ? [{ kind: 'open-export' }] : []
    case 'import':
      return screen === 'queue' ? [{ kind: 'open-import' }] : []
    case 'cold-restore':
      return screen === 'cold' ? [{ kind: 'cold-restore' }] : []
    case 'cold-purge':
      return screen === 'cold' ? [{ kind: 'cold-purge' }] : []
    case 'confirm-yes':
      return screen === 'confirm' ? [{ kind: 'confirm-yes' }] : []
    case 'confirm-no':
      return screen === 'confirm' ? [{ kind: 'confirm-no' }] : []
    case 'text':
    case 'backspace':
    case 'delete':
    case 'arrow-left':
    case 'arrow-right':
    case 'home':
    case 'end':
      return []
  }
}

export function parseKeys(chunk: string, screen: KeyScreen, pending = ''): ParsedKeys {
  const scanned = scan(`${pending}${chunk}`, TEXT_SCREENS.includes(screen))
  return {
    commands: scanned.tokens.flatMap((token) => commandsFor(screen, token)),
    pending: scanned.pending,
  }
}
