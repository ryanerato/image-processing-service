import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import { ZodError } from 'zod'

import { AppError } from './errors.ts'

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
  if (error.status >= 500) console.error(err)
  res.status(error.status).json({
    error: { code: error.code, message: error.message, details: error.details },
  })
}

/**
 * Builds the Express application. No routes, auth, or body parsers yet
 * query strings are parsed with Node's `querystring` ("simple" parser), so
 * values are strings or string arrays with no nested objects.
 */
export function createApp(): Express {
  const app = express()

  app.disable('x-powered-by')
  app.set('query parser', 'simple')

  app.use(errorHandler)

  return app
}
