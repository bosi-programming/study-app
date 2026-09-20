import { AmbiguousRefError, InvalidRefError, NotFoundError } from './errors.ts'
import type { Item } from './item.ts'
import { normalizeText, titleKey } from './normalize.ts'

const MIN_PREFIX_LENGTH = 4

export function resolveRef(ref: string, items: readonly Item[]): Item {
  const raw = ref.trim()
  const needle = normalizeText(ref)

  if (needle.length === 0) throw new InvalidRefError(raw)

  const exactId = pickOnly(
    items.filter((item) => item.id.toLowerCase() === needle),
    raw,
  )
  if (exactId) return exactId

  if (needle.length >= MIN_PREFIX_LENGTH) {
    const prefix = pickOnly(
      items.filter((item) => item.id.toLowerCase().startsWith(needle)),
      raw,
    )
    if (prefix) return prefix
  }

  const exactTitle = pickOnly(
    items.filter((item) => titleKey(item) === needle),
    raw,
  )
  if (exactTitle) return exactTitle

  if (needle.length < MIN_PREFIX_LENGTH) throw new InvalidRefError(raw)
  throw new NotFoundError(raw)
}

function pickOnly(matches: readonly Item[], ref: string): Item | null {
  if (matches.length > 1) throw new AmbiguousRefError(ref, matches)
  const [only] = matches
  return only ?? null
}
