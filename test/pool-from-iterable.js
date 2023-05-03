'use strict'

const { test } = require('uvu')
const { expect } = require('expect')
const { PromisePool } = require('../dist')

const pause = timeout => new Promise(resolve => setTimeout(resolve, timeout))

test('supports iterable in the static .for method', async () => {
  const { results } = await PromisePool
    .for('hello')
    .withConcurrency(2)
    .process(async (letter) => {
      await pause(10)
      return letter.toUpperCase()
    })

  expect(results.sort()).toEqual([...'EHLLO'])
})

test('iterates lazily', async () => {
  const items = [10, 20, 30, 40]
  const logs = []

  const iterable = {
    *[Symbol.iterator]() {
      while (items.length > 0) {
        const item = items.shift()
        logs.push(`yielding ${item}`)
        yield item
      }
    }
  }

  await PromisePool
    .for(iterable)
    .withConcurrency(2)
    .process(async (item, index) => {
      await pause(10 * index)
      logs.push(`processed ${item}`)
      return item
    })

  expect(logs).toEqual([
    'yielding 10',
    'yielding 20',
    'processed 10',
    'yielding 30',
    'processed 20',
    'yielding 40',
    'processed 30',
    'processed 40'
  ])
})

test.run()
