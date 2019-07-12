'use strict'

const Lab = require('@hapi/lab')
const PromisePool = require('..')
const { expect } = require('@hapi/code')

const { describe, it } = (exports.lab = Lab.script())

describe('Promise Pool', () => {
  it('creates a new PromisePool()', async () => {
    const pool = new PromisePool()
    expect(pool._concurrency).to.equal(10)
  })
})
