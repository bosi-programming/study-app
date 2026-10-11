import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type Card, addDays, todayLocal } from '@study/core';
import { App } from '../src/App';
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

const renderWith = (cards: readonly Card[]): CardStore => {
  const store = makeStore(cards);
  vi.mocked(getCardStore).mockResolvedValue(store);
  render(<App />);
  return store;
};

const openForm = async (): Promise<HTMLElement> => {
  fireEvent.click(await screen.findByRole('button', { name: 'Novo conteúdo' }));
  return screen.getByTestId('new-card-form');
};

const fillForm = (
  form: HTMLElement,
  values: { name: string; category: string; content: string },
): void => {
  fireEvent.change(within(form).getByLabelText('Nome'), {
    target: { value: values.name },
  });
  fireEvent.change(within(form).getByLabelText('Categoria'), {
    target: { value: values.category },
  });
  fireEvent.change(within(form).getByLabelText('Conteúdo'), {
    target: { value: values.content },
  });
};

const submitForm = (): void => {
  fireEvent.submit(screen.getByTestId('new-card-form'));
};

beforeEach(() => {
  vi.mocked(getCardStore).mockReset();
  vi.mocked(getCardStore).mockResolvedValue(makeStore([]));
});

afterEach(cleanup);

describe('open the form (AC1, AC2)', () => {
  it('T1.1 · clicking "Novo conteúdo" reveals the Nome, Categoria and Conteúdo fields', async () => {
    renderWith([]);

    const form = await openForm();

    expect(within(form).getByLabelText('Nome')).toBeInTheDocument();
    expect(within(form).getByLabelText('Categoria')).toBeInTheDocument();
    expect(within(form).getByLabelText('Conteúdo')).toBeInTheDocument();
  });

  it('T1.2 · the form stays hidden until the action is triggered', async () => {
    renderWith([]);

    expect(await screen.findByRole('button', { name: 'Novo conteúdo' })).toBeInTheDocument();
    expect(screen.queryByTestId('new-card-form')).toBeNull();
  });

  it('T2.4 · a case-insensitive duplicate category is not duplicated into chips (RB-08)', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Um', addDays(today, 1), 'Inglês'),
      makeCard('Dois', addDays(today, 2), 'inglês'),
    ]);

    const form = await openForm();

    expect(within(form).getAllByRole('button', { name: 'Inglês' })).toHaveLength(1);
  });
});

describe('create & persist (AC4)', () => {
  it('T4.2 · store.create receives reviewCount 0, lastReviewDate null, nextReviewDate today+7 and createdDate today', async () => {
    const store = renderWith([]);
    const create = vi.mocked(store.create);
    const form = await openForm();
    fillForm(form, { name: 'Novo', category: 'Geral', content: 'Conteudo' });

    submitForm();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewCount: 0,
        lastReviewDate: null,
        createdDate: todayLocal(),
        nextReviewDate: addDays(todayLocal(), 7),
        name: 'Novo',
        category: 'Geral',
        content: 'Conteudo',
      }),
    );
  });

  it('T4.3 · persistence uses getCardStore().create with the created card', async () => {
    const store = renderWith([]);
    const create = vi.mocked(store.create);
    const form = await openForm();
    fillForm(form, { name: 'Novo', category: 'Geral', content: 'Conteudo' });

    submitForm();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const arg = create.mock.calls[0]?.[0];
    expect(typeof arg).toBe('object');
    expect(typeof arg?.id).toBe('string');
  });
});

describe('list update on save (AC5)', () => {
  it('T5.1 · after saving the new card appears in the list', async () => {
    renderWith([]);
    const form = await openForm();
    fillForm(form, { name: 'Nome novo', category: 'Geral', content: 'Conteudo' });

    submitForm();

    const list = await screen.findByTestId('card-list');
    expect(within(list).getByText('Nome novo')).toBeInTheDocument();
  });

  it('T5.2 · the list stays ordered after the insertion', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Antes', addDays(today, 1)),
      makeCard('Depois', addDays(today, 14)),
    ]);
    const form = await openForm();
    fillForm(form, { name: 'Novo', category: 'Geral', content: 'Conteudo' });

    submitForm();

    await screen.findByText('Novo');
    const items = await screen.findAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Antes'),
      expect.stringContaining('Novo'),
      expect.stringContaining('Depois'),
    ]);
  });

  it('T5.3 · the form closes after a successful save', async () => {
    renderWith([]);
    const form = await openForm();
    fillForm(form, { name: 'Novo', category: 'Geral', content: 'Conteudo' });

    submitForm();

    await waitFor(() => expect(screen.queryByTestId('new-card-form')).toBeNull());
  });
});

describe('cancel (AC6)', () => {
  it('T6.1 · cancelling closes the form', async () => {
    renderWith([]);
    await openForm();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByTestId('new-card-form')).toBeNull();
  });

  it('T6.2 · cancelling calls neither onCreate nor store.create', async () => {
    const today = todayLocal();
    const store = renderWith([makeCard('Fixo', addDays(today, 1))]);
    await screen.findAllByRole('listitem');
    await openForm();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(vi.mocked(store.create)).not.toHaveBeenCalled();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
});

describe('write failure (AC8)', () => {
  it('T8.2 · a rejected store.create does not add a card to the list', async () => {
    const today = todayLocal();
    const store = {
      list: vi.fn().mockResolvedValue([makeCard('Existente', addDays(today, 1))]),
      create: vi.fn().mockRejectedValue(new PersistenceError('boom')),
    } as unknown as CardStore;
    vi.mocked(getCardStore).mockResolvedValue(store);
    render(<App />);
    await screen.findAllByRole('listitem');
    const form = await openForm();
    fillForm(form, { name: 'Novo', category: 'Geral', content: 'Conteudo' });

    submitForm();

    await screen.findByRole('alert');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('T8.3 · the store stays unchanged after the failure (RNF-13)', async () => {
    const today = todayLocal();
    const store = {
      list: vi.fn().mockResolvedValue([makeCard('Existente', addDays(today, 1))]),
      create: vi.fn().mockRejectedValue(new PersistenceError('boom')),
    } as unknown as CardStore;
    vi.mocked(getCardStore).mockResolvedValue(store);
    render(<App />);
    await screen.findAllByRole('listitem');
    const form = await openForm();
    fillForm(form, { name: 'Novo', category: 'Geral', content: 'Conteudo' });

    submitForm();

    await screen.findByRole('alert');
    expect(vi.mocked(store.create)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(store.list)).toHaveBeenCalledTimes(1);
  });
});
