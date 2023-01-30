'use strict'

const { test } = require('uvu')
const { expect } = require('expect')
const { PromisePool, ValidationError, PromisePoolError } = require('../dist')

async function pause (timeout) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout)
  })
}

test('creates a new PromisePool', async () => {
  const pool = new PromisePool()
  expect(pool.concurrency).toEqual(10)
})

test('supports a static .for method', async () => {
  const users = [1, 2, 3]
  const userPool = PromisePool.for(users)
  expect(userPool.items).toEqual(users)
  expect(userPool instanceof PromisePool).toBe(true)
})

test('supports a static .withConcurrency method', async () => {
  const pool = PromisePool.withConcurrency(4)
  expect(pool.concurrency).toEqual(4)
  expect(pool instanceof PromisePool).toBe(true)
})

test('supports a static .withTimeout method', async () => {
  const pool = PromisePool.withTimeout(4000)
  expect(pool.timeout).toEqual(4000)
  expect(pool instanceof PromisePool).toBe(true)
})

test('allows method chaining for the promise pool setup', async () => {
  const users = [1, 2, 3]
  const userPool = new PromisePool().withConcurrency(2).for(users)
  expect(userPool.items).toEqual(users)
  expect(userPool.concurrency).toEqual(2)
  expect(userPool).toBeInstanceOf(PromisePool)

  const timeouts = [1, 2, 3]
  const timeoutPool = new PromisePool().for(timeouts).withConcurrency(5)
  expect(timeoutPool.items).toEqual(timeouts)
  expect(timeoutPool.concurrency).toEqual(5)
  expect(timeoutPool).toBeInstanceOf(PromisePool)
})

test('handles empty items', async () => {
  const pool = new PromisePool()
  const { results } = await pool.process(() => {})
  expect(results).toEqual([])
})

test('ensures concurrency is a number', async () => {
  const pool = new PromisePool()
  const fn = () => {}

  expect(await pool.withConcurrency(1).process(fn)).toEqual({ errors: [], results: [] })
  expect(await pool.withConcurrency(Infinity).process(fn)).toEqual({ errors: [], results: [] })

  await expect(pool.withConcurrency(0).process(fn)).rejects.toThrow(ValidationError)
  await expect(pool.withConcurrency(-1).process(fn)).rejects.toThrow(ValidationError)
  await expect(pool.withConcurrency(null).process(fn)).rejects.toThrow(ValidationError)
})

test('ensures timeout is a valid number', async () => {
  const pool = new PromisePool()
  const fn = () => {}

  await expect(pool.withTimeout(-1).process(fn)).rejects.toThrow(ValidationError)
  await expect(pool.withTimeout('-1').process(fn)).rejects.toThrow(ValidationError)
})

test('ensures the items are an array', async () => {
  const pool = new PromisePool()
  const fn = () => {}

  await expect(pool.for('non-array').process(fn)).rejects.toThrow(ValidationError)
  await expect(await pool.for([]).process(fn)).toEqual({ errors: [], results: [] })
})

test('throws when missing the callback in .process', async () => {
  const pool = new PromisePool()
  expect(pool.process()).rejects.toThrow()
})

test('concurrency: 1', async () => {
  const start = Date.now()
  const timeouts = [40, 10, 20, 30, 10]

  const { results, errors } = await PromisePool
    .withConcurrency(1)
    .for(timeouts)
    .process(async timeout => {
      await pause(timeout)
      return timeout
    })

  expect(errors).toEqual([])
  expect(results).toEqual(timeouts)

  const elapsed = Date.now() - start
  const expectedDuration = timeouts.reduce((sum, timeout) => sum + timeout, 0)

  /**
   * All tasks run sequentially and each task must finish first before starting
   * a new task. That means the total duration of processing all items from
   * the input array is the sum of all timeouts we have to wait for.
   */
  expect(elapsed).toBeGreaterThanOrEqual(expectedDuration)
  expect(elapsed).toBeLessThanOrEqual(expectedDuration + 50) // allow 50ms offset
})

test('concurrency: 2', async () => {
  const start = Date.now()
  const timeouts = [400, 100, 200, 300, 100]

  const { results, errors } = await PromisePool
    .withConcurrency(2)
    .for(timeouts)
    .process(async timeout => {
      await pause(timeout)
      return timeout
    })

  expect(errors).toEqual([])
  expect(results).toEqual([100, 200, 400, 100, 300])

  const elapsed = Date.now() - start

  // expect 400ms because 2 tasks run in parallel,
  //   and task 1 and 2 start, waiting 400ms and 100ms
  //   and task 2 finishes (after 100ms)
  //   and the pool starts task 3 waiting 200ms
  //   and task 3 finishes (after 200ms)
  //   and the pool starts task 4 waiting 300ms
  //   and task 1 finishes (after 100ms (400ms in total))
  //   and the pool starts task 5 waiting 100ms
  //   and task 5 finishes (after 100ms)
  //   and task 4 finishes (after 300ms)
  expect(elapsed).toBeGreaterThanOrEqual(600)
  expect(elapsed).toBeLessThanOrEqual(650)
})

