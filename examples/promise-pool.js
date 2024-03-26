'use strict'

const { PromisePool } = require('../dist')

/**
 * Very basic, non-optimal shuffle function to randomly order the items.
 *
 * @param {any[]} array
 *
 * @returns {any[]}
 */
function shuffle (array) {
  return array.sort(() => Math.random() - 0.5)
}

async function run () {
  const timeouts = shuffle(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(item => item * 100)
  )

  const { results, errors } = await PromisePool
    .for(timeouts)
    .withConcurrency(2)
    .process(async (timeout, index, pool) => {
      if (index > 100) {
        return pool.stop()
      }

      await new Promise(resolve => setTimeout(resolve, timeout))
      console.log(`#${index}: waited ${timeout}ms`)

      return { item: index, timeout }
    })

  console.log()
  console.log('Results ->')
  console.log(results)

  console.log()
  console.log(`Errors -> ${errors.length ? errors : 'none'}`)
}

run().catch(error => console.error('Failed to process the promise pool', error))
