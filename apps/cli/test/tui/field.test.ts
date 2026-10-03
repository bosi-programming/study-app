import { describe, expect, it } from 'vitest'
import {
  backspaceField,
  deleteForward,
  fieldWindow,
  insertText,
  moveFieldCursor,
  startField,
} from '../../src/tui/render/field.ts'

describe('AC1 — o campo de texto puro (U-14)', () => {
  it('campo-insere: insere no cursor e avanca', () => {
    expect(insertText({ value: 'ac', cursor: 1 }, 'b')).toEqual({ value: 'abc', cursor: 2 })
    expect(insertText(startField('ab'), 'c')).toEqual({ value: 'abc', cursor: 3 })
  })

  it('campo-backspace: apaga antes do cursor e para no inicio', () => {
    expect(backspaceField({ value: 'abc', cursor: 1 })).toEqual({ value: 'bc', cursor: 0 })
    expect(backspaceField({ value: 'abc', cursor: 0 })).toEqual({ value: 'abc', cursor: 0 })
  })

  it('campo-delete: apaga depois do cursor e para no fim', () => {
    expect(deleteForward({ value: 'abc', cursor: 1 })).toEqual({ value: 'ac', cursor: 1 })
    expect(deleteForward(startField('abc'))).toEqual({ value: 'abc', cursor: 3 })
  })

  it('campo-move: move o cursor e segura nas pontas', () => {
    expect(moveFieldCursor({ value: 'abc', cursor: 1 }, 'left')).toEqual({ value: 'abc', cursor: 0 })
    expect(moveFieldCursor({ value: 'abc', cursor: 0 }, 'left')).toEqual({ value: 'abc', cursor: 0 })
    expect(moveFieldCursor({ value: 'abc', cursor: 1 }, 'right')).toEqual({ value: 'abc', cursor: 2 })
    expect(moveFieldCursor(startField('abc'), 'right')).toEqual({ value: 'abc', cursor: 3 })
    expect(moveFieldCursor({ value: 'abc', cursor: 2 }, 'home')).toEqual({ value: 'abc', cursor: 0 })
    expect(moveFieldCursor({ value: 'abc', cursor: 0 }, 'end')).toEqual({ value: 'abc', cursor: 3 })
  })

  it('campo-truncamento: a janela cabe na largura, marca com … e mantem o cursor visivel', () => {
    expect(fieldWindow(startField('abc'), 10)).toEqual({ text: 'abc', cursorColumn: 3 })
    expect(fieldWindow(startField('abcdefghijklmnop'), 10)).toEqual({
      text: '…ijklmnop',
      cursorColumn: 9,
    })
    expect(fieldWindow({ value: 'abcdefghijklmnop', cursor: 2 }, 10)).toEqual({
      text: 'abcdefgh…',
      cursorColumn: 2,
    })
    expect(fieldWindow(startField('abc'), 0)).toEqual({ text: '', cursorColumn: 0 })
  })

  it('campo-code-point: insere e apaga sem partir um code point', () => {
    const withEmoji = insertText(startField('a'), '🙂')
    expect(withEmoji).toEqual({ value: 'a🙂', cursor: 2 })
    expect(backspaceField(withEmoji)).toEqual({ value: 'a', cursor: 1 })
  })
})
