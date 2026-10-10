import { describe, expect, it } from 'vitest';
import { type Cartao, type NovoCartao, criarCartao } from '../src/cartao.ts';
import { type Dia } from '../src/data.ts';

const diaDe = (valor: string): Dia => valor as Dia;

const HOJE = diaDe('2026-03-10');

const entradaValida = (): NovoCartao => ({
  nome: 'Nome',
  categoria: 'Categoria',
  conteudo: 'Conteudo',
});

describe('Cartao (AC1)', () => {
  it('cartao: shape tem os 8 campos', () => {
    const cartao = criarCartao(entradaValida(), HOJE);

    expect(Object.keys(cartao).sort()).toEqual(
      [
        'id',
        'nome',
        'categoria',
        'conteudo',
        'dataUltimaRevisao',
        'quantidadeRevisoes',
        'dataProximaRevisao',
        'dataCriacao',
      ].sort(),
    );
  });

  it('cartao: dataUltimaRevisao é Dia|null (type-level)', () => {
    const comData: Cartao = {
      id: 'id-1',
      nome: 'Nome',
      categoria: 'Categoria',
      conteudo: 'Conteudo',
      dataUltimaRevisao: diaDe('2026-03-01'),
      quantidadeRevisoes: 1,
      dataProximaRevisao: diaDe('2026-03-08'),
      dataCriacao: diaDe('2026-03-01'),
    };
    const semData: Cartao = {
      id: 'id-2',
      nome: 'Nome',
      categoria: 'Categoria',
      conteudo: 'Conteudo',
      dataUltimaRevisao: null,
      quantidadeRevisoes: 0,
      dataProximaRevisao: diaDe('2026-03-08'),
      dataCriacao: diaDe('2026-03-01'),
    };

    expect(comData.dataUltimaRevisao).toBe('2026-03-01');
    expect(semData.dataUltimaRevisao).toBeNull();
  });

  it('cartao: campos são readonly (type-level)', () => {
    const cartao = criarCartao(entradaValida(), HOJE);
    const tentarReatribuirNome = (): void => {
      // @ts-expect-error readonly: campos de Cartao não podem ser reatribuídos
      cartao.nome = 'Outro';
    };

    expect(tentarReatribuirNome).toBeTypeOf('function');
  });
});

describe('estado inicial (AC2)', () => {
  it('criação: quantidadeRevisoes = 0', () => {
    const cartao = criarCartao(entradaValida(), HOJE);

    expect(cartao.quantidadeRevisoes).toBe(0);
  });

  it('criação: dataUltimaRevisao = null', () => {
    const cartao = criarCartao(entradaValida(), HOJE);

    expect(cartao.dataUltimaRevisao).toBeNull();
  });
});

describe('datas na criação (AC3)', () => {
  it('criação: dataCriacao = hoje injetado', () => {
    const cartao = criarCartao(entradaValida(), HOJE);

    expect(cartao.dataCriacao).toBe('2026-03-10');
  });

  it('criação: dataProximaRevisao = hoje + 7', () => {
    const cartao = criarCartao(entradaValida(), HOJE);

    expect(cartao.dataProximaRevisao).toBe('2026-03-17');
  });
});

describe('id (AC6)', () => {
  it('id: string não-vazia', () => {
    const cartao = criarCartao(entradaValida(), HOJE);

    expect(typeof cartao.id).toBe('string');
    expect(cartao.id.length).toBeGreaterThan(0);
  });

  it('id: único entre duas criações', () => {
    const primeiro = criarCartao(entradaValida(), HOJE);
    const segundo = criarCartao(entradaValida(), HOJE);

    expect(primeiro.id).not.toBe(segundo.id);
  });
});

describe('imutabilidade (AC7)', () => {
  it('criação: não muta a entrada', () => {
    const entrada = entradaValida();
    const antes: NovoCartao = {
      nome: 'Nome',
      categoria: 'Categoria',
      conteudo: 'Conteudo',
    };

    criarCartao(entrada, HOJE);

    expect(entrada).toEqual(antes);
  });

  it('criação: devolve objeto novo', () => {
    const entrada = entradaValida();

    const cartao = criarCartao(entrada, HOJE);
    const outro = criarCartao(entrada, HOJE);

    expect(cartao).not.toBe(entrada);
    expect(cartao).not.toBe(outro);
  });
});

describe('sem validação (AC8)', () => {
  it('criação: valores passam como recebidos', () => {
    const entrada: NovoCartao = {
      nome: '  Nome  ',
      categoria: ' Cat ',
      conteudo: '   ',
    };

    const cartao = criarCartao(entrada, HOJE);

    expect(cartao.nome).toBe('  Nome  ');
    expect(cartao.categoria).toBe(' Cat ');
    expect(cartao.conteudo).toBe('   ');
  });
});
