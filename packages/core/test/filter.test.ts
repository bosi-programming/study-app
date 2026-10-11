import { describe, expect, it } from 'vitest';
import { type Card } from '../src/card.ts';
import { type CalendarDay } from '../src/data.ts';
import { filterByCategory, filterByDateRange } from '../src/filter.ts';

const day = (value: string): CalendarDay => value as CalendarDay;

const card = (
  name: string,
  nextReviewDate: CalendarDay,
  category = 'Category',
): Card => ({
  id: `${name}-${nextReviewDate}`,
  name,
  category,
  content: 'Content',
  lastReviewDate: null,
  reviewCount: 0,
  nextReviewDate,
  createdDate: day('2026-03-10'),
});

const names = (cards: readonly Card[]): string[] => cards.map((entry) => entry.name);

describe('filterByDateRange inclusive [start, end] (AC1)', () => {
  it('keeps a card inside the range', () => {
    const input = [card('Inside', day('2026-10-15'))];

    const result = filterByDateRange(input, {
      start: day('2026-10-10'),
      end: day('2026-10-20'),
    });

    expect(names(result)).toEqual(['Inside']);
  });

  it('excludes a card before start', () => {
    const input = [card('Before', day('2026-10-05')), card('Inside', day('2026-10-15'))];

    const result = filterByDateRange(input, {
      start: day('2026-10-10'),
      end: day('2026-10-20'),
    });

    expect(names(result)).toEqual(['Inside']);
  });

  it('excludes a card after end', () => {
    const input = [card('Inside', day('2026-10-15')), card('After', day('2026-10-25'))];

    const result = filterByDateRange(input, {
      start: day('2026-10-10'),
      end: day('2026-10-20'),
    });

    expect(names(result)).toEqual(['Inside']);
  });

  it('includes a card exactly on start', () => {
    const input = [card('OnStart', day('2026-10-10'))];

    const result = filterByDateRange(input, {
      start: day('2026-10-10'),
      end: day('2026-10-20'),
    });

    expect(names(result)).toEqual(['OnStart']);
  });

  it('includes a card exactly on end', () => {
    const input = [card('OnEnd', day('2026-10-20'))];

    const result = filterByDateRange(input, {
      start: day('2026-10-10'),
      end: day('2026-10-20'),
    });

    expect(names(result)).toEqual(['OnEnd']);
  });
});

describe('filterByDateRange open bounds (AC2)', () => {
  it('only start keeps cards on/after start', () => {
    const input = [
      card('Before', day('2026-10-05')),
      card('On', day('2026-10-10')),
      card('After', day('2026-10-20')),
    ];

    const result = filterByDateRange(input, { start: day('2026-10-10') });

    expect(names(result)).toEqual(['On', 'After']);
  });

  it('only start excludes cards before start', () => {
    const input = [card('Before', day('2026-10-05')), card('On', day('2026-10-10'))];

    const result = filterByDateRange(input, { start: day('2026-10-10') });

    expect(names(result)).not.toContain('Before');
  });

  it('only end keeps cards on/before end', () => {
    const input = [
      card('Before', day('2026-10-05')),
      card('On', day('2026-10-20')),
      card('After', day('2026-10-25')),
    ];

    const result = filterByDateRange(input, { end: day('2026-10-20') });

    expect(names(result)).toEqual(['Before', 'On']);
  });

  it('only end excludes cards after end', () => {
    const input = [card('On', day('2026-10-20')), card('After', day('2026-10-25'))];

    const result = filterByDateRange(input, { end: day('2026-10-20') });

    expect(names(result)).not.toContain('After');
  });

  it('neither bound returns all cards in a new array', () => {
    const input = [card('A', day('2026-10-05')), card('B', day('2026-10-25'))];

    const result = filterByDateRange(input, {});

    expect(names(result)).toEqual(['A', 'B']);
    expect(result).not.toBe(input);
  });
});

