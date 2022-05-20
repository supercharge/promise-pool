'use strict'

import { ReturnValue } from './return-value'
import { PromisePoolError } from './promise-pool-error'
import { StopThePromisePoolError } from './stop-the-promise-pool-error'
import { ErrorHandler, ProcessHandler, OnProgressCallback, Statistics, Stoppable } from './contracts'

export class PromisePoolExecutor<T, R> implements Stoppable, Statistics<T> {
  /**
   * Stores the internal properties.
   */
  private meta: {
    /**
     * The list of items to process.
     */
    items: T[]

    /**
     * The list of processed items.
     */
    processedItems: T[]

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
  private handler: (item: T, index: number, pool: Stoppable) => any

  /**
   * The async error handling function.
   */
  private errorHandler?: ErrorHandler<T>

  /**
   * The `taskStarted` handler callback functions
   */
  private onTaskStartedHandlers: Array<OnProgressCallback<T>>

  /**
    * The `taskFinished` handler callback functions
    */
  private onTaskFinishedHandlers: Array<OnProgressCallback<T>>

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
      concurrency: 10,
      processedItems: [],
    }

    this.handler = () => {}
    this.errorHandler = undefined
    this.onTaskStartedHandlers = []
    this.onTaskFinishedHandlers = []
  }

  /**
   * Set the number of tasks to process concurrently the promise pool.
   *
   * @param {Integer} concurrency
   *
   * @returns {PromisePoolExecutor}
   */
  withConcurrency (concurrency: number): this {
    this.meta.concurrency = concurrency

    return this
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
    this.meta.items = items

    return this
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
   * Returns the number of items to process.
   *
   * @returns {Number}
   */
  itemsCount (): number {
    return this.items().length
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
   * Returns the number of currently processed tasks.
   *
   * @returns {Number}
   */
  activeTaskCount (): number {
    return this.tasks().length
  }

  /**
   * Returns the list of processed items.
   *
   * @returns {T[]}
   */
  processedItems (): T[] {
    return this.meta.processedItems
  }

  /**
   * Returns the number of processed items.
   *
   * @returns {Number}
   */
  processedCount (): number {
    return this.processedItems().length
  }

  /**
   * Returns the percentage progress of items that have been processed.
   */
  processedPercentage (): number {
    return (this.processedCount() / this.itemsCount()) * 100
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
  withHandler (action: ProcessHandler<T, R>): this {
    this.handler = action

    return this
  }

  /**
   * Determine whether a custom error handle is available.
   *
   * @returns {Boolean}
   */
  hasErrorHandler (): boolean {
    return !!this.errorHandler
  }

  /**
   * Set the error handler function to execute when an error occurs.
   *
   * @param {Function} errorHandler
   *
   * @returns {PromisePoolExecutor}
   */
  handleError (handler?: (error: Error, item: T, pool: Stoppable) => Promise<void> | void): this {
    this.errorHandler = handler

    return this
  }

  /**
   * Set the handler function to execute when started a task.
   *
   * @param {Function} handler
   *
   * @returns {this}
   */
  onTaskStarted (handlers: Array<OnProgressCallback<T>>): this {
    this.onTaskStartedHandlers = handlers

    return this
  }

  /**
    * Assign the given callback `handler` function to run when a task finished.
   *
   * @param {OnProgressCallback<T>} handlers
   *
   * @returns {this}
   */

  onTaskFinished (handlers: Array<OnProgressCallback<T>>): this {
    this.onTaskFinishedHandlers = handlers

    return this
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
    this.meta.stopped = true

    return this
  }

  /**
   * Determine whether the pool is stopped.
   *
   * @returns {Boolean}
   */
  isStopped (): boolean {
    return this.meta.stopped
  }

  /**
   * Start processing the promise pool.
   *
   * @returns {ReturnValue}
   */
  async start (): Promise<ReturnValue<T, R>> {
    return await this.validateInputs().process()
  }

  /**
   * Determine whether the pool should stop.
   *
   * @returns {PromisePoolExecutor}
   *
   * @throws
   */
  validateInputs (): this {
    if (typeof this.handler !== 'function') {
      throw new Error('The first parameter for the .process(fn) method must be a function')
    }

    if (!(typeof this.concurrency() === 'number' && this.concurrency() >= 1)) {
      throw new TypeError(`"concurrency" must be a number, 1 or up. Received "${this.concurrency()}" (${typeof this.concurrency()})`)
    }

    if (!Array.isArray(this.items())) {
      throw new TypeError(`"items" must be an array. Received ${typeof this.items()}`)
    }

    if (this.errorHandler && typeof this.errorHandler !== 'function') {
      throw new Error(`The error handler must be a function. Received ${typeof this.errorHandler}`)
    }

    this.onTaskStartedHandlers.forEach(handler => {
      if (handler && typeof handler !== 'function') {
        throw new Error(`The onTaskStarted handler must be a function. Received ${typeof handler}`)
      }
    })

    this.onTaskFinishedHandlers.forEach(handler => {
      if (handler && typeof handler !== 'function') {
        throw new Error(`The error handler must be a function. Received ${typeof handler}`)
      }
    })

    return this
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
    for (const [index, item] of this.items().entries()) {
      if (this.isStopped()) {
        break
      }

      if (this.hasReachedConcurrencyLimit()) {
        await this.waitForTaskToFinish()
      }

      this.startProcessing(item, index)
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
   * @param {T} item
   * @param {number} index
   */
  startProcessing (item: T, index: number): void {
    const task: Promise<void> = this.createTaskFor(item, index)
      .then(result => {
        this
          .removeActive(task)
          .save(result)
      })
      .catch(async error => {
        return this
          .removeActive(task)
          .handleErrorFor(error, item)
      }).finally(() => {
        this.processedItems().push(item)
        this.runOnTaskFinishedHandlers(item)
      })

    this.tasks().push(task)
    this.runOnTaskStartedHandlers(item)
  }

  /**
   * Ensures a returned promise for the processing of the given `item`.
   *
   * @param {T} item
   * @param {number} index
   *
   * @returns {*}
   */
  async createTaskFor (item: T, index: number): Promise<any> {
    return this.handler(item, index, this)
  }

  /**
   * Save the given calculation `result`.
   *
   * @param {*} result
   *
   * @returns {PromisePoolExecutor}
   */
  save (result: any): this {
    this.results().push(result)

    return this
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
   * @param {Error} error
   * @param {T} item
   */
  async handleErrorFor (error: Error, item: T): Promise<void> {
    if (this.isStoppingThePool(error)) {
      return
    }

    return this.hasErrorHandler()
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
    try {
      return await this.errorHandler?.(processingError, item, this)
    } catch (error: any) {
      this.rethrowIfNotStoppingThePool(error)
    }
  }

  /**
   * Run the onTaskStarted handlers.
   */
  runOnTaskStartedHandlers (item: T): void {
    this.onTaskStartedHandlers.forEach(handler => {
      handler(item, this)
    })
  }

  /**
   * Run the onTaskFinished handlers.
   */
  runOnTaskFinishedHandlers (item: T): void {
    this.onTaskFinishedHandlers.forEach(handler => {
      handler(item, this)
    })
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
