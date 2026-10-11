import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { Typography } from 'bosi-design-system/react';
import { App } from '../src/App';

describe('App (AC5)', () => {
  it('renders DS Typography as heading', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Estudo' }),
    ).toBeInTheDocument();
  });

  it('Typography accepts size & color props', () => {
    render(
      <Typography as="h2" size="h2" color="primary">
        Estudo
      </Typography>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Estudo' }),
    ).toBeInTheDocument();
  });
});