describe('filterByCategory case-insensitive (AC3)', () => {
  it('matches an exact category', () => {
    const input = [card('A', day('2026-10-10'), 'Inglês')];

    expect(names(filterByCategory(input, 'Inglês'))).toEqual(['A']);
  });

  it('matches a different case', () => {
    const input = [card('A', day('2026-10-10'), 'Inglês')];

    expect(names(filterByCategory(input, 'INGLÊS'))).toEqual(['A']);
  });

  it('matches a padded/trimmed variant', () => {
    const input = [card('A', day('2026-10-10'), 'Inglês')];

    expect(names(filterByCategory(input, '  inglês  '))).toEqual(['A']);
  });

  it('matches a card whose category is padded', () => {
    const input = [card('A', day('2026-10-10'), '  Inglês  ')];

    expect(names(filterByCategory(input, 'inglês'))).toEqual(['A']);
  });

  it('excludes a non-matching category', () => {
    const input = [
      card('Match', day('2026-10-10'), 'Inglês'),
      card('Other', day('2026-10-10'), 'Matemática'),
    ];

    expect(names(filterByCategory(input, 'Inglês'))).toEqual(['Match']);
  });

  it('empty string arg returns []', () => {
    const input = [card('A', day('2026-10-10'), 'Inglês')];

    expect(filterByCategory(input, '')).toEqual([]);
  });

  it('whitespace-only arg returns []', () => {
    const input = [card('A', day('2026-10-10'), 'Inglês')];

    expect(filterByCategory(input, '   ')).toEqual([]);
  });
});

describe('combination conjunction (AC4)', () => {
  const range = { start: day('2026-10-10'), end: day('2026-10-20') };

  const input = [
    card('Both', day('2026-10-15'), 'Inglês'),
    card('DateOnly', day('2026-10-15'), 'Matemática'),
    card('CatOnly', day('2026-11-01'), 'Inglês'),
    card('Neither', day('2026-11-01'), 'Matemática'),
  ];

  it('chained call keeps a card satisfying both filters', () => {
    const result = filterByCategory(filterByDateRange(input, range), 'Inglês');

    expect(names(result)).toContain('Both');
  });

  it('chained call drops a card satisfying only one filter', () => {
    const result = filterByCategory(filterByDateRange(input, range), 'Inglês');

    expect(names(result)).toEqual(['Both']);
  });

  it('chained result equals manual intersection', () => {
    const result = filterByCategory(filterByDateRange(input, range), 'Inglês');

    const manual = input.filter(
      (entry) =>
        entry.nextReviewDate >= range.start &&
        entry.nextReviewDate <= range.end &&
        entry.category.trim().toLowerCase() === 'inglês',
    );

    expect(names(result)).toEqual(names(manual));
  });
});

describe('purity & order (AC5)', () => {
  it('returns a new array (not the input reference)', () => {
    const input = [card('Keep', day('2026-10-15')), card('Drop', day('2026-11-01'))];

    const result = filterByDateRange(input, { end: day('2026-10-20') });

    expect(result).not.toBe(input);
  });

  it('does not mutate the input array', () => {
    const input = [
      card('A', day('2026-10-15'), 'Inglês'),
      card('B', day('2026-11-01'), 'Matemática'),
    ];
    const before = input.map((entry) => [entry.name, entry.nextReviewDate, entry.category]);

    filterByDateRange(input, { start: day('2026-10-10') });
    filterByCategory(input, 'Inglês');

    expect(input.map((entry) => [entry.name, entry.nextReviewDate, entry.category])).toEqual(
      before,
    );
    expect(input).toHaveLength(2);
  });

  it('preserves input order', () => {
    const input = [
      card('B', day('2026-10-20')),
      card('A', day('2026-10-10')),
      card('C', day('2026-10-30')),
    ];

    const result = filterByDateRange(input, { start: day('2026-10-05') });

    expect(names(result)).toEqual(['B', 'A', 'C']);
  });
});

describe('invalid range & single day (AC6)', () => {
  it('start > end returns []', () => {
    const input = [card('A', day('2026-10-15'))];

    const result = filterByDateRange(input, {
      start: day('2026-10-20'),
      end: day('2026-10-10'),
    });

    expect(result).toEqual([]);
  });

  it('start == end keeps cards exactly on that day', () => {
    const input = [card('On', day('2026-10-15')), card('Off', day('2026-10-16'))];

    const result = filterByDateRange(input, {
      start: day('2026-10-15'),
      end: day('2026-10-15'),
    });

    expect(names(result)).toEqual(['On']);
  });
});

describe('empty list (AC7)', () => {
  it('filterByDateRange([]) returns []', () => {
    expect(filterByDateRange([], { start: day('2026-10-10') })).toEqual([]);
  });

  it('filterByCategory([]) returns []', () => {
    expect(filterByCategory([], 'Inglês')).toEqual([]);
  });
});