test('ensures concurrency', async () => {
  const start = Date.now()
  const timeouts = [100, 20, 30, 10, 10, 10, 50]

  const { results } = await PromisePool
    .withConcurrency(2)
    .for(timeouts)
    .process(async timeout => {
      await pause(timeout)
      return timeout
    })

  expect(results).toEqual([20, 30, 10, 10, 10, 100, 50])

  const elapsed = Date.now() - start

  // expect the first task to take the longest processing time
  // and expect all other tasks to finish while task 1 is running
  expect(elapsed).toBeGreaterThanOrEqual(130)
  expect(elapsed).toBeLessThanOrEqual(160)
})

test('handles concurrency greater than items in the list', async () => {
  const ids = [1, 2, 3, 4, 5]

  const { results } = await PromisePool
    .withConcurrency(3000)
    .for(ids)
    .process(async timeout => {
      await pause(timeout)
      return timeout
    })

  expect(results).toEqual([1, 2, 3, 4, 5])
})

test('returns errors', async () => {
  const ids = [1, 2, 3, 4]

  const { results, errors } = await PromisePool
    .withConcurrency(2)
    .for(ids)
    .process(id => {
      if (id === 3) throw new Error('Oh no, not a 3.')

      return id
    })

  expect(results).toEqual([1, 2, 4])

  expect(errors.length).toEqual(1)
  expect(errors[0].item).toEqual(3)
  expect(errors[0]).toBeInstanceOf(Error)
  expect(errors[0].message).toEqual('Oh no, not a 3.')
})

test('stores the original error', async () => {
  class CustomError extends Error {
    constructor (message, code) {
      super(message)

      this.code = code
    }
  }

  const ids = [1, 2, 3]

  const { errors } = await PromisePool
    .withConcurrency(2)
    .for(ids)
    .process(() => {
      throw new CustomError('Oh no, not a 3.', 123)
    })

  expect(errors.length).toEqual(3)
  errors.forEach(error => {
    expect(error.raw).toBeInstanceOf(CustomError)
    expect(error.raw).toBeInstanceOf(CustomError)
  })
})

test('keeps processing with when errors occur', async () => {
  const ids = Array.from({ length: 10 }, (_, i) => i + 1)

  const start = Date.now()

  const { results, errors } = await PromisePool
    .withConcurrency(2)
    .for(ids)
    .process(async id => {
      await pause(20)

      if (id === 1) {
        throw new Error('I can’t keep the first item')
      }

      return id
    })

  expect(results).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10])

  expect(errors.length).toEqual(1)
  expect(
    errors.every(error => error.message === 'I can’t keep the first item')
  ).toBe(true)

  const elapsed = Date.now() - start

  // 10 tasks are in the pool
  // expect 20ms for 2 parally running tasks
  // results in 5 batches each batch taking about 20ms
  // takes around 100ms for all items to process
  expect(elapsed).toBeGreaterThanOrEqual(100)
  expect(elapsed).toBeLessThanOrEqual(200)
})

test('fails when not passing a function for the error handler', async () => {
  const pool = await PromisePool
    .for([1, 2, 3])
    .handleError('non-function')

  await expect(pool.process(() => {})).rejects.toThrow()
})

test('should handle error and continue processing', async () => {
  const ids = [1, 2, 3, 4]
  const collectedItemsOnError = []

  const { results, errors } = await PromisePool
    .withConcurrency(2)
    .for(ids)
    .handleError((_, item) => {
      collectedItemsOnError.push(item)
    })
    .process(id => {
      if (id === 3) throw new Error('Oh no, not a 3.')

      return id
    })

  expect(errors).toEqual([])
  expect(results).toEqual([1, 2, 4])
  expect(collectedItemsOnError).toEqual([3])
})

test('should allow custom processing on a specific error', async () => {
  const ids = [1, 2, 3, 4]
  let calledError

  const { results, errors } = await PromisePool
    .withConcurrency(2)
    .for(ids)
    .handleError(async error => {
      if (error instanceof RangeError) {
        calledError = error
      }
    })
    .process(id => {
      if (id === 4) throw new RangeError('Oh no, too large')

      return id
    })

  expect(errors).toEqual([])
  expect(results).toEqual([1, 2, 3])
  expect(calledError).toBeInstanceOf(RangeError)
})

