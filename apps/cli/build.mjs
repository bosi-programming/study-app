import { join } from 'node:path'
import { build } from 'esbuild'

const dir = import.meta.dirname

await build({
  entryPoints: [join(dir, 'src/main.ts')],
  outfile: join(dir, 'dist/main.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  logLevel: 'info',
})
