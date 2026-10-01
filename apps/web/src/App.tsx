import { type RefObject, useEffect, useRef, useState } from 'react'
import { type Deps } from '@study/core'
import { AddView, useAdd } from './features/add/index.ts'
import { ItemDetailView, ItemsView, useItemDetail, useItems } from './features/items/index.ts'
import { QueueView, useQueue } from './features/queue/index.ts'
import { ReviewView, useReview } from './features/review/index.ts'
import { StatsView, useStats } from './features/stats/index.ts'
import { messageForError } from './errors.ts'
import { ErrorNotice, LoadingNotice } from './notices.tsx'
import { rollQueueStreak } from './queueStreak.ts'
import { hrefFor, routeKey, type Route } from './routing.ts'
import { type Store } from './store/index.ts'
import { strings } from './strings.ts'
import { type HashNavigation, useHashRoute } from './useHashRoute.ts'

export type AppProps = {
  readonly store: Store
  readonly deps: Deps
}

type BootState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready' }

const NAV: readonly { readonly route: Route; readonly label: string }[] = [
  { route: { name: 'queue' }, label: strings.app.navQueue },
  { route: { name: 'add' }, label: strings.app.navAdd },
  { route: { name: 'items' }, label: strings.app.navItems },
  { route: { name: 'stats' }, label: strings.app.navStats },
]

export function App({ store, deps }: AppProps) {
  const navigation = useHashRoute()
  const boot = useBoot(store, deps)
  const heading = useNavigationFocus(routeKey(navigation.route))

  return (
    <main>
      <h1 ref={heading}>{strings.app.title}</h1>
      <Navigation current={navigation.route} />
      {boot.status === 'loading' ? <LoadingNotice /> : null}
      {boot.status === 'error' ? <ErrorNotice message={boot.message} /> : null}
      {boot.status === 'ready' ? (
        <Screen route={navigation.route} navigate={navigation.navigate} store={store} deps={deps} />
      ) : null}
    </main>
  )
}

function useNavigationFocus(key: string): RefObject<HTMLHeadingElement | null> {
  const heading = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    heading.current?.focus()
  }, [key])

  return heading
}

function useBoot(store: Store, deps: Deps): BootState {
  const [boot, setBoot] = useState<BootState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    setBoot({ status: 'loading' })
    rollQueueStreak(store, deps.clock.todayLocalDate()).then(
      () => {
        if (active) setBoot({ status: 'ready' })
      },
      (thrown: unknown) => {
        if (active) setBoot({ status: 'error', message: messageForError(thrown) })
      },
    )
    return () => {
      active = false
    }
  }, [store, deps])

  return boot
}

function Navigation({ current }: { readonly current: Route }) {
  return (
    <nav>
      <ul>
        {NAV.map((entry) => (
          <li key={entry.route.name}>
            <a
              href={hrefFor(entry.route)}
              aria-current={current.name === entry.route.name ? 'page' : undefined}
            >
              {entry.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

type ScreenProps = {
  readonly route: Route
  readonly navigate: HashNavigation['navigate']
  readonly store: Store
  readonly deps: Deps
}

function Screen({ route, navigate, store, deps }: ScreenProps) {
  switch (route.name) {
    case 'queue':
      return <QueueRoute store={store} deps={deps} />
    case 'add':
      return <AddRoute store={store} deps={deps} navigate={navigate} />
    case 'items':
      return <ItemsRoute store={store} />
    case 'item':
      return <ItemDetailRoute store={store} deps={deps} id={route.id} />
    case 'review':
      return <ReviewRoute store={store} deps={deps} id={route.id} />
    case 'stats':
      return <StatsRoute store={store} deps={deps} />
  }
}

function QueueRoute({ store, deps }: { readonly store: Store; readonly deps: Deps }) {
  const state = useQueue(store, deps)
  return <QueueView state={state} />
}

function AddRoute({
  store,
  deps,
  navigate,
}: {
  readonly store: Store
  readonly deps: Deps
  readonly navigate: HashNavigation['navigate']
}) {
  const controller = useAdd(store, deps, navigate)
  return <AddView controller={controller} />
}

function ItemsRoute({ store }: { readonly store: Store }) {
  const controller = useItems(store)
  return <ItemsView controller={controller} />
}

function ItemDetailRoute({
  store,
  deps,
  id,
}: {
  readonly store: Store
  readonly deps: Deps
  readonly id: string
}) {
  const controller = useItemDetail(store, deps, id)
  return <ItemDetailView controller={controller} />
}

function ReviewRoute({
  store,
  deps,
  id,
}: {
  readonly store: Store
  readonly deps: Deps
  readonly id: string
}) {
  const controller = useReview(store, deps, id)
  return <ReviewView controller={controller} />
}

function StatsRoute({ store, deps }: { readonly store: Store; readonly deps: Deps }) {
  const state = useStats(store, deps)
  return <StatsView state={state} />
}
