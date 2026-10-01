import { resolve } from 'node:path'
import { run } from './run.ts'
import { assertSigningReady, signingPlan, signingPlatform } from './signing.ts'
import { assertReleasableVersion, webVersion } from './version.ts'

const desktopDir = resolve(import.meta.dirname, '..')
const rootDir = resolve(desktopDir, '../..')
const release = process.env.STUDY_RELEASE === '1'

function pnpm(args: readonly string[], env: NodeJS.ProcessEnv): void {
  run('pnpm', args, { cwd: desktopDir, env })
}

const version = assertReleasableVersion(webVersion(rootDir))

pnpm(['--filter', '@study/web', 'build'], process.env)

const plan = assertSigningReady(signingPlan(signingPlatform(process.platform), process.env), {
  release,
})

const env: NodeJS.ProcessEnv = { ...process.env }
if ((env.CSC_LINK ?? '').length === 0) env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
if (!plan.signed) {
  console.warn(
    `empacotamento sem assinatura de ${plan.platform}: faltam ${plan.missing.join(', ')}`,
  )
}

pnpm(
  [
    'exec',
    'electron-builder',
    '--config',
    'electron-builder.yml',
    `--config.extraMetadata.version=${version}`,
    '--publish',
    'never',
  ],
  env,
)
