'use strict'

import { ReturnValue } from './return-value'
import { PromisePoolExecutor } from './promise-pool-executor'
import { ErrorHandler, ProcessHandler, OnProgressCallback } from './contracts'

export const notRun: unique symbol = Symbol('notRun')
export const rejected: unique symbol = Symbol('rejected')
export type CorrespondingResult<R> = R | typeof notRun | typeof rejected

export class PromisePool<T, UseCorrespondingResults = false> {
  /**
   * The processable items.
   */
  private readonly items: T[]

  /**
   * The number of promises running concurrently.
   */
  private concurrency: number

  private shouldResultsCorrespond: boolean

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
    this.concurrency = 10
    this.shouldResultsCorrespond = false
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
  withConcurrency (concurrency: number): PromisePool<T, UseCorrespondingResults> {
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
   * Set the items to be processed in the promise pool.
   *
   * @param {T[]} items
   *
   * @returns {PromisePool}
   */
  for<T> (items: T[]): PromisePool<T, UseCorrespondingResults> {
    const promisePool = new PromisePool<T, UseCorrespondingResults>(items)
      .withConcurrency(this.concurrency)
    if (this.shouldResultsCorrespond) {
      return promisePool.useCorrespondingResults()
    }
    return promisePool
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
  handleError (handler: ErrorHandler<T>): PromisePool<T, UseCorrespondingResults> {
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
  onTaskStarted (handler: OnProgressCallback<T>): PromisePool<T, UseCorrespondingResults> {
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
  onTaskFinished (handler: OnProgressCallback<T>): PromisePool<T, UseCorrespondingResults> {
    this.onTaskFinishedHandlers.push(handler)

    return this
  }

  useCorrespondingResults (): PromisePool<T, true> {
    this.shouldResultsCorrespond = true

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
  async process<R, ErrorType = any> (callback: ProcessHandler<T, R>): Promise<
  ReturnValue<T,
  UseCorrespondingResults extends true
    ? CorrespondingResult<R>
    : R,
  ErrorType>
  > {
    return new PromisePoolExecutor<T, any>()
      .useConcurrency(this.concurrency)
      .useCorrespondingResults(this.shouldResultsCorrespond)
      .withHandler(callback)
      .handleError(this.errorHandler)
      .onTaskStarted(this.onTaskStartedHandlers)
      .onTaskFinished(this.onTaskFinishedHandlers)
      .for(this.items)
      .start()
  }
}
