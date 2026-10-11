import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type CalendarDay, type Card, addDays, todayLocal } from '@study/core';
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

const editableCard: Card = {
  id: 'Ábaco-2026-10-10',
  name: 'Ábaco',
  category: 'Geral',
  content: 'Ábaco conteudo',
  lastReviewDate: '2026-02-02' as CalendarDay,
  reviewCount: 3,
  nextReviewDate: '2026-10-10' as CalendarDay,
  createdDate: '2026-01-01' as CalendarDay,
};

const makeStore = (cards: readonly Card[]): CardStore =>
  ({
    list: vi.fn().mockResolvedValue([...cards]),
    create: vi.fn().mockImplementation((card: Card) => Promise.resolve(card)),
    update: vi.fn().mockImplementation((card: Card) => Promise.resolve(card)),
  } as unknown as CardStore);

const renderWith = (cards: readonly Card[]): CardStore => {
  const store = makeStore(cards);
  vi.mocked(getCardStore).mockResolvedValue(store);
  render(<App />);
  return store;
};

const openEdit = async (name: string): Promise<HTMLElement> => {
  const item = (await screen.findByText(name)).closest('li') as HTMLElement;
  fireEvent.click(within(item).getByRole('button', { name: 'Editar' }));
  return screen.findByTestId('new-card-form');
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

describe('open the edit form (AC1)', () => {
  it('T1.1 · clicking a card\'s "Editar" opens the form prefilled with its Nome, Categoria and Conteúdo', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10', 'Matemática')]);

    const form = await openEdit('Ábaco');

    expect(within(form).getByLabelText('Nome')).toHaveValue('Ábaco');
    expect(within(form).getByLabelText('Categoria')).toHaveValue('Matemática');
    expect(within(form).getByLabelText('Conteúdo')).toHaveValue('Ábaco conteudo');
  });
});

describe('category suggestions (AC2)', () => {
  it('T2.1 · the edit form suggests the existing categories', async () => {
    renderWith([
      makeCard('Ábaco', '2026-10-10', 'Matemática'),
      makeCard('Zebra', '2026-10-11', 'História'),
    ]);

    const form = await openEdit('Ábaco');

    expect(within(form).getByRole('button', { name: 'Matemática' })).toBeInTheDocument();
    expect(within(form).getByRole('button', { name: 'História' })).toBeInTheDocument();
  });

  it('T2.2 · a new category typed is accepted and persisted trimmed', async () => {
    const store = renderWith([makeCard('Ábaco', '2026-10-10', 'Matemática')]);
    const update = vi.mocked(store.update);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Ábaco', category: '  Física  ', content: 'Ábaco conteudo' });

    submitForm();

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ category: 'Física' }));
  });

  it('T2.3 · the suggestions include the edited card\'s own category', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10', 'Matemática')]);

    const form = await openEdit('Ábaco');

    expect(within(form).getByRole('button', { name: 'Matemática' })).toBeInTheDocument();
  });
});

describe('validation (AC3)', () => {
  it('T3.1 · a blank or whitespace-only Nome shows the required error, persists nothing and keeps the form open', async () => {
    const store = renderWith([makeCard('Ábaco', '2026-10-10')]);
    const update = vi.mocked(store.update);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: '   ', category: 'Geral', content: 'Ábaco conteudo' });

    submitForm();

    expect(await within(form).findByText('Informe o nome.')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByTestId('new-card-form')).toBeInTheDocument();
  });

  it('T3.2 · a blank or whitespace-only Conteúdo shows the required error', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Ábaco', category: 'Geral', content: '   ' });

    submitForm();

    expect(await within(form).findByText('Informe o conteúdo.')).toBeInTheDocument();
  });

  it('T3.3 · a blank or whitespace-only Categoria shows the required error', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Ábaco', category: '   ', content: 'Ábaco conteudo' });

    submitForm();

    expect(await within(form).findByText('Informe a categoria.')).toBeInTheDocument();
  });

  it('T3.4 · a Nome with 41 characters shows the size error', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'a'.repeat(41), category: 'Geral', content: 'Ábaco conteudo' });

    submitForm();

    expect(
      await within(form).findByText('O nome pode ter no máximo 40 caracteres.'),
    ).toBeInTheDocument();
  });

  it('T3.5 · a Categoria with 41 characters shows the size error', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Ábaco', category: 'a'.repeat(41), content: 'Ábaco conteudo' });

    submitForm();

    expect(
      await within(form).findByText('A categoria pode ter no máximo 40 caracteres.'),
    ).toBeInTheDocument();
  });

  it('T3.6 · a Conteúdo with 5001 characters shows the size error', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Ábaco', category: 'Geral', content: 'a'.repeat(5001) });

    submitForm();

    expect(
      await within(form).findByText('O conteúdo pode ter no máximo 5000 caracteres.'),
    ).toBeInTheDocument();
  });

  it('T3.7 · an invalid submit does not call store.update', async () => {
    const store = renderWith([makeCard('Ábaco', '2026-10-10')]);
    const update = vi.mocked(store.update);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: '   ', category: 'Geral', content: 'Ábaco conteudo' });

    submitForm();

    expect(await screen.findByText('Informe o nome.')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });
});

