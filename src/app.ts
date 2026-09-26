import express, { type Express } from 'express'

/**
 * Builds the Express application. No routes, auth, or body parsers yet
 * query strings are parsed with Node's `querystring` ("simple" parser), so
 * values are strings or string arrays with no nested objects.
 */
export function createApp(): Express {
  const app = express()

  app.disable('x-powered-by')
  app.set('query parser', 'simple')

  return app
}
