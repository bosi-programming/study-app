import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type CalendarDay, type Card } from '@study/core';
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

const failingStore = (cards: readonly Card[]): CardStore =>
  ({
    list: vi.fn().mockResolvedValue([...cards]),
    create: vi.fn().mockImplementation((card: Card) => Promise.resolve(card)),
    update: vi.fn().mockImplementation((card: Card) => Promise.resolve(card)),
    remove: vi.fn().mockRejectedValue(new PersistenceError('boom')),
  } as unknown as CardStore);

const pendingStore = (cards: readonly Card[]): CardStore =>
  ({
    list: vi.fn().mockResolvedValue([...cards]),
    create: vi.fn().mockImplementation((card: Card) => Promise.resolve(card)),
    update: vi.fn().mockImplementation((card: Card) => Promise.resolve(card)),
    remove: vi.fn().mockReturnValue(new Promise<void>(() => {})),
  } as unknown as CardStore);

const renderWith = (cards: readonly Card[]): CardStore => {
  const store = makeStore(cards);
  vi.mocked(getCardStore).mockResolvedValue(store);
  render(<App />);
  return store;
};

const openDelete = async (name: string): Promise<HTMLElement> => {
  const item = (await screen.findByText(name)).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: 'Excluir' }));
  return screen.findByTestId('confirmation-dialog');
};

beforeEach(() => {
  vi.mocked(getCardStore).mockReset();
  vi.mocked(getCardStore).mockResolvedValue(makeStore([]));
});

afterEach(cleanup);

describe('open the confirmation dialog (AC1)', () => {
  it('T1.1 · clicking "Excluir" opens the dialog showing the card name', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);

    const dialog = await openDelete('Ábaco');

    expect(within(dialog).getByText('Ábaco')).toBeInTheDocument();
  });

  it('T1.2 · the dialog exposes the "Confirmar" and "Cancelar" actions', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);

    const dialog = await openDelete('Ábaco');

    expect(within(dialog).getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('T1.3 · the dialog is not present before the icon is clicked', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    await screen.findAllByRole('listitem');

    expect(screen.queryByTestId('confirmation-dialog')).toBeNull();
  });
});

describe('confirm removes the card (AC2)', () => {
  it('T2.1 · confirming calls store.remove once with the card id', async () => {
    const store = renderWith([makeCard('Ábaco', '2026-10-10')]);
    const dialog = await openDelete('Ábaco');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(vi.mocked(store.remove)).toHaveBeenCalledTimes(1));
    expect(store.remove).toHaveBeenCalledWith('Ábaco-2026-10-10');
  });

  it('T2.2 · confirming removes the card from the list', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10'), makeCard('Zebra', '2026-10-11')]);
    const dialog = await openDelete('Ábaco');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(screen.queryByText('Ábaco')).toBeNull());
    expect(screen.getByText('Zebra')).toBeInTheDocument();
  });

  it('T2.3 · confirming closes the dialog', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    const dialog = await openDelete('Ábaco');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(screen.queryByTestId('confirmation-dialog')).toBeNull());
  });

  it('T2.4 · a second "Confirmar" while remove is pending does not call store.remove again', async () => {
    const store = pendingStore([makeCard('Ábaco', '2026-10-10')]);
    vi.mocked(getCardStore).mockResolvedValue(store);
    render(<App />);
    await screen.findAllByRole('listitem');
    const dialog = await openDelete('Ábaco');
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar' });

    fireEvent.click(confirm);
    await waitFor(() => expect(vi.mocked(store.remove)).toHaveBeenCalledTimes(1));
    fireEvent.click(confirm);

    expect(vi.mocked(store.remove)).toHaveBeenCalledTimes(1);
  });
});

describe('cancel / Escape (AC3)', () => {
  it('T3.1 · cancelling closes the dialog without calling store.remove', async () => {
    const store = renderWith([makeCard('Ábaco', '2026-10-10')]);
    const dialog = await openDelete('Ábaco');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByTestId('confirmation-dialog')).toBeNull();
    expect(store.remove).not.toHaveBeenCalled();
  });

  it('T3.2 · cancelling leaves the list unchanged', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    const dialog = await openDelete('Ábaco');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByText('Ábaco')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('T3.3 · Escape closes the dialog without calling store.remove', async () => {
    const store = renderWith([makeCard('Ábaco', '2026-10-10')]);
    const dialog = await openDelete('Ábaco');

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByTestId('confirmation-dialog')).toBeNull();
    expect(store.remove).not.toHaveBeenCalled();
  });
});

