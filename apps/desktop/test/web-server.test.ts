import { type AddressInfo, type Server, createServer } from 'node:net'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { startWebServer } from './web-server.ts'

let blocker: Server
let occupiedPort: number

beforeAll(async () => {
  blocker = createServer()
  await new Promise<void>((settle) => blocker.listen(0, 'localhost', () => settle()))
  occupiedPort = (blocker.address() as AddressInfo).port
})

afterAll(async () => {
  await new Promise<void>((settle, fail) => {
    blocker.close((cause) => (cause ? fail(cause) : settle()))
  })
})

it('recusa iniciar quando a porta já está ocupada', async () => {
  await expect(startWebServer(occupiedPort)).rejects.toThrow(
    `a porta ${occupiedPort} já está ocupada`,
  )
})
