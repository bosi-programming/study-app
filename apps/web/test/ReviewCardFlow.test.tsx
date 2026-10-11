import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type CalendarDay, type Card, addDays, todayLocal } from '@study/core';
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
    update: vi.fn().mockRejectedValue(new PersistenceError('boom')),
    remove: vi.fn().mockResolvedValue(undefined),
  } as unknown as CardStore);

const pendingStore = (cards: readonly Card[]): CardStore =>
  ({
    list: vi.fn().mockResolvedValue([...cards]),
    create: vi.fn().mockImplementation((card: Card) => Promise.resolve(card)),
    update: vi.fn().mockReturnValue(new Promise<Card>(() => {})),
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

const reviewButton = (item: HTMLElement): HTMLElement =>
  within(item).getByRole('button', { name: 'Marcar como revisado' });

beforeEach(() => {
  vi.mocked(getCardStore).mockReset();
  vi.mocked(getCardStore).mockResolvedValue(makeStore([]));
});

afterEach(cleanup);

describe('review button position (AC1)', () => {
  it('T1.1 · o botão "Marcar como revisado" precede o botão "Editar" na linha de ações', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);
    const item = await findItem('Ábaco');
    const labels = within(item)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));

    expect(reviewButton(item)).toBeInTheDocument();
    expect(labels.indexOf('Marcar como revisado')).toBeLessThan(labels.indexOf('Editar'));
  });
});

describe('updates & persists (AC2)', () => {
  it('T2.1 · clicar em revisar chama store.update 1x com lastReviewDate = hoje, reviewCount + 1 & nextReviewDate recalculada', async () => {
    const today = todayLocal();
    const card = makeCard('Ábaco', addDays(today, 1));
    const store = renderWith([card]);

    fireEvent.click(reviewButton(await findItem('Ábaco')));

    await waitFor(() => expect(vi.mocked(store.update)).toHaveBeenCalledTimes(1));
    expect(store.update).toHaveBeenCalledWith({
      ...card,
      lastReviewDate: today,
      reviewCount: 1,
      nextReviewDate: addDays(today, 14),
    });
  });

  it('T2.2 · cartão com reviewCount = 6 gera nextReviewDate no teto de 365 dias (RB-01)', async () => {
    const today = todayLocal();
    const card = { ...makeCard('Ábaco', addDays(today, 1)), reviewCount: 6 };
    const store = renderWith([card]);

    fireEvent.click(reviewButton(await findItem('Ábaco')));

    await waitFor(() => expect(vi.mocked(store.update)).toHaveBeenCalledTimes(1));
    expect(store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        lastReviewDate: today,
        reviewCount: 7,
        nextReviewDate: addDays(today, 365),
      }),
    );
  });

  it('T2.3 · a revisão grava o dia local: lastReviewDate === todayLocal() (RB-07)', async () => {
    const store = renderWith([makeCard('Ábaco', addDays(todayLocal(), 1))]);

    fireEvent.click(reviewButton(await findItem('Ábaco')));

    await waitFor(() => expect(vi.mocked(store.update)).toHaveBeenCalledTimes(1));
    expect(store.update).toHaveBeenCalledWith(
      expect.objectContaining({ lastReviewDate: todayLocal() }),
    );
  });

  it('T2.4 · a lista mostra o cartão atualizado após o sucesso', async () => {
    const today = todayLocal();
    renderWith([makeCard('Ábaco', addDays(today, 1))]);

    fireEvent.click(reviewButton(await findItem('Ábaco')));

    await waitFor(() =>
      expect(screen.getByRole('listitem')).toHaveTextContent(
        formatCalendarDay(addDays(today, 14)),
      ),
    );
  });
});

describe('reordering (AC3)', () => {
  it('T3.1 · após revisar, a lista é reordenada conforme RB-03', async () => {
    const today = todayLocal();
    renderWith([
      makeCard('Alvo', addDays(today, 1)),
      makeCard('Zebra', addDays(today, 5)),
    ]);

    fireEvent.click(reviewButton(await findItem('Alvo')));

    await waitFor(() => {
      const items = screen.getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('Zebra');
      expect(items[1]).toHaveTextContent('Alvo');
    });
  });

  it('T3.2 · a revisão não faz leitura extra: store.list chamado 1x', async () => {
    const store = renderWith([makeCard('Ábaco', addDays(todayLocal(), 1))]);

    fireEvent.click(reviewButton(await findItem('Ábaco')));

    await waitFor(() => expect(vi.mocked(store.update)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(store.list)).toHaveBeenCalledTimes(1);
  });
});

describe('write failure (AC4)', () => {
  it('T4.1 · store.update rejeitado mantém cartão & ordem, exibe role="alert" com "Não foi possível marcar como revisado. Tente novamente."', async () => {
    const today = todayLocal();
    vi.mocked(getCardStore).mockResolvedValue(
      failingStore([
        makeCard('Alvo', addDays(today, 1)),
        makeCard('Zebra', addDays(today, 5)),
      ]),
    );
    render(<App />);
    await screen.findAllByRole('listitem');
    const before = screen.getAllByRole('listitem').map((item) => item.textContent);

    fireEvent.click(reviewButton(await findItem('Alvo')));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível marcar como revisado. Tente novamente.',
    );
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(before);
  });

  it('T4.2 · após a falha o botão volta a habilitado & um retry bem-sucedido aplica a revisão', async () => {
    const today = todayLocal();
    const store = renderWith([makeCard('Ábaco', addDays(today, 1))]);
    vi.mocked(store.update).mockRejectedValueOnce(new PersistenceError('boom'));

    fireEvent.click(reviewButton(await findItem('Ábaco')));
    await screen.findByRole('alert');
    fireEvent.click(reviewButton(await findItem('Ábaco')));

    await waitFor(() => expect(vi.mocked(store.update)).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('listitem')).toHaveTextContent(
      formatCalendarDay(addDays(today, 14)),
    );
  });
});

describe('accessible name (AC5)', () => {
  it('T5.1 · o botão de revisão tem nome acessível "Marcar como revisado"', async () => {
    renderWith([makeCard('Ábaco', '2026-10-10')]);

    const item = await findItem('Ábaco');

    expect(reviewButton(item)).toBeInTheDocument();
  });
});

describe('double invocation (AC6)', () => {
  it('T6.1 · com store.update pendente o botão fica desabilitado & o segundo clique não chama store.update de novo', async () => {
    const store = pendingStore([makeCard('Ábaco', addDays(todayLocal(), 1))]);
    vi.mocked(getCardStore).mockResolvedValue(store);
    render(<App />);
    await screen.findAllByRole('listitem');
    const button = reviewButton(await findItem('Ábaco'));

    fireEvent.click(button);
    await waitFor(() => expect(vi.mocked(store.update)).toHaveBeenCalledTimes(1));
    expect(reviewButton(await findItem('Ábaco'))).toBeDisabled();

    fireEvent.click(reviewButton(await findItem('Ábaco')));
    await act(async () => {});

    expect(vi.mocked(store.update)).toHaveBeenCalledTimes(1);
  });
});

describe('active filter (AC7)', () => {
  it('T7.1 · filtro de data ativo: o cartão revisado sai da lista visível', async () => {
    const today = todayLocal();
    renderWith([makeCard('Alvo', addDays(today, 1))]);
    await screen.findAllByRole('listitem');
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: addDays(today, 1) } });
    await screen.findByText('Alvo');

    fireEvent.click(reviewButton(await findItem('Alvo')));

    expect(await screen.findByText('Nenhum cartão para esses filtros.')).toBeInTheDocument();
    expect(screen.queryByText('Alvo')).toBeNull();
  });
});
