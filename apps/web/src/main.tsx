import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { systemDeps } from './deps.ts'
import { browserFiles } from './files.ts'
import { RecoveryScreen, isSchemaError } from './recovery.tsx'
import { IDB_NAME, browserIdb, openStore, type Store } from './store/index.ts'
import { strings } from './strings.ts'

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

const root = createRoot(container)

function renderApp(store: Store): void {
  root.render(<App store={store} deps={systemDeps} files={browserFiles} />)
}

function renderStoreFailure(): void {
  root.render(
    <main>
      <h1>{strings.app.title}</h1>
      <p role="alert">{strings.errors.store}</p>
    </main>,
  )
}

function renderFailure(error: unknown): void {
  if (!isSchemaError(error)) {
    renderStoreFailure()
    return
  }
  try {
    root.render(
      <RecoveryScreen
        error={error}
        environment={browserIdb()}
        name={IDB_NAME}
        deps={systemDeps}
        files={browserFiles}
      />,
    )
  } catch {
    renderStoreFailure()
  }
}

function boot(): Promise<Store> {
  try {
    return openStore(browserIdb())
  } catch (error) {
    return Promise.reject(error)
  }
}

exposeStore()
boot().then(renderApp, renderFailure)
