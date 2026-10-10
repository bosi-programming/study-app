# Requisitos não funcionais — Study Web

| ID | Requisito | Categoria (ISO 25010) |
| --- | --- | --- |
| [RNF-01](./RNF-01%20-%20Persistência%20local.md) | Persistência local IndexedDB; nada sai do dispositivo | Segurança/Privacidade |
| [RNF-02](./RNF-02%20-%20Funcionamento%20offline.md) | Funciona offline após o 1º carregamento | Confiabilidade |
| [RNF-03](./RNF-03%20-%20Idioma%20pt-BR.md) | Interface em pt-BR | Usabilidade |
| [RNF-04](./RNF-04%20-%20Layout%20responsivo.md) | Layout responsivo, máx 1024px, 40px lateral | Usabilidade |
| [RNF-05](./RNF-05%20-%20Espaçamentos.md) | Espaçamentos 40/8/20px | Usabilidade |
| [RNF-06](./RNF-06%20-%20Acessibilidade.md) | Acessibilidade WCAG 2.1 AA + teclado | Usabilidade |
| [RNF-07](./RNF-07%20-%20Stack%20base.md) | Stack base: TS + React 19 + Tailwind CSS 4 | Manutenibilidade |
| [RNF-08](./RNF-08%20-%20Design%20system.md) | UI via `bosi-design-system` | Usabilidade/Manutenibilidade |
| [RNF-09](./RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md) | RN & código compartilhável em `packages/core` | Manutenibilidade/Portabilidade |
| [RNF-10](./RNF-10%20-%20Desempenho.md) | 500 cartões renderiza/ordena < 100ms | Eficiência |
| [RNF-11](./RNF-11%20-%20Compatibilidade%20de%20navegadores.md) | Navegadores c/ IndexedDB (últimas 2 versões) | Compatibilidade |
| [RNF-12](./RNF-12%20-%20Cobertura%20de%20testes.md) | Cobertura ≥90% em core; lint & typecheck verdes | Manutenibilidade |
| [RNF-13](./RNF-13%20-%20Escrita%20atômica.md) | Escrita atômica; falha não corrompe dados | Confiabilidade |
| [RNF-14](./RNF-14%20-%20Sem%20telemetria.md) | Sem telemetria/analytics/rede | Privacidade |

## Categorias (ISO/IEC 25010)

- **Segurança/Privacidade:** RNF-01, RNF-14.
- **Confiabilidade:** RNF-02, RNF-13.
- **Usabilidade:** RNF-03, RNF-04, RNF-05, RNF-06, RNF-08.
- **Eficiência de desempenho:** RNF-10.
- **Compatibilidade:** RNF-11.
- **Manutenibilidade:** RNF-07, RNF-08, RNF-09, RNF-12.
- **Portabilidade:** RNF-09.

## Notas

- O antigo `RNF-06` (conteúdo do cartão colapsado & ações) foi **reclassificado como requisito funcional** (ver [CDU-02](../Casos%20de%20uso/CDU-02%20-%20Listar%20conteúdos.md) e [HU-02](../Histórias%20de%20usuários/HU-02%20-%20Ver%20lista%20de%20conteúdos.md)); a numeração foi refeita.
