import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { browserIdb, openStore } from './store/index.ts'

type StudyStoreHandle = {
  readonly openStore: typeof openStore
  readonly browserIdb: typeof browserIdb
}

function exposeStore(): void {
  const scope = globalThis as unknown as { studyStore: StudyStoreHandle }
  scope.studyStore = { openStore, browserIdb }
}

const container = document.getElementById('root')
if (container === null) throw new Error('elemento #root ausente no index.html')

exposeStore()

createRoot(container).render(<App />)
