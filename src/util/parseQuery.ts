import { type Request } from 'express'
import { z } from 'zod'

export default function parseQuery<S extends z.ZodType>(req: Request, schema: S): z.output<S> {
  return schema.parse(req.query)
}
