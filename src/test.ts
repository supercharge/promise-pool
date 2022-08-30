'use strict'

import { PromisePool } from './promise-pool'
import {expect} from "expect";

async function pause (timeout: number) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout)
  })
}

async function go() {
  const timeouts: number[] = [20, 0, 10, 100]

  const output = await PromisePool<number, boolean>
    .withConcurrency(1)
    .for(timeouts)
    .handleError((_error, _index, pool) => {
      pool.stop()
    })
    // .useCorrespondingResults()
    .process<number, string>(async (timeout): Promise<number> => {
      if (timeout) {
        await pause(timeout)
        return timeout
      }
      throw new Error('did not work')
    })

  const results: number[] = output.results
  // const results: (number | Symbol)[] = output.results

  console.log('results[0]', results[0])
  console.log('results[1]', results[1])
  console.log('results[2]', results[2])
  console.log('results[3]', results[3])
  expect(results).toEqual([20, PromisePool.rejected, 10, PromisePool.notRun])
}

go()
