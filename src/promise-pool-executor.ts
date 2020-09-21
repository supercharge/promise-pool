'use strict'

import { ReturnValue } from './return-value'
import { tap, upon } from '@supercharge/goodies'
import { PromisePoolError } from './promise-pool-error'

export class PromisePoolExecutor<T, R> {
  /**
   * The list of items to process.
   */
  private items: T[]

  /**
   * The number of concurrently running tasks.
   */
  private concurrency: number

  /**
   * The intermediate list of currently running tasks.
   */
  private readonly tasks: any[]

  /**
   * The list of results.
   */
  private readonly results: R[]

  /**
   * The async processing function receiving each item from the `items` array.
   */
  private handler: (item: T) => any

  /**
   * The list of errors.
   */
  private readonly errors: Array<PromisePoolError<T>>

  /**
   * Creates a new promise pool executer instance with a default concurrency of 10.
   */
  constructor () {
    this.tasks = []
    this.items = []
    this.errors = []
    this.results = []
    this.concurrency = 10
    this.handler = () => {}
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
  for (items: T[]): this {
    return tap(this, () => {
      this.items = items
    })
  }

  /**
   * Set the handler that is applied to each item.
   *
   * @param {Function} action
   *
   * @returns {PromisePoolExecutor}
   */
  withHandler (action: (item: T) => R | Promise<R>): this {
    return tap(this, () => {
      this.handler = action
    })
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

  /**
   * Start processing the promise pool.
   *
   * @returns {Array}
   */
  async start (): Promise<ReturnValue<T, R>> {
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
    if (typeof this.handler !== 'function') {
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
  async process (): Promise<ReturnValue<T, R>> {
    for (const item of this.items) {
      if (this.hasReachedConcurrencyLimit()) {
        await this.processingSlot()
      }

      this.startProcessing(item)
    }

    return this.drained()
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

  /**
   * Wait for one of the active tasks to finish processing.
   */
  async waitForTaskToFinish (): Promise<void> {
    await Promise.race(this.tasks)
  }

  /**
   * Create a processing function for the given `item`.
   *
   * @param {*} item
   */
  startProcessing (item: T): void {
    const task = this.createTaskFor(item)
      .then(result => {
        this.results.push(result)
        this.tasks.splice(this.tasks.indexOf(task), 1)
      })
      .catch(error => {
        this.errors.push(
          PromisePoolError.createFrom(error, item)
        )
      })

    this.tasks.push(task)
  }

  /**
   * Ensures a returned promise for the processing of the given `item`.
   *
   * @param item
   *
   * @returns {*}
   */
  async createTaskFor (item: T): Promise<any> {
    return this.handler(item)
  }

  /**
   * Wait for all active tasks to finish. Once all the tasks finished
   * processing, returns an object containing the results and errors.
   *
   * @returns {Object}
   */
  async drained (): Promise<ReturnValue<T, R>> {
    await this.drainActiveTasks()

    return {
      results: this.results,
      errors: this.errors
    }
  }

  /**
   * Wait for all of the active tasks to finish processing.
   */
  async drainActiveTasks (): Promise<void> {
    await Promise.all(this.tasks)
  }
}
