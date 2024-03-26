'use strict'

import { PromisePool } from './promise-pool'
import { ReturnValue } from './return-value'
import { ValidationError } from './validation-error'
import { PromisePoolError } from './promise-pool-error'
import { StopThePromisePoolError } from './stop-the-promise-pool-error'
import { ErrorHandler, ProcessHandler, OnProgressCallback, Statistics, Stoppable, UsesConcurrency, SomeIterable } from './contracts'

export class PromisePoolExecutor<T, R> implements UsesConcurrency, Stoppable, Statistics<T> {
  /**
   * Stores the internal properties.
   */
  private readonly meta: {
    /**
     * The list of items to process.
     */
    items: SomeIterable<T>

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
  private handler: ProcessHandler<T, R>

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

    this.handler = (item) => item as any
    this.errorHandler = undefined
    this.onTaskStartedHandlers = []
    this.onTaskFinishedHandlers = []
  }

  /**
   * Set the number of tasks to process concurrently the promise pool.
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
   */
  private isValidConcurrency (concurrency: number): boolean {
    return typeof concurrency === 'number' && concurrency >= 1
  }

  /**
   * Set the timeout in ms for the pool handler
   */
  withTaskTimeout (timeout: number | undefined): this {
    this.meta.taskTimeout = timeout

    return this
  }

  /**
   * Returns the number of concurrently processed tasks.
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
   */
  for (items: SomeIterable<T>): this {
    this.meta.items = items

    return this
  }

  /**
   * Returns the list of items to process.
   */
  items (): SomeIterable<T> {
    return this.meta.items
  }

  /**
   * Returns the number of items to process, or `NaN` if items are not an array.
   */
  itemsCount (): number {
    const items = this.items()
    return Array.isArray(items) ? items.length : NaN
  }

  /**
   * Returns the list of active tasks.
   */
  tasks (): any[] {
    return this.meta.tasks
  }

  /**
   * Returns the number of currently active tasks.
   *
   * @deprecated use the `activeTasksCount()` method (plural naming) instead
   */
  activeTaskCount (): number {
    return this.activeTasksCount()
  }

  /**
   * Returns the number of currently active tasks.
   */
  activeTasksCount (): number {
    return this.tasks().length
  }

  /**
   * Returns the list of processed items.
   */
  processedItems (): T[] {
    return this.meta.processedItems
  }

  /**
   * Returns the number of processed items.
   */
  processedCount (): number {
    return this.processedItems().length
  }

  /**
   * Returns the percentage progress of items that have been processed, or `NaN` if items is not an array.
   */
  processedPercentage (): number {
    return (this.processedCount() / this.itemsCount()) * 100
  }

  /**
   * Returns the list of results.
   */
  results (): Array<R | symbol> {
    return this.meta.results
  }

  /**
   * Returns the list of errors.
   */
  errors (): Array<PromisePoolError<T>> {
    return this.meta.errors
  }

  /**
   * Set the handler that is applied to each item.
   */
  withHandler (action: ProcessHandler<T, R>): this {
    this.handler = action

    return this
  }

  /**
   * Determine whether a custom error handle is available.
   */
  hasErrorHandler (): boolean {
    return !!this.errorHandler
  }

  /**
   * Set the error handler function to execute when an error occurs.
   */
  handleError (handler?: (error: Error, item: T, pool: Stoppable & UsesConcurrency) => Promise<void> | void): this {
    this.errorHandler = handler

    return this
  }

  /**
   * Set the handler function to execute when started a task.
   */
  onTaskStarted (handlers: Array<OnProgressCallback<T>>): this {
    this.onTaskStartedHandlers = handlers

    return this
  }

  /**
    * Assign the given callback `handler` function to run when a task finished.
   */

  onTaskFinished (handlers: Array<OnProgressCallback<T>>): this {
    this.onTaskFinishedHandlers = handlers

    return this
  }

  /**
   * Determines whether the number of active tasks is greater or equal to the concurrency limit.
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
   */
  markAsStopped (): this {
    this.meta.stopped = true

    return this
  }

  /**
   * Determine whether the pool is stopped.
   */
  isStopped (): boolean {
    return this.meta.stopped
  }

  /**
   * Start processing the promise pool.
   */
  async start (): Promise<any> {
    return await this
      .validateInputs()
      .prepareResultsArray()
      .process()
  }

