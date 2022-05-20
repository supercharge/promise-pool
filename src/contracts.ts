'use strict'

export interface Stoppable {
  /**
   * Stop the promise pool and returns any results that already have been calculated.
   * Stopping the pool waits for  active task to finish processing before returning.
   */
  stop (): void

  /**
   * Determine whether the pool is marked as stopped.
   */
  isStopped(): boolean
}

export interface Statistics<T> {
  /**
   * Returns the number of currently processed tasks.
   */
  activeTaskCount (): number

  /**
   * Returns the list of processed items.
   */
  processedItems (): T[]

  /**
   * Returns the number of processed items.
   */
  processedCount (): number

  /**
   * Returns the percentage progress of items that have been processed.
   */
  processedPercentage (): number
}

export type ErrorHandler<T> = (error: Error, item: T, pool: Stoppable) => void | Promise<void>

export type ProcessHandler<T, R> = (item: T, index: number, pool: Stoppable) => R | Promise<R>

export type OnProgressCallback<T> = (item: T, pool: Stoppable & Statistics<T>) => void
