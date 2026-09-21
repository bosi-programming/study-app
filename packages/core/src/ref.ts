import { AmbiguousRefError, InvalidRefError, NotFoundError } from './errors.ts'
import { type Item } from './entity.ts'
import { normalizeText, titleKey } from './normalize.ts'

const MIN_PREFIX_LENGTH = 4

export function resolveRef(ref: string, items: readonly Item[]): Item {
  const raw = ref.trim()
  const needle = normalizeText(ref)

  if (needle.length === 0) throw new InvalidRefError(raw)

  const exactId = onlyMatch(
    items.filter((item) => item.id.toLowerCase() === needle),
    raw,
  )
  if (exactId) return exactId

  if (needle.length >= MIN_PREFIX_LENGTH) {
    const prefix = onlyMatch(
      items.filter((item) => item.id.toLowerCase().startsWith(needle)),
      raw,
    )
    if (prefix) return prefix
  }

  const exactTitle = onlyMatch(
    items.filter((item) => titleKey(item) === needle),
    raw,
  )
  if (exactTitle) return exactTitle

  if (needle.length < MIN_PREFIX_LENGTH) throw new InvalidRefError(raw)
  throw new NotFoundError(raw)
}

function onlyMatch(matches: readonly Item[], ref: string): Item | null {
  if (matches.length > 1) throw new AmbiguousRefError(ref, matches)
  const [only] = matches
  return only ?? null
}
