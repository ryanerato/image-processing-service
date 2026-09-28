import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { http, HttpResponse } from 'msw'
import sharp from 'sharp'

import { useIntegrationServer } from './testing/integrationServer.ts'
import { mswServer } from './testing/mswServer.ts'

const SOURCE_URL = 'https://images.test/cat.png'

function makePng() {
  return sharp({ create: { width: 40, height: 30, channels: 3, background: '#f00' } })
    .png()
    .toBuffer()
}

function serveSource(body: Buffer | string, status = 200) {
  mswServer.use(http.get(SOURCE_URL, () => new HttpResponse(body, { status })))
}

type ErrorBody = {
  error: { code: string; message: string; details?: { field: string; message: string }[] }
}

async function assertErrorShape(response: Response, status: number, code: string) {
  assert.equal(response.status, status)
  const body = (await response.json()) as ErrorBody
  assert.equal(body.error.code, code)
  assert.equal(typeof body.error.message, 'string')
  return body.error
}

describe('Images', () => {
  const app = useIntegrationServer()

  test('/process returns the transformed image with the correct Content-Type', async () => {
    serveSource(await makePng())

    const response = await fetch(app.url('/process', { url: SOURCE_URL, format: 'webp' }))

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/webp')
    const { format } = await sharp(Buffer.from(await response.arrayBuffer())).metadata()
    assert.equal(format, 'webp')
  })

  test('/image alias behaves the same as /process', async () => {
    serveSource(await makePng())

    const response = await fetch(app.url('/image', { url: SOURCE_URL, format: 'webp' }))

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/webp')
  })

  test('400 INVALID_REQUEST with field details when url is missing', async () => {
    const response = await fetch(app.url('/process'))

    const error = await assertErrorShape(response, 400, 'INVALID_REQUEST')
    assert.ok(error.details?.some((detail) => detail.field === 'url'))
  })

  test('400 for a non-http(s) URL (file://)', async () => {
    const response = await fetch(app.url('/process', { url: 'file:///etc/passwd' }))

    await assertErrorShape(response, 400, 'INVALID_REQUEST')
  })

  test('400 when width exceeds 4096', async () => {
    const response = await fetch(app.url('/process', { url: SOURCE_URL, width: '4097' }))

    await assertErrorShape(response, 400, 'INVALID_REQUEST')
  })

  test('source failure comes back in the error shape (404 → 502)', async () => {
    serveSource('missing', 404)

    const response = await fetch(app.url('/process', { url: SOURCE_URL }))

    await assertErrorShape(response, 502, 'SOURCE_ERROR')
  })

  test('a non-image source returns 422 in the error shape', async () => {
    serveSource('not an image')

    const response = await fetch(app.url('/process', { url: SOURCE_URL, width: '100' }))

    await assertErrorShape(response, 422, 'UNPROCESSABLE_IMAGE')
  })

  test('successful responses are cacheable for 7 days', async () => {
    serveSource(await makePng())

    const response = await fetch(app.url('/process', { url: SOURCE_URL }))

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'public, max-age=604800')
  })

  test('error responses are not cacheable', async () => {
    serveSource('missing', 404)

    const response = await fetch(app.url('/process', { url: SOURCE_URL }))

    assert.equal(response.status, 502)
    assert.equal(response.headers.get('cache-control'), null)
  })

  test('unknown routes return 404 in the error shape', async () => {
    const response = await fetch(app.url('/nope'))

    await assertErrorShape(response, 404, 'NOT_FOUND')
  })

  test('health check responds ok', async () => {
    const response = await fetch(app.url('/health'))

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { status: 'ok' })
  })

  for (const [format, type] of [
    ['jpeg', 'image/jpeg'],
    ['png', 'image/png'],
    ['webp', 'image/webp'],
    ['avif', 'image/avif'],
    ['gif', 'image/gif'],
  ] as const) {
    test(`format=${format} responds with Content-Type ${type}`, async () => {
      serveSource(await makePng())

      const response = await fetch(app.url('/process', { url: SOURCE_URL, format }))

      assert.equal(response.status, 200)
      assert.equal(response.headers.get('content-type'), type)
    })
  }

  test('400 for an unknown query param', async () => {
    const response = await fetch(app.url('/process', { url: SOURCE_URL, widht: '100' }))

    const error = await assertErrorShape(response, 400, 'INVALID_REQUEST')
    assert.ok(error.details?.some((detail) => detail.field === 'widht'))
  })

  test('v changes the URL for cache busting without affecting the result', async () => {
    serveSource(await makePng())

    const response = await fetch(app.url('/process', { url: SOURCE_URL, v: '2' }))

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/png')
  })
})
