'use strict'

import { tap } from '@supercharge/goodies'
import { PromisePoolExecutor } from './promise-pool-executor'

export class PromisePool {
  /**
   * The processable items.
   */
  private items: any[]

  /**
   * The number of promises running concurrently.
   */
  private concurrency: number

  /**
   * The number of promises running concurrently.
   */
  private errorHandler: Function | undefined

  /**
   * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
   *
   * @param {Object} options
   */
  constructor ({ concurrency = 10, items = [] } = {}) {
    this.items = items
    this.concurrency = concurrency
  }

  /**
   * Set the number of tasks to process concurrently the promise pool.
   *
   * @param {Integer} concurrency
   *
   * @returns {PromisePool}
   */
  withConcurrency (concurrency: number): this {
    return tap(this, () => {
      this.concurrency = concurrency
    })
  }

  /**
   * Set the number of promises to process concurrently in the promise pool.
   *
   * @param {Number} concurrency
   *
   * @returns {PromisePool}
   */
  static withConcurrency (concurrency: number): PromisePool {
    return new this().withConcurrency(concurrency)
  }

  /**
   * Set the items to be processed in the promise pool.
   *
   * @param {Array} items
   *
   * @returns {PromisePool}
   */
  for (items: any[]): this {
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
  static for (items: any[]): PromisePool {
    return new this().for(items)
  }

  /**
   * Set an error handler that will be called when an error occurs while processing the items.
   *
   * @param {Function} handler
   *
   * @returns {PromisePool}
   */
  onError (handler: Function): this {
    return tap(this, () => {
      this.errorHandler = handler
    })
  }

  /**
   * Starts processing the promise pool by iterating over the items
   * and running each item through the async `callback` function.
   *
   * @param {Function} callback
   *
   * @returns {Promise}
   */
  async process (callback: Function): Promise<any[]> {
    return new PromisePoolExecutor()
      .withConcurrency(this.concurrency)
      .withHandler(callback)
      .onError(this.errorHandler)
      .for(this.items)
      .start()
  }
}
