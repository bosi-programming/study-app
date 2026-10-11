import { describe, expect, it } from 'vitest';
import { type CalendarDay, type Card } from '@study/core';
import { visibleCards } from '../src/cards';

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

describe('visibleCards (AC2)', () => {
  it('AC2 · re-sorts the visible set after a filter changes it', () => {
    const cards = [
      makeCard('Zebra', '2026-10-20', 'Matemática'),
      makeCard('Beta', '2026-10-15', 'História'),
      makeCard('Ábaco', '2026-10-10', 'Matemática'),
    ];

    const visible = visibleCards(cards, {
      start: '',
      end: '',
      category: 'matemática',
    });

    expect(visible.map((card) => card.name)).toEqual(['Ábaco', 'Zebra']);
  });
});

describe('filter composition (AC4)', () => {
  it('AC4 · date range filters cards inclusively at both bounds', () => {
    const cards = [
      makeCard('Antes', '2026-10-09'),
      makeCard('Inicio', '2026-10-10'),
      makeCard('Fim', '2026-10-17'),
      makeCard('Depois', '2026-10-18'),
    ];

    const visible = visibleCards(cards, {
      start: '2026-10-10',
      end: '2026-10-17',
      category: '',
    });

    expect(visible.map((card) => card.name)).toEqual(['Inicio', 'Fim']);
  });

  it('AC4 · category filter combines with the date range', () => {
    const cards = [
      makeCard('Alvo', '2026-10-12', 'Matemática'),
      makeCard('Outra', '2026-10-12', 'História'),
      makeCard('Fora', '2026-10-25', 'Matemática'),
    ];

    const visible = visibleCards(cards, {
      start: '2026-10-10',
      end: '2026-10-20',
      category: 'matemática',
    });

    expect(visible.map((card) => card.name)).toEqual(['Alvo']);
  });
});
