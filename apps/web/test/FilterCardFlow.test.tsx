import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { type Card, addDays, todayLocal } from '@study/core';
import { App } from '../src/App';
import { type CardStore, getCardStore } from '../src/persistence';

vi.mock('../src/persistence', async () => {
  const errors = await vi.importActual<
    typeof import('../src/persistence/errors')
  >('../src/persistence/errors');
  return { getCardStore: vi.fn(), PersistenceError: errors.PersistenceError };
});

const DATE_RANGE_ERROR_MESSAGE = 'A data final deve ser posterior à inicial.';

const makeCard = (
  name: string,
  nextReviewDate: string,
  category = 'Geral',
): Card => ({
  id: `${name}-${nextReviewDate}`,
  name,
  category,
  content: `${name} conteudo`,
  lastReviewDate: null,
  reviewCount: 0,
  nextReviewDate: nextReviewDate as Card['nextReviewDate'],
  createdDate: '2026-01-01' as Card['createdDate'],
});

const makeStore = (cards: readonly Card[]): CardStore =>
  ({
    list: vi.fn().mockResolvedValue([...cards]),
    create: vi.fn().mockImplementation((card: Card) => Promise.resolve(card)),
  } as unknown as CardStore);

const renderWith = (cards: readonly Card[]): void => {
  const store = makeStore(cards);
  vi.mocked(getCardStore).mockResolvedValue(store);
  render(<App />);
};

const changeFilter = (label: string, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

beforeEach(() => {
  vi.mocked(getCardStore).mockReset();
  vi.mocked(getCardStore).mockResolvedValue(makeStore([]));
});

afterEach(cleanup);

describe('date range narrowing (AC1)', () => {
  it('T1.4 · typing only De narrows the list to dates >= start', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Antes', addDays(today, -1)),
      makeCard('Hoje', today),
      makeCard('Depois', addDays(today, 5)),
    ]);
    await screen.findAllByRole('listitem');

    changeFilter('De', today);

    const items = await screen.findAllByRole('listitem');

    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Hoje'),
      expect.stringContaining('Depois'),
    ]);
  });

  it('T1.5 · typing only Até narrows the list to dates <= end', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Hoje', today),
      makeCard('Amanha', addDays(today, 1)),
      makeCard('Depois', addDays(today, 5)),
    ]);
    await screen.findAllByRole('listitem');

    changeFilter('Até', addDays(today, 1));

    const items = await screen.findAllByRole('listitem');

    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Hoje'),
      expect.stringContaining('Amanha'),
    ]);
  });
});

describe('date and category conjunction (AC2)', () => {
  it('T2.2 · an active range plus a category yields the intersection in RB-03 order', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Alvo', addDays(today, 2), 'Matemática'),
      makeCard('Isento', addDays(today, 2), 'História'),
      makeCard('ForaDoRange', addDays(today, 30), 'Matemática'),
      makeCard('OutroMat', addDays(today, 3), 'Matemática'),
    ]);
    await screen.findAllByRole('listitem');

    changeFilter('De', addDays(today, 1));
    changeFilter('Até', addDays(today, 5));
    changeFilter('Categoria', 'Matemática');

    const items = await screen.findAllByRole('listitem');

    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Alvo'),
      expect.stringContaining('OutroMat'),
    ]);
  });
});

describe('clear filters (AC3)', () => {
  it('T3.1 · "Limpar filtros" is not rendered without an active filter', async () => {
    const today = todayLocal();
    renderWith([makeCard('Um', addDays(today, 1))]);
    await screen.findAllByRole('listitem');

    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });

  it('T3.2 · "Limpar filtros" resets De, Até and Categoria and restores every card in RB-03 order', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Zebra', addDays(today, 3), 'Matemática'),
      makeCard('Alfa', addDays(today, 1), 'História'),
    ]);
    await screen.findAllByRole('listitem');
    changeFilter('De', today);
    changeFilter('Até', addDays(today, 10));
    changeFilter('Categoria', 'Matemática');

    fireEvent.click(await screen.findByRole('button', { name: 'Limpar filtros' }));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    expect(screen.getByLabelText('De')).toHaveValue('');
    expect(screen.getByLabelText('Até')).toHaveValue('');
    expect(screen.getByLabelText('Categoria')).toHaveValue('');
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Alfa'),
      expect.stringContaining('Zebra'),
    ]);
  });
});

describe('empty states (AC4)', () => {
  it('T4.1 · an active date filter with no match shows "Nenhum cartão para esses filtros."', async () => {
    const today = todayLocal();
    renderWith([makeCard('Um', addDays(today, 1))]);
    await screen.findAllByRole('listitem');

    changeFilter('De', addDays(today, 30));

    expect(
      await screen.findByText('Nenhum cartão para esses filtros.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Você ainda não tem cartões.')).not.toBeInTheDocument();
  });

  it('T4.2 · the filtered message never appears without an active filter and an empty store keeps "Você ainda não tem cartões."', async () => {
    renderWith([]);

    expect(
      await screen.findByText('Você ainda não tem cartões.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Nenhum cartão para esses filtros.'),
    ).not.toBeInTheDocument();
  });
});

