import { type Store } from '../../persistence/index.ts'
import { type RenderDetail } from '../render/index.ts'

export function resolveDetail(store: Store, itemId: string | null): RenderDetail | null {
  if (itemId === null) return null
  const item = store.getItem(itemId)
  if (item === null) return null
  return { item, history: store.listReviewLogs(itemId) }
}
