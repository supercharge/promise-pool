'use strict'

import { ReturnValue } from './return-value'
import { PromisePoolExecutor } from './promise-pool-executor'
import { ErrorHandler, ProcessHandler, OnProgressCallback, SomeIterable } from './contracts'

export class PromisePool<T, ShouldUseCorrespondingResults extends boolean = false> {
  /**
   * The processable items.
   */
  private readonly items: SomeIterable<T>

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

  public static readonly notRun: symbol = Symbol('notRun')
  public static readonly failed: symbol = Symbol('failed')

  /**
   * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
   */
  constructor (items?: SomeIterable<T>) {
    this.timeout = undefined
    this.concurrency = 10
    this.items = items ?? []
    this.errorHandler = undefined
    this.onTaskStartedHandlers = []
    this.onTaskFinishedHandlers = []
    this.shouldResultsCorrespond = false
  }

  /**
   * Set the number of tasks to process concurrently in the promise pool.
   */
  withConcurrency (concurrency: number): PromisePool<T> {
    this.concurrency = concurrency

    return this
  }

  /**
   * Set the number of tasks to process concurrently in the promise pool.
   */
  static withConcurrency (concurrency: number): PromisePool<unknown> {
    return new this().withConcurrency(concurrency)
  }

  /**
   * Set the timeout in milliseconds for the pool handler.
   */
  withTaskTimeout (timeout: number): PromisePool<T> {
    this.timeout = timeout

    return this
  }

  /**
   * Set the timeout in milliseconds for the pool handler.
   */
  static withTaskTimeout (timeout: number): PromisePool<unknown> {
    return new this().withTaskTimeout(timeout)
  }

  /**
   * Set the items to be processed in the promise pool.
   */
  for<ItemType> (items: SomeIterable<ItemType>): PromisePool<ItemType> {
    const pool = new PromisePool<ItemType>(items).withConcurrency(this.concurrency)

    if (typeof this.errorHandler === 'function') {
      pool.handleError(this.errorHandler as unknown as ErrorHandler<ItemType>)
    }

    return typeof this.timeout === 'number'
      ? pool.withTaskTimeout(this.timeout)
      : pool
  }

  /**
   * Set the items to be processed in the promise pool.
   */
  static for<T> (items: SomeIterable<T>): PromisePool<T> {
    return new this<T>().for(items)
  }

  /**
   * Set the error handler function to execute when an error occurs.
   */
  handleError (handler: ErrorHandler<T>): PromisePool<T> {
    this.errorHandler = handler

    return this
  }

  /**
   * Assign the given callback `handler` function to run when a task starts.
   */
  onTaskStarted (handler: OnProgressCallback<T>): PromisePool<T> {
    this.onTaskStartedHandlers.push(handler)

    return this
  }

  /**
   * Assign the given callback `handler` function to run when a task finished.
   */
  onTaskFinished (handler: OnProgressCallback<T>): PromisePool<T> {
    this.onTaskFinishedHandlers.push(handler)

    return this
  }

  /**
   * Assign whether to keep corresponding results between source items and resulting tasks.
   */
  useCorrespondingResults (): PromisePool<T, true> {
    this.shouldResultsCorrespond = true

    return this
  }

  /**
   * Starts processing the promise pool by iterating over the items
   * and running each item through the async `callback` function.
   */
  async process<ResultType, ErrorType = any> (
    callback: ProcessHandler<T, ResultType>
  ): Promise<ReturnValue<T, ShouldUseCorrespondingResults extends true ? ResultType | symbol : ResultType, ErrorType>> {
    return new PromisePoolExecutor<T, ResultType>()
      .useConcurrency(this.concurrency)
      .useCorrespondingResults(this.shouldResultsCorrespond)
      .withTaskTimeout(this.timeout)
      .withHandler(callback)
      .handleError(this.errorHandler)
      .onTaskStarted(this.onTaskStartedHandlers)
      .onTaskFinished(this.onTaskFinishedHandlers)
      .for(this.items)
      .start()
  }
}
