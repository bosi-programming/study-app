import { join } from 'node:path'
import { build } from 'esbuild'

const cliDir = import.meta.dirname

await build({
  entryPoints: [join(cliDir, 'src/main.ts')],
  outfile: join(cliDir, 'dist/main.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  logLevel: 'info',
})