describe('category filter / empty states (AC4)', () => {
  it('T4.1 · deleting the last card of a category removes the category from the filter options', async () => {
    renderWith([
      makeCard('Ábaco', '2026-10-10', 'História'),
      makeCard('Zebra', '2026-10-11', 'Matemática'),
    ]);
    const dialog = await openDelete('Ábaco');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(screen.queryByText('Ábaco')).toBeNull());
    expect(
      within(screen.getByLabelText('Categoria')).queryByRole('option', { name: 'História' }),
    ).toBeNull();
  });

  it('T4.2 · deleting the last card overall shows "Você ainda não tem cartões."', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    const dialog = await openDelete('Ábaco');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('Você ainda não tem cartões.')).toBeInTheDocument();
  });

  it('T4.3 · deleting the last visible card under an active filter shows "Nenhum cartão para esses filtros."', async () => {
    renderWith([
      makeCard('Alvo', '2026-10-10', 'Matemática'),
      makeCard('Fora', '2026-10-11', 'História'),
    ]);
    await screen.findAllByRole('listitem');
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'Matemática' } });
    const dialog = await openDelete('Alvo');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    expect(
      await screen.findByText('Nenhum cartão para esses filtros.'),
    ).toBeInTheDocument();
  });

  it('T4.4 · deleting a card while others share its category keeps the category in the filter', async () => {
    renderWith([
      makeCard('Ábaco', '2026-10-10', 'Matemática'),
      makeCard('Zebra', '2026-10-11', 'Matemática'),
    ]);
    const dialog = await openDelete('Ábaco');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(screen.queryByText('Ábaco')).toBeNull());
    expect(
      within(screen.getByLabelText('Categoria')).getByRole('option', { name: 'Matemática' }),
    ).toBeInTheDocument();
  });
});

describe('removal failure (AC5)', () => {
  it('T5.1 · a rejected store.remove keeps the card in the list and shows a visible error (role="alert") in the dialog', async () => {
    const store = failingStore([makeCard('Ábaco', '2026-10-10')]);
    vi.mocked(getCardStore).mockResolvedValue(store);
    render(<App />);
    await screen.findAllByRole('listitem');
    const dialog = await openDelete('Ábaco');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Não foi possível excluir. Tente novamente.',
    );
    expect(within(screen.getByTestId('card-list')).getByText('Ábaco')).toBeInTheDocument();
  });

  it('T5.2 · after a failure the dialog stays open and allows retrying', async () => {
    const store = failingStore([makeCard('Ábaco', '2026-10-10')]);
    vi.mocked(getCardStore).mockResolvedValue(store);
    render(<App />);
    await screen.findAllByRole('listitem');
    const dialog = await openDelete('Ábaco');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    await within(dialog).findByRole('alert');

    expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Confirmar' })).toBeEnabled();
  });

  it('T5.3 · the rejection writes nothing extra: store.remove called once, store.list called once', async () => {
    const store = failingStore([makeCard('Ábaco', '2026-10-10')]);
    vi.mocked(getCardStore).mockResolvedValue(store);
    render(<App />);
    await screen.findAllByRole('listitem');
    const dialog = await openDelete('Ábaco');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    await within(dialog).findByRole('alert');

    expect(vi.mocked(store.remove)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(store.list)).toHaveBeenCalledTimes(1);
  });
});

describe('DS composition & accessibility (AC6)', () => {
  it('T6.1 · the dialog has an accessible name', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    await openDelete('Ábaco');

    expect(screen.getByRole('dialog', { name: 'Excluir conteúdo?' })).toBeInTheDocument();
  });

  it('T6.2 · the actions are DS Buttons (role button) keyboard-activatable; Escape cancels', async () => {
    const store = renderWith([makeCard('Ábaco', '2026-10-10')]);
    const dialog = await openDelete('Ábaco');
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar' });
    const cancel = within(dialog).getByRole('button', { name: 'Cancelar' });

    confirm.focus();

    expect(confirm).toHaveFocus();
    expect(cancel).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByTestId('confirmation-dialog')).toBeNull();
    expect(store.remove).not.toHaveBeenCalled();
  });

  it('T6.3 · the dialog content is composed of DS Paper/Typography/Button (no raw interactive elements)', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    const dialog = await openDelete('Ábaco');

    expect(dialog.querySelector('.shadow-paper')).not.toBeNull();
    expect(within(dialog).getByRole('heading', { name: 'Excluir conteúdo?' })).toBeInTheDocument();
    expect(within(dialog).getAllByRole('button')).toHaveLength(2);
    expect(within(dialog).queryByRole('link')).toBeNull();
    expect(within(dialog).queryByRole('textbox')).toBeNull();
  });
});
