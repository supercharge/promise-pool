'use strict'

const PromisePool = require('../dist')

const pause = timeout => new Promise(resolve => setTimeout(resolve, timeout))

describe('Promise Pool', () => {
  it('creates a new PromisePool', async () => {
    const pool = new PromisePool()
    expect(pool.concurrency).toEqual(10)
  })

  it('supports a static .for method', async () => {
    const users = [1, 2, 3]
    const userPool = PromisePool.for(users)
    expect(userPool.items).toEqual(users)
    expect(userPool instanceof PromisePool).toBe(true)
  })

  it('supports a static .withConcurrency method', async () => {
    const pool = PromisePool.withConcurrency(4)
    expect(pool.concurrency).toEqual(4)
    expect(pool instanceof PromisePool).toBe(false) // pool is not an instance yet
  })

  it('allows method chaining for the promise pool setup', async () => {
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

  it('handles empty items', async () => {
    const pool = new PromisePool()
    const { results } = await pool.process(() => {})
    expect(results).toEqual([])
  })

  it('ensures concurrency is a number', async () => {
    const pool = new PromisePool()
    const fn = () => {}

    await expect(pool.withConcurrency(1).process(fn)).not.toReject()
    await expect(pool.withConcurrency(0).process(fn)).toReject(TypeError)
    await expect(pool.withConcurrency(-1).process(fn)).toReject(TypeError)
    await expect(pool.withConcurrency(Infinity).process(fn)).not.toReject()
    await expect(pool.withConcurrency(null).process(fn)).toReject(TypeError)
  })

  it('ensures the items are an array', async () => {
    const pool = new PromisePool()
    const fn = () => {}

    await expect(pool.for([]).process(fn)).not.toReject()
    await expect(pool.for('non-array').process(fn)).toReject(TypeError)
  })

  it('throws when missing the callback in .process', async () => {
    const pool = new PromisePool()
    expect(pool.process()).toReject()
  })

  it('concurrency: 2', async () => {
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
    expect(elapsed).toBeWithin(600, 650)
  })

  it('ensures concurrency', async () => {
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
    expect(elapsed).toBeWithin(130, 160)
  })

  it('handles concurrency greater than items in the list', async () => {
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

  it('returns errors', async () => {
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

  // it('throws - and fails loud', async () => {
  //   const ids = [1, 2, 3, 4]

  //   try {
  //     await PromisePool
  //       .withConcurrency(2)
  //       .for(ids)
  //       .process(id => {
  //         if (id === 3) throw new Error('Oh no, not a 3.')

  //         return id
  //       })

//     expect(false).toBe(true) // should not be reached
//   } catch (error) {
//     const err = new Error('Oh no, not a 3.')
//     expect(error).toEqual(err)
})
