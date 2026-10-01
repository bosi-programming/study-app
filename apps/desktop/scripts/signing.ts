export type Platform = 'darwin' | 'win32' | 'linux'

export type SigningTarget = {
  readonly artifact: string
  readonly tool: string
  readonly env: readonly string[]
  readonly missing: readonly string[]
}

export type SigningPlan = {
  readonly platform: Platform
  readonly targets: readonly SigningTarget[]
  readonly missing: readonly string[]
  readonly signed: boolean
}

type Environment = Readonly<Record<string, string | undefined>>

const PLANS: Record<Platform, readonly Omit<SigningTarget, 'missing'>[]> = {
  darwin: [
    { artifact: 'dmg', tool: 'codesign', env: ['CSC_LINK', 'CSC_KEY_PASSWORD'] },
    {
      artifact: 'dmg',
      tool: 'notarytool',
      env: ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'],
    },
  ],
  win32: [{ artifact: 'nsis', tool: 'signtool', env: ['CSC_LINK', 'CSC_KEY_PASSWORD'] }],
  linux: [
    {
      artifact: 'AppImage',
      tool: 'gpg',
      env: ['GPG_PRIVATE_KEY', 'GPG_KEY_ID', 'GPG_PASSPHRASE'],
    },
  ],
}

function isSet(env: Environment, name: string): boolean {
  const value = env[name]
  return value !== undefined && value.length > 0
}

export function signingPlatform(value: string): Platform {
  if (value === 'darwin' || value === 'win32' || value === 'linux') return value
  throw new Error(`plataforma sem plano de assinatura: ${value}`)
}

export function signingPlan(platform: Platform, env: Environment): SigningPlan {
  const targets = PLANS[platform].map((target) => ({
    ...target,
    missing: target.env.filter((name) => !isSet(env, name)),
  }))
  const missing = [...new Set(targets.flatMap((target) => target.missing))]
  return { platform, targets, missing, signed: missing.length === 0 }
}

export function assertSigningReady(plan: SigningPlan, options: { release: boolean }): SigningPlan {
  if (!plan.signed && options.release) {
    throw new Error(
      `release sem os segredos de assinatura de ${plan.platform}: faltam ${plan.missing.join(', ')}`,
    )
  }
  return plan
}
