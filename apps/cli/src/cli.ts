import { ALL_FLAGS, type ParsedArgs, assertPositionals, hasFlag, parseArgs, valueOf } from './args.ts'
import { addCommand } from './commands/add.ts'
import { archiveCommand } from './commands/archive.ts'
import { coldCommand } from './commands/cold.ts'
import { configCommand } from './commands/config.ts'
import { dueCommand } from './commands/due.ts'
import { difficultyCommand } from './commands/difficulty.ts'
import { editCommand } from './commands/edit.ts'
import { exportCommand } from './commands/export.ts'
import { findCommand } from './commands/find.ts'
import { importCommand } from './commands/import.ts'
import { initCommand } from './commands/init.ts'
import { listCommand } from './commands/list.ts'
import { removeCommand } from './commands/remove.ts'
import { reviewCommand } from './commands/review.ts'
import { showCommand } from './commands/show.ts'
import { statsCommand } from './commands/stats.ts'
import { unarchiveCommand } from './commands/unarchive.ts'
import { type Command } from './commands/types.ts'
import { withContext } from './context.ts'
import { systemDeps } from './deps.ts'
import { CliError, exitCodeFor } from './errors.ts'
import { colorEnabled, resolveColorEnabled, setColorEnabled } from './output/color.ts'
import { printError, printSuccess } from './output/index.ts'
import { USAGE } from './output/usage.ts'
import { exitCodeOf, refuseTui, runTui } from './tui/loop/index.ts'
import { processTerminal } from './tui/terminal/index.ts'

const COMMANDS: Record<string, Command> = {
  init: initCommand,
  add: addCommand,
  list: listCommand,
  find: findCommand,
  due: dueCommand,
  difficulty: difficultyCommand,
  show: showCommand,
  stats: statsCommand,
  edit: editCommand,
  remove: removeCommand,
  review: reviewCommand,
  archive: archiveCommand,
  unarchive: unarchiveCommand,
  cold: coldCommand,
  config: configCommand,
  export: exportCommand,
  import: importCommand,
}

type ContextException = {
  readonly skipSchemaGate: boolean
  readonly skipMigrationHook: boolean
  readonly skipStreakHook: boolean
}

const NO_EXCEPTION: ContextException = {
  skipSchemaGate: false,
  skipMigrationHook: false,
  skipStreakHook: false,
}

const CONTEXT_EXCEPTIONS: Record<string, ContextException> = {
  export: { skipSchemaGate: true, skipMigrationHook: true, skipStreakHook: true },
  import: { skipSchemaGate: false, skipMigrationHook: true, skipStreakHook: true },
  init: { skipSchemaGate: false, skipMigrationHook: false, skipStreakHook: true },
}


export function runCli(argv: readonly string[]): void {
  setColorEnabled(
    resolveColorEnabled(process.env, process.stdout.isTTY === true, {
      json: argv.includes('--json'),
      noColor: argv.includes('--no-color'),
    }),
  )

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

  const json = hasFlag(args, 'json')
  const commandName = args.positionals[0]
  if (commandName === undefined) {
    if (json) {
      const error = CliError.usage('nenhum comando informado')
      printError(error, { json: true })
      process.exitCode = error.exitCode
      return
    }
    process.stderr.write(`${USAGE}\n`)
    process.exitCode = 1
    return
  }

  if (commandName === 'tui') {
    runTuiCommand(args, json)
    return
  }

  const command = COMMANDS[commandName]
  if (command === undefined) {
    const error = CliError.usage(`comando desconhecido: ${commandName}`)
    printError(error, { json })
    process.exitCode = error.exitCode
    return
  }

  const commandArgs: ParsedArgs = { positionals: args.positionals.slice(1), flags: args.flags }

  try {
    const exception = CONTEXT_EXCEPTIONS[commandName] ?? NO_EXCEPTION
    const result = withContext(
      {
        dbPath: valueOf(args, 'db'),
        json,
        noInput: hasFlag(args, 'no-input'),
        exportDir: valueOf(args, 'export-dir'),
        skipSchemaGate: exception.skipSchemaGate,
        skipMigrationHook: exception.skipMigrationHook,
        skipStreakHook: exception.skipStreakHook,
      },
      (ctx) => command(commandArgs, ctx),
    )
    printSuccess(commandName, result, { json })
  } catch (error) {
    printError(error, { json })
    process.exitCode = exitCodeFor(error)
  }
}

function runTuiCommand(args: ParsedArgs, json: boolean): void {
  const commandArgs: ParsedArgs = { positionals: args.positionals.slice(1), flags: args.flags }

  try {
    assertPositionals(commandArgs, 0, 0, 'tui')
  } catch (error) {
    printError(error, { json })
    process.exitCode = exitCodeFor(error)
    return
  }

  const refusal = refuseTui({
    stdinTty: process.stdin.isTTY === true,
    stdoutTty: process.stdout.isTTY === true,
    noInput: hasFlag(args, 'no-input'),
    json,
  })
  if (refusal !== null) {
    printError(refusal, { json })
    process.exitCode = refusal.exitCode
    return
  }

  void runTui({
    dbPath: valueOf(args, 'db'),
    exportDir: valueOf(args, 'export-dir'),
    deps: systemDeps,
    env: process.env,
    color: colorEnabled(),
    terminal: processTerminal(),
  })
    .then((outcome) => {
      process.exitCode = exitCodeOf(outcome)
      process.stdin.pause()
    })
    .catch((error: unknown) => {
      printError(error, { json })
      process.exitCode = exitCodeFor(error)
      process.stdin.pause()
    })
}
