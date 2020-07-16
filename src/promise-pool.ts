'use strict'

import { tap } from '@supercharge/goodies'
import { PromisePoolExecutor, ReturnValue } from './promise-pool-executor'

export class PromisePool<T> {
  /**
   * The processable items.
   */
  private items: T[]

  /**
   * The number of promises running concurrently.
   */
  private concurrency: number
  private static concurrency: number

  /**
   * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
   *
   * @param {Object} options
   */
  constructor () {
    this.items = []
    this.concurrency = 10
  }

  /**
   * Set the number of tasks to process concurrently in the promise pool.
   *
   * @param {Integer} concurrency
   *
   * @returns {PromisePool}
   */
  withConcurrency (concurrency: number): PromisePool<T> {
    return tap(this, () => {
      this.concurrency = concurrency
    })
  }

  /**
   * Set the number of tasks to process concurrently in the promise pool.
   *
   * @param {Number} concurrency
   *
   * @returns {PromisePool}
   */
  static withConcurrency (concurrency: number): typeof PromisePool {
    return tap(this, () => {
      this.concurrency = concurrency
    })
  }

  /**
   * Set the items to be processed in the promise pool.
   *
   * @param {Array} items
   *
   * @returns {PromisePool}
   */
  for (items: T[]): PromisePool<T> {
    return tap(this, () => {
      this.items = items
    })
  }

  /**
   * Set the items to be processed in the promise pool.
   *
   * @param {Array} items
   *
   * @returns {PromisePool}
   */
  static for<T> (items: T[]): PromisePool<T> {
    return new this<T>()
      .for(items)
      .withConcurrency(this.concurrency)
  }

  /**
   * Starts processing the promise pool by iterating over the items
   * and running each item through the async `callback` function.
   *
   * @param {Function} The async processing function receiving each item from the `items` array.
   *
   * @returns Promise<{ results, errors }>
   */
  async process (callback: (item: T) => any): Promise<ReturnValue> {
    return new PromisePoolExecutor<T>()
      .withConcurrency(this.concurrency)
      .withHandler(callback)
      .for(this.items)
      .start()
  }
}
