import type { Card } from './card.ts';

export function categoryKey(category: string): string {
  return category.trim().toLowerCase();
}

export function distinctCategories(cards: readonly Card[]): readonly string[] {
  const firstSeen = new Map<string, string>();
  for (const card of cards) {
    const key = categoryKey(card.category);
    if (!firstSeen.has(key)) {
      firstSeen.set(key, card.category);
    }
  }
  return [...firstSeen.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
