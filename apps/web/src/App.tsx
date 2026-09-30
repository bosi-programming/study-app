import { DueDate, useDue } from './features/due/index.ts'

const DEMO_CREATED_ON = '2026-09-20'
const DEMO_DIFFICULTY = 3

function DueFeature() {
  const estimate = useDue(DEMO_DIFFICULTY, DEMO_CREATED_ON)

  return <DueDate estimate={estimate} />
}

export function App() {
  return (
    <main>
      <h1>Study</h1>
      <DueFeature />
    </main>
  )
}
