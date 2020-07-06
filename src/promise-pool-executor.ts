'use strict'

import { EventEmitter } from 'events'
import { tap, upon } from '@supercharge/goodies'

export class PromisePoolExecutor extends EventEmitter {
  private readonly tasks: any[]

  private items: any[]

  private concurrency: number

  private itemHandler: Function

  private errorHandler: Function | undefined

  private readonly results: any[]

  /**
   * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
   *
   * @param {Object} options
   */
  constructor () {
    super()

    this.tasks = []
    this.results = []
    this.items = []
    this.concurrency = 10

    this.itemHandler = () => {}
  }

  /**
   * Set the number of tasks to process concurrently the promise pool.
   *
   * @param {Integer} concurrency
   *
   * @returns {PromisePoolExecutor}
   */
  withConcurrency (concurrency: number): this {
    return tap(this, () => {
      this.concurrency = concurrency
    })
  }

  /**
   * Set the items to be processed in the promise pool.
   *
   * @param {Array} items
   *
   * @returns {PromisePoolExecutor}
   */
  for (items: any[]): this {
    return tap(this, () => {
      this.items = items
    })
  }

  /**
   * Set the handler that is applied to each item.
   *
   * @param {Function} handler
   *
   * @returns {PromisePoolExecutor}
   */
  withHandler (handler: Function): this {
    return tap(this, () => {
      this.itemHandler = handler
    })
  }

  /**
   * Set an error handler that will be called when an error occurs while processing the items.
   *
   * @param {Function} handler
   *
   * @returns {PromisePool}
   */
  onError (handler?: Function): this {
    return tap(this, () => {
      this.errorHandler = handler
    })
  }

  /**
   * Start processing the promise pool.
   *
   * @returns {Array}
   */
  async start (): Promise<any[]> {
    return upon(this.validateInputs(), async () => {
      return this.process()
    })
  }

  /**
   * Ensure valid inputs and throw otherwise.
   *
   * @throws
   */
  validateInputs (): void {
    if (typeof this.itemHandler !== 'function') {
      throw new Error('The first parameter for the .process(fn) method must be a function')
    }

    if (!(typeof this.concurrency === 'number' && this.concurrency >= 1)) {
      throw new TypeError(`"concurrency" must be a number, 1 or up. Received "${this.concurrency}" (${typeof this.concurrency})`)
    }

    if (!Array.isArray(this.items)) {
      throw new TypeError(`"items" must be an array. Received ${typeof this.items}`)
    }
  }

  /**
   * Starts processing the promise pool by iterating over the items
   * and running each item through the async `callback` function.
   *
   * @param {Function} callback
   *
   * @returns {Promise}
   */
  async process (): Promise<any[]> {
    for (const item of this.items) {
      if (this.hasReachedConcurrencyLimit()) {
        await this.processingSlot()
      }

      this.startProcessing(item)
    }

    return this.drained()
  }

  /**
   * Create a processing function for the given `item`.
   *
   * @param {*} item
   */
  startProcessing (item: any): void {
    const task = this.createTaskFor(item)

    const t = task.then(result => {
      this.results.push(result)
      this.tasks.splice(this.tasks.indexOf(t), 1)
    })

    this.tasks.push(t)
  }

  /**
   * Ensures a returned promise for the processing of the given `item`.
   *
   * @param item
   *
   * @returns {*}
   */
  async createTaskFor (item: any): Promise<any> {
    const wrap = async (): Promise<any> => {
      try {
        return await this.itemHandler(item)
      } catch (error) {
        if (this.errorHandler) {
          return this.errorHandler(error, item)
        }

        throw error
      }
    }

    return wrap()
  }

  /**
   * Creates a deferred promise and pushes the related callback to the pending
   * queue. Returns the promise which is used to wait for the callback.
   *
   * @returns {Promise}
   */
  async processingSlot (): Promise<void> {
    return this.waitForTaskToFinish()
  }

  async waitForTaskToFinish (): Promise<void> {
    await Promise.race(this.tasks)
  }

  async drainActiveTasks (): Promise<void> {
    await Promise.all(this.tasks)
  }

  /**
   * Wait for all active tasks to finish. Once all the tasks finished
   * processing, returns an object containing the results and errors.
   *
   * @returns {Object}
   */
  async drained (): Promise<any[]> {
    await this.drainActiveTasks()

    return Promise.all(this.results)
  }

  /**
   * Determines whether the number of active tasks is greater or equal to the concurrency limit.
   *
   * @returns {Boolean}
   */
  hasReachedConcurrencyLimit (): boolean {
    return this.activeCount() >= this.concurrency
  }

  /**
   * Returns the number of active tasks.
   *
   * @returns {Number}
   */
  activeCount (): number {
    return this.tasks.length
  }
}
