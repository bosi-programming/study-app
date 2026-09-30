const RULE_UTF8 = '─'
const RULE_ASCII = '-'

export function ruleLine(columns: number, utf8: boolean): string {
  return (utf8 ? RULE_UTF8 : RULE_ASCII).repeat(columns)
}
