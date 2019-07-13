'use strict'

const PromisePoolExecutor = require('./promise-pool-executor')

class PromisePool {
  /**
   * Instantiates a new promise pool with a default
   * `concurrency: 10` and `items: []`.
   *
   * @param {Object} options
   */
  constructor ({ concurrency = 10, items = [] } = {}) {
    this._items = items
    this._concurrency = concurrency
  }

  /**
   * Set the number of tasks to concurrently
   * when processing the promise pool.
   *
   * @param {Integer} concurrency
   *
   * @returns {PromisePool}
   */
  withConcurrency (concurrency) {
    this._concurrency = concurrency

    return this
  }

  /**
   * Set the items to be processed in
   * the promise pool.
   *
   * @param {Array} items
   *
   * @returns {PromisePool}
   */
  for (items) {
    this._items = items

    return this
  }

  /**
   * Starts processing the promise pool by iterating
   * over the items and passing each item to the
   * async mapper function.
   *
   * @param {Function} callback
   *
   * @returns {Promise}
   */
  async process (callback) {
    return new PromisePoolExecutor({
      items: this._items,
      concurrency: this._concurrency
    }).process(callback)
  }
}

module.exports = PromisePool
