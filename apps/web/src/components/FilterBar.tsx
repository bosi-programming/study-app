import { Button, Input, Selector } from 'bosi-design-system/react'
import { type JSX } from 'react'
import {
  type CardFilters,
  INITIAL_FILTERS,
  isDateRangeInvalid,
  isFilterActive,
} from '../cards'

const DATE_RANGE_ERROR_MESSAGE = 'A data final deve ser posterior à inicial.'

export interface FilterBarProps {
  readonly filters: CardFilters
  readonly categories: readonly string[]
  readonly onChange: (filters: CardFilters) => void
}

export function FilterBar({
  filters,
  categories,
  onChange,
}: FilterBarProps): JSX.Element {
  const dateRangeError: string | undefined = isDateRangeInvalid(filters)
    ? DATE_RANGE_ERROR_MESSAGE
    : undefined
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-4 md:flex-row">
        <Input
          name="start"
          label="De"
          type="date"
          value={filters.start}
          setValue={(value) => onChange({ ...filters, start: value })}
        />
        <Input
          name="end"
          label="Até"
          type="date"
          value={filters.end}
          error={dateRangeError ?? ''}
          setValue={(value) => onChange({ ...filters, end: value })}
        />
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <Selector
          name="category"
          label="Categoria"
          placeholder="Todas as categorias"
          disabled={categories.length === 0}
          value={filters.category}
          options={categories.map((category) => ({
            id: category,
            label: category,
          }))}
          onChange={(event) =>
            onChange({ ...filters, category: event.target.value })
          }
        />
        {isFilterActive(filters) ? (
          <Button onClick={() => onChange(INITIAL_FILTERS)}>
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </div>
    </div>
  )
}
