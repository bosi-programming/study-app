import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { browserFiles } from '../src/files.ts'

afterEach(vi.restoreAllMocks)

describe('adaptador de arquivos do navegador', () => {
  it('browserSaveFileCriaEEntaoRevogaAUrlDoBlob', async () => {
    const create = vi.fn(() => 'blob:estudo')
    const revoke = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await browserFiles.saveFile('study-2026-09-30.json', '{"schema_version":1}')

    expect(create).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revoke).not.toHaveBeenCalled()
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(revoke).toHaveBeenCalledWith('blob:estudo')
  })

  it('browserPickFileDevolveOTextoDoArquivo', async () => {
    const file = new File(['{"schema_version":1}'], 'estudo.json', { type: 'application/json' })
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
      Object.defineProperty(this, 'files', { value: [file], configurable: true })
      this.onchange?.(new Event('change'))
    })

    await expect(browserFiles.pickFile()).resolves.toBe('{"schema_version":1}')
  })

  it('browserPickFileDevolveNuloQuandoNenhumArquivoEhEscolhido', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
      Object.defineProperty(this, 'files', { value: [], configurable: true })
      this.onchange?.(new Event('change'))
    })

    await expect(browserFiles.pickFile()).resolves.toBeNull()
  })
})
