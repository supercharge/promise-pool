'use strict'

const PromisePool = require('../dist')

/**
 * Very basic, non-optimal shuffle function
 * to randomly order the items.
 *
 * @param {Array} array
 *
 * @returns {Array}
 */
const shuffle = function (array) {
  return array.sort(() => Math.random() - 0.5)
}

async function run () {
  const timeouts = shuffle(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(item => item * 100)
  )

  const { results, errors } = await PromisePool
    .for(timeouts)
    .withConcurrency(2)
    .process(async (timeout) => {
      await new Promise(resolve => setTimeout(resolve, timeout))
      console.log(`waited ${timeout}ms`)

      return timeout
    })

  console.log('Results ->')
  console.log(results)

  console.log(`Errors -> ${errors.length ? errors : 'none'}`)
}

run()
