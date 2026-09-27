import { createApp } from './app.ts'
import { logger } from './util/logger.ts'
import { config } from './config.ts'

const port = config.PORT

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
