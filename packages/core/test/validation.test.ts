import { describe, expect, it } from 'vitest';
import type { NewCard } from '../src/card.ts';
import { validateCard } from '../src/validation.ts';

const validInput = (): NewCard => ({
  name: 'Name',
  category: 'Category',
  content: 'Content',
});

describe('required fields (AC1)', () => {
  it('marks empty name as required', () => {
    const result = validateCard({ ...validInput(), name: '' });

    expect(result.errors).toContainEqual({ field: 'name', rule: 'required' });
  });

  it('marks whitespace-only name as required', () => {
    const result = validateCard({ ...validInput(), name: '   ' });

    expect(result.errors).toContainEqual({ field: 'name', rule: 'required' });
  });

  it('marks empty category as required', () => {
    const result = validateCard({ ...validInput(), category: '' });

    expect(result.errors).toContainEqual({ field: 'category', rule: 'required' });
  });

  it('marks whitespace-only category as required', () => {
    const result = validateCard({ ...validInput(), category: '   ' });

    expect(result.errors).toContainEqual({ field: 'category', rule: 'required' });
  });

  it('marks empty content as required', () => {
    const result = validateCard({ ...validInput(), content: '' });

    expect(result.errors).toContainEqual({ field: 'content', rule: 'required' });
  });

  it('marks whitespace-only content as required', () => {
    const result = validateCard({ ...validInput(), content: '   ' });

    expect(result.errors).toContainEqual({ field: 'content', rule: 'required' });
  });
});

describe('length limits (AC2)', () => {
  it('accepts name at the 40-char limit', () => {
    const result = validateCard({ ...validInput(), name: 'a'.repeat(40) });

    expect(result.errors.some((error) => error.field === 'name')).toBe(false);
    expect(result.valid).toBe(true);
  });

  it('rejects name over the 40-char limit', () => {
    const result = validateCard({ ...validInput(), name: 'a'.repeat(41) });

    expect(result.errors).toContainEqual({ field: 'name', rule: 'too-long' });
  });

  it('accepts category at the 40-char limit', () => {
    const result = validateCard({ ...validInput(), category: 'a'.repeat(40) });

    expect(result.errors.some((error) => error.field === 'category')).toBe(false);
    expect(result.valid).toBe(true);
  });

  it('rejects category over the 40-char limit', () => {
    const result = validateCard({ ...validInput(), category: 'a'.repeat(41) });

    expect(result.errors).toContainEqual({ field: 'category', rule: 'too-long' });
  });

  it('accepts content at the 5000-char limit', () => {
    const result = validateCard({ ...validInput(), content: 'a'.repeat(5000) });

    expect(result.errors.some((error) => error.field === 'content')).toBe(false);
    expect(result.valid).toBe(true);
  });

  it('rejects content over the 5000-char limit', () => {
    const result = validateCard({ ...validInput(), content: 'a'.repeat(5001) });

    expect(result.errors).toContainEqual({ field: 'content', rule: 'too-long' });
  });

  it('counts length after trim', () => {
    const over = validateCard({
      ...validInput(),
      name: `  ${'a'.repeat(41)}  `,
    });
    const at = validateCard({
      ...validInput(),
      name: `  ${'a'.repeat(40)}  `,
    });

    expect(over.errors).toContainEqual({ field: 'name', rule: 'too-long' });
    expect(at.errors.some((error) => error.field === 'name')).toBe(false);
  });
});

describe('normalization (AC3)', () => {
  it('returns trimmed fields in value', () => {
    const result = validateCard({
      name: '  Name  ',
      category: ' Cat ',
      content: '  Content  ',
    });

    expect(result.value).toEqual({
      name: 'Name',
      category: 'Cat',
      content: 'Content',
    });
  });

  it('preserves case', () => {
    const result = validateCard({ ...validInput(), category: '  Inglês  ' });

    expect(result.value.category).toBe('Inglês');
  });

  it('does not mutate the input', () => {
    const input: NewCard = {
      name: '  Name  ',
      category: ' Cat ',
      content: ' Content ',
    };
    const before: NewCard = { ...input };

    validateCard(input);

    expect(input).toEqual(before);
  });
});

describe('error list (AC4)', () => {
  it('returns all failing fields in one list', () => {
    const result = validateCard({
      name: '',
      category: 'a'.repeat(41),
      content: '   ',
    });

    expect(result.errors).toHaveLength(3);
    expect(result.errors).toContainEqual({ field: 'name', rule: 'required' });
    expect(result.errors).toContainEqual({ field: 'category', rule: 'too-long' });
    expect(result.errors).toContainEqual({ field: 'content', rule: 'required' });
  });

  it('sets valid true when there are no errors', () => {
    const result = validateCard(validInput());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('sets valid false when there are errors', () => {
    const result = validateCard({ ...validInput(), name: '' });

    expect(result.valid).toBe(false);
  });

  it('returns the trimmed value even when invalid', () => {
    const result = validateCard({
      name: '   ',
      category: ' Cat ',
      content: ' Content ',
    });

    expect(result.value).toEqual({
      name: '',
      category: 'Cat',
      content: 'Content',
    });
  });
});
