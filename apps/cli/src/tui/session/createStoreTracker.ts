import { type StoreTracker } from './types.ts'

export function createStoreTracker(): StoreTracker {
  let failed = false

  return {
    reset() {
      failed = false
    },
    hasFailure: () => failed,
    wrap(store) {
      return {
        ...store,
        transaction: <T>(run: () => T): T => {
          try {
            return store.transaction(run)
          } catch (error) {
            failed = true
            throw error
          }
        },
      }
    },
  }
}
