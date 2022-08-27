'use strict'

import { PromisePoolError } from './promise-pool-error'

export interface ReturnValue<T, R, E = any> {
  /**
   * The list of results returned by the processing function.
   */
  results: Array<R | Symbol>

  /**
   * The list of errors that occurred while processing all items in the pool.
   * Each error contains the error-causing item at `error.item` as a
   * reference for re-processing.
   */
  errors: Array<PromisePoolError<T, E>>
}
