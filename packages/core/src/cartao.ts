import type { Dia } from './data.ts';
import { addDias, hojeLocal } from './data.ts';

export interface Cartao {
  readonly id: string;
  readonly nome: string;
  readonly categoria: string;
  readonly conteudo: string;
  readonly dataUltimaRevisao: Dia | null;
  readonly quantidadeRevisoes: number;
  readonly dataProximaRevisao: Dia;
  readonly dataCriacao: Dia;
}

export interface NovoCartao {
  nome: string;
  categoria: string;
  conteudo: string;
}

export function criarCartao(
  entrada: NovoCartao,
  hoje: Dia = hojeLocal(),
): Cartao {
  return {
    id: crypto.randomUUID(),
    nome: entrada.nome,
    categoria: entrada.categoria,
    conteudo: entrada.conteudo,
    dataUltimaRevisao: null,
    quantidadeRevisoes: 0,
    dataProximaRevisao: addDias(hoje, 7),
    dataCriacao: hoje,
  };
}
