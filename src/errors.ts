
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

export class UnprocessableImageError extends AppError {
  constructor(err: unknown) {
    super(422, 'UNPROCESSABLE_IMAGE', 'Source could not be processed as an image', { cause: err })
  }
}
