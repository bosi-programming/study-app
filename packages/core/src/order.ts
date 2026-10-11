import type { Card } from './card.ts';

export function sortCards(cards: readonly Card[]): readonly Card[] {
  return [...cards].sort(compareCards);
}

function compareCards(a: Card, b: Card): number {
  if (a.nextReviewDate < b.nextReviewDate) {
    return -1;
  }
  if (a.nextReviewDate > b.nextReviewDate) {
    return 1;
  }
  return a.name.localeCompare(b.name, 'pt-BR');
}
