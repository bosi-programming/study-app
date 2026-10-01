import { type Item } from '@study/core'
import { type LoadState } from '../../../loadState.ts'

export type ItemDetailController = {
  readonly state: LoadState<Item>
  readonly error: string | null
  archive(): void
  unarchive(): void
}
