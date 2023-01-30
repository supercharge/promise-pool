'use strict'

import { ReturnValue } from './return-value'
import { PromisePoolExecutor } from './promise-pool-executor'
import { ErrorHandler, ProcessHandler, OnProgressCallback } from './contracts'

export class PromisePool<T> {
  /**
   * The processable items.
   */
  private readonly items: T[]

  /**
   * The number of promises running concurrently.
   */
  private concurrency: number

  /**
   * The maximum timeout in milliseconds for the item handler, or `undefined` to disable.
   */
  private timeout: number | undefined

  /**
   * The error handler callback function
   */
  private errorHandler?: ErrorHandler<T>

  /**
   * The `taskStarted` handler callback functions
   */
  private readonly onTaskStartedHandlers: Array<OnProgressCallback<T>>

  /**
   * The `taskFinished` handler callback functions
   */
  private readonly onTaskFinishedHandlers: Array<OnProgressCallback<T>>

  /**
   * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
   *
   * @param {Object} options
   */
  constructor (items?: T[]) {
    this.timeout = undefined
    this.concurrency = 10
    this.items = items ?? []
    this.errorHandler = undefined
    this.onTaskStartedHandlers = []
    this.onTaskFinishedHandlers = []
  }

  /**
   * Set the number of tasks to process concurrently in the promise pool.
   *
   * @param {Integer} concurrency
   *
   * @returns {PromisePool}
   */
  withConcurrency (concurrency: number): PromisePool<T> {
    this.concurrency = concurrency

    return this
  }

  /**
   * Set the number of tasks to process concurrently in the promise pool.
   *
   * @param {Number} concurrency
   *
   * @returns {PromisePool}
   */
  static withConcurrency (concurrency: number): PromisePool<unknown> {
    return new this().withConcurrency(concurrency)
  }

  /**
   * Set the timeout in milliseconds for the pool handler.
   *
   * @param {Number} timeout
   *
   * @returns {PromisePool}
   */
  withTimeout (timeout: number): PromisePool<T> {
    this.timeout = timeout

    return this
  }

  /**
   * Set the timeout in milliseconds for the pool handler.
   *
   * @param {Number} timeout
   *
   * @returns {PromisePool}
   */
  static withTimeout (timeout: number): PromisePool<unknown> {
    return new this().withTimeout(timeout)
  }

  /**
   * Set the items to be processed in the promise pool.
   *
   * @param {T[]} items
   *
   * @returns {PromisePool}
   */
  for<T> (items: T[]): PromisePool<T> {
    return typeof this.timeout === 'number'
      ? new PromisePool<T>(items).withConcurrency(this.concurrency).withTimeout(this.timeout)
      : new PromisePool<T>(items).withConcurrency(this.concurrency)
  }

  /**
   * Set the items to be processed in the promise pool.
   *
   * @param {T[]} items
   *
   * @returns {PromisePool}
   */
  static for<T> (items: T[]): PromisePool<T> {
    return new this<T>().for(items)
  }

  /**
   * Set the error handler function to execute when an error occurs.
   *
   * @param {ErrorHandler<T>} handler
   *
   * @returns {PromisePool}
   */
  handleError (handler: ErrorHandler<T>): PromisePool<T> {
    this.errorHandler = handler

    return this
  }

  /**
   * Assign the given callback `handler` function to run when a task starts.
   *
   * @param {OnProgressCallback<T>} handler
   *
   * @returns {PromisePool}
   */
  onTaskStarted (handler: OnProgressCallback<T>): PromisePool<T> {
    this.onTaskStartedHandlers.push(handler)

    return this
  }

  /**
    * Assign the given callback `handler` function to run when a task finished.
    *
    * @param {OnProgressCallback<T>} handler
    *
    * @returns {PromisePool}
    */
  onTaskFinished (handler: OnProgressCallback<T>): PromisePool<T> {
    this.onTaskFinishedHandlers.push(handler)

    return this
  }

  /**
   * Starts processing the promise pool by iterating over the items
   * and running each item through the async `callback` function.
   *
   * @param {ProcessHandler} The async processing function receiving each item from the `items` array.
   *
   * @returns Promise<{ results, errors }>
   */
  async process<ResultType, ErrorType = any> (callback: ProcessHandler<T, ResultType>): Promise<ReturnValue<T, ResultType, ErrorType>> {
    return new PromisePoolExecutor<T, ResultType>()
      .useConcurrency(this.concurrency)
      .withTimeout(this.timeout)
      .withHandler(callback)
      .handleError(this.errorHandler)
      .onTaskStarted(this.onTaskStartedHandlers)
      .onTaskFinished(this.onTaskFinishedHandlers)
      .for(this.items)
      .start()
  }
}
