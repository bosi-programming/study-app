import { type Store } from './persistence/index.ts'

export const COLD_ARCHIVE_AFTER_DAYS = 'cold_archive_after_days'
export const DEFAULT_COLD_ARCHIVE_AFTER_DAYS = 180

export function parseColdArchiveWindow(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (!Number.isInteger(value) || value < 1) return null
  return value
}

export function readColdArchiveWindow(store: Store): number {
  const raw = store.getMeta(COLD_ARCHIVE_AFTER_DAYS)
  if (raw === null) return DEFAULT_COLD_ARCHIVE_AFTER_DAYS
  return parseColdArchiveWindow(raw) ?? DEFAULT_COLD_ARCHIVE_AFTER_DAYS
}
