import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**/*.ts'],
      reportsDirectory: 'coverage/core',
      reporter: ['text-summary', 'html'],
      thresholds: { lines: 90 },
    },
    projects: [
      {
        test: {
          name: 'core',
          root: './packages/core',
          environment: 'node',
          include: ['test/**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/dist/**', 'test/golden.test.ts'],
        },
      },
      {
        test: {
          name: 'golden',
          root: '.',
          environment: 'node',
          include: ['fixtures/golden/test/**/*.test.ts', 'packages/core/test/golden.test.ts'],
        },
      },
      {
        test: {
          name: 'cli',
          root: './apps/cli',
          environment: 'node',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'scaffold',
          root: '.',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
        },
      },
    ],
  },
})
