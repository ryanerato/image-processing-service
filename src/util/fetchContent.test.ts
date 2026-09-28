import assert from 'node:assert/strict'
import { after, afterEach, before, describe, test } from 'node:test'
import { delay, http, HttpResponse } from 'msw'

import { fetchContent } from './fetchContent.ts'
import { mswServer, startMswServer } from '../testing/mswServer.ts'
import { config } from '../config.ts'

const SOURCE_URL = 'https://images.test/cat.png'
const CHUNK_BYTES = 1024 * 1024

/** A streamed body, so the response carries no Content-Length header. */
function streamBody(size: number): ReadableStream<Uint8Array> {
  let remaining = size
  return new ReadableStream({
    pull(controller) {
      if (remaining <= 0) {
        controller.close()
        return
      }
      const chunk = new Uint8Array(Math.min(CHUNK_BYTES, remaining))
      remaining -= chunk.length
      controller.enqueue(chunk)
    },
  })
}

function respondWith(resolver: Parameters<typeof http.get>[1]) {
  mswServer.use(http.get(SOURCE_URL, resolver))
}

describe('fetchContent', () => {
  before(() => startMswServer())
  afterEach(() => mswServer.resetHandlers())
  after(() => mswServer.close())

  test('returns the body as a Buffer on 200', async () => {
    respondWith(() => HttpResponse.arrayBuffer(new Uint8Array([1, 2, 3]).buffer))

    const body = await fetchContent(SOURCE_URL)

    assert.ok(Buffer.isBuffer(body))
    assert.deepEqual([...body], [1, 2, 3])
  })

  test('returns an empty Buffer when the source has no body', async () => {
    respondWith(() => new HttpResponse(null, { status: 200 }))

    const body = await fetchContent(SOURCE_URL)

    assert.equal(body.length, 0)
  })

  test('throws SOURCE_ERROR (502) when the source returns 404', async () => {
    respondWith(() => new HttpResponse(null, { status: 404 }))

    await assert.rejects(fetchContent(SOURCE_URL), { status: 502, code: 'SOURCE_ERROR' })
  })

  test('throws TOO_LARGE when Content-Length exceeds the limit', async () => {
    respondWith(
      () => new HttpResponse('x', { headers: { 'Content-Length': String(config.SOURCE_MAX_BYTES + 1) } }),
    )

    await assert.rejects(fetchContent(SOURCE_URL), { code: 'CONTENT_TOO_LARGE' })
  })

  test('throws TOO_LARGE when the body exceeds the limit without Content-Length', async () => {
    respondWith(() => new HttpResponse(streamBody(config.SOURCE_MAX_BYTES + 1)))

    await assert.rejects(fetchContent(SOURCE_URL), { code: 'CONTENT_TOO_LARGE' })
  })

  test('accepts a body of exactly the limit', async () => {
    respondWith(() => new HttpResponse(streamBody(config.SOURCE_MAX_BYTES)))

    const body = await fetchContent(SOURCE_URL)

    assert.equal(body.length, config.SOURCE_MAX_BYTES)
  })

  test('throws SOURCE_TIMEOUT (504) when the source is slow', async () => {
    respondWith(async () => {
      await delay(200)
      return HttpResponse.text('late')
    })

    await assert.rejects(fetchContent(SOURCE_URL, { timeoutMs: 20 }), {
      status: 504,
      code: 'SOURCE_TIMEOUT',
    })
  })

  test('throws SOURCE_UNREACHABLE (502) on a network error', async () => {
    respondWith(() => HttpResponse.error())

    await assert.rejects(fetchContent(SOURCE_URL), { status: 502, code: 'SOURCE_UNREACHABLE' })
  })
})
