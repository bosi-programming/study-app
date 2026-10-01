import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const UNRELEASABLE = '0.0.0'

export const repoRoot = resolve(import.meta.dirname, '../../..')

type Manifest = { readonly version?: string }

function readManifestVersion(manifestPath: string): string {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error(`manifesto sem versão: ${manifestPath}`)
  }
  return manifest.version
}

export function webVersion(root: string = repoRoot): string {
  return readManifestVersion(resolve(root, 'apps/web/package.json'))
}

export function desktopVersion(root: string = repoRoot): string {
  return readManifestVersion(resolve(root, 'apps/desktop/package.json'))
}

export function assertReleasableVersion(version: string): string {
  if (!SEMVER.test(version)) {
    throw new Error(`versão fora de semver: ${version}`)
  }
  if (version === UNRELEASABLE) {
    throw new Error(`versão ${UNRELEASABLE} não tem significado de release: suba apps/web/package.json`)
  }
  return version
}
