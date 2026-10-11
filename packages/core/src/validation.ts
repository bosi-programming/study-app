import type { NewCard } from './card.ts';

export type CardField = 'name' | 'category' | 'content';

export type CardRule = 'required' | 'too-long';

export interface CardFieldError {
  readonly field: CardField;
  readonly rule: CardRule;
}

export interface CardValidation {
  readonly valid: boolean;
  readonly errors: readonly CardFieldError[];
  readonly value: NewCard;
}

export const CARD_LIMITS = {
  name: 40,
  category: 40,
  content: 5000,
} as const;

const FIELDS: readonly CardField[] = ['name', 'category', 'content'];

function errorsFor(field: CardField, value: string): CardFieldError[] {
  if (value.length === 0) {
    return [{ field, rule: 'required' }];
  }
  if (value.length > CARD_LIMITS[field]) {
    return [{ field, rule: 'too-long' }];
  }
  return [];
}

export function validateCard(input: NewCard): CardValidation {
  const value: NewCard = {
    name: input.name.trim(),
    category: input.category.trim(),
    content: input.content.trim(),
  };
  const errors = FIELDS.flatMap((field) => errorsFor(field, value[field]));
  return { valid: errors.length === 0, errors, value };
}
