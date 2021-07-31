"use strict";

import { PromisePoolExecutor } from "./promise-pool-executor";
import { ReturnValue } from "./return-value";

export class PromisePool<T> {
	/**
	 * The processable items.
	 */
	private readonly items: T[];

	/**
	 * The number of promises running concurrently.
	 */
	private concurrency: number;

	/**
	 * The error handler callback function
	 */
	private errorHandler?: (error: Error, item: T) => void | Promise<void>;

	/**
	 * Instantiates a new promise pool with a default `concurrency: 10` and `items: []`.
	 *
	 * @param {Object} options
	 */
	constructor(items?: T[]) {
		this.concurrency = 10;
		this.items = items ?? [];
		this.errorHandler = undefined;
	}

	/**
	 * Set the number of tasks to process concurrently in the promise pool.
	 *
	 * @param {Integer} concurrency
	 *
	 * @returns {PromisePool}
	 */
	withConcurrency(concurrency: number): PromisePool<T> {
		this.concurrency = concurrency;

		return this;
	}

	/**
	 * Set the number of tasks to process concurrently in the promise pool.
	 *
	 * @param {Number} concurrency
	 *
	 * @returns {PromisePool}
	 */
	static withConcurrency(concurrency: number): PromisePool<unknown> {
		return new this().withConcurrency(concurrency);
	}

	/**
	 * Set the items to be processed in the promise pool.
	 *
	 * @param {Array} items
	 *
	 * @returns {PromisePool}
	 */
	for<T>(items: T[]): PromisePool<T> {
		return new PromisePool<T>(items).withConcurrency(this.concurrency);
	}

	/**
	 * Set the items to be processed in the promise pool.
	 *
	 * @param {Array} items
	 *
	 * @returns {PromisePool}
	 */
	static for<T>(items: T[]): PromisePool<T> {
		return new this<T>().for(items);
	}

	/**
	 * Set the error handler function to execute when an error occurs.
	 *
	 * @param {Function} handler
	 *
	 * @returns {PromisePool}
	 */
	handleError(handler: (error: Error, item: T) => Promise<void> | void): PromisePool<T> {
		this.errorHandler = handler;

		return this;
	}

	/**
	 * Starts processing the promise pool by iterating over the items
	 * and running each item through the async `callback` function.
	 *
	 * @param {Function} The async processing function receiving each item from the `items` array.
	 *
	 * @returns Promise<{ results, errors }>
	 */
	async process<R>(callback: (item: T) => R | Promise<R>): Promise<ReturnValue<T, R>> {
		return new PromisePoolExecutor<T, R>()
			.withConcurrency(this.concurrency)
			.withHandler(callback)
			.handleError(this.errorHandler)
			.for(this.items)
			.start();
	}
}
