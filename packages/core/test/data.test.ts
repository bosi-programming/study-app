import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Dia, addDias, hojeLocal } from '../src/data.ts';
import { criarCartao } from '../src/cartao.ts';

const diaDe = (valor: string): Dia => valor as Dia;

describe('hojeLocal (AC4)', () => {
  const tzOriginal = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = 'America/Sao_Paulo';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
  });

  it('hojeLocal: default em criarCartao', () => {
    vi.setSystemTime(new Date('2026-03-10T12:00:00-03:00'));

    const cartao = criarCartao({
      nome: 'Nome',
      categoria: 'Categoria',
      conteudo: 'Conteudo',
    });

    expect(cartao.dataCriacao).toBe(hojeLocal());
    expect(cartao.dataCriacao).toBe('2026-03-10');
  });

  it('hojeLocal: 23h59 grava dia local, não UTC', () => {
    vi.setSystemTime(new Date('2026-03-10T23:59:00-03:00'));

    expect(hojeLocal()).toBe('2026-03-10');
  });
});

describe('addDias (AC5)', () => {
  it('addDias: +0 idempotente', () => {
    const dia = diaDe('2026-03-10');

    expect(addDias(dia, 0)).toBe(dia);
  });

  it('addDias: +7 no mesmo mês', () => {
    expect(addDias(diaDe('2026-03-10'), 7)).toBe('2026-03-17');
  });

  it('addDias: cruza fim de mês', () => {
    expect(addDias(diaDe('2026-01-28'), 7)).toBe('2026-02-04');
  });

  it('addDias: cruza virada de ano', () => {
    expect(addDias(diaDe('2026-12-29'), 7)).toBe('2027-01-05');
  });

  it('addDias: bissexto', () => {
    expect(addDias(diaDe('2024-02-28'), 1)).toBe('2024-02-29');
    expect(addDias(diaDe('2024-02-29'), 1)).toBe('2024-03-01');
  });

  it('addDias: preserva formato YYYY-MM-DD', () => {
    expect(addDias(diaDe('2026-02-28'), 1)).toBe('2026-03-01');
  });

  it('addDias: aceita dias negativos', () => {
    expect(addDias(diaDe('2026-03-10'), -7)).toBe('2026-03-03');
    expect(addDias(diaDe('2026-03-01'), -1)).toBe('2026-02-28');
  });
});
