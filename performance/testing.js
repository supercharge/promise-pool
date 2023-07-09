'use strict'

const { PromisePool } = require('../dist')
const { setTimeout } = require('timers/promises')

// const batchSize = 10 * 1000
const batchSize = 50 * 1000

function createPromises (size) {
  return Array.apply(null, { length: size }).map(x => exec())
}

async function exec () {
  await setTimeout(1000)
}

async function run () {
  console.log('Creating promises')
  const promisePool = createPromises(batchSize)
  console.time('PromisePool')

  await PromisePool
    .withConcurrency(batchSize)
    .for(promisePool)
    .process(async (d) => {
      await d
    })
  console.timeEnd('PromisePool')

  const promisesAll = createPromises(batchSize)
  console.time('Promise.all')
  await Promise.all(promisesAll)
  console.timeEnd('Promise.all')
}

run()
  .then(() => console.log('done'))
  .catch(error => console.error('Failed to process promise pool performance', error))
