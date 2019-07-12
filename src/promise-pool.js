'use strict'

const Deferred = require('p-defer')
const EventEmitter = require('events')

class PromisePool extends EventEmitter {
  /**
   * Instantiates a new promise pool with a default
   * `concurrency: 10` and `items: []`.
   *
   * @param {Object} options
   */
  constructor ({ concurrency = 10, items = [] } = {}) {
    super()

    this._active = 0
    this._errors = []
    this._results = []
    this._pending = []
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
    if (typeof callback !== 'function') {
      throw new Error('The first parameter for the .process(fn) method must be a function')
    }

    for (const item of this._items) {
      if (this._hasReachedConcurrencyLimit()) {
        await this._processingSlot()
      }

      this._handle(callback, item)
    }

    return this._drained()
  }

  /**
   * Creates a deferred promise and pushes the related
   * callback to the pending queue. Returns the
   * promise which is used to wait for the callback.
   *
   * @returns {Promise}
   */
  async _processingSlot () {
    const { resolve, promise } = Deferred()
    this._pending.push(resolve)

    return promise
  }

  /**
   * Asynchronously call the given processing function
   * and pass the current `item` as an argument.
   *
   * @param {Function} callback
   * @param {*} item
   */
  async _handle (callback, item) {
    this._increaseActive()

    try {
      this._results.push(
        await callback(item)
      )
    } catch (error) {
      this._errors.push(error)
    }

    this._startNext()
  }

  /**
   * Starts the next task from the list of pending
   * tasks. Once all tasks finished processing,
   * it emits the `pool:all-finished` event.
   */
  _startNext () {
    this._decreaseActive()

    if (this._hasPending()) {
      const resolve = this._pending.shift()

      return resolve()
    }

    if (this._allFinished()) {
      this.emit('pool:all-finished')
    }
  }

  /**
   * Wait for all active tasks to finish. Once all
   * the tasks finished processing, returns an
   * object containing the results and errors.
   *
   * @returns {Object}
   */
  async _drained () {
    if (this._hasActiveTasks()) {
      const { resolve, promise } = Deferred()
      this.once('pool:all-finished', resolve)
      await promise
    }

    return {
      errors: this._errors,
      results: this._results
    }
  }

  /**
   * Determines whether the number of active tasks
   * is greater or equal to the concurrency limit.
   *
   * @returns {Boolean}
   */
  _hasReachedConcurrencyLimit () {
    return this._active >= this._concurrency
  }

  /**
   * Increases the number of active tasks by one.
   */
  _increaseActive () {
    ++this._active
  }

  /**
   * Decreases the number of active tasks by one.
   */
  _decreaseActive () {
    --this._active
  }

  /**
   * Determines whether there are still pending or
   * active tasks remaining for processing.
   *
   * @returns {Boolean}
   */
  _allFinished () {
    return this._hasNoActiveTasks() && this._hasNoPendingTasks()
  }

  /**
   * Determines whether there are active tasks.
   *
   * @returns {Boolean}
   */
  _hasActiveTasks () {
    return this._active > 0
  }

  /**
   * Determines whether there are no active tasks.
   *
   * @returns {Boolean}
   */
  _hasNoActiveTasks () {
    return !this._hasActiveTasks()
  }

  /**
   * Determines whether there are pending tasks.
   *
   * @returns {Boolean}
   */
  _hasPending () {
    return this._pending.length > 0
  }

  /**
   * Determines whether there are no pending tasks.
   *
   * @returns {Boolean}
   */
  _hasNoPendingTasks () {
    return !this._hasPending()
  }
}

module.exports = PromisePool
