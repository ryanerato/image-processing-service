import { AppError } from "../errors.ts"
import { config } from '../config.ts'

const MAX_MB = 10

export class MaxSizeExceededError extends AppError {
  constructor() {
    super(422, 'CONTENT_TOO_LARGE', `Content exceeds ${MAX_MB}MB limit`)
  }
}

export type FetchContentOptions = {
  timeoutMs?: number
}

export async function fetchContent(url: string, { timeoutMs = config.SOURCE_TIMEOUT_MS }: FetchContentOptions = {}): Promise<Buffer> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) {
      throw new AppError(502, 'SOURCE_ERROR', `Source responded with ${res.status}`)
    }

    // Reject early if the declared size is too big; the header can be missing or wrong, so the body is counted below too
    if (Number(res.headers.get('content-length')) > config.SOURCE_MAX_BYTES) throw new MaxSizeExceededError()

    // Validate actual image size as it is loaded
    const chunks: Uint8Array[] = []
    let total = 0
    for await (const chunk of res.body ?? []) {
      total += chunk.length
      if (total > config.SOURCE_MAX_BYTES) throw new MaxSizeExceededError()
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  } catch (err) {
    if (err instanceof AppError) throw err
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new AppError(504, 'SOURCE_TIMEOUT', `Source did not respond within ${timeoutMs}ms`, { cause: err })
    }
    throw new AppError(502, 'SOURCE_UNREACHABLE', 'Could not reach the source URL', { cause: err })
  }
}
