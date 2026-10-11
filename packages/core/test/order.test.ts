import { describe, expect, it } from 'vitest';
import { type Card } from '../src/card.ts';
import { type CalendarDay } from '../src/data.ts';
import { sortCards } from '../src/order.ts';

const day = (value: string): CalendarDay => value as CalendarDay;

const card = (name: string, nextReviewDate: CalendarDay): Card => ({
  id: `${name}-${nextReviewDate}`,
  name,
  category: 'Category',
  content: 'Content',
  lastReviewDate: null,
  reviewCount: 0,
  nextReviewDate,
  createdDate: day('2026-03-10'),
});

const names = (cards: readonly Card[]): string[] => cards.map((entry) => entry.name);

describe('sortCards ascending by nextReviewDate (AC1)', () => {
  it('sorts cards ascending by nextReviewDate', () => {
    const input = [card('B', day('2026-10-12')), card('A', day('2026-10-10'))];

    expect(names(sortCards(input))).toEqual(['A', 'B']);
  });

  it('keeps already-sorted input', () => {
    const input = [card('A', day('2026-10-10')), card('B', day('2026-10-12'))];

    expect(names(sortCards(input))).toEqual(['A', 'B']);
  });
});

describe('sortCards name tie-break pt-BR (AC2)', () => {
  it('breaks a date tie by name ascending', () => {
    const input = [card('Zebra', day('2026-10-10')), card('Ábaco', day('2026-10-10'))];

    expect(names(sortCards(input))).toEqual(['Ábaco', 'Zebra']);
  });

  it('orders accented names in pt-BR', () => {
    const input = [
      card('Zebra', day('2026-10-10')),
      card('Água', day('2026-10-10')),
      card('Inglês', day('2026-10-10')),
    ];

    expect(names(sortCards(input))).toEqual(['Água', 'Inglês', 'Zebra']);
  });
});

describe('sortCards immutability (AC3)', () => {
  it('returns a new array', () => {
    const input = [card('A', day('2026-10-10'))];

    expect(sortCards(input)).not.toBe(input);
  });

  it('does not mutate the input order', () => {
    const input = [card('B', day('2026-10-12')), card('A', day('2026-10-10'))];
    const before = names(input);

    sortCards(input);

    expect(names(input)).toEqual(before);
  });
});

describe('sortCards edges (AC5)', () => {
  it('returns [] for an empty list', () => {
    expect(sortCards([])).toEqual([]);
  });

  it('returns the single card for a one-card list', () => {
    const only = card('A', day('2026-10-10'));

    expect(sortCards([only])).toEqual([only]);
  });

  it('preserves stable input order for equal date & equal name', () => {
    const first = card('Same', day('2026-10-10'));
    const second = card('Same', day('2026-10-10'));
    const input = [first, second];

    const result = sortCards(input);

    expect(result[0]).toBe(first);
    expect(result[1]).toBe(second);
  });
});
