'use strict'

import { PromisePool } from './promise-pool'
import { ReturnValue } from './return-value'
import { PromisePoolError } from './promise-pool-error'
import { StopThePromisePoolError } from './stop-the-promise-pool-error'
import { ErrorHandler, ProcessHandler, OnProgressCallback, Statistics, Stoppable, UsesConcurrency } from './contracts'
import { ValidationError } from './validation-error'

export class PromisePoolExecutor<T, R> implements UsesConcurrency, Stoppable, Statistics<T> {
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
     * Determine whether to put a task’s result at the same position in the result
     * array as its related source item has in the source array.
     */
    shouldResultsCorrespond: boolean

    /**
     * The maximum timeout in milliseconds for the item handler, or `undefined` to disable.
     */
    taskTimeout: number | undefined

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
    results: Array<R | symbol>

    /**
     * The list of errors.
     */
    readonly errors: Array<PromisePoolError<T>>
  }

  /**
   * The async processing function receiving each item from the `items` array.
   */
  private handler: (item: T, index: number, pool: Stoppable & UsesConcurrency) => any

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
      shouldResultsCorrespond: false,
      processedItems: [],
      taskTimeout: 0
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
  useConcurrency (concurrency: number): this {
    if (!this.isValidConcurrency(concurrency)) {
      throw ValidationError.createFrom(`"concurrency" must be a number, 1 or up. Received "${concurrency}" (${typeof concurrency})`)
    }

    this.meta.concurrency = concurrency

    return this
  }

  /**
   * Determine whether the given `concurrency` value is valid.
   *
   * @param {Number} concurrency
   *
   * @returns {Boolean}
   */
  private isValidConcurrency (concurrency: number): boolean {
    return typeof concurrency === 'number' && concurrency >= 1
  }

  /**
   * Set the timeout in ms for the pool handler
   *
   * @param {Number} timeout
   *
   * @returns {PromisePool}
   */
  withTaskTimeout (timeout: number | undefined): this {
    this.meta.taskTimeout = timeout

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
   * Assign whether to keep corresponding results between source items and resulting tasks.
   */
  useCorrespondingResults (shouldResultsCorrespond: boolean): this {
    this.meta.shouldResultsCorrespond = shouldResultsCorrespond

    return this
  }

  /**
   * Determine whether to keep corresponding results between source items and resulting tasks.
   */
  shouldUseCorrespondingResults (): boolean {
    return this.meta.shouldResultsCorrespond
  }

  /**
   * Returns the task timeout in milliseconds.
   */
  taskTimeout (): number | undefined {
    return this.meta.taskTimeout
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
   * Returns the number of currently active tasks.
   *
   * @returns {Number}
   *
   * @deprecated use the `activeTasksCount()` method (plural naming) instead
   */
  activeTaskCount (): number {
    return this.activeTasksCount()
  }

  /**
   * Returns the number of currently active tasks.
   *
   * @returns {Number}
   */
  activeTasksCount (): number {
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
  results (): Array<R | symbol> {
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
  handleError (handler?: (error: Error, item: T, pool: Stoppable & UsesConcurrency) => Promise<void> | void): this {
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
    return this.activeTasksCount() >= this.concurrency()
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
  async start (): Promise<any> {
    return await this
      .validateInputs()
      .prepareResultsArray()
      .process()
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
      throw ValidationError.createFrom('The first parameter for the .process(fn) method must be a function')
    }

    const timeout = this.taskTimeout()

    if (!(timeout == null || (typeof timeout === 'number' && timeout >= 0))) {
      throw ValidationError.createFrom(`"timeout" must be undefined or a number. A number must be 0 or up. Received "${String(timeout)}" (${typeof timeout})`)
    }

    if (!Array.isArray(this.items())) {
      throw ValidationError.createFrom(`"items" must be an array. Received "${typeof this.items()}"`)
    }

    if (this.errorHandler && typeof this.errorHandler !== 'function') {
      throw ValidationError.createFrom(`The error handler must be a function. Received "${typeof this.errorHandler}"`)
    }

    this.onTaskStartedHandlers.forEach(handler => {
      if (handler && typeof handler !== 'function') {
        throw ValidationError.createFrom(`The onTaskStarted handler must be a function. Received "${typeof handler}"`)
      }
    })

    this.onTaskFinishedHandlers.forEach(handler => {
      if (handler && typeof handler !== 'function') {
        throw ValidationError.createFrom(`The error handler must be a function. Received "${typeof handler}"`)
      }
    })

    return this
  }

  /**
   * Prefill the results array with `notRun` symbol values if results should correspond.
   */
  private prepareResultsArray (): this {
    if (this.shouldUseCorrespondingResults()) {
      this.meta.results = Array(this.items().length).fill(PromisePool.notRun)
    }

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

      await this.waitForProcessingSlot()
      this.startProcessing(item, index)
    }

    return await this.drained()
  }

  /**
   * Wait for one of the active tasks to finish processing.
   */
  async waitForProcessingSlot (): Promise<void> {
    /**
     * We’re using a while loop here because it’s possible to decrease the pool’s
     * concurrency at runtime. We need to wait for as many tasks as needed to
     * finish processing before moving on to process the remaining tasks.
     */
    while (this.hasReachedConcurrencyLimit()) {
      await this.waitForActiveTaskToFinish()
    }
  }

  /**
   * Wait for the next, currently active task to finish processing.
   */
  async waitForActiveTaskToFinish (): Promise<void> {
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
        this.save(result, index).removeActive(task)
      })
      .catch(async error => {
        await this.handleErrorFor(error, item, index)
        this.removeActive(task)
      })
      .finally(() => {
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
    if (this.taskTimeout() === undefined) {
      return this.handler(item, index, this)
    }

    return Promise.race([
      this.handler(item, index, this),
      this.createTaskTimeout(item)
    ])
  }

  /**
   * Returns a promise that times-out after the configured task timeout.
   */
  private async createTaskTimeout (item: T): Promise<void> {
    return new Promise<void>((_resolve, reject) => {
      setTimeout(() => {
        reject(new PromisePoolError(`Promise in pool timed out after ${this.taskTimeout() as number}ms`, item))
      }, this.taskTimeout())
    })
  }

  /**
   * Save the given calculation `result`, possibly at the provided `position`.
   *
   * @param {*} result
   * @param {number} position
   *
   * @returns {PromisePoolExecutor}
   */
  save (result: any, position: number): this {
    this.shouldUseCorrespondingResults()
      ? this.results()[position] = result
      : this.results().push(result)

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
   * @param {number} index
   */
  async handleErrorFor (error: Error, item: T, index: number): Promise<void> {
    if (this.shouldUseCorrespondingResults()) {
      this.results()[index] = PromisePool.failed
    }

    if (this.isStoppingThePoolError(error)) {
      return
    }

    if (this.isValidationError(error)) {
      this.markAsStopped()
      throw error
    }

    this.hasErrorHandler()
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
  isStoppingThePoolError (error: Error): boolean {
    return error instanceof StopThePromisePoolError
  }

  /**
   * Determine whether the given `error` is a `ValidationError` instance.
   *
   * @param {Error} error
   *
   * @returns {Boolean}
   */
  isValidationError (error: Error): boolean {
    return error instanceof ValidationError
  }

  /**
   * Run the user’s error handler, if available.
   *
   * @param {Error} processingError
   * @param {T} item
   */
  async runErrorHandlerFor (processingError: Error, item: T): Promise<void> {
    try {
      await this.errorHandler?.(processingError, item, this)
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
    if (this.isStoppingThePoolError(error)) {
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
  async drained (): Promise<ReturnValue<T, any>> {
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
