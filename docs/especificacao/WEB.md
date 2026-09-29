# Web — App de Estudo Espaçado

Versão: 1 | Data: 2026-09-28 | Base: `docs/especificacao/REQUISITOS.md`

## Convenções

- App em `apps/web`: React com Vite, TypeScript estrito, consumindo `@study/core` direto do `src`, sem cópia da regra e sem `dist/` (ADR-001, ADR-013).
- Persistência em IndexedDB, no contrato do `MODELO-DE-DADOS.md` (ADR-003). Nenhum fluxo depende de rede (RNF-01) e não há conta, login nem telemetria fora do piloto (RNF-02).
- Idioma pt-BR na V1; nenhuma string de UI fora do módulo único de strings (RNF-06).
- Datas de vencimento são datas locais (`YYYY-MM-DD`); timestamps UTC ficam só no dado persistido.
- Uma tela por rota, navegação por hash; estados e comportamento de cada tela seguem o molde deste documento.
- Toda tela descreve os quatro estados da seção `## Estados`, mesmo quando não tem `RF-nn` próprio.
- Operações destrutivas pedem confirmação explícita: remover item (`RF-04`), alterar a janela do arquivo morto (`RF-25`), purgar do arquivo morto (`RF-17`) e avisar antes de migrar (`RF-16`).
- A fila aparece sempre como lista plana ordenada; sem paginação na V1.

## Telas e fluxos

Tabela de cobertura: cada `RF-nn` da UI aponta a tela onde aparece.

| Tela | Rota | Requisitos |
| --- | --- | --- |
| Adicionar | `#/add` | RF-01 |
| Lista | `#/items` | RF-02, RF-24 |
| Detalhe | `#/items/:id` | RF-03, RF-04, RF-06, RF-10, RF-11 |
| Fila | `#/` | RF-05, RF-07 |
| Check-in | `#/review/:id` | RF-08, RF-09, RF-12, RF-13 |
| Ciclo de vida | `#/items/:id` (ações) | RF-14, RF-15 |
| Arquivo morto | `#/cold` | RF-16, RF-17 |
| Export/import | `#/data` | RF-18, RF-19, RF-20 |
| Stats | `#/stats` | RF-21, RF-22, RF-23 |
| Config | `#/config` | RF-25 |

Toda tela sem `RF-nn` (config, estados de erro, confirmações) segue as regras de `## Estados`.

### Adicionar e editar (RF-01, RF-03, RF-04)

- Formulário de adicionar: título (1–200 caracteres, sem espaços nas pontas), matéria (1–60), dificuldade de 1 a 5 e nota/link opcionais.
- O vencimento inicial não é digitado: o app mostra a data calculada pelo core a partir da dificuldade (RN-01, RN-02).
- Salvar cria o item e volta para a lista; o item aparece na fila na data calculada.
- Detalhe permite editar título, matéria, nota/link e dificuldade (RF-03). Mudar a dificuldade recalcula o intervalo com a base nova e o mesmo `n`, com vencimento a partir de hoje (RN-06). Manter a dificuldade não altera nada.
- Remover (RF-04) é definitivo, não passa pelo arquivo morto e exige confirmação na mesma moldura destrutiva do CLI: o diálogo nomeia o item e diz que a remoção não pode ser desfeita.
- Título só com espaços é recusado com a mensagem de campo obrigatório; matéria é string livre, comparada sem caixa e sem acentos (RN-12).

### Lista e busca (RF-02, RF-24)

- Lista com filtro por matéria e por status (`active`, `archived`, `cold`) e ordenação por vencimento (RF-02).
- Sem filtro de status, mostra só ativos; `cold` mostra o arquivo morto com a data de migração.
- Busca por termo no título, sem diferenciar maiúsculas e acentos, reutilizando a normalização do core (RF-24).
- Cada linha mostra título, matéria, vencimento e dificuldade; a linha inteira abre o detalhe.
- Lista vazia cai no estado vazio, com o atalho para adicionar o primeiro item.

### Fila e resumo (RF-05, RF-06, RF-07)

- A fila do dia lista os itens com vencimento `<=` hoje, atrasados primeiro, em ordem de vencimento (RF-05).
- Cada item mostra o próximo vencimento calculado quando está adiantado, e o atraso em dias quando está vencido (RF-06).
- O resumo da fila traz o total de hoje, o total de atrasados e o recorte por matéria (RF-07).
- A fila responde em menos de 200ms com 5.000 itens (RNF-03); o carregamento tem o estado carregando e nunca bloqueia a navegação.