test('rethrowing an error from the error handler should stop promise pool immediately when using an async processing function', async () => {
  await expect(
    PromisePool
      .for(new Array(10))
      .withConcurrency(2)
      .handleError(async error => {
        throw error
      })
      .process(async (_item, index) => {
        if (index === 4) {
          throw new RangeError('Oh no, too large')
        }
      })
  ).rejects.toThrowError(RangeError)
})

test('rethrowing an error from the error handler should stop promise pool immediately when using a sync processing function', async () => {
  await expect(
    PromisePool
      .for(new Array(100))
      .withConcurrency(2)
      .handleError(error => {
        throw error
      })
      .process((_item, index) => {
        if (index === 4) {
          throw new RangeError('Oh no, too large')
        }
      })
  ).rejects.toThrowError(RangeError)
})

test('fails without error', async () => {
  const ids = [1, 2, 3, 4, 5]

  const { errors } = await PromisePool
    .withConcurrency(2)
    .for(ids)
    .process(async id => {
      await new Promise((resolve, reject) => setTimeout(reject, 10))

      return id
    })

  expect(errors.length).toEqual(ids.length)
  expect(
    errors.every(error => error.message === '')
  ).toBe(true)
})

test('fails with string', async () => {
  const ids = [1, 2, 3]

  const { errors } = await PromisePool
    .withConcurrency(2)
    .for(ids)
    .process(async () => {
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject('failed')
    })

  expect(
    errors.every(error => error.message === 'failed')
  ).toBe(true)
})

test('fails with Error and stacktrace', async () => {
  const ids = [1, 2, 3]

  const { errors } = await PromisePool
    .withConcurrency(2)
    .for(ids)
    .process(async () => {
      throw new Error('failing')
    })

  expect(
    errors.every(error => error.message === 'failing')
  ).toBe(true)
})

test('fails with object', async () => {
  const ids = [1, 2, 3]

  const { errors } = await PromisePool
    .withConcurrency(2)
    .for(ids)
    .process(async () => {
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject({ message: 'failed' })
    })

  expect(
    errors.every(error => error.message === 'failed')
  ).toBe(true)
})

test('.process provides an index as the second argument', async () => {
  const ids = [1, 2, 3, 4, 5]

  const { results } = await PromisePool
    .withConcurrency(10)
    .for(ids)
    .process(async (timeout, index) => {
      await pause(timeout)
      return { index, timeout }
    })

  expect(results).toEqual([
    { index: 0, timeout: 1 },
    { index: 1, timeout: 2 },
    { index: 2, timeout: 3 },
    { index: 3, timeout: 4 },
    { index: 4, timeout: 5 }
  ])
})

test('fails when not passing a function as an onTaskStarted callback', async () => {
  const pool = await PromisePool
    .for([1, 2, 3])
    .onTaskStarted('non-function')

  await expect(pool.process(() => {})).rejects.toThrow()
})

test('onTaskStarted is called when a task is about to be processed', async () => {
  const ids = [1, 2, 3, 4, 5]
  const startedIds = []
  const concurrency = 1
  const percentageArr = [0, 20, 40, 60, 80]

  await PromisePool
    .withConcurrency(concurrency)
    .for(ids)
    .onTaskStarted((item, pool) => {
      startedIds.push(item)
      expect(pool.activeTaskCount()).toBeLessThanOrEqual(concurrency)
      expect(pool.processedPercentage()).toEqual(percentageArr.shift())
    })
    .process(async () => {
      return await Promise.resolve()
    })

  expect(ids).toEqual(startedIds)
})

test('fails when not passing a function as an onTaskFinished callback', async () => {
  const pool = await PromisePool
    .for([1, 2, 3])
    .onTaskFinished('non-function')

  await expect(pool.process(() => {})).rejects.toThrow()
})

test('onTaskFinished is called when a task was processed', async () => {
  const ids = [1, 2, 3, 4, 5]
  const concurrency = 2
  const finishedIds = []
  const percentageArr = [20, 40, 60, 80, 100]

  await PromisePool
    .withConcurrency(concurrency)
    .for(ids)
    .onTaskFinished((item, pool) => {
      finishedIds.push(item)
      expect(finishedIds).toEqual(pool.processedItems())
      expect(pool.activeTaskCount()).toBeLessThanOrEqual(concurrency)
      expect(pool.processedPercentage()).toEqual(percentageArr.shift())
    })
    .process(async () => {
      return await Promise.resolve()
    })

  expect(ids).toEqual(finishedIds)
})

