'use strict'

const { test } = require('uvu')
const { expect } = require('expect')
const { PromisePool } = require('../dist')

const pause = timeout => new Promise(resolve => setTimeout(resolve, timeout))

const fakeClock = {
  time: 0,
  schedule: [],
  pause: (t) => new Promise(res => {
    fakeClock.schedule.push([fakeClock.time + t, res])
  }),
  run: async () => {
    await pause(0)
    const s = fakeClock.schedule
    if (s.length === 0) return

    fakeClock.time += 1
    for (let i = 0; i < s.length;) {
      const [t, res] = s[i]
      if (t <= fakeClock.time) {
        res()
        s.splice(i, 1)
      } else {
        i += 1
      }
    }

    return fakeClock.run()
  }
}

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
      for (const item of items) {
        logs.push(`yielded ${item}`)
        yield item
      }
    }
  }

  const { results } = await PromisePool
    .for(iterable)
    .withConcurrency(2)
    .process(async (item, index) => {
      await pause(10 * index)
      logs.push(`processed ${item}`)
      return item
    })

  expect(logs).toEqual([
    'yielded 10',
    'yielded 20',
    'processed 10',
    'yielded 30',
    'processed 20',
    'yielded 40',
    'processed 30',
    'processed 40'
  ])

  expect(results).toEqual([10, 20, 30, 40])
})

test('supports async iterable in the static .for method', async () => {
  const items = [[10, 500], [20, 20], [30, 10], [40, 0]]
  const logs = []

  const iterable = {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        logs.push(`loaded ${item.join(',')}`)
        await pause(item[0])

        logs.push(`yielded ${item.join(',')}`)
        yield item
      }
    }
  }

  const { results } = await PromisePool
    .for(iterable)
    .withConcurrency(2)
    .process(async (item) => {
      await pause(item[1])
      logs.push(`processed ${item.join(',')}`)
      return item[0]
    })

  expect(logs).toEqual([
    'loaded 10,500',
    'yielded 10,500',
    'loaded 20,20',
    'yielded 20,20',
    'processed 20,20',
    'loaded 30,10',
    'yielded 30,10',
    'processed 30,10',
    'loaded 40,0',
    'yielded 40,0',
    'processed 40,0',
    'processed 10,500',
  ])

  expect(results).toEqual([20, 30, 40, 10])
})

// The following test transitions from a badly parallelizable case, where the bottleneck
// is the async iterator that generates the data sequentially, to a highly parallelizable
// case where the async iterable only takes a small fraction of the overall "computation".
//
// The processes should be scheduled according to the following diagram,
// where each "S" is a unit of time spent on the sequential computation (in the async iterable),
// and each "P" is a unit of time spent on a parallelized task (in the process method):
//
// time:   v0        v10       v20       v30       v40
//         SSSSSSSSSSPPPPPPPPPP    SSSSPPPPPPPSPPPP
//                   SSSSSSSSPPPPPPPPP SSPPPPPPSPPP
//                           SSSSSSPPPPPPPPSPPPPPSPP
//
// loaded: 1         2       3     4   5   6  78 9
// yielded:          1       2     3   4 5  6  78 9
// processed:                  1      2    3  45 6 (78 at once, then 9)
//         ^0        ^10       ^20       ^30       ^40
//
// Because there are so many steps in the test, the entropy from setTimeout would quickly
// add up, resulting in unreliable test results. Therefore we will be using a fake clock
// which ensures that things will happen in the right order – that is, things which are
// scheduled to happen after, say, 70ms will hapen before things which are scheduled to
// happen after 71ms. However, the actual time that elapses between these operations is
// completely arbitrary. 

test('schedules async iterables efficiently', async () => {
  const logs = []

  async function* generateIterable() {
    let index = 0
    let sequentialWait = 10
    let parallelWait = 10

    while (parallelWait > 1) {
      logs.push(`loaded ${index+1} at ${fakeClock.time}`)
      await fakeClock.pause(sequentialWait)

      logs.push(`yielded ${index+1} at ${fakeClock.time}`)
      yield parallelWait

      sequentialWait -= 2
      sequentialWait = Math.max(sequentialWait, 1)
      parallelWait -= 1
      index += 1
    }
  }

  PromisePool
    .for(generateIterable())
    .withConcurrency(3)
    .process(async (timeout, index) => {
      await fakeClock.pause(timeout)
      logs.push(`processed ${index+1} at ${fakeClock.time}`)
    })

  await fakeClock.run()

  expect(logs).toEqual([
    'loaded 1 at 0',
    'yielded 1 at 10',
    'loaded 2 at 10',
    'yielded 2 at 18',
    'loaded 3 at 18',
    'processed 1 at 20',
    'yielded 3 at 24',
    'loaded 4 at 24',
    'processed 2 at 27',
    'yielded 4 at 28',
    'loaded 5 at 28',
    'yielded 5 at 30',
    'processed 3 at 32',
    'loaded 6 at 32',
    'yielded 6 at 33',
    'processed 4 at 35',
    'loaded 7 at 35',
    'processed 5 at 36',
    'yielded 7 at 36',
    'loaded 8 at 36',
    'yielded 8 at 37',
    'processed 6 at 38',
    'loaded 9 at 38',
    'yielded 9 at 39',
    'processed 7 at 40',
    'processed 8 at 40',
    'processed 9 at 41',
  ])
})

test.run()
