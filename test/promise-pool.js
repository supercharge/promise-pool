'use strict'

const Lab = require('@hapi/lab')
const PromisePool = require('..')
const { expect } = require('@hapi/code')

const { describe, it } = (exports.lab = Lab.script())

const pause = timeout => new Promise(resolve => setTimeout(resolve, timeout))

describe('Promise Pool', () => {
  it('creates a new PromisePool()', async () => {
    const pool = new PromisePool()
    expect(pool._concurrency).to.equal(10)
  })

  it('allows method chaining for the promise pool setup', async () => {
    const users = [1, 2, 3]
    const userPool = new PromisePool().withConcurrency(2).for(users)
    expect(userPool._items).to.equal(users)
    expect(userPool._concurrency).to.equal(2)
    expect(userPool instanceof PromisePool).to.be.true()

    const timeouts = [1, 2, 3]
    const timeoutPool = new PromisePool().for(timeouts).withConcurrency(5)
    expect(timeoutPool._items).to.equal(timeouts)
    expect(timeoutPool._concurrency).to.equal(5)
    expect(timeoutPool instanceof PromisePool).to.be.true()
  })

  it('handles empty items', async () => {
    const pool = new PromisePool()
    const { results } = await pool.process(() => {})
    expect(results).to.equal([])
  })

  it('ensures concurrency is a number', async () => {
    const pool = new PromisePool()
    const fn = () => {}

    await expect(pool.withConcurrency(1).process(fn)).to.not.reject()
    await expect(pool.withConcurrency(0).process(fn)).to.reject(TypeError)
    await expect(pool.withConcurrency(-1).process(fn)).to.reject(TypeError)
    await expect(pool.withConcurrency(Infinity).process(fn)).to.not.reject()
    await expect(pool.withConcurrency(null).process(fn)).to.reject(TypeError)
  })

  it('ensures the items are an array', async () => {
    const pool = new PromisePool()
    const fn = () => {}

    await expect(pool.for([]).process(fn)).to.not.reject()
    await expect(pool.for('non-array').process(fn)).to.reject(TypeError)
  })

  it('throws when missing the callback in .process', async () => {
    const pool = new PromisePool()
    expect(pool.process()).to.reject()
  })

  it('concurrency: 2', async () => {
    const start = Date.now()
    const timeouts = [100, 200, 300, 100]

    const { results, errors } = await new PromisePool()
      .withConcurrency(2)
      .for(timeouts)
      .process(async timeout => {
        await pause(timeout)
        return timeout
      })

    expect(errors).to.equal([])
    expect(results).to.equal([100, 200, 100, 300])

    const elapsed = Date.now() - start

    // expect 400ms because 2 tasks run in parallel,
    //   and task 1 and 2 start, waiting 100ms and 200ms
    //   and task 1 finishes (after 100ms)
    //   and the pool starts task 3 waiting 300ms
    //   and task 2 finishes (after 200ms)
    //   and the pool starts task 4 waiting 200ms
    //   and task 2 and 4 probably finish at around 400ms
    expect(elapsed > 400 && elapsed < 450).to.be.true()
  })

  it('ensures concurrency', async () => {
    const start = Date.now()
    const timeouts = [100, 20, 30, 10, 10, 10, 10]

    const { results, errors } = await new PromisePool()
      .withConcurrency(2)
      .for(timeouts)
      .process(async timeout => {
        await pause(timeout)
        return timeout
      })

    expect(errors).to.equal([])
    expect(results.length).to.equal(7)

    const elapsed = Date.now() - start

    // expect the first task to take the longest processing time
    // and expect all other tasks to finish while task 1 is running
    expect(elapsed > 100 && elapsed < 150).to.be.true()
  })

  it('handles concurrency greater than items in the list', async () => {
    const ids = [1, 2, 3, 4, 5]

    const { results, errors } = await new PromisePool()
      .withConcurrency(3000)
      .for(ids)
      .process(async timeout => {
        await pause(timeout)
        return timeout
      })

    expect(errors).to.equal([])
    expect(results).to.equal([1, 2, 3, 4, 5])
  })

  it('returns errors', async () => {
    const ids = [1, 2, 3, 4]

    const { results, errors } = await new PromisePool()
      .withConcurrency(2)
      .for(ids)
      .process(id => {
        if (id === 3) throw new Error('Oh no, not a 3.')

        return id
      })

    expect(errors).to.equal([new Error('Oh no, not a 3.')])
    expect(results).to.equal([1, 2, 4])
  })
})
