import { describe, expect, it } from 'vitest';
import { type CardField, type CardRule, type CardValidation, validateCard } from '@study/core';
import { EMPTY_NEW_CARD, fieldMessages } from '../src/cardForm';

const rows: readonly [CardField, CardRule, string][] = [
  ['name', 'required', 'Informe o nome.'],
  ['name', 'too-long', 'O nome pode ter no máximo 40 caracteres.'],
  ['category', 'required', 'Informe a categoria.'],
  ['category', 'too-long', 'A categoria pode ter no máximo 40 caracteres.'],
  ['content', 'required', 'Informe o conteúdo.'],
  ['content', 'too-long', 'O conteúdo pode ter no máximo 5000 caracteres.'],
];

describe('fieldMessages (AC3)', () => {
  it.each(rows)('T3.7 · maps %s × %s to its pt-BR copy', (field, rule, expected) => {
    const validation: CardValidation = {
      valid: false,
      errors: [{ field, rule }],
      value: EMPTY_NEW_CARD,
    };

    expect(fieldMessages(validation)).toEqual({ [field]: expected });
  });

  it('T3.8 · accepts the exact 40/40/5000 boundaries with no messages', () => {
    const validation = validateCard({
      name: 'a'.repeat(40),
      category: 'b'.repeat(40),
      content: 'c'.repeat(5000),
    });

    expect(validation.valid).toBe(true);
    expect(fieldMessages(validation)).toEqual({});
  });
});
