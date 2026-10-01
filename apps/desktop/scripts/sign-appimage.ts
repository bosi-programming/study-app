import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve(import.meta.dirname, '../dist')

function appImageArtifact(): string {
  if (!existsSync(distDir)) throw new Error(`dist do empacotamento ausente: ${distDir}`)
  const name = readdirSync(distDir).find((entry) => entry.endsWith('.AppImage'))
  if (name === undefined) throw new Error(`AppImage não encontrado em ${distDir}`)
  return resolve(distDir, name)
}

function required(name: string): string {
  const value = process.env[name]
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} ausente: o AppImage não sai assinado`)
  }
  return value
}

const keyId = required('GPG_KEY_ID')
const passphrase = required('GPG_PASSPHRASE')
const artifact = appImageArtifact()

const result = spawnSync(
  'gpg',
  [
    '--batch',
    '--yes',
    '--pinentry-mode',
    'loopback',
    '--passphrase-fd',
    '0',
    '--local-user',
    keyId,
    '--detach-sign',
    '--armor',
    '--output',
    `${artifact}.sig`,
    artifact,
  ],
  { input: passphrase, stdio: ['pipe', 'inherit', 'inherit'] },
)

if (result.status !== 0) {
  throw new Error(`gpg falhou ao assinar ${artifact} (status ${result.status ?? 'sem status'})`)
}

console.log(`assinatura destacada: ${artifact}.sig`)
