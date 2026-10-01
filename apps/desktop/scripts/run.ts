import { spawnSync } from 'node:child_process'

export function shellFor(platform: NodeJS.Platform): boolean {
  return platform === 'win32'
}

export function run(
  command: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env: NodeJS.ProcessEnv },
): void {
  const result = spawnSync(command, [...args], {
    cwd: options.cwd,
    env: options.env,
    stdio: 'inherit',
    shell: shellFor(process.platform),
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} falhou (status ${result.status ?? 'sem status'})`)
  }
}
