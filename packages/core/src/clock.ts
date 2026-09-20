export type Clock = {
  nowUtc(): string
  todayLocalDate(): string
}

export type IdGenerator = () => string

export type Deps = {
  clock: Clock
  ids: IdGenerator
}
