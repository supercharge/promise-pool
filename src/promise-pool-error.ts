"use strict";

export class PromisePoolError<T> extends Error {
	/**
	 * Returns the item that caused this error.
	 */
	public item: T;

	/**
	 * Create a new instance for the given `message` and `item`.
	 *
	 * @param error  The original error
	 * @param item   The item causing the error
	 */
	constructor(error: any, item: T) {
		super();

		this.item = item;
		this.name = this.constructor.name;
		this.message = this.messageFrom(error);

		Error.captureStackTrace(this, this.constructor);
	}

	/**
	 * Returns a new promise pool error instance wrapping the `error` and `item`.
	 *
	 * @param {*} error
	 * @param {*} item
	 *
	 * @returns {PromisePoolError}
	 */
	static createFrom<T>(error: any, item: T): PromisePoolError<T> {
		return new this(error, item);
	}

	/**
	 * Returns the error message from the given `error`.
	 *
	 * @param {*} error
	 *
	 * @returns {String}
	 */
	private messageFrom(error: any): string {
		if (error instanceof Error) {
			return error.message;
		}

		if (typeof error === "object") {
			return error.message;
		}

		if (typeof error === "string" || typeof error === "number") {
			return error.toString();
		}

		return "";
	}
}
