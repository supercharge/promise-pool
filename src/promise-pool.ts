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
   * Determine whether to put a task’s result at the same position in the result
   * array as its related source item has in the source array. Failing tasks
   * and those items that didn’t run carry a related symbol as a value.
   */
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

  public static readonly notRun: symbol = Symbol('notRun')
  public static readonly failed: symbol = Symbol('failed')

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
   * Set the items to be processed in the promise pool.
   *
   * @param {T[]} items
   *
   * @returns {PromisePool}
   */
  for<T> (items: T[]): PromisePool<T> {
    return new PromisePool<T>(items).withConcurrency(this.concurrency)
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
   * Assign whether to keep corresponding results between source items and resulting tasks.
   */
  useCorrespondingResults (): PromisePool<T> {
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
  async process<ResultType, ErrorType = any> (callback: ProcessHandler<T, ResultType>): Promise<ReturnValue<T, ResultType, ErrorType>> {
    return new PromisePoolExecutor<T, ResultType>()
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
