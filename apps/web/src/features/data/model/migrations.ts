export type DumpStep = (dump: Record<string, unknown>) => Record<string, unknown>

export type MigrationTable = Readonly<Record<number, DumpStep>>

export const CURRENT_SCHEMA_VERSION = 1

export const MIGRATIONS: MigrationTable = {}

export function migrateDump(
  dump: Record<string, unknown>,
  fromVersion: number,
  migrations: MigrationTable = MIGRATIONS,
  currentVersion: number = CURRENT_SCHEMA_VERSION,
): Record<string, unknown> {
  let migrated = dump
  for (let version = fromVersion + 1; version <= currentVersion; version += 1) {
    const step = migrations[version]
    if (step !== undefined) migrated = step(migrated)
  }
  return { ...migrated, schema_version: currentVersion }
}
