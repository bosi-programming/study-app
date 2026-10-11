import { type Page, expect, test } from '@playwright/test'

type SeedCard = {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly content: string
  readonly lastReviewDate: string | null
  readonly reviewCount: number
  readonly nextReviewDate: string
  readonly createdDate: string
}

const day = (offset: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

const seedCards: readonly SeedCard[] = [
  {
    id: 'seed-1',
    name: 'Verbos irregulares',
    category: 'Inglês',
    content: 'go/went/gone, take/took/taken, see/saw/seen.',
    lastReviewDate: null,
    reviewCount: 0,
    nextReviewDate: day(-2),
    createdDate: day(-9),
  },
  {
    id: 'seed-2',
    name: 'Teorema de Bayes',
    category: 'Estatística',
    content: 'P(A|B) = P(B|A) P(A) / P(B).',
    lastReviewDate: day(-1),
    reviewCount: 2,
    nextReviewDate: day(0),
    createdDate: day(-30),
  },
  {
    id: 'seed-3',
    name: 'Ciclo de Krebs',
    category: 'Biologia',
    content: 'Acetil-CoA entra no ciclo e gera NADH, FADH2 e GTP.',
    lastReviewDate: null,
    reviewCount: 1,
    nextReviewDate: day(6),
    createdDate: day(-7),
  },
]

const seed = async (page: Page): Promise<void> => {
  await page.goto('/')
  await page.evaluate(async (cards: readonly SeedCard[]) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('study', 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('cartoes')) {
          db.createObjectStore('cartoes', { keyPath: 'id' })
        }
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('cartoes', 'readwrite')
        for (const card of cards) {
          tx.objectStore('cartoes').put(card)
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
    })
  }, seedCards)
  await page.reload()
}

test('captures the card list', async ({ page }) => {
  await seed(page)
  await expect(page.getByTestId('card-list')).toBeVisible()
  await expect(page.getByText('Verbos irregulares')).toBeVisible()
  await page.screenshot({
    path: 'screenshots/list.png',
    fullPage: true,
  })
})

test('captures an expanded card', async ({ page }) => {
  await seed(page)
  const item = page.locator('li', { hasText: 'Verbos irregulares' })
  await item.getByRole('button', { name: 'Expandir' }).click()
  await expect(item.getByText('go/went/gone')).toBeVisible()
  await page.screenshot({
    path: 'screenshots/list-expanded.png',
    fullPage: true,
  })
})

test('captures the new card form', async ({ page }) => {
  await seed(page)
  await page.getByRole('button', { name: 'Novo conteúdo' }).click()
  await expect(page.getByLabel('Conteúdo')).toBeVisible()
  await page.screenshot({
    path: 'screenshots/new-card-form.png',
    fullPage: true,
  })
})