  /**
   * Ensure that the given input values are valid or throw an error otherwise.
   */
  validateInputs (): this {
    if (typeof this.handler !== 'function') {
      throw ValidationError.createFrom('The first parameter for the .process(fn) method must be a function')
    }

    const timeout = this.taskTimeout()

    if (!(timeout == null || (typeof timeout === 'number' && timeout >= 0))) {
      throw ValidationError.createFrom(`"timeout" must be undefined or a number. A number must be 0 or up. Received "${String(timeout)}" (${typeof timeout})`)
    }

    if (!this.areItemsValid()) {
      throw ValidationError.createFrom(`"items" must be an array, an iterable or an async iterable. Received "${typeof this.items()}"`)
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
   * Determine whether the provided items are processable by the pool. We’re
   * handling arrays and (async) iterables. Everything else is not valid.
   */
  private areItemsValid (): boolean {
    const items = this.items() as any

    return Array.isArray(items) ||
            typeof items[Symbol.iterator] === 'function' ||
            typeof items[Symbol.asyncIterator] === 'function'
  }

  /**
   * Prefill the results array with `notRun` symbol values if results should correspond.
   */
  private prepareResultsArray (): this {
    const items = this.items()

    if (Array.isArray(items) && this.shouldUseCorrespondingResults()) {
      this.meta.results = Array(items.length).fill(PromisePool.notRun)
    }

    return this
  }

  /**
   * Starts processing the promise pool by iterating over the items
   * and running each item through the async `callback` function.
   */
  async process (): Promise<ReturnValue<T, R>> {
    let index = 0

    for await (const item of this.items()) {
      if (this.isStopped()) {
        break
      }

      if (this.shouldUseCorrespondingResults()) {
        this.results()[index] = PromisePool.notRun
      }

      this.startProcessing(item, index)
      index += 1

      // don't consume the next item from iterable
      // until there's a free slot for a new task
      await this.waitForProcessingSlot()
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
   */
  async createTaskFor (item: T, index: number): Promise<any> {
    if (this.taskTimeout() === undefined) {
      return this.handler(item, index, this)
    }

    const [timer, canceller] = this.createTaskTimeout(item)

    return Promise.race([
      this.handler(item, index, this),
      timer(),
    ]).finally(canceller)
  }

  /**
   * Returns a tuple of a timer function and a canceller function that
   * times-out after the configured task timeout.
   */
  private createTaskTimeout (item: T): [() => Promise<void>, () => void] {
    let timerId: ReturnType<typeof setTimeout> | undefined

    const timer: () => Promise<void> = async () =>
      new Promise<void>((_resolve, reject) => {
        timerId = setTimeout(() => {
          reject(new PromisePoolError(`Task in promise pool timed out after ${this.taskTimeout() as number}ms`, item))
        }, this.taskTimeout())
      })

    const canceller: () => void = () => clearTimeout(timerId)

    return [timer, canceller]
  }

  /**
   * Save the given calculation `result`, possibly at the provided `position`.
   */
  save (result: any, position: number): this {
    this.shouldUseCorrespondingResults()
      ? this.results()[position] = result
      : this.results().push(result)

    return this
  }

  /**
   * Remove the given `task` from the list of active tasks.
   */
  removeActive (task: Promise<void>): this {
    this.tasks().splice(
      this.tasks().indexOf(task), 1
    )

    return this
  }

  /**
   * Create and save an error for the the given `item`.
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
   */
  isStoppingThePoolError (error: Error): boolean {
    return error instanceof StopThePromisePoolError
  }

  /**
   * Determine whether the given `error` is a `ValidationError` instance.
   */
  isValidationError (error: Error): boolean {
    return error instanceof ValidationError
  }

  /**
   * Run the user’s error handler, if available.
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
   */
  rethrowIfNotStoppingThePool (error: Error): void {
    if (this.isStoppingThePoolError(error)) {
      return
    }

    throw error
  }

  /**
   * Create and save an error for the the given `item`.
   */
  saveErrorFor (error: Error, item: T): void {
    this.errors().push(
      PromisePoolError.createFrom(error, item)
    )
  }

  /**
   * Wait for all active tasks to finish. Once all the tasks finished
   * processing, returns an object containing the results and errors.
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
