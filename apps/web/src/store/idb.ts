export type IdbEnvironment = {
  readonly factory: IDBFactory
  readonly keyRange: typeof IDBKeyRange
}

export class IndexedDbUnavailableError extends Error {
  constructor() {
    super('IndexedDB indisponível: injete um IdbEnvironment ou rode num navegador')
    this.name = 'IndexedDbUnavailableError'
  }
}

type IdbGlobals = {
  readonly indexedDB?: IDBFactory
  readonly IDBKeyRange?: typeof IDBKeyRange
}

export function browserIdb(): IdbEnvironment {
  const scope = globalThis as IdbGlobals
  if (scope.indexedDB === undefined || scope.IDBKeyRange === undefined) {
    throw new IndexedDbUnavailableError()
  }
  return { factory: scope.indexedDB, keyRange: scope.IDBKeyRange }
}
