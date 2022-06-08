'use strict'

export class ValidationError extends Error {
  /**
   * Create a new instance for the given `message`.
   *
   * @param message  The error message
   */
  constructor (message?: string) {
    super(message)

    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Returns a validation error with the given `message`.
   */
  static createFrom (message: string): ValidationError {
    return new this(message)
  }
}
