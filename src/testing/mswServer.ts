import { setupServer } from 'msw/node'

const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]'])

/**
 * Intercepts outbound HTTP from the app under test. Add per-test handlers with
 * `mswServer.use(...)`. Requests to the local test server pass through; any
 * other unmocked outbound request is blocked and answered with a 500.
 *
 * The callback throws rather than relying on `print.error()` alone: in MSW
 * 2.15 that only logs, and the built-in "error" strategy exempts asset URLs
 * such as `*.png`, which this service will fetch.
 */
export const mswServer = setupServer()

export function startMswServer(): void {
  mswServer.listen({
    onUnhandledRequest(request, print) {
      if (LOCAL_HOSTNAMES.has(new URL(request.url).hostname)) {
        return
      }
      print.error()
      throw new Error(`Unhandled outbound request: ${request.method} ${request.url}`)
    },
  })
}
