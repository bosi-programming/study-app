import { type Item } from './entity.ts'

export function archiveItem(item: Item, now: string): Item {
  return { ...item, status: 'archived', archived_at: now, updated_at: now }
}

export function unarchiveItem(item: Item, now: string): Item {
  return { ...item, status: 'active', archived_at: null, updated_at: now }
}
