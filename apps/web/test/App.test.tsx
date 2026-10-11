import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { type CalendarDay, type Card, addDays, nextReviewDate, todayLocal } from '@study/core';
import { App } from '../src/App';
import { formatCalendarDay } from '../src/format';
import { type CardStore, getCardStore } from '../src/persistence';
import { PersistenceError } from '../src/persistence/errors';

vi.mock('../src/persistence', async () => {
  const errors = await vi.importActual<
    typeof import('../src/persistence/errors')
  >('../src/persistence/errors');
  return { getCardStore: vi.fn(), PersistenceError: errors.PersistenceError };
});

const makeCard = (
  name: string,
  nextReviewDate: CalendarDay,
  category = 'Geral',
): Card => ({
  id: `${name}-${nextReviewDate}`,
  name,
  category,
  content: `${name} conteudo`,
  lastReviewDate: null,
  reviewCount: 0,
  nextReviewDate,
  createdDate: '2026-01-01' as CalendarDay,
});

const storeWith = (cards: readonly Card[]): CardStore =>
  ({ list: () => Promise.resolve([...cards]) }) as unknown as CardStore;

const renderWith = (cards: readonly Card[]): void => {
  vi.mocked(getCardStore).mockResolvedValue(storeWith(cards));
  render(<App />);
};

beforeEach(() => {
  vi.mocked(getCardStore).mockReset();
  vi.mocked(getCardStore).mockResolvedValue(storeWith([]));
});

afterEach(cleanup);

describe('order (AC2)', () => {
  it('AC2 · renders cards ordered by next review date then name', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Beta', addDays(today, 3)),
      makeCard('Zebra', addDays(today, 1)),
      makeCard('Ábaco', addDays(today, 1)),
    ]);

    const items = await screen.findAllByRole('listitem');

    expect(items[0]).toHaveTextContent('Ábaco');
    expect(items[1]).toHaveTextContent('Zebra');
    expect(items[2]).toHaveTextContent('Beta');
  });
});

describe('header (AC3)', () => {
  it('AC3 · header renders the Estudo wordmark heading', async () => {
    renderWith([]);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Estudo' }),
    ).toBeInTheDocument();
  });
});

describe('filter bar (AC4)', () => {
  it('AC4 · renders review-date and category controls', async () => {
    renderWith([]);

    expect(await screen.findByLabelText('De')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Até')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Categoria')).toBeInTheDocument();
  });

  it('AC4 · category selected in the filter bar narrows the list', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Alvo', addDays(today, 1), 'Matemática'),
      makeCard('Outra', addDays(today, 2), 'História'),
    ]);
    await screen.findAllByRole('listitem');

    fireEvent.change(screen.getByLabelText('Categoria'), {
      target: { value: 'Matemática' },
    });

    const items = await screen.findAllByRole('listitem');

    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Alvo');
  });

  it('AC4 · clearing the date inputs restores all cards', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Um', addDays(today, 1)),
      makeCard('Dois', addDays(today, 5)),
      makeCard('Tres', addDays(today, 9)),
    ]);

    await screen.findAllByRole('listitem');
    fireEvent.change(screen.getByLabelText('De'), {
      target: { value: addDays(today, 4) },
    });
    expect(await screen.findAllByRole('listitem')).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '' } });
    expect(await screen.findAllByRole('listitem')).toHaveLength(3);
  });
});

describe('collapsed card (AC5)', () => {
  it('AC5 · shows formatted next review date, name and category', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10' as CalendarDay, 'Matemática')]);

    const item = await screen.findByRole('listitem');

    expect(item).toHaveTextContent('10/10/2026');
    expect(item).toHaveTextContent('Ábaco');
    expect(item).toHaveTextContent('Matemática');
  });

  it('AC5 · renders exactly four action icon buttons', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10' as CalendarDay)]);

    const item = await screen.findByRole('listitem');

    expect(within(item).getAllByRole('button')).toHaveLength(4);
  });
});

describe('overdue (AC6)', () => {
  it('AC6 · highlights an overdue card with the error token', async () => {
    const today = todayLocal();
    renderWith([makeCard('Vencido', addDays(today, -1))]);

    const item = await screen.findByRole('listitem');

    expect(item).toHaveClass('border-error');
    expect(item.querySelector('.text-error')).not.toBeNull();
  });

  it('AC6 · does not highlight a card due today', async () => {
    const today = todayLocal();
    renderWith([makeCard('Hoje', today)]);

    const item = await screen.findByRole('listitem');

    expect(item).not.toHaveClass('border-error');
    expect(item.querySelector('.text-error')).toBeNull();
  });

  it('AC6 · overdue highlight does not change ordering', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Futuro', addDays(today, 5)),
      makeCard('Antigo', addDays(today, -5)),
      makeCard('Meio', addDays(today, -1)),
    ]);

    const items = await screen.findAllByRole('listitem');

    expect(items[0]).toHaveTextContent('Antigo');
    expect(items[1]).toHaveTextContent('Meio');
    expect(items[2]).toHaveTextContent('Futuro');
  });
});

