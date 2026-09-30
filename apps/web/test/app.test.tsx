import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../src/App.tsx'

afterEach(cleanup)

describe('S-43 web-root-composition', () => {
  it('compõe o shell com o título e a feature de vencimento montada', () => {
    const { container } = render(<App />)

    expect(screen.getByRole('heading', { name: 'Study' })).toBeInTheDocument()
    expect(screen.getByText(/Próxima revisão em/)).toBeInTheDocument()
    expect(container.querySelector('time')?.dateTime).toBeTruthy()
  })
})
