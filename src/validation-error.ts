'use strict'

export class ValidationError extends Error {
  /**
   * Create a new instance for the given `message`.
   */
  constructor (message?: string) {
    super(message)

    if (Error.captureStackTrace && typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Returns a validation error with the given `message`.
   */
  static createFrom (message: string): ValidationError {
    return new this(message)
  }
}
