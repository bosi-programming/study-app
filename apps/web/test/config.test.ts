import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import viteConfig from '../vite.config';

const readFile = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), 'utf8');

describe('tailwind vite plugin (AC1)', () => {
  it('vite registers tailwind plugin', () => {
    const plugins = (viteConfig.plugins ?? []).flat() as unknown as {
      name?: string;
    }[];

    expect(
      plugins.some((plugin) => plugin.name?.startsWith('@tailwindcss/vite')),
    ).toBe(true);
  });
});

describe('css entry (AC2)', () => {
  it('css entry imports tailwind', () => {
    expect(readFile('../src/index.css')).toContain("@import 'tailwindcss';");
  });

  it('css entry sources DS react-dist', () => {
    expect(readFile('../src/index.css')).toContain(
      '@source "../node_modules/bosi-design-system/react-dist";',
    );
  });
});

describe('DS dependency (AC3)', () => {
  it('manifest declares DS github spec', () => {
    const manifest = JSON.parse(readFile('../package.json')) as {
      dependencies: Record<string, string>;
    };

    expect(manifest.dependencies['bosi-design-system']).toBe(
      'github:bosi-programming/bosi-design-system',
    );
  });
});

describe('build approval (AC4)', () => {
  it('workspace approves DS builds', () => {
    const workspace = readFile('../../../pnpm-workspace.yaml');

    expect(workspace).toMatch(
      /allowBuilds:[\s\S]*bosi-design-system:\s*true/,
    );
  });
});

describe('CSS import graph (AC8)', () => {
  it('app component keeps CSS out of import graph', () => {
    expect(readFile('../src/App.tsx')).not.toMatch(/\.css['"]/);
  });
});
