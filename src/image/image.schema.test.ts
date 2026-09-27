import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import ImageQuerySchema from './image.schema.ts'

const VALID_URL = 'https://images.test/cat.png'

function parse(query: Record<string, string>) {
  return ImageQuerySchema.safeParse({ url: VALID_URL, ...query })
}

describe('ImageQuerySchema', () => {
  describe('crop', () => {
    test('accepts a known crop mode', () => {
      const result = parse({ crop: 'fill' })
      assert.equal(result.success, true)
      assert.equal(result.data?.crop, 'fill')
    })

    test('rejects an unknown crop mode', () => {
      assert.equal(parse({ crop: 'stretch' }).success, false)
    })
  })

  describe('format', () => {
    test('accepts a supported format', () => {
      const result = parse({ format: 'webp' })
      assert.equal(result.success, true)
      assert.equal(result.data?.format, 'webp')
    })

    test('rejects an unsupported format', () => {
      assert.equal(parse({ format: 'bmp' }).success, false)
    })

    test('accepts jpg as an alias for jpeg', () => {
      const result = parse({ format: 'jpg' })
      assert.equal(result.success, true)
      assert.equal(result.data?.format, 'jpeg')
    })
  })

  describe('width', () => {
    test('accepts a value within range', () => {
      const result = parse({ width: '800' })
      assert.equal(result.success, true)
      assert.equal(result.data?.width, 800)
    })

    test('rejects a value below the minimum', () => {
      assert.equal(parse({ width: '0' }).success, false)
    })

    test('rejects a value above the maximum', () => {
      assert.equal(parse({ width: '4097' }).success, false)
    })
  })

  describe('height', () => {
    test('accepts a value within range', () => {
      const result = parse({ height: '600' })
      assert.equal(result.success, true)
      assert.equal(result.data?.height, 600)
    })

    test('rejects a value below the minimum', () => {
      assert.equal(parse({ height: '0' }).success, false)
    })

    test('rejects a value above the maximum', () => {
      assert.equal(parse({ height: '4097' }).success, false)
    })
  })

  describe('quality', () => {
    test('accepts a value within range', () => {
      const result = parse({ quality: '80' })
      assert.equal(result.success, true)
      assert.equal(result.data?.quality, 80)
    })

    test('rejects a value below the minimum', () => {
      assert.equal(parse({ quality: '0' }).success, false)
    })

    test('rejects a value above the maximum', () => {
      assert.equal(parse({ quality: '101' }).success, false)
    })
  })
})
