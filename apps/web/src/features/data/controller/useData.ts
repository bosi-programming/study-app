import { useCallback, useState } from 'react'
import { type Deps } from '@study/core'
import { messageForError } from '../../../errors.ts'
import { type FileGateway } from '../../../files.ts'
import { type Store } from '../../../store/index.ts'
import { strings } from '../../../strings.ts'
import { type DataController, type DataCounts, type DataState } from '../model/dataView.ts'
import { InvalidDumpError, UnsupportedSchemaError } from '../model/json.ts'
import { dumpFileName, exportDump, importDump } from './service.ts'

function messageOf(error: unknown): string {
  if (error instanceof UnsupportedSchemaError) return strings.data.unsupportedSchema(error.version)
  if (error instanceof InvalidDumpError) return strings.data.invalidFile
  return messageForError(error)
}

export function useData(store: Store, deps: Deps, files: FileGateway): DataController {
  const [state, setState] = useState<DataState>({ status: 'idle' })
  const [lastExport, setLastExport] = useState<DataCounts | null>(null)
  const [lastImport, setLastImport] = useState<DataCounts | null>(null)

  const exportData = useCallback(() => {
    setState({ status: 'busy' })
    exportDump(store, deps).then(
      (result) => {
        files.saveFile(dumpFileName(deps.clock.todayLocalDate()), result.text).then(
          () => {
            setLastExport(result.counts)
            setState({ status: 'done' })
          },
          () => setState({ status: 'error', message: strings.data.exportFailed }),
        )
      },
      () => setState({ status: 'error', message: strings.data.exportFailed }),
    )
  }, [store, deps, files])

  const importData = useCallback(() => {
    setState({ status: 'busy' })
    files.pickFile().then(
      (text) => {
        if (text === null) {
          setState({ status: 'idle' })
          return
        }
        importDump(store, text).then(
          (counts) => {
            setLastImport(counts)
            setState({ status: 'done' })
          },
          (thrown: unknown) => setState({ status: 'error', message: messageOf(thrown) }),
        )
      },
      () => setState({ status: 'error', message: strings.errors.store }),
    )
  }, [store, files])

  return { state, lastExport, lastImport, exportData, importData }
}
