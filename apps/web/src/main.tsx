import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'

const container = document.getElementById('root')
if (container === null) throw new Error('elemento #root ausente no index.html')

createRoot(container).render(<App />)
