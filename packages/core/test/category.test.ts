import { describe, expect, it } from 'vitest';
import { type Card, createCard } from '../src/card.ts';
import { categoryKey, distinctCategories } from '../src/category.ts';
import { type CalendarDay } from '../src/data.ts';

const day = (value: string): CalendarDay => value as CalendarDay;

const TODAY = day('2026-03-10');

const card = (category: string): Card =>
  createCard({ name: 'Name', category, content: 'Content' }, TODAY);

const cards = (...categories: string[]): Card[] => categories.map(card);

describe('categoryKey (AC1)', () => {
  it('trims surrounding whitespace', () => {
    expect(categoryKey('  Inglês  ')).toBe(categoryKey('Inglês'));
  });

  it('lowercases ASCII letters', () => {
    expect(categoryKey('Category')).toBe('category');
  });

  it('lowercases accented letters', () => {
    expect(categoryKey('INGLÊS')).toBe('inglês');
  });

  it('equates case & padded variants', () => {
    const key = categoryKey('Inglês');

    expect(categoryKey('inglês')).toBe(key);
    expect(categoryKey('INGLÊS')).toBe(key);
    expect(categoryKey('  Inglês  ')).toBe(key);
  });
});

describe('distinctCategories spelling (AC2)', () => {
  it('emits the original spelling', () => {
    expect(distinctCategories(cards('Inglês'))).toEqual(['Inglês']);
  });

  it('keeps the first spelling among case variants', () => {
    expect(distinctCategories(cards('Inglês', 'inglês', 'INGLÊS'))).toEqual([
      'Inglês',
    ]);
  });

  it('does not change card.category', () => {
    const input = cards('Inglês', 'inglês');
    const before = input.map((entry) => entry.category);

    distinctCategories(input);

    expect(input.map((entry) => entry.category)).toEqual(before);
    expect(input[0]?.category).toBe('Inglês');
  });
});

describe('distinctCategories (AC3)', () => {
  it('returns [] for no cards', () => {
    expect(distinctCategories([])).toEqual([]);
  });

  it('returns the single category for one card', () => {
    expect(distinctCategories(cards('Inglês'))).toHaveLength(1);
  });

  it('collapses case duplicates', () => {
    expect(distinctCategories(cards('Inglês', 'inglês', 'INGLÊS'))).toHaveLength(
      1,
    );
  });

  it('collapses whitespace duplicates', () => {
    expect(distinctCategories(cards('  Inglês  ', 'Inglês'))).toHaveLength(1);
  });

  it('keeps distinct categories separate', () => {
    expect(distinctCategories(cards('Inglês', 'Matemática'))).toHaveLength(2);
  });

  it('sorts ascending in pt-BR', () => {
    expect(distinctCategories(cards('Zebra', 'Água'))).toEqual([
      'Água',
      'Zebra',
    ]);
  });

  it('places accented categories in pt-BR order', () => {
    expect(distinctCategories(cards('Zebra', 'Água', 'Inglês'))).toEqual([
      'Água',
      'Inglês',
      'Zebra',
    ]);
  });

  it('is deterministic for the same cards', () => {
    const input = cards('Zebra', 'Água', 'Inglês');

    expect(distinctCategories(input)).toEqual(distinctCategories(input));
  });

  it('does not mutate the input array', () => {
    const input = cards('Inglês', 'inglês', 'Matemática');
    const before = input.map((entry) => entry.category);

    distinctCategories(input);

    expect(input).toHaveLength(3);
    expect(input.map((entry) => entry.category)).toEqual(before);
  });

  it('returns a new array', () => {
    const input = cards('Inglês');

    expect(distinctCategories(input)).not.toBe(input);
  });
});
