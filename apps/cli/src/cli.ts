import { ALL_FLAGS, type ParsedArgs, hasFlag, parseArgs, valueOf } from './args.ts'
import { addCommand } from './commands/add.ts'
import { dueCommand } from './commands/due.ts'
import { editCommand } from './commands/edit.ts'
import { findCommand } from './commands/find.ts'
import { initCommand } from './commands/init.ts'
import { listCommand } from './commands/list.ts'
import { removeCommand } from './commands/remove.ts'
import { showCommand } from './commands/show.ts'
import { type Command } from './commands/types.ts'
import { withContext } from './context.ts'
import { CliError, exitCodeFor } from './errors.ts'
import { printError, printSuccess } from './output/index.ts'

const COMMANDS: Record<string, Command> = {
  init: initCommand,
  add: addCommand,
  list: listCommand,
  find: findCommand,
  due: dueCommand,
  show: showCommand,
  edit: editCommand,
  remove: removeCommand,
}

const USAGE = `study — app de estudo espaçado

Uso:
  study <comando> [opções]

Comandos:
  init                cria o banco; com banco existente exige --reset --yes
  add <título>        cria um item (exige -s; sem -d pergunta a dificuldade)
  list                lista itens (--status, -s)
  find <termo>        busca por substring no título (--status, -s)
  due                 fila do dia, atrasados primeiro (-s)
  show <ref>          detalhe e vencimento; --history inclui os check-ins
  edit <ref>          edita --title, -s, -n, -l ou -d
  remove <ref>        remove em definitivo (exige --yes)

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
  --no-input                 nunca pergunta
  --export-dir <path>        destino do export do arquivo morto
  -h, --help                 mostra este uso`

export function runCli(argv: readonly string[]): void {
  const wantsJson = argv.includes('--json')
  let args: ParsedArgs
  try {
    args = parseArgs(argv, ALL_FLAGS)
  } catch (error) {
    printError(error, { json: wantsJson })
    process.exitCode = exitCodeFor(error)
    return
  }

  if (hasFlag(args, 'help')) {
    process.stdout.write(`${USAGE}\n`)
    return
  }

  const commandName = args.positionals[0]
  if (commandName === undefined) {
    process.stderr.write(`${USAGE}\n`)
    process.exitCode = 1
    return
  }

  const command = COMMANDS[commandName]
  const json = hasFlag(args, 'json')
  if (command === undefined) {
    const error = CliError.usage(`comando desconhecido: ${commandName}`)
    printError(error, { json })
    process.exitCode = error.exitCode
    return
  }

  const commandArgs: ParsedArgs = { positionals: args.positionals.slice(1), flags: args.flags }

  try {
    const result = withContext(
      {
        dbPath: valueOf(args, 'db'),
        json,
        noInput: hasFlag(args, 'no-input'),
        exportDir: valueOf(args, 'export-dir'),
      },
      (ctx) => command(commandArgs, ctx),
    )
    printSuccess(commandName, result, { json })
  } catch (error) {
    printError(error, { json })
    process.exitCode = exitCodeFor(error)
  }
}
