import {
  type CardField,
  type CardRule,
  type CardValidation,
  type NewCard,
  CARD_LIMITS,
} from '@study/core'

export type CardFieldMessages = Partial<Record<CardField, string>>

export const EMPTY_NEW_CARD: NewCard = { name: '', category: '', content: '' }

const MESSAGES: Record<CardField, Record<CardRule, string>> = {
  name: {
    required: 'Informe o nome.',
    'too-long': `O nome pode ter no máximo ${CARD_LIMITS.name} caracteres.`,
  },
  category: {
    required: 'Informe a categoria.',
    'too-long': `A categoria pode ter no máximo ${CARD_LIMITS.category} caracteres.`,
  },
  content: {
    required: 'Informe o conteúdo.',
    'too-long': `O conteúdo pode ter no máximo ${CARD_LIMITS.content} caracteres.`,
  },
}

export function fieldMessages(validation: CardValidation): CardFieldMessages {
  const messages: CardFieldMessages = {}
  for (const { field, rule } of validation.errors) {
    messages[field] = MESSAGES[field][rule]
  }
  return messages
}