describe('invalid range (AC5)', () => {
  it('T5.2 · start > end shows the inline message and keeps every visible card', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Um', addDays(today, 1)),
      makeCard('Dois', addDays(today, 5)),
    ]);
    await screen.findAllByRole('listitem');

    changeFilter('De', addDays(today, 10));
    changeFilter('Até', addDays(today, 1));

    expect(await screen.findByText(DATE_RANGE_ERROR_MESSAGE)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(
      screen.queryByText('Nenhum cartão para esses filtros.'),
    ).not.toBeInTheDocument();
  });

  it('T5.3 · fixing the range removes the inline message and applies the filter', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Antes', today),
      makeCard('Dentro', addDays(today, 3)),
      makeCard('Depois', addDays(today, 9)),
    ]);
    await screen.findAllByRole('listitem');
    changeFilter('De', addDays(today, 2));
    changeFilter('Até', addDays(today, 1));
    await screen.findByText(DATE_RANGE_ERROR_MESSAGE);

    changeFilter('Até', addDays(today, 5));

    await waitFor(() =>
      expect(screen.queryByText(DATE_RANGE_ERROR_MESSAGE)).toBeNull(),
    );
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Dentro'),
    ]);
  });
});

describe('category filter (AC1-AC6)', () => {
  it('A1.1 · dropdown lists distinct categories sorted pt-BR', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('A', addDays(today, 1), 'Matemática'),
      makeCard('B', addDays(today, 2), 'História'),
    ]);
    await screen.findAllByRole('listitem');

    const select = screen.getByLabelText('Categoria');
    const options = within(select).getAllByRole('option');

    expect(options.map((option) => option.textContent)).toEqual([
      'Todas as categorias',
      'História',
      'Matemática',
    ]);
  });

  it('A1.2 · case/space variants collapse to one option & all match', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Um', addDays(today, 1), 'Inglês'),
      makeCard('Dois', addDays(today, 2), 'inglês'),
      makeCard('Tres', addDays(today, 3), '  Inglês  '),
    ]);
    await screen.findAllByRole('listitem');

    const select = screen.getByLabelText('Categoria');
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Todas as categorias',
      'Inglês',
    ]);

    changeFilter('Categoria', 'Inglês');

    const items = await screen.findAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Um'),
      expect.stringContaining('Dois'),
      expect.stringContaining('Tres'),
    ]);
  });

  it('A2.1 · comparison ignores case & spaces', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Maiuscula', addDays(today, 1), 'Matemática'),
      makeCard('Minuscula', addDays(today, 2), 'matemática'),
      makeCard('Espacada', addDays(today, 3), '  Matemática  '),
      makeCard('Outra', addDays(today, 4), 'História'),
    ]);
    await screen.findAllByRole('listitem');

    changeFilter('Categoria', 'Matemática');

    const items = await screen.findAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Maiuscula'),
      expect.stringContaining('Minuscula'),
      expect.stringContaining('Espacada'),
    ]);
  });

  it('A3.1 · category-only keeps RB-03 order', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Zebra', addDays(today, 2), 'Matemática'),
      makeCard('Alfa', addDays(today, 2), 'Matemática'),
      makeCard('Cedo', addDays(today, 1), 'Matemática'),
      makeCard('Outra', addDays(today, 1), 'História'),
    ]);
    await screen.findAllByRole('listitem');

    changeFilter('Categoria', 'Matemática');

    const items = await screen.findAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Cedo'),
      expect.stringContaining('Alfa'),
      expect.stringContaining('Zebra'),
    ]);
  });

  it('A4.1 · no cards ⇒ dropdown disabled & placeholder-only', async () => {
    renderWith([]);
    await screen.findByText('Você ainda não tem cartões.');

    const select = screen.getByLabelText('Categoria');

    expect(select).toBeDisabled();
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Todas as categorias',
    ]);
  });

  it('A4.2 · with cards ⇒ dropdown enabled', async () => {
    const today = todayLocal();
    renderWith([makeCard('Um', addDays(today, 1), 'Matemática')]);
    await screen.findAllByRole('listitem');

    expect(screen.getByLabelText('Categoria')).not.toBeDisabled();
  });

  it('A5.1 · category + date yields no match ⇒ empty state', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Mat', addDays(today, 1), 'Matemática'),
      makeCard('Hist', addDays(today, 10), 'História'),
    ]);
    await screen.findAllByRole('listitem');

    changeFilter('Categoria', 'Matemática');
    changeFilter('De', addDays(today, 5));

    expect(
      await screen.findByText('Nenhum cartão para esses filtros.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('A6.1 · clearing a category-only filter restores all', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Zebra', addDays(today, 3), 'Matemática'),
      makeCard('Alfa', addDays(today, 1), 'História'),
    ]);
    await screen.findAllByRole('listitem');

    changeFilter('Categoria', 'Matemática');
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));

    fireEvent.click(await screen.findByRole('button', { name: 'Limpar filtros' }));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    expect(screen.getByLabelText('Categoria')).toHaveValue('');
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Alfa'),
      expect.stringContaining('Zebra'),
    ]);
  });
});
