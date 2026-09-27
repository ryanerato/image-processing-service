import { after, afterEach, before } from 'node:test'
import { createApp } from '../app.ts'
import { mswServer, startMswServer } from './mswServer.ts'
import { startTestServer, type TestServer } from './startTestServer.ts'

export interface IntegrationServer {
  /** Builds an absolute URL on the running app, e.g. `url('/image', { url: '...' })`. */
  url(path: string, query?: Record<string, string | readonly string[]>): string
}

/**
 * Registers suite hooks that start MSW and the real app on an ephemeral port.
 * Call once at the top of a `describe` block.
 */
export function useIntegrationServer(): IntegrationServer {
  let server: TestServer | undefined

  before(async () => {
    startMswServer()
    server = await startTestServer(createApp())
  })

  afterEach(() => {
    mswServer.resetHandlers()
  })

  after(async () => {
    await server?.close()
    mswServer.close()
  })

  return {
    url(path, query = {}) {
      if (!server) {
        throw new Error('Integration server is not running; call url() inside a test')
      }
      const search = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        for (const item of typeof value === 'string' ? [value] : value) {
          search.append(key, item)
        }
      }
      const queryString = search.size > 0 ? `?${search}` : ''
      return `${server.baseUrl}${path}${queryString}`
    },
  }
}
