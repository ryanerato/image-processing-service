import { fileURLToPath } from 'node:url'
import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import { pinoHttp } from 'pino-http'

import { fromError, AppError } from './errors.ts'
import { logger } from './util/logger.ts'
import ImageRouter from './image/image.router.ts'

// `next` function required for Express to register as an error handler
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

  // Necessary if running behind a load balancer.
  // Registered before logging so frequent health checks don't flood the logs.
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' })
  })

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

  // No routes matched, return simple error
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`))
  })

  // Must be the last handler set in order to catch all errors
  app.use(errorHandler)

  return app
}
