import { type ImportCounts } from './merge.ts'

export type DataCounts = ImportCounts

export type DataState =
  | { readonly status: 'idle' }
  | { readonly status: 'busy' }
  | { readonly status: 'done' }
  | { readonly status: 'error'; readonly message: string }

export type DataController = {
  readonly state: DataState
  readonly lastExport: DataCounts | null
  readonly lastImport: DataCounts | null
  exportData(): void
  importData(): void
}