describe('persist preserving immutables (AC4)', () => {
  it('T4.1 · saving calls store.update once with the trimmed values', async () => {
    const store = renderWith([makeCard('Ábaco', '2026-10-10')]);
    const update = vi.mocked(store.update);
    const form = await openEdit('Ábaco');
    fillForm(form, {
      name: '  Novo Nome  ',
      category: '  Nova Cat  ',
      content: '  Novo conteudo  ',
    });

    submitForm();

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Novo Nome', category: 'Nova Cat', content: 'Novo conteudo' }),
    );
  });

  it('T4.2 · store.update receives id/createdDate/lastReviewDate/reviewCount/nextReviewDate unchanged', async () => {
    const store = renderWith([editableCard]);
    const update = vi.mocked(store.update);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Outro', category: 'Outra', content: 'Outro conteudo' });

    submitForm();

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'Ábaco-2026-10-10',
        createdDate: '2026-01-01',
        lastReviewDate: '2026-02-02',
        reviewCount: 3,
        nextReviewDate: '2026-10-10',
      }),
    );
  });

  it('T4.3 · only Nome/Categoria/Conteúdo change', async () => {
    const store = renderWith([editableCard]);
    const update = vi.mocked(store.update);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Outro', category: 'Outra', content: 'Outro conteudo' });

    submitForm();

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith({
      ...editableCard,
      name: 'Outro',
      category: 'Outra',
      content: 'Outro conteudo',
    });
  });
});

describe('list & close (AC5)', () => {
  it('T5.1 · after saving the list shows the updated values', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10', 'Matemática')]);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Ábaco Editado', category: 'Matemática', content: 'Ábaco conteudo' });

    submitForm();

    const list = await screen.findByTestId('card-list');
    expect(within(list).getByText('Ábaco Editado')).toBeInTheDocument();
  });

  it('T5.2 · the list stays ordered after the edit', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Alvo', addDays(today, 1)),
      makeCard('Depois', addDays(today, 14)),
    ]);
    const form = await openEdit('Alvo');
    fillForm(form, { name: 'Zzz Alvo', category: 'Geral', content: 'Alvo conteudo' });

    submitForm();

    await screen.findByText('Zzz Alvo');
    const items = await screen.findAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Zzz Alvo'),
      expect.stringContaining('Depois'),
    ]);
  });

  it('T5.3 · the form closes after a successful save', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Ábaco', category: 'Geral', content: 'Ábaco conteudo' });

    submitForm();

    await waitFor(() => expect(screen.queryByTestId('new-card-form')).toBeNull());
  });
});

describe('category filter (AC6)', () => {
  it('T6.1 · editing the category out of the active filter removes the card from the visible list', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Alvo', addDays(today, 1), 'Matemática'),
      makeCard('Fora', addDays(today, 2), 'História'),
    ]);
    await screen.findAllByRole('listitem');
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'Matemática' } });
    const form = await openEdit('Alvo');
    fillForm(form, { name: 'Alvo', category: 'História', content: 'Alvo conteudo' });

    submitForm();

    await screen.findByText('Nenhum cartão para esses filtros.');
    expect(screen.queryByText('Alvo')).toBeNull();
  });

  it('T6.2 · the filter options are recomputed with the current category', async () => {
    renderWith([
      makeCard('Um', '2026-10-10', 'Geral'),
      makeCard('Dois', '2026-10-11', 'Geral'),
    ]);
    const form = await openEdit('Um');
    fillForm(form, { name: 'Um', category: 'Física', content: 'Um conteudo' });

    submitForm();

    await waitFor(() => expect(screen.queryByTestId('new-card-form')).toBeNull());
    expect(
      within(screen.getByLabelText('Categoria')).getByRole('option', { name: 'Física' }),
    ).toBeInTheDocument();
  });

  it('T6.3 · a case-only change keeps the case-insensitive grouping (RB-08)', async () => {
    renderWith([
      makeCard('Um', '2026-10-10', 'Inglês'),
      makeCard('Dois', '2026-10-11', 'inglês'),
    ]);
    await screen.findAllByRole('listitem');
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'Inglês' } });
    const form = await openEdit('Dois');
    fillForm(form, { name: 'Dois', category: 'INGLÊS', content: 'Dois conteudo' });

    submitForm();

    await waitFor(() => expect(screen.queryByTestId('new-card-form')).toBeNull());
    expect(
      within(screen.getByLabelText('Categoria')).getAllByRole('option', { name: /inglês/i }),
    ).toHaveLength(1);
    expect(screen.getByText('Um')).toBeInTheDocument();
    expect(screen.getByText('Dois')).toBeInTheDocument();
  });
});

