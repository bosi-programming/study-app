import { describe, expect, it } from 'vitest';
import { type CalendarDay, type Card } from '@study/core';
import { isDateRangeInvalid, visibleCards } from '../src/cards';

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

describe('visibleCards · date range (AC1)', () => {
  it('T1.1 · keeps only cards with nextReviewDate >= start when only start is set', () => {
    const cards = [
      makeCard('Antes', '2026-10-09'),
      makeCard('Inicio', '2026-10-10'),
      makeCard('Depois', '2026-10-15'),
    ];

    const visible = visibleCards(cards, { start: '2026-10-10', end: '', category: '' });

    expect(visible.map((card) => card.name)).toEqual(['Inicio', 'Depois']);
  });

  it('T1.2 · keeps only cards with nextReviewDate <= end when only end is set', () => {
    const cards = [
      makeCard('Antes', '2026-10-09'),
      makeCard('Fim', '2026-10-10'),
      makeCard('Depois', '2026-10-15'),
    ];

    const visible = visibleCards(cards, { start: '', end: '2026-10-10', category: '' });

    expect(visible.map((card) => card.name)).toEqual(['Antes', 'Fim']);
  });

  it('T1.3 · keeps [start, end] inclusive at both bounds when both are set', () => {
    const cards = [
      makeCard('Antes', '2026-10-09'),
      makeCard('Inicio', '2026-10-10'),
      makeCard('Fim', '2026-10-17'),
      makeCard('Depois', '2026-10-18'),
    ];

    const visible = visibleCards(cards, { start: '2026-10-10', end: '2026-10-17', category: '' });

    expect(visible.map((card) => card.name)).toEqual(['Inicio', 'Fim']);
  });
});

describe('visibleCards · filter composition (AC2)', () => {
  it('T2.1 · combines date and category and re-sorts by date asc then pt-BR name', () => {
    const cards = [
      makeCard('Zebra', '2026-10-20', 'Matemática'),
      makeCard('Beta', '2026-10-10', 'Matemática'),
      makeCard('Ábaco', '2026-10-10', 'Matemática'),
      makeCard('Fora', '2026-10-25', 'Matemática'),
      makeCard('Outra', '2026-10-12', 'História'),
    ];

    const visible = visibleCards(cards, {
      start: '2026-10-10',
      end: '2026-10-20',
      category: 'matemática',
    });

    expect(visible.map((card) => card.name)).toEqual(['Ábaco', 'Beta', 'Zebra']);
  });
});

describe('visibleCards · invalid range (AC5)', () => {
  it('T5.0 · returns every card (date ignored) when start > end', () => {
    const cards = [
      makeCard('Um', '2026-10-05'),
      makeCard('Dois', '2026-10-20'),
    ];

    const visible = visibleCards(cards, { start: '2026-10-20', end: '2026-10-05', category: '' });

    expect(visible.map((card) => card.name)).toEqual(['Um', 'Dois']);
  });
});

describe('isDateRangeInvalid (AC5)', () => {
  it('T5.1 · flags as invalid only a filled and inverted range', () => {
    expect(isDateRangeInvalid({ start: '', end: '', category: '' })).toBe(false);
    expect(isDateRangeInvalid({ start: '2026-10-10', end: '', category: '' })).toBe(false);
    expect(isDateRangeInvalid({ start: '', end: '2026-10-10', category: '' })).toBe(false);
    expect(isDateRangeInvalid({ start: '2026-10-10', end: '2026-10-10', category: '' })).toBe(false);
    expect(isDateRangeInvalid({ start: '2026-10-09', end: '2026-10-10', category: '' })).toBe(false);
    expect(isDateRangeInvalid({ start: '2026-10-10', end: '2026-10-09', category: '' })).toBe(true);
  });
});
