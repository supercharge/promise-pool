'use strict'

const { test } = require('uvu')
const { expect } = require('expect')
const { PromisePool } = require('../dist')

const pause = timeout => new Promise(resolve => setTimeout(resolve, timeout))

test('stops the pool from .process', async () => {
  const timeouts = [10, 20, 30, 40, 50]

  const { results } = await PromisePool
    .for(timeouts)
    .process(async (timeout, _, pool) => {
      if (timeout > 30) {
        return pool.stop()
      }

      await pause(timeout)
      return timeout
    })

  expect(results).toEqual([10, 20, 30])
})

test('stops the pool from .process without returning pool.stop', async () => {
  const timeouts = [10, 20, 30, 40, 50]

  const { results } = await PromisePool
    .for(timeouts)
    .process(async (timeout, _, pool) => {
      if (timeout === 30) {
        pool.stop()
      }

      await pause(timeout)
      return timeout
    })

  expect(results).toEqual([10, 20])
})

test('stops the pool from sync .handleError', async () => {
  const timeouts = [10, 20, 30, 40, 50]

  const { results } = await PromisePool
    .withConcurrency(2)
    .for(timeouts)
    .withConcurrency(2)
    .handleError((_, __, pool) => {
      return pool.stop()
    })
    .process(async timeout => {
      if (timeout > 30) {
        throw new Error('stop the pool')
      }

      await pause(timeout)
      return timeout
    })

  expect(results).toEqual([10, 20, 30])
})

test('stops the pool from async error handler', async () => {
  const timeouts = [10, 20, 30, 40, 50]

  const { results } = await PromisePool
    .for(timeouts)
    .withConcurrency(2)
    .handleError(async (_, __, pool) => {
      pool.stop()
    })
    .process(async (timeout) => {
      if (timeout < 30) {
        throw new Error('stop the pool')
      }

      await pause(timeout)
      return timeout
    })

  expect(results).toEqual([])
})

test.run()
