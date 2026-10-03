const ELLIPSIS = '…'
const WINDOW_MARKERS = 2

export type TextField = {
  readonly value: string
  readonly cursor: number
}

export type FieldMove = 'left' | 'right' | 'home' | 'end'

export type FieldWindow = {
  readonly text: string
  readonly cursorColumn: number
}

export function startField(value = ''): TextField {
  return { value, cursor: [...value].length }
}

export function insertText(field: TextField, text: string): TextField {
  const points = [...field.value]
  const cursor = clamp(field.cursor, 0, points.length)
  const inserted = [...text]
  return {
    value: [...points.slice(0, cursor), ...inserted, ...points.slice(cursor)].join(''),
    cursor: cursor + inserted.length,
  }
}

export function backspaceField(field: TextField): TextField {
  const points = [...field.value]
  const cursor = clamp(field.cursor, 0, points.length)
  if (cursor === 0) return field
  return {
    value: [...points.slice(0, cursor - 1), ...points.slice(cursor)].join(''),
    cursor: cursor - 1,
  }
}

export function deleteForward(field: TextField): TextField {
  const points = [...field.value]
  const cursor = clamp(field.cursor, 0, points.length)
  if (cursor >= points.length) return field
  return {
    value: [...points.slice(0, cursor), ...points.slice(cursor + 1)].join(''),
    cursor,
  }
}

export function moveFieldCursor(field: TextField, move: FieldMove): TextField {
  const points = [...field.value]
  const cursor = clamp(field.cursor, 0, points.length)
  if (move === 'home') return { ...field, cursor: 0 }
  if (move === 'end') return { ...field, cursor: points.length }
  if (move === 'left') return { ...field, cursor: Math.max(0, cursor - 1) }
  return { ...field, cursor: Math.min(points.length, cursor + 1) }
}

export function fieldWindow(field: TextField, width: number): FieldWindow {
  const points = [...field.value]
  if (width <= 0) return { text: '', cursorColumn: 0 }
  if (points.length <= width) return { text: field.value, cursorColumn: clamp(field.cursor, 0, points.length) }

  const contentWidth = Math.max(1, width - WINDOW_MARKERS)
  const cursor = clamp(field.cursor, 0, points.length)
  const start = Math.max(0, Math.min(cursor - (contentWidth - 1), points.length - contentWidth))
  const end = start + contentWidth
  const lead = start > 0
  const trail = end < points.length
  const text = `${lead ? ELLIPSIS : ''}${points.slice(start, end).join('')}${trail ? ELLIPSIS : ''}`

  return { text, cursorColumn: Math.min(cursor - start + (lead ? 1 : 0), [...text].length) }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