### Check-in e reavaliação (RF-08..RF-13)

- Check-in "estudei agora" só existe para item ativo; recalcula o vencimento pelo core (RF-08).
- Item arquivado é recusado com o caminho para desarquivar (RF-09); item no arquivo morto é recusado com o caminho para restaurar.
- Após o check-in, a tela pede a reavaliação da dificuldade com a atual como padrão; manter não muda nada (RF-12, RN-06).
- O histórico de check-ins do item aparece no detalhe, com data, vencimento na hora do check-in e intervalo resultante (RF-10).
- A dificuldade também pode ser reavaliada a qualquer momento, sem check-in, pela tela de detalhe (RF-11).
- O `on_time_streak` aparece no detalhe e nos stats como check-ins consecutivos no prazo; um check-in atrasado zera o contador (RF-13, RN-08).
- Dois check-ins no mesmo dia são permitidos e cada um incrementa `n` e dobra o intervalo (RN-13).

### Ciclo de vida e arquivo morto (RF-14..RF-17)

- Arquivar tira o item da fila e das contagens de ativos; desarquivar o traz de volta (RF-14, RF-15, RN-09).
- Arquivar e desarquivar são ações do detalhe, reversíveis e sem confirmação.
- Restaurar do arquivo morto volta o item a ativo com o mesmo `n` e a mesma dificuldade (RF-17, RN-11).
- A migração para o arquivo morto ocorre `cold_archive_after_days` dias após o arquivamento (padrão 180, RN-10) e o app avisa antes de migrar, na mesma moldura destrutiva do CLI (RF-16).
- Purgar do arquivo morto é definitivo e exige confirmação que nomeia o item (RF-17).
- O arquivo morto é uma visão própria, com `cold_archived_at` por item e o agrupamento de restaurar/purgar.

### Export e import (RF-18..RF-20)

- Export baixa um único JSON v1 com ativos, arquivados, arquivo morto e histórico, com `schema_version` (RF-18, RNF-04).
- Import lê um JSON v1 e mescla por UUID: item existente é mesclado pelo `updated_at` mais recente, nunca duplicado (RF-19, ADR-022).
- Ao terminar, a interface confirma a operação e mostra as contagens do que foi mesclado.
- O export automático dispara a cada migração para o arquivo morto e fica disponível mesmo com o banco corrompido, quando o arquivo existir (RF-20, RNF-07).
- O arquivo exportado pelo web abre no import do CLI, e o do CLI abre no import do web.

### Stats (RF-21..RF-23)

- Streak de dias com fila zerada, recalculado a cada abertura (RF-21, RN-14).
- Contagem de ativos, arquivados e no arquivo morto (RF-22).
- Check-ins do dia e total por matéria (RF-23).
- Stats não editam dado: são leitura sobre o mesmo store da lista.

### Config da janela (RF-25)

- Mostra e altera `cold_archive_after_days` (padrão 180), com o mesmo domínio do CLI (RF-25, RN-10).
- A alteração passa pela moldura destrutiva: o diálogo explica que itens elegíveis migram na próxima abertura.
- Configurar usa a porta de `meta` do store; não é uma tabela de preferências à parte.

## Estados

| Estado | Quando | Comportamento |
| --- | --- | --- |
| Vazio | Não há item para mostrar na tela | Ilustração curta, a ação principal da tela e nenhum controle desabilitado sem explicação |
| Carregando | Leitura ou escrita em andamento no IndexedDB | Esqueleto ou indicador na área do conteúdo; a navegação continua utilizável |
| Offline | Sem rede, o que é o padrão da V1 | Nada muda: nenhuma feature depende de rede (RNF-01); o aviso só aparece se algo tentar rede |
| Erro | Falha do store ou recusa do core | Mensagem pt-BR da seção `## Erros`, com a ação de tentar de novo quando fizer sentido |

- Cada tela implementa os quatro estados; a de erro nunca mostra stack trace nem detalhe técnico.
- O estado de erro do export preserva o caminho de saída: com o arquivo existindo, o export continua (RNF-07).
- Estados são por área da tela: um erro no resumo não apaga a fila já carregada.

