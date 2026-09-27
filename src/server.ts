import { createApp } from './app.ts'
import { logger } from './util/logger.ts'

const DEFAULT_PORT = 3000

function readPort(): number {
  const rawPort = process.env['PORT']
  if (rawPort === undefined || rawPort === '') {
    return DEFAULT_PORT
  }
  const port = Number(rawPort)
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT "${rawPort}": expected an integer between 0 and 65535`)
  }
  return port
}

const port = readPort()
const server = createApp().listen(port, (error?: Error) => {
  if (error) {
    logger.error({ err: error }, 'Failed to start server')
    process.exit(1)
  }
  logger.info(`Server listening on port ${port}`)
})

function shutdown(signal: NodeJS.Signals): void {
  logger.info(`Received ${signal}, shutting down`)
  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'Error during shutdown')
      process.exit(1)
    }
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
