'use strict'

export class PromisePoolError<T> extends Error {
  /**
   * Returns the item that caused this error.
   */
  public item: T

  /**
   * Create a new instance for the given `message` and `item`.
   *
   * @param message  The error message
   * @param item  The item causing the error
   */
  constructor (message: string, item: T) {
    super(message)

    this.item = item
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}
