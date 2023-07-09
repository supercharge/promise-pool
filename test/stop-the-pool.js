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

test('stops on time with async error handler', async () => {
  const timeouts = [50, 40, 30, 20, 10]

  const { results } = await PromisePool
    .for(timeouts)
    .withConcurrency(2)
    .useCorrespondingResults()
    .handleError(async (_, __, pool) => {
      pool.stop()
    })
    .process(async (timeout) => {
      if (timeout === 30) {
        throw new Error('stop the pool')
      }

      await pause(timeout)
      return timeout
    })

  expect(results).toEqual([
    50,
    40,
    PromisePool.failed,
    PromisePool.notRun,
    PromisePool.notRun
  ])
})

test('stops on time with timed stop call', async () => {
  const timeouts = [100, 200, 300]
  let processedSecond = false

  const { results } = await PromisePool
    .withConcurrency(1)
    .for(timeouts)
    .process(async (timeout, _, pool) => {
      // simulate user stopping pool after 50ms
      pause(50).then(() => pool.stop()).catch(() => {})

      if (timeout === 200) {
        processedSecond = true
      }
      // simulate load
      await pause(timeout)
      return timeout
    })

  // should only have finished the current task
  expect(results).toEqual([100])

  // should not have started the second task
  expect(processedSecond).toEqual(false)
})

test.run()
