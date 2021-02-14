'use strict'

import { Stoppable } from './stoppable'
import { tap } from '@supercharge/goodies'
import { ReturnValue } from './return-value'
import { PromisePoolExecutor } from './promise-pool-executor'

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
   * The error handler callback function
   */
  private errorHandler?: (error: Error, item: T, pool: Stoppable) => void | Promise<void>

  /**
   * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
   *
   * @param {Object} options
   */
  constructor () {
    this.items = []
    this.concurrency = 10
    this.errorHandler = undefined
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
   * Set the error handler function to execute when an error occurs.
   *
   * @param {Function} handler
   *
   * @returns {PromisePool}
   */
  handleError (handler: (error: Error, item: T, pool: Stoppable) => void | Promise<void>): PromisePool<T> {
    return tap(this, () => {
      this.errorHandler = handler
    })
  }

  /**
   * Starts processing the promise pool by iterating over the items
   * and running each item through the async `callback` function.
   *
   * @param {Function} The async processing function receiving each item from the `items` array.
   *
   * @returns Promise<{ results, errors }>
   */
  async process<R> (callback: (item: T, pool: Stoppable) => R | Promise<R>): Promise<ReturnValue<T, R>> {
    return new PromisePoolExecutor<T, R>()
      .withConcurrency(this.concurrency)
      .withHandler(callback)
      .handleError(this.errorHandler)
      .for(this.items)
      .start()
  }
}