test('onTaskStarted and onTaskFinished are called in the same amount', async () => {
  const ids = [1, 2, 3, 4, 5]
  const concurrency = 3
  const finishedIds = []
  const startedIds = []

  await PromisePool
    .withConcurrency(concurrency)
    .for(ids)
    .onTaskStarted((item) => {
      startedIds.push(item)
    })
    .onTaskFinished((item) => {
      finishedIds.push(item)
    })
    .process(async () => {
      return await Promise.resolve()
    })

  expect(startedIds).toEqual(ids)
  expect(finishedIds).toEqual(ids)
})

test('can decrease the concurrency while the pool is running', async () => {
  const concurrency = 3
  const timeouts = [10, 20, 30, 40, 50]

  const start = Date.now()

  await PromisePool
    .withConcurrency(concurrency)
    .for(timeouts)
    .process(async (timeout, _, pool) => {
      if (timeout >= 30) {
        pool.useConcurrency(1)
      }

      await pause(timeout)
    })

  const elapsed = Date.now() - start

  expect(elapsed).toBeGreaterThanOrEqual(30 + 40 + 50)
  expect(elapsed).toBeLessThanOrEqual(30 + 40 + 50 + 8) // +8 is a leeway for the pool overhead
})

test('can increase the concurrency while the pool is running', async () => {
  const concurrency = 1
  const timeouts = [10, 20, 30, 40, 50]

  const start = Date.now()

  await PromisePool
    .withConcurrency(concurrency)
    .for(timeouts)
    .process(async (timeout, _, pool) => {
      if (timeout >= 30) {
        pool.useConcurrency(3)
      }

      await pause(timeout)
    })

  const elapsed = Date.now() - start

  /**
   * 1. the first two items run in sequence: 10ms + 20ms
   * 2. we’re changing the concurrency when hitting the third item
   * 3. the changed concurrency results in processing the remainin items in parallel
   * 4. processing the items 30,40,50 in parallel has the longest timeout is the limit
   */
  expect(elapsed).toBeGreaterThanOrEqual(10 + 20 + 50 - 1) // -1 is a leeway if the pool is faster
  expect(elapsed).toBeLessThanOrEqual(10 + 20 + 50 + 8) // +8 is a leeway for the pool overhead
})

test('fails to change the concurrency for a running pool to an invalid value', async () => {
  const timeouts = [100, 200, 300, 400, 500]

  await expect(
    PromisePool
      .withConcurrency(3)
      .for(timeouts)
      .process(async (timeout, _, pool) => {
        if (timeout >= 300) {
          pool.useConcurrency(-1)
        }

        await pause(timeout)
      })
  ).rejects.toThrow(ValidationError)
})

test('useCorrespondingResults keeps results in order', async () => {
  const timeouts = [20, undefined, 10]

  const { results } = await PromisePool
    .for(timeouts)
    .useCorrespondingResults()
    .process(async (timeout) => {
      if (timeout) {
        await pause(timeout)
        return timeout
      }
      throw new Error('did not work')
    })

  expect(results).toEqual([20, PromisePool.failed, 10])
})

test('useCorrespondingResults defaults results to notRun symbol', async () => {
  const timeouts = [20, undefined, 10, 100]

  const { results } = await PromisePool
    .withConcurrency(1)
    .for(timeouts)
    .handleError((_error, _index, pool) => {
      pool.stop()
    })
    .useCorrespondingResults()
    .process(async (timeout) => {
      if (timeout) {
        await pause(timeout)
        return timeout
      }
      throw new Error('did not work')
    })

  expect(results).toEqual([20, PromisePool.failed, 10, PromisePool.notRun])
})

test('can timeout long-running handlers', async () => {
  const timers = [1, 2, 3, 4]

  const { results, errors } = await PromisePool
    .withTimeout(10)
    .for(timers)
    .process(async (timer) => {
      const computed = 10 * timer
      await pause(computed)

      return computed
    })

  // only the first item resolves
  expect(results).toEqual([10])

  // items 2, 3, and 4 time out
  expect(errors.length).toEqual(3)
  expect(errors[0]).toBeInstanceOf(PromisePoolError)
  expect(errors[1]).toBeInstanceOf(PromisePoolError)
  expect(errors[2]).toBeInstanceOf(PromisePoolError)

  expect(errors.map(error => error.item)).toEqual([2, 3, 4])
})

test.run()
