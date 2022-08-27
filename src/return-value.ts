'use strict'

import { PromisePoolError } from './promise-pool-error'

export type Result<R> = R | Symbol

export interface ReturnValue<T, R, E = any> {
  /**
   * The list of results returned by the processing function.
   */
  results: Array<Result<R>>

  /**
   * The list of errors that occurred while processing all items in the pool.
   * Each error contains the error-causing item at `error.item` as a
   * reference for re-processing.
   */
  errors: Array<PromisePoolError<T, E>>
}
