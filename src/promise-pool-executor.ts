'use strict'

import { Stoppable } from './stoppable'
import { tap } from '@supercharge/goodies'
import { ReturnValue } from './return-value'
import { PromisePoolError } from './promise-pool-error'
import { StopThePromisePoolError } from './stop-the-promise-pool-error'

type ErrorHandler<T> = (error: Error, item: T, pool: Stoppable) => void | Promise<void>

export class PromisePoolExecutor<T, R> implements Stoppable {
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
  private handler: (item: T, pool: Stoppable) => any

  /**
   * The async error handling function.
   */
  private errorHandler?: ErrorHandler<T>

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
    if (!(typeof concurrency === 'number' && concurrency >= 1)) {
      throw new TypeError(`"concurrency" must be a number, 1 or up. Received "${concurrency}" (${typeof this.concurrency})`)
    }

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
    if (!Array.isArray(items)) {
      throw new TypeError(`"items" must be an array. Received ${typeof items}`)
    }

    return tap(this, () => {
      this.meta.items = ([] as T[]).concat(items)
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
  withHandler (action: (item: T, pool: Stoppable) => R | Promise<R>): this {
    if (typeof action !== 'function') {
      throw new Error('The first parameter for the .process(fn) method must be a function')
    }

    return tap(this, () => {
      this.handler = action
    })
  }

  /**
   * Set the error handler function to execute when an error occurs.
   *
   * @param {Function} errorHandler
   *
   * @returns {PromisePoolExecutor}
   */
  handleError (errorHandler?: ErrorHandler<T>): this {
    if (!errorHandler) {
      return this
    }

    if (typeof errorHandler !== 'function') {
      throw new Error(`The error handler must be a function. Received ${typeof errorHandler}`)
    }

    return tap(this, () => {
      this.errorHandler = errorHandler
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
   * Stop a promise pool processing.
   */
  stop (): void {
    this.markAsStopped()

    throw new StopThePromisePoolError()
  }

  /**
   * Mark the promise pool as stopped.
   *
   * @returns {PromisePoolExecutor}
   */
  markAsStopped (): this {
    return tap(this, () => {
      this.meta.stopped = true
    })
  }

  /**
   * Determine whether the pool should stop.
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
    return await this.process()
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
      if (this.stopped()) {
        break
      }

      if (this.hasReachedConcurrencyLimit()) {
        await this.waitForTaskToFinish()
      }

      this.startProcessing(item)
    }

    return await this.drained()
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
    const task: Promise<void> = this.createTaskFor(item)
      .then(result => {
        this
          .removeActive(task)
          .save(result)
      })
      .catch(async error => {
        return this
          .removeActive(task)
          .handleErrorFor(error, item)
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
    return this.handler(item, this)
  }

  /**
   * Save the given calculation `result`.
   *
   * @param {*} result
   *
   * @returns {PromisePoolExecutor}
   */
  save (result: any): this {
    return tap(this, () => {
      this.results().push(result)
    })
  }

  /**
   * Remove the given `task` from the list of active tasks.
   *
   * @param {Promise} task
   */
  removeActive (task: Promise<void>): this {
    this.tasks().splice(
      this.tasks().indexOf(task), 1
    )

    return this
  }

  /**
   * Create and save an error for the the given `item`.
   *
   * @param {T} item
   */
  async handleErrorFor (error: Error, item: T): Promise<void> {
    if (this.isStoppingThePool(error)) {
      return
    }

    return this.errorHandler
      ? await this.runErrorHandlerFor(error, item)
      : this.saveErrorFor(error, item)
  }

  /**
   * Determine whether the given `error` is a `StopThePromisePoolError` instance.
   *
   * @param {Error} error
   *
   * @returns {Boolean}
   */
  isStoppingThePool (error: Error): boolean {
    return error instanceof StopThePromisePoolError
  }

  /**
   * Run the user’s error handler, if available.
   *
   * @param {Error} processingError
   * @param {T} item
   */
  async runErrorHandlerFor (processingError: Error, item: T): Promise<void> {
    if (!this.errorHandler) {
      return
    }

    try {
      return await this.errorHandler(processingError, item, this)
    } catch (error) {
      this.rethrowIfNotStoppingThePool(error)
    }
  }

  /**
   * Rethrow the given `error` if it’s not an instance of `StopThePromisePoolError`.
   *
   * @param {Error} error
   */
  rethrowIfNotStoppingThePool (error: Error): void {
    if (this.isStoppingThePool(error)) {
      return
    }

    throw error
  }

  /**
   * Create and save an error for the the given `item`.
   *
   * @param {T} item
   */
  saveErrorFor (error: Error, item: T): void {
    this.errors().push(
      PromisePoolError.createFrom(error, item)
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
