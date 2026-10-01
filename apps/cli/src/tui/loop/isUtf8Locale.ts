import { type TuiLocaleEnv } from './types.ts'

const UTF8_PATTERN = /utf-?8/i

function localeValue(value: string | undefined): string | null {
  return value === undefined || value === '' ? null : value
}

export function isUtf8Locale(env: TuiLocaleEnv): boolean {
  const locale = localeValue(env.LC_ALL) ?? localeValue(env.LC_CTYPE) ?? localeValue(env.LANG)
  if (locale === null) return true
  return UTF8_PATTERN.test(locale)
}
