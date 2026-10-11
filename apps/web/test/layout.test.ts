import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { type Card } from '@study/core';
import { App } from '../src/App';
import { type CardStore, getCardStore } from '../src/persistence';

vi.mock('../src/persistence', async () => {
  const errors = await vi.importActual<
    typeof import('../src/persistence/errors')
  >('../src/persistence/errors');
  return { getCardStore: vi.fn(), PersistenceError: errors.PersistenceError };
});

const readFile = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), 'utf8');

const cards: readonly Card[] = [
  {
    id: 'a',
    name: 'Ábaco',
    category: 'Geral',
    content: 'conteudo',
    lastReviewDate: null,
    reviewCount: 0,
    nextReviewDate: '2026-10-10' as Card['nextReviewDate'],
    createdDate: '2026-01-01' as Card['createdDate'],
  },
  {
    id: 'b',
    name: 'Zebra',
    category: 'Geral',
    content: 'conteudo',
    lastReviewDate: null,
    reviewCount: 0,
    nextReviewDate: '2026-10-20' as Card['nextReviewDate'],
    createdDate: '2026-01-01' as Card['createdDate'],
  },
];

beforeEach(() => {
  vi.mocked(getCardStore).mockReset();
  vi.mocked(getCardStore).mockResolvedValue({
    list: () => Promise.resolve([...cards]),
  } as unknown as CardStore);
});

afterEach(cleanup);

describe('screen layout (AC1)', () => {
  it('AC1 · screen caps width at 1024px and pads 40px laterally', async () => {
    render(createElement(App));

    const root = await screen.findByTestId('card-list-screen');

    expect(root).toHaveClass('max-w-[1024px]');
    expect(root).toHaveClass('px-10');
  });

  it('AC1 · list uses 8px card gaps, 20px bottom and 40px section gaps', async () => {
    render(createElement(App));

    const list = await screen.findByTestId('card-list');
    const sections = list.closest('.gap-10');

    expect(list).toHaveClass('flex', 'flex-col', 'gap-2', 'pb-5');
    expect(sections).not.toBeNull();
    expect(sections).toHaveClass('flex', 'flex-col', 'gap-10');
  });
});

describe('design system usage (AC9)', () => {
  it('AC9 · screen uses bosi-design-system components', () => {
    const screenSource = readFile('../src/components/CardListScreen.tsx');
    const itemSource = readFile('../src/components/CardListItem.tsx');
    const filterBarSource = readFile('../src/components/FilterBar.tsx');

    expect(screenSource).toContain("from 'bosi-design-system/react'");
    expect(itemSource).toContain("from 'bosi-design-system/react'");
    expect(filterBarSource).toContain("from 'bosi-design-system/react'");
  });

  it('T7.1 · NewCardForm source imports bosi-design-system/react', () => {
    const formSource = readFile('../src/components/NewCardForm.tsx');

    expect(formSource).toContain("from 'bosi-design-system/react'");
  });
});

describe('no UI recomputation (WEB-11)', () => {
  it('T2.2 no UI module calls nextReviewDate', () => {
    const itemSource = readFile('../src/components/CardListItem.tsx');
    const formatSource = readFile('../src/format.ts');

    expect(itemSource).not.toContain('nextReviewDate(');
    expect(formatSource).not.toContain('nextReviewDate(');
  });
});
