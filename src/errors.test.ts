import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { AppError, fromError } from './errors.ts'

describe('fromError', () => {
  test('passes AppErrors through unchanged', () => {
    const error = new AppError(404, 'NOT_FOUND', 'Not found')
    assert.equal(fromError(error), error)
  })

  test('keeps an unexpected error as the cause of a generic 500', () => {
    const original = new Error('boom')
    const error = fromError(original)
    assert.equal(error.status, 500)
    assert.equal(error.code, 'INTERNAL_ERROR')
    assert.equal(error.message, 'Something went wrong')
    assert.equal(error.cause, original)
  })
})
