import { useCallback, useEffect, useState } from 'react'
import { type Route, hrefFor, parseHash } from './routing.ts'

export type HashNavigation = {
  readonly route: Route
  navigate(route: Route): void
}

export function useHashRoute(): HashNavigation {
  const [route, setRoute] = useState<Route>(() => parseHash(globalThis.location.hash))

  useEffect(() => {
    const onChange = (): void => setRoute(parseHash(globalThis.location.hash))
    globalThis.addEventListener('hashchange', onChange)
    return () => globalThis.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((next: Route) => {
    globalThis.location.hash = hrefFor(next)
    setRoute(next)
  }, [])

  return { route, navigate }
}
