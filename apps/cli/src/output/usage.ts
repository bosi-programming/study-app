export const USAGE = `study — app de estudo espaçado

Uso:
  study <comando> [opções]

Comandos:
  init                cria o banco; com banco existente exige --reset --yes
  add <título>        cria um item (exige -s; sem -d pergunta a dificuldade)
  list                lista itens (--status, -s)
  find <termo>        busca por substring no título (--status, -s)
  due                 fila do dia, atrasados primeiro (-s)
  tui                 abre a TUI no terminal (exige um terminal interativo)
  review <ref>        check-in e dificuldade (-d pula o prompt)
  difficulty <ref> <1-5>  reavalia a dificuldade sem check-in
  show <ref>          detalhe e vencimento; --history inclui os check-ins
  edit <ref>          edita --title, -s, -n, -l ou -d
  remove <ref>        remove em definitivo (exige --yes)
  archive <ref>       arquiva o item; sai da fila e das contagens
  unarchive <ref>     devolve o item arquivado à fila
  cold list           visão do arquivo morto, com a data de migração
  cold restore <ref>  restaura o item do arquivo morto
  cold purge <ref>    remove do arquivo morto em definitivo (exige --yes)
  config get <chave>  lê uma configuração
  config set <chave> <valor>  altera uma configuração
  stats               métricas: streak, contagens e check-ins
  export <path>       exporta todo o acervo em JSON v1 (--yes sobrescreve)
  import <path>       importa um JSON v1 sem duplicar nada

Opções:
  -s, --subject <nome>       matéria
  -d, --difficulty <1-5>     dificuldade
  -n, --note <texto>         nota
  -l, --link <url>           link
  --title <texto>            novo título
  --status <active|archived|cold>
  --history                  inclui os check-ins
  --reset                    autoriza recriar o banco
  --yes                      confirma operação destrutiva
  --db <path>                caminho do banco (vence STUDY_DB)
  --json                     saída JSON estável
  --no-color                 desliga as cores da saída humana
  --no-input                 nunca pergunta
  --export-dir <path>        destino do export do arquivo morto
  -h, --help                 mostra este uso`
