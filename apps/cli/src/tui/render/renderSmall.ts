import { truncate } from './truncate.ts'

const SMALL_FIRST = 'Aumente a janela para pelo menos'
const SMALL_SECOND = '60 colunas e 15 linhas.'

export function renderSmall(columns: number): string {
  return [truncate(SMALL_FIRST, columns), truncate(SMALL_SECOND, columns)].join('\n')
}
