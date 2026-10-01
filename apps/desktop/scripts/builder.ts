import { assertReleasableVersion, webVersion } from './version.ts'

export function packageVersion(root: string): string {
  return assertReleasableVersion(webVersion(root))
}

export function builderArgs(version: string): readonly string[] {
  return [
    'exec',
    'electron-builder',
    '--config',
    'electron-builder.yml',
    `--config.extraMetadata.version=${version}`,
    '--publish',
    'never',
  ]
}
