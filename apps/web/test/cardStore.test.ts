import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Card, createCard } from '@study/core';
import {
  getCardStore,
  isIndexedDbAvailable,
  openCardStore,
  PersistenceError,
} from '../src/persistence';

const readFile = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), 'utf8');

const deleteDatabase = (dbName: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });

const openRaw = (dbName: string): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const seedCard = (id: string, name = 'Nome', content = 'Conteudo'): Card => ({
  ...createCard(
    { name, category: 'Categoria', content },
    '2026-01-01' as Card['createdDate'],
  ),
  id,
});

let dbName: string;
let databaseCount = 0;

beforeEach(async () => {
  databaseCount += 1;
  dbName = `test-db-${databaseCount}`;
  await deleteDatabase(dbName);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('schema (AC1)', () => {
  it('creates store cartoes with keyPath id', async () => {
    await getCardStore();

    const db = await openRaw('study');
    expect(db.objectStoreNames.contains('cartoes')).toBe(true);
    expect(db.transaction('cartoes').objectStore('cartoes').keyPath).toBe('id');
    db.close();
  });

  it('uses schema version 1', async () => {
      await getCardStore();

      const db = await openRaw('study');
      expect(db.version).toBe(1);
      db.close();
  });
});

describe('list (AC2)', () => {
  it('lists all stored cards', async () => {
    const store = await openCardStore(dbName);
    await store.create(seedCard('card-a'));
    await store.create(seedCard('card-b'));

    const ids = (await store.list()).map((card) => card.id).sort();
    expect(ids).toEqual(['card-a', 'card-b']);
  });

  it('returns empty array for empty store', async () => {
    const store = await openCardStore(dbName);

    expect(await store.list()).toEqual([]);
  });
});

describe('get (AC3)', () => {
  it('returns the stored card by id', async () => {
    const store = await openCardStore(dbName);
    const card = seedCard('card-a');
    await store.create(card);

    expect(await store.get('card-a')).toEqual(card);
  });

  it('returns undefined for missing id', async () => {
    const store = await openCardStore(dbName);

    expect(await store.get('nope')).toBeUndefined();
  });
});

describe('create (AC4)', () => {
  it('create persists and returns the card', async () => {
    const store = await openCardStore(dbName);
    const card = seedCard('card-a');

    await expect(store.create(card)).resolves.toEqual(card);
    expect(await store.get('card-a')).toEqual(card);
  });

  it('create rejects on duplicate id without overwriting', async () => {
    const store = await openCardStore(dbName);
    const card = seedCard('card-a');
    await store.create(card);

    await expect(store.create(seedCard('card-a', 'Outro'))).rejects.toBeInstanceOf(
      PersistenceError,
    );
    expect(await store.get('card-a')).toEqual(card);
  });
});

describe('update and remove (AC5)', () => {
  it('update overwrites the stored card', async () => {
    const store = await openCardStore(dbName);
    await store.create(seedCard('card-a'));
    const updated = seedCard('card-a', 'Novo nome', 'Novo conteudo');

    await store.update(updated);

    expect(await store.get('card-a')).toEqual(updated);
  });

  it('remove deletes the card', async () => {
    const store = await openCardStore(dbName);
    await store.create(seedCard('card-a'));

    await store.remove('card-a');

    expect(await store.get('card-a')).toBeUndefined();
    expect((await store.list()).map((card) => card.id)).not.toContain('card-a');
  });
});

describe('atomicity (AC6)', () => {
  it('failed write leaves prior data intact', async () => {
    const store = await openCardStore(dbName);
    const card = seedCard('card-a');
    await store.create(card);

    await expect(store.create(seedCard('card-a', 'Outro'))).rejects.toBeInstanceOf(
      PersistenceError,
    );
    expect(await store.list()).toEqual([card]);
  });
});

describe('no network (AC7)', () => {
  it('persistence module performs no network calls', () => {
    const source = readFile('../src/persistence/cardStore.ts');

    expect(source).not.toMatch(/fetch\(|XMLHttpRequest|WebSocket|sendBeacon/);
  });
});

describe('feature detection (AC8)', () => {
  it('isIndexedDbAvailable true when indexedDB present', () => {
    expect(isIndexedDbAvailable()).toBe(true);
  });

  it('isIndexedDbAvailable false when indexedDB absent', () => {
    vi.stubGlobal('indexedDB', undefined);

    expect(isIndexedDbAvailable()).toBe(false);
  });

  it('openCardStore rejects when indexedDB absent', async () => {
    vi.stubGlobal('indexedDB', undefined);

    await expect(openCardStore()).rejects.toBeInstanceOf(PersistenceError);
  });
});

describe('persistence (AC9)', () => {
  it('data survives close and reopen', async () => {
    const card = seedCard('card-a');
    const first = await openCardStore(dbName);
    await first.create(card);
    (await openRaw(dbName)).close();

    const reopened = await openCardStore(dbName);
    expect(await reopened.list()).toEqual([card]);
    const db = await openRaw(dbName);
    expect(db.version).toBe(1);
    db.close();
  });
});

describe('singleton (contract)', () => {
  it('getCardStore memoizes a single store promise', () => {
    expect(getCardStore()).toBe(getCardStore());
  });
});

describe('core dependency (AC10)', () => {
  it('web package declares @study/core workspace dep', () => {
    const manifest = JSON.parse(readFile('../package.json')) as {
      dependencies: Record<string, string>;
    };

    expect(manifest.dependencies['@study/core']).toBe('workspace:*');
  });

  it('persistence imports Card from @study/core', () => {
    const source = readFile('../src/persistence/cardStore.ts');

    expect(source).toContain("from '@study/core'");
    expect(source).not.toMatch(/interface Card\b/);
  });
});
