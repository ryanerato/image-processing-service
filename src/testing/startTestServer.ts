import type { AddressInfo } from 'node:net'
import type { Express } from 'express'

export interface TestServer {
  readonly baseUrl: string
  close(): Promise<void>
}

/** Starts the app on an ephemeral port on the loopback interface. */
export function startTestServer(app: Express): Promise<TestServer> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', (error?: Error) => {
      if (error) {
        reject(error)
        return
      }
      const { port } = server.address() as AddressInfo
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((resolveClose, rejectClose) => {
            server.close((closeError) => (closeError ? rejectClose(closeError) : resolveClose()))
          }),
      })
    })
  })
}
