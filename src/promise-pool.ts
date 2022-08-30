'use strict'

import { ReturnValue } from './return-value'
import { PromisePoolExecutor } from './promise-pool-executor'
import { ErrorHandler, ProcessHandler, OnProgressCallback } from './contracts'

export class PromisePool<T, ReturnType> {
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

  public static readonly notRun: Symbol = Symbol('notRun')
  public static readonly rejected: Symbol = Symbol('rejected')

  /**
   * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
   *
   * @param {Object} options
   */
  constructor (items?: T[], shouldResultsCorrespond: boolean = false) {
    this.concurrency = 10
    this.shouldResultsCorrespond = shouldResultsCorrespond
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
  withConcurrency (concurrency: number): PromisePool<T, ReturnType> {
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
  static withConcurrency (concurrency: number): PromisePool<unknown, unknown> {
    return new this().withConcurrency(concurrency)
  }

  /**
   * Set the items to be processed in the promise pool.
   *
   * @param {T[]} items
   *
   * @returns {PromisePool}
   */
  for<T> (items: T[]): PromisePool<T, ReturnType> {
    return new PromisePool<T, ReturnType>(items).withConcurrency(this.concurrency)
  }

  /**
   * Set the items to be processed in the promise pool.
   *
   * @param {T[]} items
   *
   * @returns {PromisePool}
   */
  static for<T, ReturnType> (items: T[]): PromisePool<T, ReturnType> {
    return new this<T, ReturnType>().for(items)
  }

  /**
   * Set the error handler function to execute when an error occurs.
   *
   * @param {ErrorHandler<T>} handler
   *
   * @returns {PromisePool}
   */
  handleError (handler: ErrorHandler<T>): PromisePool<T, ReturnType> {
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
  onTaskStarted (handler: OnProgressCallback<T>): PromisePool<T, ReturnType> {
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
  onTaskFinished (handler: OnProgressCallback<T>): PromisePool<T, ReturnType> {
    this.onTaskFinishedHandlers.push(handler)

    return this
  }

  useCorrespondingResults () {
    const pool = new PromisePool<T, number | Symbol>(this.items, true)
        .withConcurrency(this.concurrency)
    if (this.errorHandler) {
      pool.handleError(this.errorHandler);
    }
    for (const handler of this.onTaskStartedHandlers) {
      pool.onTaskStarted(handler)
    }
    for (const handler of this.onTaskFinishedHandlers) {
      pool.onTaskFinished(handler)
    }
    return pool
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