## Contrato com o core

- Regra, tipos e erros vêm do barrel `@study/core`; o web não reimplementa `RN-nn` (ADR-001).
- Funções usadas pela UI: `createItem`, `recordReview`, `reevaluateDifficulty`, `resolveRef`, `hasDueItems` e `advanceQueueStreak`.
- Tempo e ids são injetados por `deps` (`clock.nowUtc`, `clock.todayLocalDate`, `ids`); a UI nunca lê relógio direto.
- `resolveRef` é usado nas telas que aceitam referência por título; ambiguidade nunca é resolvida pela UI (RN-15).
- Os erros do core chegam como `CoreError` com `kind` discriminante e são traduzidos na seção `## Erros`.

O store do web é uma porta com a mesma forma da porta do CLI (ADR-016), sobre os quatro stores de `MODELO-DE-DADOS.md`:

| Store IndexedDB | Chave | Índices | Operação na porta |
| --- | --- | --- | --- |
| `items` | id | status+due_date, subject_key+status | criar, ler, listar, filtrar, ordenar, arquivar, desarquivar, migrar |
| `review_logs` | id | item_id+reviewed_at | registrar e listar histórico por item |
| `meta` | key | — | ler e gravar `schema_version`, `cold_archive_after_days`, `locale` e o streak |
| `cold_archive` | id | cold_archived_at | restaurar e purgar |

- O store devolve o mesmo formato de linha do CLI: `late` 0/1 vira boolean na leitura e volta a 0/1 na escrita; as chaves derivadas (`title_key`, `subject_key`) saem da mesma normalização.
- Um teste lê o bloco IndexedDB do `MODELO-DE-DADOS.md` e reprova se o código divergir do documento.
- A fila é medida sobre o store real: 5.000 itens abaixo de 200ms, como o `T-26` (RNF-03).

## Erros

O `kind` do core é o valor estável; a mensagem é pt-BR e pode mudar. A UI mostra a mensagem e nunca o `kind` cru.

| Situação | `kind` | Mensagem na tela |
| --- | --- | --- |
| Campo fora da invariante | `invalid-field` | uma por campo, ex. `título é obrigatório`, `matéria deve ter no máximo 60 caracteres` |
| Data fora de `YYYY-MM-DD` | `invalid-field` | `data inválida: use YYYY-MM-DD` |
| Dificuldade fora de 1–5 | `invalid-difficulty` | `dificuldade inválida: use 1 a 5` |
| Referência curta demais e sem correspondência | `invalid-ref` | `referência inválida: use o título exato` |
| Item não encontrado | `not-found` | `item não encontrado` |
| Referência ambígua | `ambiguous-ref` | `há mais de um item com esse título`, com a lista de candidatos |
| Check-in em arquivado | `item-not-active` | `item arquivado; desarquive para revisar` |
| Check-in em item do arquivo morto | `item-not-active` | `item no arquivo morto; restaure para revisar` |
| Falha de leitura ou escrita no IndexedDB | — | `não foi possível salvar; tente de novo` |
| Export sem permissão de download | — | `não foi possível exportar o arquivo` |
| Arquivo de import fora do contrato | `invalid-value` | `arquivo inválido` |
| Import com `schema_version` futuro | `unsupported-schema` | `schema_version 2 não suportado` |

## Critérios de aceite

- `RF-01`..`RF-25` têm comportamento descrito acima, com token literal de cada um.
- A fila do dia mostra atrasados primeiro, com o resumo por matéria (RF-05, RF-07, `W-03`).
- O check-in recalcula o vencimento e pede a reavaliação com a atual como padrão (RF-08, RF-12, `W-04`).
- Arquivar e desarquivar tiram o item da fila e das contagens (RF-14, RF-15, `W-06`).
- Remover, migrar, purgar e alterar a janela pedem confirmação explícita (RF-04, RF-16, RF-17, RF-25).
- O export gera JSON v1 com tudo, e o import mescla por UUID sem duplicar (RF-18, RF-19, `W-09`).
- As strings pt-BR ficam num módulo único (RNF-06, `W-13`).
- Toda tela cobre vazio, carregando, offline e erro (`W-12`).
- A regra vem do `@study/core`, provada contra um vetor de `fixtures/golden` (`W-11`).
