# Requisitos — App de Estudo Espaçado

Versão: 1 | Data: 2026-09-09 | Base: `docs/PRD.md`

## Convenções

- RF: requisito funcional. RN: regra de negócio. RNF: requisito não funcional. CA: critério de aceite.
- Datas de vencimento são datas locais (YYYY-MM-DD); eventos são timestamps UTC ISO 8601.
- "No prazo" significa check-in até o fim do dia local do vencimento.

## Requisitos funcionais

### Itens

- RF-01 Criar item com título, matéria e dificuldade 1–5; nota/link opcional.
- RF-02 Listar itens com filtro por matéria, por status e ordenação por vencimento.
- RF-03 Editar título, matéria, nota/link e dificuldade de um item.
- RF-04 Remover item com confirmação; remoção é definitiva e não vai para o arquivo morto.

### Agenda

- RF-05 Mostrar fila do dia: itens com vencimento <= hoje, atrasados primeiro.
- RF-06 Mostrar o próximo vencimento calculado de um item.
- RF-07 Mostrar resumo da fila: total de hoje, total de atrasados, recorte por matéria.

### Revisão

- RF-08 Registrar check-in "estudei agora" em item ativo e recalcular vencimento.
- RF-09 Rejeitar check-in em item arquivado, com mensagem para desarquivar.
- RF-10 Manter histórico de check-ins por item.

### Dificuldade

- RF-11 Permitir reavaliação manual de dificuldade a qualquer momento.
- RF-12 Sugerir reavaliação após 3 check-ins consecutivos no prazo; nunca aplicar sozinho.
- RF-13 Zerar o contador de sugestão quando um check-in ocorre após o vencimento.

### Ciclo de vida

- RF-14 Arquivar e desarquivar item.
- RF-15 Excluir itens arquivados da fila e das sugestões.
- RF-16 Migrar para o arquivo morto itens arquivados há mais de 180 dias, após aviso.
- RF-17 Listar, restaurar e purgar itens do arquivo morto; purga exige confirmação.

### Dados

- RF-18 Exportar todos os dados (ativos, arquivados, arquivo morto, histórico) para JSON v1.
- RF-19 Importar JSON v1 de forma idempotente: itens existentes por UUID são mesclados, não duplicados.
- RF-20 Exportar automaticamente para JSON a cada migração para o arquivo morto.

### Stats

- RF-21 Mostrar streak de dias com fila zerada.
- RF-22 Mostrar contagem de ativos, arquivados e no arquivo morto.
- RF-23 Mostrar check-ins do dia e total por matéria.

## Regras de negócio

- RN-01 Intervalo base: d1=10, d2=7, d3=5, d4=3, d5=2 dias.
- RN-02 Vencimento inicial = data de criação + intervalo base da dificuldade.
- RN-03 Após n check-ins, intervalo = min(365, base(dificuldade) × 2^n) dias.
- RN-04 Cada check-in incrementa n, inclusive quando o item está atrasado.
- RN-05 Atraso não reduz o intervalo nem muda a dificuldade.
- RN-06 Reavaliação de dificuldade recalcula o intervalo com a nova base e o mesmo n.
- RN-07 Teto de 365 dias; check-ins continuam registrados no teto.
- RN-08 Sugestão de reavaliação após 3 check-ins consecutivos no prazo (RN-04 não afeta o contador de sugestão; atraso zera).
- RN-09 Item arquivado não aparece em fila, stats de ativos ou sugestões.
- RN-10 Migração para o arquivo morto ocorre 180 dias após o arquivamento, configurável.
- RN-11 Item restaurado do arquivo morto volta a ativo com o mesmo n e dificuldade.
- RN-12 Matéria é string livre, sem hierarquia; comparação sem diferenciar maiúsculas e acentos.

## Requisitos não funcionais

- RNF-01 Offline-first: nenhuma feature da V1 depende de rede.
- RNF-02 Sem conta, sem login, sem telemetria por padrão fora do piloto.
- RNF-03 Fila do dia responde em menos de 200ms com 5.000 itens.
- RNF-04 Contrato JSON versionado, com `schema_version` e migração documentada.
- RNF-05 Dados do piloto: eventos anônimos no Sentry + aviso LGPD de 1 parágrafo.
- RNF-06 Idioma pt-BR na V1; strings centralizadas para i18n futura.
- RNF-07 Export sempre disponível, mesmo com banco corrompido, quando o arquivo existir.

## Critérios de aceite

- CA-01 (RF-01, RN-01, RN-02): Dado item novo com dificuldade 4, quando criado hoje, então vencimento = hoje + 3 dias.
- CA-02 (RF-08, RN-03): Dado item com n=0 e dificuldade 3, quando check-in no prazo, então n=1 e próximo vencimento = hoje + 10 dias.
- CA-03 (RN-03, RN-07): Dado item com n=8 e dificuldade 1, quando check-in, então intervalo = 365 dias, não 2560.
- CA-04 (RN-05): Dado item vencido há 30 dias, quando check-in, então intervalo dobra e nada é penalizado.
- CA-05 (RN-06): Dado item n=2 dificuldade 5, quando dificuldade muda para 2, então intervalo passa de 8 para 28 dias.
- CA-06 (RF-12): Dado 3 check-ins consecutivos no prazo, quando o terceiro é registrado, então o sistema sugere reavaliação sem alterar nada.
- CA-07 (RF-13): Dado contador de sugestão em 2, quando check-in atrasado, então contador zera.
- CA-08 (RF-09): Dado item arquivado, quando check-in, então operação é rejeitada com instrução de desarquivar.
- CA-09 (RF-16, RN-10): Dado item arquivado há 181 dias, quando o app abre, então avisa e migra para o arquivo morto, exportando JSON.
- CA-10 (RF-17): Dado item no arquivo morto, quando restore, então volta a ativo com n e dificuldade preservados.
- CA-11 (RF-19): Dado export importado duas vezes, quando a segunda importação roda, então nenhum item duplica.
- CA-12 (RF-05): Dados 3 itens atrasados e 2 para hoje, quando a fila abre, então atrasados aparecem primeiro, por vencimento.

## Casos de borda

- Check-in em item com vencimento no mesmo dia local: conta como no prazo.
- Mudança de fuso: vencimento continua sendo data local; comparar sempre pela data local atual.
- Item no teto de 365d: check-ins continuam permitidos e registrados.
- Import com UUID existente e dados diferentes: vence o registro de `updated_at` mais recente.
- Migração para arquivo morto durante o uso: item sai da fila imediatamente após a migração.
- Matéria só com espaços: rejeitar na criação.
- Título duplicado: permitido; matéria e título não formam chave.
