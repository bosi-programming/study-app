/**
 * Time as a port. `nowUtc` stamps events; `todayLocalDate` gives the local
 * `YYYY-MM-DD` the scheduling rule is anchored on. Core never derives a
 * timezone, so each runtime injects its own.
 */
export type Clock = {
  nowUtc(): string
  todayLocalDate(): string
}

/** Ids are a port too: core never reaches for `crypto`. */
export type IdGenerator = () => string

export type Deps = {
  clock: Clock
  ids: IdGenerator
}
