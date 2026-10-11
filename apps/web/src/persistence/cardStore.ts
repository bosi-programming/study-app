import { type Card } from '@study/core';
import { PersistenceError } from './errors';

const DB_NAME = 'study';
const DB_VERSION = 1;
const STORE_NAME = 'cartoes';

export interface CardStore {
  list(): Promise<Card[]>;
  get(id: string): Promise<Card | undefined>;
  create(card: Card): Promise<Card>;
  update(card: Card): Promise<Card>;
  remove(id: string): Promise<void>;
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new PersistenceError(`failed to open database ${dbName}`, {
          cause: request.error,
        }),
      );
    request.onblocked = () =>
      reject(new PersistenceError(`database ${dbName} is blocked`));
  });
}

function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new PersistenceError('read failed', { cause: request.error }));
  });
}

function writeCard(
  db: IDBDatabase,
  mode: 'add' | 'put',
  card: Card,
): Promise<Card> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    if (mode === 'add') {
      store.add(card);
    } else {
      store.put(card);
    }

    transaction.oncomplete = () => resolve(card);
    transaction.onerror = () =>
      reject(
        new PersistenceError('write failed', { cause: transaction.error }),
      );
    transaction.onabort = () =>
      reject(
        new PersistenceError('write aborted', { cause: transaction.error }),
      );
  });
}

function removeCard(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        new PersistenceError('remove failed', { cause: transaction.error }),
      );
    transaction.onabort = () =>
      reject(
        new PersistenceError('remove aborted', { cause: transaction.error }),
      );
  });
}

function createIndexedDbStore(db: IDBDatabase): CardStore {
  return {
    list(): Promise<Card[]> {
      return readRequest<Card[]>(
        db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll(),
      );
    },
    get(id: string): Promise<Card | undefined> {
      return readRequest<Card | undefined>(
        db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id),
      );
    },
    create(card: Card): Promise<Card> {
      return writeCard(db, 'add', card);
    },
    update(card: Card): Promise<Card> {
      return writeCard(db, 'put', card);
    },
    remove(id: string): Promise<void> {
      return removeCard(db, id);
    },
  };
}

export async function openCardStore(
  dbName: string = DB_NAME,
): Promise<CardStore> {
  if (!isIndexedDbAvailable()) {
    throw new PersistenceError('IndexedDB is not available');
  }
  return createIndexedDbStore(await openDatabase(dbName));
}

let storePromise: Promise<CardStore> | undefined;

export function getCardStore(): Promise<CardStore> {
  storePromise ??= openCardStore();
  return storePromise;
}
