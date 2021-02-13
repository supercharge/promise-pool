'use strict'

import { ReturnValue } from './return-value'
import { tap, upon } from '@supercharge/goodies'
import { PromisePoolError } from './promise-pool-error'

export class PromisePoolExecutor<T, R> {
  /**
   * The list of items to process.
   */
  private meta: {
    /**
     * The list of items to process.
     */
    items: T[]

    /**
     * The number of concurrently running tasks.
     */
    concurrency: number

    /**
     * Determine whether the pool is stopped.
     */
    stopped: boolean

    /**
     * The intermediate list of currently running tasks.
     */
    readonly tasks: any[]

    /**
     * The list of results.
     */
    readonly results: R[]

    /**
     * The list of errors.
     */
    readonly errors: Array<PromisePoolError<T>>
  }

  /**
   * The async processing function receiving each item from the `items` array.
   */
  private handler: (item: T) => any

  /**
   * The async error handling function.
   */
  private errorHandler?: (error: Error, item: T) => void | Promise<void>

  /**
   * Creates a new promise pool executer instance with a default concurrency of 10.
   */
  constructor () {
    this.meta = {
      tasks: [],
      items: [],
      errors: [],
      results: [],
      stopped: false,
      concurrency: 10
    }
    this.handler = () => {}
    this.errorHandler = undefined
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
      this.meta.concurrency = concurrency
    })
  }

  /**
   * Returns the number of concurrently processed tasks.
   *
   * @returns {Number}
   */
  concurrency (): number {
    return this.meta.concurrency
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
      this.meta.items = items
    })
  }

  /**
   * Returns the list of items to process.
   *
   * @returns {T[]}
   */
  items (): T[] {
    return this.meta.items
  }

  /**
   * Returns the list of active tasks.
   *
   * @returns {Array}
   */
  tasks (): any[] {
    return this.meta.tasks
  }

  /**
   * Returns the list of results.
   *
   * @returns {R[]}
   */
  results (): R[] {
    return this.meta.results
  }

  /**
   * Returns the list of errors.
   *
   * @returns {Array<PromisePoolError<T>>}
   */
  errors (): Array<PromisePoolError<T>> {
    return this.meta.errors
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
   * Set the error handler function to execute when an error occurs.
   *
   * @param {Function} handler
   *
   * @returns {PromisePoolExecutor}
   */
  handleError (handler?: (error: Error, item: T) => Promise<void> | void): this {
    return tap(this, () => {
      this.errorHandler = handler
    })
  }

  /**
   * Determines whether the number of active tasks is greater or equal to the concurrency limit.
   *
   * @returns {Boolean}
   */
  hasReachedConcurrencyLimit (): boolean {
    return this.activeTasks() >= this.concurrency()
  }

  /**
   * Returns the number of active tasks.
   *
   * @returns {Number}
   */
  activeTasks (): number {
    return this.meta.tasks.length
  }

  /**
   * Determine whether the pool should stop processing.
   *
   * @returns {Boolean}
   */
  stopped (): boolean {
    return this.meta.stopped
  }

  /**
   * Start processing the promise pool.
   *
   * @returns {ReturnValue}
   */
  async start (): Promise<ReturnValue<T, R>> {
    return upon(this.validateInputs(), async () => {
      return this.process()
    })
  }

  /**
   * Stop a promise pool processing.
   */
  async stop (): Promise<void> {
    //
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

    if (!(typeof this.concurrency() === 'number' && this.concurrency() >= 1)) {
      throw new TypeError(`"concurrency" must be a number, 1 or up. Received "${this.concurrency()}" (${typeof this.concurrency})`)
    }

    if (!Array.isArray(this.items())) {
      throw new TypeError(`"items" must be an array. Received ${typeof this.items()}`)
    }

    if (this.errorHandler) {
      if (typeof this.errorHandler !== 'function') {
        throw new Error(`The error handler must be a function. Received ${typeof this.errorHandler}`)
      }
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
    for (const item of this.items()) {
      if (this.hasReachedConcurrencyLimit()) {
        await this.waitForTaskToFinish()
      }

      this.startProcessing(item)
    }

    return this.drained()
  }

  /**
   * Wait for one of the active tasks to finish processing.
   */
  async waitForTaskToFinish (): Promise<void> {
    await Promise.race(
      this.tasks()
    )
  }

  /**
   * Create a processing function for the given `item`.
   *
   * @param {*} item
   */
  startProcessing (item: T): void {
    const task = this.createTaskFor(item)
      .then(result => {
        this.results().push(result)
        this.removeActive(task)
      })
      .catch(error => {
        this.removeActive(task)

        if (this.errorHandler) {
          return this.errorHandler(error, item)
        }

        this.errors().push(
          PromisePoolError.createFrom(error, item)
        )
      })

    this.tasks().push(task)
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
   * Remove the given `task` from the list of active tasks.
   *
   * @param {Promise} task
   */
  removeActive (task: Promise<void>): void {
    this.tasks().splice(
      this.tasks().indexOf(task), 1
    )
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
      errors: this.errors(),
      results: this.results()
    }
  }

  /**
   * Wait for all of the active tasks to finish processing.
   */
  async drainActiveTasks (): Promise<void> {
    await Promise.all(
      this.tasks()
    )
  }
}
