import { ZodError } from 'zod'

export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, options?: { details?: unknown; cause?: unknown }) {
    super(message, { cause: options?.cause })
    this.status = status
    this.code = code
    this.details = options?.details
  }
}

export function fromError(err: unknown): AppError {
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

export class UnprocessableImageError extends AppError {
  constructor(err: unknown) {
    super(422, 'UNPROCESSABLE_IMAGE', 'Source could not be processed as an image', { cause: err })
  }
}
