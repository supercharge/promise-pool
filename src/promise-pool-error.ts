'use strict'

export class PromisePoolError<T, E = any> extends Error {
  /**
   * Returns the item that caused this error.
   */
  public item: T

  /**
   * Returns the original, raw error instance.
   */
  public raw: E

  /**
   * Create a new instance for the given `message` and `item`.
   *
   * @param error  The original error
   * @param item   The item causing the error
   */
  constructor (error: E, item: T) {
    super()

    this.raw = error
    this.item = item
    this.name = this.constructor.name
    this.message = this.messageFrom(error)

    if (Error.captureStackTrace && typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Returns a new promise pool error instance wrapping the `error` and `item`.
   */
  static createFrom<T, E = any>(error: E, item: T): PromisePoolError<T> {
    return new this(error, item)
  }

  /**
   * Returns the error message from the given `error`.
   */
  private messageFrom (error: any): string {
    if (error instanceof Error) {
      return error.message
    }

    if (typeof error === 'object') {
      return error.message
    }

    if (typeof error === 'string' || typeof error === 'number') {
      return error.toString()
    }

    return ''
  }
}
