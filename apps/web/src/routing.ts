export type Route =
  | { readonly name: 'queue' }
  | { readonly name: 'add' }
  | { readonly name: 'items' }
  | { readonly name: 'item'; readonly id: string }
  | { readonly name: 'review'; readonly id: string }
  | { readonly name: 'stats' }

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export function parseHash(hash: string): Route {
  const path = hash.startsWith('#') ? hash.slice(1) : hash
  const segments = path.split('/').filter((segment) => segment.length > 0)
  const [first, second] = segments

  if (first === 'add') return { name: 'add' }
  if (first === 'stats') return { name: 'stats' }
  if (first === 'items') {
    return second === undefined ? { name: 'items' } : { name: 'item', id: decode(second) }
  }
  if (first === 'review' && second !== undefined) {
    return { name: 'review', id: decode(second) }
  }
  return { name: 'queue' }
}

export function routeKey(route: Route): string {
  return route.name === 'item' || route.name === 'review' ? `${route.name}:${route.id}` : route.name
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'queue':
      return '#/'
    case 'add':
      return '#/add'
    case 'items':
      return '#/items'
    case 'stats':
      return '#/stats'
    case 'item':
      return `#/items/${encodeURIComponent(route.id)}`
    case 'review':
      return `#/review/${encodeURIComponent(route.id)}`
  }
}
