import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type CalendarDay, type Card, addDays, todayLocal } from '@study/core';
import { App } from '../src/App';
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
  nextReviewDate: nextReviewDate as CalendarDay,
  createdDate: '2026-01-01' as CalendarDay,
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

const findItem = async (name: string): Promise<HTMLElement> =>
  (await screen.findByText(name)).closest('li') as HTMLElement;

const expandToggle = (item: HTMLElement): HTMLElement =>
  within(item).getByRole('button', { name: 'Expandir' });

const collapseToggle = (item: HTMLElement): HTMLElement =>
  within(item).getByRole('button', { name: 'Recolher' });

beforeEach(() => {
  vi.mocked(getCardStore).mockReset();
  vi.mocked(getCardStore).mockResolvedValue(makeStore([]));
});

afterEach(cleanup);

describe('toggle expansion (AC1)', () => {
  it('T1.1 · a collapsed card exposes a button named "Expandir" with aria-expanded="false" and renders no content', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);

    const item = await findItem('Ábaco');
    const toggle = expandToggle(item);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(item).queryByText('Ábaco conteudo')).toBeNull();
  });

  it('T1.2 · clicking the toggle expands: button named "Recolher", aria-expanded="true", content visible', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);

    const item = await findItem('Ábaco');
    fireEvent.click(expandToggle(item));

    expect(collapseToggle(item)).toHaveAttribute('aria-expanded', 'true');
    expect(within(item).getByText('Ábaco conteudo')).toBeInTheDocument();
  });
});

describe('expanded content (AC2)', () => {
  it("T2.1 · expanded renders the card's content text within the same list item", async () => {
    const card = makeCard('Ábaco', '2026-10-10');
    renderWith([card]);

    const item = await findItem('Ábaco');
    fireEvent.click(expandToggle(item));

    expect(within(item).getByText(card.content)).toBeInTheDocument();
  });

  it('T2.2 · the content region sits after the header row in DOM order', async () => {
    const card = makeCard('Ábaco', '2026-10-10');
    renderWith([card]);

    const nameNode = await screen.findByText('Ábaco');
    const item = nameNode.closest('li') as HTMLElement;
    fireEvent.click(expandToggle(item));
    const contentNode = within(item).getByText(card.content);

    expect(nameNode.compareDocumentPosition(contentNode)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('T2.3 · a 5000-char content renders uncut', async () => {
    const card = { ...makeCard('Longo', '2026-10-10'), content: 'a'.repeat(5000) };
    renderWith([card]);

    const item = await findItem('Longo');
    fireEvent.click(expandToggle(item));
    const contentNode = within(item).getByText(card.content);

    expect(contentNode.textContent?.length).toBe(5000);
  });

  it('T2.4 · an overdue card keeps border-error on the li and .text-error in the header while expanded', async () => {
    renderWith([makeCard('Vencido', addDays(todayLocal(), -1))]);

    const item = await findItem('Vencido');
    fireEvent.click(expandToggle(item));

    expect(item).toHaveClass('border-error');
    expect(item.querySelector('.text-error')).not.toBeNull();
  });
});

describe('collapse (AC3)', () => {
  it('T3.1 · a second activation hides the content, restores aria-expanded="false" and label "Expandir"', async () => {
    const card = makeCard('Ábaco', '2026-10-10');
    renderWith([card]);

    const item = await findItem('Ábaco');
    fireEvent.click(expandToggle(item));
    fireEvent.click(collapseToggle(item));

    expect(expandToggle(item)).toHaveAttribute('aria-expanded', 'false');
    expect(within(item).queryByText(card.content)).toBeNull();
  });
});

describe('empty content (AC4)', () => {
  it('T4.1 · empty content shows "Sem conteúdo."', async () => {
    const card = { ...makeCard('Vazio', '2026-10-10'), content: '' };
    renderWith([card]);

    const item = await findItem('Vazio');
    fireEvent.click(expandToggle(item));

    expect(within(item).getByText('Sem conteúdo.')).toBeInTheDocument();
  });

  it('T4.2 · whitespace-only content shows "Sem conteúdo."', async () => {
    const card = { ...makeCard('Branco', '2026-10-10'), content: '   ' };
    renderWith([card]);

    const item = await findItem('Branco');
    fireEvent.click(expandToggle(item));

    expect(within(item).getByText('Sem conteúdo.')).toBeInTheDocument();
  });
});

describe('accessibility (AC5)', () => {
  it('T5.1 · the toggle is a native, focusable, enabled button', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);

    const item = await findItem('Ábaco');
    const toggle = expandToggle(item);
    toggle.focus();

    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle).toHaveFocus();
    expect(toggle).toBeEnabled();
  });

  it('T5.2 · the accessible name toggles "Expandir" ⇄ "Recolher" across activations', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);

    const item = await findItem('Ábaco');
    expect(expandToggle(item)).toBeInTheDocument();
    fireEvent.click(expandToggle(item));
    expect(collapseToggle(item)).toBeInTheDocument();
    fireEvent.click(collapseToggle(item));
    expect(expandToggle(item)).toBeInTheDocument();
  });

  it('T5.3 · the expand icon is aria-hidden in both collapsed and expanded states', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);

    const item = await findItem('Ábaco');
    expect(item.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(4);
    fireEvent.click(expandToggle(item));
    expect(item.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(4);
  });
});

