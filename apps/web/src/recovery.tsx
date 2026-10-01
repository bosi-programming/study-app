import { useState } from 'react'
import { type Deps } from '@study/core'
import { exportForRecovery } from './features/data/index.ts'
import { type FileGateway } from './files.ts'
import { ErrorNotice } from './notices.tsx'
import { type IdbEnvironment, SchemaMismatchError, SchemaVersionError } from './store/index.ts'
import { strings } from './strings.ts'

export function isSchemaError(error: unknown): boolean {
  return error instanceof SchemaVersionError || error instanceof SchemaMismatchError
}

export type RecoveryScreenProps = {
  readonly error: unknown
  readonly environment: IdbEnvironment
  readonly name: string
  readonly deps: Deps
  readonly files: FileGateway
}

export function RecoveryScreen({ error, environment, name, deps, files }: RecoveryScreenProps) {
  const [failed, setFailed] = useState(false)

  const download = (): void => {
    exportForRecovery(environment, name, deps, files).then(
      () => setFailed(false),
      () => setFailed(true),
    )
  }

  return (
    <main>
      <h1>{strings.app.title}</h1>
      <ErrorNotice message={strings.errors.store} />
      {isSchemaError(error) ? (
        <button type="button" onClick={download}>
          {strings.data.export}
        </button>
      ) : null}
      {failed ? <ErrorNotice message={strings.data.exportFailed} /> : null}
    </main>
  )
}
