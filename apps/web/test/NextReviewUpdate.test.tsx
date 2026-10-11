import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type Card, createCard, markCardReviewed, todayLocal } from '@study/core';
import { App } from '../src/App';
import { formatCalendarDay } from '../src/format';
import { type CardStore, getCardStore } from '../src/persistence';

vi.mock('../src/persistence', async () => {
  const errors = await vi.importActual<
    typeof import('../src/persistence/errors')
  >('../src/persistence/errors');
  return { getCardStore: vi.fn(), PersistenceError: errors.PersistenceError };
});

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
    update: vi.fn().mockImplementation((card: Card) => Promise.resolve(card)),
    remove: vi.fn().mockResolvedValue(undefined),
  } as unknown as CardStore);

const renderWith = (cards: readonly Card[]): CardStore => {
  const store = makeStore(cards);
  vi.mocked(getCardStore).mockResolvedValue(store);
  render(<App />);
  return store;
};

const itemFor = async (name: string): Promise<HTMLElement> => {
  const node = await screen.findByText(name);
  return node.closest('li') as HTMLElement;
};

beforeEach(() => {
  vi.mocked(getCardStore).mockReset();
  vi.mocked(getCardStore).mockResolvedValue(makeStore([]));
});

afterEach(cleanup);

describe('next review date updates across actions (WEB-11 · AC4)', () => {
  it('shows a created card with its computed next review date', async () => {
    renderWith([]);
    fireEvent.click(await screen.findByRole('button', { name: 'Novo conteúdo' }));
    const form = screen.getByTestId('new-card-form');
    fireEvent.change(within(form).getByLabelText('Nome'), {
      target: { value: 'Novo' },
    });
    fireEvent.change(within(form).getByLabelText('Categoria'), {
      target: { value: 'Geral' },
    });
    fireEvent.change(within(form).getByLabelText('Conteúdo'), {
      target: { value: 'Conteudo' },
    });
    fireEvent.submit(form);

    const created = createCard(
      { name: 'Novo', category: 'Geral', content: 'Conteudo' },
      todayLocal(),
    );
    const item = await itemFor('Novo');
    expect(item).toHaveTextContent(formatCalendarDay(created.nextReviewDate));
  });

  it('updates the shown next review date after marking the card reviewed', async () => {
    const card = makeCard('Revisar', '2026-10-10');
    renderWith([card]);
    const item = await itemFor('Revisar');
    expect(item).toHaveTextContent('10/10/2026');

    fireEvent.click(
      within(item).getByRole('button', { name: 'Marcar como revisado' }),
    );

    const expected = formatCalendarDay(markCardReviewed(card, todayLocal()).nextReviewDate);
    await waitFor(() => {
      expect(screen.getByText('Revisar').closest('li')).toHaveTextContent(expected);
    });
    expect(screen.getByText('Revisar').closest('li')).not.toHaveTextContent('10/10/2026');
  });

  it('keeps the shown next review date after editing the card', async () => {
    const card = makeCard('Editar', '2026-10-10');
    renderWith([card]);
    const item = await itemFor('Editar');
    fireEvent.click(within(item).getByRole('button', { name: 'Editar' }));
    const form = screen.getByTestId('new-card-form');
    fireEvent.change(within(form).getByLabelText('Nome'), {
      target: { value: 'Editado' },
    });
    fireEvent.submit(form);

    const edited = await itemFor('Editado');
    expect(edited).toHaveTextContent('10/10/2026');
  });
});
