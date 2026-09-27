import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SOURCE_MAX_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  SOURCE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
})

export const config = schema.parse(process.env)
