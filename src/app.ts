import { fileURLToPath } from 'node:url'
import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import { ZodError } from 'zod'
import { pinoHttp } from 'pino-http'


import { AppError } from './errors.ts'
import { logger } from './util/logger.ts'

function fromError(err: unknown): AppError {
  if (err instanceof AppError) return err
  if (err instanceof ZodError) {
    return new AppError(400, 'INVALID_REQUEST', 'Invalid query parameters', {
      details: err.issues.map((i) => ({
        // Unknown keys have no path; name them so the caller can see which param was wrong
        field: i.code === 'unrecognized_keys' ? i.keys.join(', ') : i.path.join('.'),
        message: i.message,
      }))
    })
  }
  return new AppError(500, 'INTERNAL_ERROR', 'Something went wrong', { cause: err })
}

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const error = fromError(err)
  if (error.status >= 500 || error.cause) req.log.error({ err: error }, error.code)
  res.status(error.status).json({
    error: { code: error.code, message: error.message, details: error.details },
  })
}

import ImageRouter from './image/image.router.ts'

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

  app.use(errorHandler)

  return app
}
