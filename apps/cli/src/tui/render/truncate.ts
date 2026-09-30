const ELLIPSIS = '…'

export function truncate(text: string, limit: number): string {
  if (limit <= 0) return ''
  const points = [...text]
  if (points.length <= limit) return text
  return `${points.slice(0, limit - 1).join('')}${ELLIPSIS}`
}
