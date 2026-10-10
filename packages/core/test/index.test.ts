import { describe, expect, it } from 'vitest';
import {
  type Cartao,
  type Dia,
  type NovoCartao,
  addDias,
  criarCartao,
  hojeLocal,
} from '../src/index.ts';

describe('barrel público (AC9)', () => {
  it('barrel: exporta símbolos runtime', () => {
    expect(hojeLocal).toBeTypeOf('function');
    expect(addDias).toBeTypeOf('function');
    expect(criarCartao).toBeTypeOf('function');
  });

  it('barrel: exporta tipos (typecheck)', () => {
    const dia: Dia = hojeLocal();
    const entrada: NovoCartao = {
      nome: 'Nome',
      categoria: 'Categoria',
      conteudo: 'Conteudo',
    };
    const cartao: Cartao = criarCartao(entrada, dia);

    expect(cartao.dataCriacao).toBe(dia);
  });
});