describe('empty states (AC7)', () => {
  it('AC7 · shows the no-cards message when the store is empty', async () => {
    renderWith([]);

    expect(
      await screen.findByText('Você ainda não tem cartões.'),
    ).toBeInTheDocument();
  });

  it('AC7 · shows the filtered message when a filter matches nothing', async () => {
    const today = todayLocal();
    renderWith([makeCard('Um', addDays(today, 1))]);
    await screen.findAllByRole('listitem');

    fireEvent.change(screen.getByLabelText('De'), {
      target: { value: addDays(today, 30) },
    });

    expect(
      await screen.findByText('Nenhum cartão para esses filtros.'),
    ).toBeInTheDocument();
  });

  it('AC7 · never shows the filtered message without an active filter', async () => {
    const today = todayLocal();
    renderWith([makeCard('Um', addDays(today, 1))]);
    await screen.findAllByRole('listitem');

    expect(
      screen.queryByText('Nenhum cartão para esses filtros.'),
    ).not.toBeInTheDocument();
  });

  it('AC7 · no-cards message wins when the store is empty', async () => {
    const today = todayLocal();
    renderWith([]);

    fireEvent.change(await screen.findByLabelText('De'), {
      target: { value: addDays(today, 30) },
    });

    expect(
      await screen.findByText('Você ainda não tem cartões.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Nenhum cartão para esses filtros.'),
    ).not.toBeInTheDocument();
  });
});

describe('accessibility (AC8)', () => {
  it('AC8 · each icon button carries a distinct aria-label', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10' as CalendarDay)]);

    const item = await screen.findByRole('listitem');
    const actions = within(item);

    expect(actions.getAllByRole('button', { name: 'Revisar' })).toHaveLength(1);
    expect(actions.getAllByRole('button', { name: 'Editar' })).toHaveLength(1);
    expect(actions.getAllByRole('button', { name: 'Excluir' })).toHaveLength(1);
    expect(actions.getAllByRole('button', { name: 'Expandir' })).toHaveLength(1);
  });

  it('AC8 · icons are aria-hidden decorations', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10' as CalendarDay)]);

    const item = await screen.findByRole('listitem');
    const icons = item.querySelectorAll('svg');

    expect(icons).toHaveLength(4);
    expect(icons[0]).toHaveAttribute('aria-hidden', 'true');
    expect(icons[1]).toHaveAttribute('aria-hidden', 'true');
    expect(icons[2]).toHaveAttribute('aria-hidden', 'true');
    expect(icons[3]).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('load & error (AC10)', () => {
  it('AC10 · shows a loading state before cards resolve', async () => {
    vi.mocked(getCardStore).mockReturnValue(new Promise<CardStore>(() => {}));
    render(<App />);

    expect(await screen.findByText('Carregando...')).toBeInTheDocument();
  });

  it('AC10 · shows an error state when the store rejects', async () => {
    vi.mocked(getCardStore).mockResolvedValue({
      list: vi.fn().mockRejectedValue(new PersistenceError('boom')),
    } as unknown as CardStore);
    render(<App />);

    expect(
      await screen.findByText('Não foi possível carregar os cartões.'),
    ).toBeInTheDocument();
  });

  it('AC10 · loads cards through getCardStore', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10' as CalendarDay)]);

    expect(await screen.findByRole('listitem')).toHaveTextContent('Ábaco');
    expect(getCardStore).toHaveBeenCalledTimes(1);
  });
});

describe('next review date (WEB-11)', () => {
  it("T1.1 renders the card's stored nextReviewDate formatted in pt-BR", async () => {
    renderWith([makeCard('Alvo', '2026-10-10' as CalendarDay)]);

    const item = await screen.findByRole('listitem');

    expect(item).toHaveTextContent('10/10/2026');
  });

  it('T2.1 renders the stored date even when it differs from a UI recomputation', async () => {
    const card = makeCard('Divergente', '2026-05-20' as CalendarDay);
    const recomputed = formatCalendarDay(
      nextReviewDate(card.createdDate, card.lastReviewDate, card.reviewCount),
    );
    renderWith([card]);

    const item = await screen.findByRole('listitem');

    expect(item).toHaveTextContent('20/05/2026');
    expect(item).not.toHaveTextContent(recomputed);
  });

  it("T3.1 formats each card's own date across 2+ cards", async () => {
    renderWith([
      makeCard('Alfa', '2026-03-15' as CalendarDay),
      makeCard('Beta', '2026-11-02' as CalendarDay),
    ]);

    const items = await screen.findAllByRole('listitem');

    expect(items[0]).toHaveTextContent('15/03/2026');
    expect(items[0]).not.toHaveTextContent('02/11/2026');
    expect(items[1]).toHaveTextContent('02/11/2026');
    expect(items[1]).not.toHaveTextContent('15/03/2026');
  });

  it('T3.2 keeps single-digit day/month zero-padded across the list', async () => {
    renderWith([
      makeCard('Janeiro', '2026-01-05' as CalendarDay),
      makeCard('Setembro', '2026-09-08' as CalendarDay),
    ]);

    const items = await screen.findAllByRole('listitem');

    expect(items[0]).toHaveTextContent('05/01/2026');
    expect(items[1]).toHaveTextContent('08/09/2026');
  });
});