describe('design system (AC6)', () => {
  it('T6.1 · expanded content renders through DS Typography (carries text-body)', async () => {
    const card = makeCard('Ábaco', '2026-10-10');
    renderWith([card]);

    const item = await findItem('Ábaco');
    fireEvent.click(expandToggle(item));

    expect(within(item).getByText(card.content)).toHaveClass('text-body');
  });

  it('T6.2 · the empty indicator renders through DS Typography with color="secondary" (text-secondary-on-light)', async () => {
    const card = { ...makeCard('Vazio', '2026-10-10'), content: '' };
    renderWith([card]);

    const item = await findItem('Vazio');
    fireEvent.click(expandToggle(item));

    expect(within(item).getByText('Sem conteúdo.')).toHaveClass(
      'text-secondary-on-light',
    );
  });
});

describe('isolation & persistence (AC7)', () => {
  it('T7.1 · expanding one card leaves the other card collapsed', async () => {
    renderWith([
      makeCard('Alfa', '2026-10-10'),
      makeCard('Beta', '2026-10-11'),
    ]);

    const alpha = await findItem('Alfa');
    const beta = await findItem('Beta');
    fireEvent.click(expandToggle(alpha));

    expect(expandToggle(beta)).toHaveAttribute('aria-expanded', 'false');
  });

  it('T7.2 · expansion survives a review-driven list reorder', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Alvo', addDays(today, 1)),
      makeCard('Zebra', addDays(today, 5)),
    ]);

    const item = await findItem('Alvo');
    fireEvent.click(expandToggle(item));
    fireEvent.click(within(item).getByRole('button', { name: 'Marcar como revisado' }));

    await waitFor(() => {
      const items = screen.getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('Zebra');
    });
    const reordered = await findItem('Alvo');

    expect(collapseToggle(reordered)).toBeInTheDocument();
  });

  it('T7.3 · expansion survives a category-filter change that keeps the card visible', async () => {
    renderWith([
      makeCard('Alvo', '2026-10-10', 'Matemática'),
      makeCard('Outra', '2026-10-11', 'História'),
    ]);

    const item = await findItem('Alvo');
    fireEvent.click(expandToggle(item));
    fireEvent.change(screen.getByLabelText('Categoria'), {
      target: { value: 'Matemática' },
    });
    const filtered = await findItem('Alvo');

    expect(collapseToggle(filtered)).toBeInTheDocument();
  });
});

describe('local state (AC8)', () => {
  it('T8.1 · expanding calls store.list once and never create/update/remove', async () => {
    const store = renderWith([makeCard('Ábaco', '2026-10-10')]);

    const item = await findItem('Ábaco');
    fireEvent.click(expandToggle(item));

    expect(store.list).toHaveBeenCalledTimes(1);
    expect(store.create).not.toHaveBeenCalled();
    expect(store.update).not.toHaveBeenCalled();
    expect(store.remove).not.toHaveBeenCalled();
  });
});
