# Study — Documentação

App p/ ajudar o usuário a saber a melhor data p/ revisar conteúdos, usando repetição espaçada.

## Índice

- [Web (browser)](./web/index.md) — versão web; dados persistidos só no browser via IndexedDB.
- CLI — _a definir_.
- Desktop — _a definir_.

## Organização

- `docs/web/` — requisitos, regras de negócio, casos de uso e histórias de usuário da versão web.
- `docs/web/Casos de uso/` — CDUs; 1 arquivo Markdown por caso de uso.
- `docs/web/Histórias de usuários/` — HUs; 1 arquivo Markdown por história, com critérios de aceite em Gherkin.
- `docs/web/Regras de negócio/` — RBs; 1 arquivo Markdown por regra.
- `docs/web/Requisitos não funcionais/` — RNFs; 1 arquivo Markdown por requisito.

## Convenções

- Diagramas em [mermaid](https://mermaid.js.org/) por padrão; PlantUML só quando o mermaid não suporta o tipo (ex.: diagrama UML de casos de uso).
- Idioma: pt-BR.
- Toda decisão de escopo vive no `index.md` de cada plataforma; os CDUs referenciam as regras por ID (`RB-*`) e os requisitos não funcionais por ID (`RNF-*`).
