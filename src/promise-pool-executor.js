'use strict'

const EventEmitter = require('events')

class PromisePoolExecutor extends EventEmitter {
  /**
   * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
   *
   * @param {Object} options
   */
  constructor ({ concurrency = 10, items = [] } = {}) {
    super()

    this.active = 0
    this.errors = []
    this.results = []
    this.pending = []
    this.items = items
    this.concurrency = concurrency
  }

  /**
   * Starts processing the promise pool by iterating over the items
   * and passing each item to the async `callback` function.
   *
   * @param {Function} callback
   *
   * @returns {Promise}
   */
  async process (callback) {
    this.validateInputs(callback)

    for (const item of this.items) {
      if (this.hasReachedConcurrencyLimit()) {
        await this.processingSlot()
      }

      this.handle(callback, item)
    }

    return this.drained()
  }

  /**
   * Ensure valid inputs and throw otherwise.
   *
   * @param {Function} callback
   *
   * @throws
   */
  validateInputs (callback) {
    if (typeof callback !== 'function') {
      throw new Error('The first parameter for the .process(fn) method must be a function')
    }

    if (!(typeof this.concurrency === 'number' && this.concurrency >= 1)) {
      throw new TypeError(`\`concurrency\` must be a number, 1 or up. Received \`${this.concurrency}\` (${typeof concurrency})`)
    }

    if (!Array.isArray(this.items)) {
      throw new TypeError(`\`items\` must be an array. Received \`${this.items}\` (${typeof this.items})`)
    }
  }

  /**
   * Creates a deferred promise and pushes the related callback to the pending
   * queue. Returns the promise which is used to wait for the callback.
   *
   * @returns {Promise}
   */
  async processingSlot () {
    return new Promise(resolve => {
      this.pending.push(resolve)
    })
  }

  /**
   * Asynchronously call the given processing function
   * and pass the current `item` as an argument.
   *
   * @param {Function} callback
   * @param {*} item
   */
  async handle (callback, item) {
    this.increaseActive()

    try {
      this.results.push(
        await callback(item)
      )
    } catch (error) {
      error.item = item
      this.errors.push(error)
    }

    this.startNext()
  }

  /**
   * Starts the next task from the list of pending tasks. Once all tasks
   * finished processing, it emits the `pool:finished` event.
   */
  startNext () {
    this.decreaseActive()

    if (this.hasPending()) {
      const resolve = this.pending.shift()

      return resolve()
    }

    if (this.allFinished()) {
      this.emit('pool:finished')
    }
  }

  /**
   * Wait for all active tasks to finish. Once all the tasks finished
   * processing, returns an object containing the results and errors.
   *
   * @returns {Object}
   */
  async drained () {
    if (this.hasActive()) {
      await new Promise(resolve => {
        this.once('pool:finished', resolve)
      })
    }

    return {
      errors: this.errors,
      results: this.results
    }
  }

  /**
   * Determines whether the number of active tasks is greater or equal to the concurrency limit.
   *
   * @returns {Boolean}
   */
  hasReachedConcurrencyLimit () {
    return this.active >= this.concurrency
  }

  /**
   * Increases the number of active tasks by one.
   */
  increaseActive () {
    ++this.active
  }

  /**
   * Decreases the number of active tasks by one.
   */
  decreaseActive () {
    --this.active
  }

  /**
   * Determines whether there are still pending or active tasks remaining for processing.
   *
   * @returns {Boolean}
   */
  allFinished () {
    return this.noActive() && this.noPending()
  }

  /**
   * Determines whether there are active tasks.
   *
   * @returns {Boolean}
   */
  hasActive () {
    return this.active > 0
  }

  /**
   * Determines whether there are no active tasks.
   *
   * @returns {Boolean}
   */
  noActive () {
    return !this.hasActive()
  }

  /**
   * Determines whether there are pending tasks.
   *
   * @returns {Boolean}
   */
  hasPending () {
    return this.pending.length > 0
  }

  /**
   * Determines whether there are no pending tasks.
   *
   * @returns {Boolean}
   */
  noPending () {
    return !this.hasPending()
  }
}

module.exports = PromisePoolExecutor
