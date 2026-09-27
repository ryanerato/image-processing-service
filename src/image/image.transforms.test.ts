import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { crc32 } from 'node:zlib'
import sharp from 'sharp'

import { transformImage, type ImageOptions } from './image.transforms.ts'

/** Generates a solid-color source image so tests know the exact input size. */
function makeImage(width = 400, height = 300, format: 'png' | 'jpeg' = 'png') {
  return sharp({
    create: { width, height, channels: 3, background: '#f00' },
  })
    .toFormat(format)
    .toBuffer()
}

/**
 * Returns a tiny PNG whose header claims the given dimensions. Sharp checks the
 * pixel limit against the header, so this avoids encoding a huge real image.
 */
async function makeOversizedPngHeader(width: number, height: number) {
  const png = Buffer.from(await makeImage(1, 1))
  // IHDR: length (4) + type (4) at offset 8, data (13) at offset 16, CRC at 29.
  png.writeUInt32BE(width, 16)
  png.writeUInt32BE(height, 20)
  png.writeUInt32BE(crc32(png.subarray(12, 29)), 29)
  return png
}

function options(overrides: Partial<ImageOptions> = {}): ImageOptions {
  return { crop: 'fit', ...overrides }
}

describe('transformImage', () => {
  describe('resize', () => {
    test('keeps the aspect ratio when only width is given (400×300 → 100×75)', async () => {
      const { info } = await transformImage(await makeImage(400, 300), options({ width: 100 }))
      assert.equal(info.width, 100)
      assert.equal(info.height, 75)
    })

    test('enlarges when the requested size is larger than the source', async () => {
      const { info } = await transformImage(await makeImage(400, 300), options({ width: 800 }))
      assert.equal(info.width, 800)
      assert.equal(info.height, 600)
    })
  })

  describe('crop', () => {
    test('fit (the default) stays inside the width × height box', async () => {
      const { info } = await transformImage(
        await makeImage(400, 300),
        options({ width: 100, height: 100 }),
      )
      assert.equal(info.width, 100)
      assert.equal(info.height, 75)
    })

    test('fill produces exactly width × height', async () => {
      const { info } = await transformImage(
        await makeImage(400, 300),
        options({ width: 100, height: 100, crop: 'fill' }),
      )
      assert.equal(info.width, 100)
      assert.equal(info.height, 100)
    })

    test('scale stretches to exactly width × height', async () => {
      const { info } = await transformImage(
        await makeImage(400, 300),
        options({ width: 100, height: 50, crop: 'scale' }),
      )
      assert.equal(info.width, 100)
      assert.equal(info.height, 50)
    })
  })

  describe('encoding', () => {
    test('converts to the requested format', async () => {
      const { info } = await transformImage(await makeImage(), options({ format: 'webp' }))
      assert.equal(info.format, 'webp')
    })

    test('keeps the source format when only quality is given', async () => {
      const { info } = await transformImage(
        await makeImage(400, 300, 'jpeg'),
        options({ quality: 50 }),
      )
      assert.equal(info.format, 'jpeg')
    })

    test('falls back to PNG when the source format can\'t be written (SVG)', async () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="red"/></svg>')
      const { info } = await transformImage(svg, options({ quality: 80 }))
      assert.equal(info.format, 'png')
    })

    test('keeps AVIF when only quality is given for an AVIF source', async () => {
      const avif = await sharp(await makeImage()).avif({ effort: 0 }).toBuffer()
      const { info } = await transformImage(avif, options({ quality: 50 }))
      // sharp reports AVIF output as 'heif'
      assert.equal(info.format, 'heif')
    })
  })

  describe('errors', () => {
    test("throws UNPROCESSABLE_IMAGE for bytes that aren't an image", async () => {
      await assert.rejects(transformImage(Buffer.from('not an image'), options({ width: 100 })), {
        status: 422,
        code: 'UNPROCESSABLE_IMAGE',
      })
    })

    test('throws UNPROCESSABLE_IMAGE when the input exceeds the pixel limit', async () => {
      const input = await makeOversizedPngHeader(8193, 8192)
      await assert.rejects(transformImage(input, options({ width: 100 })), {
        status: 422,
        code: 'UNPROCESSABLE_IMAGE',
      })
    })
  })
})
