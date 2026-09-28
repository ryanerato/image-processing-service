import { fileURLToPath } from 'node:url'
import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import { pinoHttp } from 'pino-http'

import { fromError } from './errors.ts'
import { logger } from './util/logger.ts'
import ImageRouter from './image/image.router.ts'

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const error = fromError(err)
  if (error.status >= 500 || error.cause) req.log.error({ err: error }, error.code)
  res.status(error.status).json({
    error: { code: error.code, message: error.message, details: error.details },
  })
}

// Resolved relative to this file so the server works from any directory
const SAMPLES_DIR = fileURLToPath(new URL('../samples', import.meta.url))

export function createApp(): Express {
  const app = express()

  app.disable('x-powered-by')
  app.set('query parser', 'simple')

  // Log only what's needed to debug a request: source URLs can carry signed
  // tokens, and headers and client IPs are personal data
  app.use(pinoHttp({
    logger,
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, path: req.url.split('?')[0] }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }))

  app.use('/samples', express.static(SAMPLES_DIR))
  app.use(['/process', '/image'], ImageRouter)

  // Must be the last handler set in order to catch all errors
  app.use(errorHandler)

  return app
}