describe('cancel (AC7)', () => {
  it('T7.1 · cancelling closes the form', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    await openEdit('Ábaco');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByTestId('new-card-form')).toBeNull();
  });

  it('T7.2 · cancelling does not call store.update and leaves the list unchanged', async () => {
    const store = renderWith([makeCard('Ábaco', '2026-10-10', 'Matemática')]);
    const update = vi.mocked(store.update);
    await screen.findAllByRole('listitem');
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Outro', category: 'Outra', content: 'Outro conteudo' });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(update).not.toHaveBeenCalled();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Ábaco')).toBeInTheDocument();
  });
});

describe('write failure (AC8)', () => {
  const failingStore = (cards: readonly Card[]): CardStore =>
    ({
      list: vi.fn().mockResolvedValue([...cards]),
      create: vi.fn().mockImplementation((card: Card) => Promise.resolve(card)),
      update: vi.fn().mockRejectedValue(new PersistenceError('boom')),
    } as unknown as CardStore);

  it('T8.1 · a rejected store.update keeps the form open and shows a visible error', async () => {
    vi.mocked(getCardStore).mockResolvedValue(failingStore([makeCard('Ábaco', '2026-10-10')]));
    render(<App />);
    await screen.findAllByRole('listitem');
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Outro', category: 'Outra', content: 'Outro conteudo' });

    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar. Tente novamente.',
    );
    expect(screen.getByTestId('new-card-form')).toBeInTheDocument();
  });

  it('T8.2 · a rejected store.update leaves the list unchanged', async () => {
    vi.mocked(getCardStore).mockResolvedValue(failingStore([makeCard('Ábaco', '2026-10-10')]));
    render(<App />);
    await screen.findAllByRole('listitem');
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Outro', category: 'Outra', content: 'Outro conteudo' });

    submitForm();

    await screen.findByRole('alert');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Ábaco')).toBeInTheDocument();
  });

  it('T8.3 · the store stays unchanged after the failure (RNF-13)', async () => {
    const store = failingStore([makeCard('Ábaco', '2026-10-10')]);
    vi.mocked(getCardStore).mockResolvedValue(store);
    render(<App />);
    await screen.findAllByRole('listitem');
    const form = await openEdit('Ábaco');
    fillForm(form, { name: 'Outro', category: 'Outra', content: 'Outro conteudo' });

    submitForm();

    await screen.findByRole('alert');
    expect(vi.mocked(store.update)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(store.list)).toHaveBeenCalledTimes(1);
  });
});

describe('remount / no leak (AC9)', () => {
  it('T9.1 · with A\'s edit open, clicking B\'s "Editar" shows B, not A', async () => {
    renderWith([
      makeCard('Alfa', '2026-10-10', 'Geral'),
      makeCard('Beta', '2026-10-11', 'Geral'),
    ]);

    const formA = await openEdit('Alfa');
    expect(within(formA).getByLabelText('Nome')).toHaveValue('Alfa');

    const betaItem = (await screen.findByText('Beta')).closest('li') as HTMLElement;
    fireEvent.click(within(betaItem).getByRole('button', { name: 'Editar' }));

    const formB = screen.getByTestId('new-card-form');
    expect(within(formB).getByLabelText('Nome')).toHaveValue('Beta');
  });

  it('T9.2 · create typed then cancelled, then editing A shows A, not the create values', async () => {
    renderWith([makeCard('Alfa', '2026-10-10', 'Geral')]);

    fireEvent.click(await screen.findByRole('button', { name: 'Novo conteúdo' }));
    const createForm = screen.getByTestId('new-card-form');
    fillForm(createForm, { name: 'Rascunho', category: 'Geral', content: 'Rascunho conteudo' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    const form = await openEdit('Alfa');
    expect(within(form).getByLabelText('Nome')).toHaveValue('Alfa');
  });
});

