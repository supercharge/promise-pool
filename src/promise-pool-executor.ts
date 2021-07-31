'use strict';

import { PromisePoolError } from './promise-pool-error';
import { ReturnValue } from './return-value';

export class PromisePoolExecutor<T, R> {
	/**
	 * The list of items to process.
	 */
	private _items: T[];

	/**
	 * The number of concurrently running tasks.
	 */
	private _concurrency: number;

	/**
	 * The number of finished tasks.
	 */
	private _finished_tasks: number;

	/**
	 * The intermediate list of currently running tasks.
	 */
	private readonly _tasks: any[];

	/**
	 * The list of results.
	 */
	private readonly _results: R[];

	/**
	 * The async processing function receiving each item from the `items` array.
	 */
	private _handler: (item: T) => any;

	/**
	 * This function runs after each execution
	 */
	private _progressHandler?: (result: R, progress: number, total: number) => any;

	/**
	 * The async error handling function.
	 */
	private _errorHandler?: (error: Error, item: T) => void | Promise<void>;

	/**
	 * The list of errors.
	 */
	private readonly errors: Array<PromisePoolError<T>>;

	/**
	 * Creates a new promise pool executer instance with a default concurrency of 10.
	 */
	constructor() {
		this._tasks = [];
		this._items = [];
		this.errors = [];
		this._results = [];
		this._concurrency = 10;
		this._finished_tasks = 0;
		this._handler = () => {};
		this._progressHandler = () => {};
		this._errorHandler = undefined;
	}

	/**
	 * Set the number of tasks to process concurrently the promise pool.
	 *
	 * @param {Integer} concurrency
	 *
	 * @returns {PromisePoolExecutor}
	 */
	withConcurrency(concurrency: number): this {
		this._concurrency = concurrency;

		return this;
	}

	/**
	 * Set the items to be processed in the promise pool.
	 *
	 * @param {Array} items
	 *
	 * @returns {PromisePoolExecutor}
	 */
	for(items: T[]): this {
		this._items = items;

		return this;
	}

	/**
	 * Set the on progress handler
	 *
	 * @param {onProgressFunction} progressFunction
	 *
	 * @returns {PromisePoolExecutor}
	 */
	onProgress(progressFunction?: (result: R, progress: number, total: number) => any): this {
		this._progressHandler = progressFunction;

		return this;
	}

	/**
	 * Set the handler that is applied to each item.
	 *
	 * @param {Function} action
	 *
	 * @returns {PromisePoolExecutor}
	 */
	withHandler(action: (item: T) => R | Promise<R>): this {
		this._handler = action;

		return this;
	}

	/**
	 * Set the error handler function to execute when an error occurs.
	 *
	 * @param {Function} handler
	 *
	 * @returns {PromisePoolExecutor}
	 */
	handleError(handler?: (error: Error, item: T) => Promise<void> | void): this {
		this._errorHandler = handler;

		return this;
	}

	/**
	 * Determines whether the number of active tasks is greater or equal to the concurrency limit.
	 *
	 * @returns {Boolean}
	 */
	hasReachedConcurrencyLimit(): boolean {
		return this.activeCount() >= this._concurrency;
	}

	/**
	 * Returns the number of active tasks.
	 *
	 * @returns {Number}
	 */
	activeCount(): number {
		return this._tasks.length;
	}

	/**
	 * Start processing the promise pool.
	 *
	 * @returns {Array}
	 */
	async start(): Promise<ReturnValue<T, R>> {
		return await this.validateInputs().process();
	}

	/**
	 * Ensure valid inputs and throw otherwise.
	 *
	 * @returns {PromisePoolExecutor}
	 *
	 * @throws
	 */
	validateInputs(): this {
		if (typeof this._handler !== 'function') {
			throw new Error('The first parameter for the .process(fn) method must be a function');
		}

		if (!(typeof this._concurrency === 'number' && this._concurrency >= 1)) {
			throw new TypeError(`"concurrency" must be a number, 1 or up. Received "${this._concurrency}" (${typeof this._concurrency})`);
		}

		if (!Array.isArray(this._items)) {
			throw new TypeError(`"items" must be an array. Received ${typeof this._items}`);
		}

		if (this._errorHandler) {
			if (typeof this._errorHandler !== 'function') {
				throw new Error(`The error handler must be a function. Received ${typeof this._errorHandler}`);
			}
		}

		return this;
	}

	/**
	 * Starts processing the promise pool by iterating over the items
	 * and running each item through the async `callback` function.
	 *
	 * @param {Function} callback
	 *
	 * @returns {Promise}
	 */
	async process(): Promise<ReturnValue<T, R>> {
		this._finished_tasks = 0;
		for (const item of this._items) {
			if (this.hasReachedConcurrencyLimit()) {
				await this.processingSlot();
			}

			this.startProcessing(item);
		}

		return await this.drained();
	}

	/**
	 * Creates a deferred promise and pushes the related callback to the pending
	 * queue. Returns the promise which is used to wait for the callback.
	 *
	 * @returns {Promise}
	 */
	async processingSlot(): Promise<void> {
		return await this.waitForTaskToFinish();
	}

	/**
	 * Wait for one of the active tasks to finish processing.
	 */
	async waitForTaskToFinish(): Promise<void> {
		await Promise.race(this._tasks);
	}

	/**
	 * Create a processing function for the given `item`.
	 *
	 * @param {*} item
	 */
	startProcessing(item: T): void {
		const task = this.createTaskFor(item)
			.then((result) => {
				this._results.push(result);
				this._tasks.splice(this._tasks.indexOf(task), 1);

				this._finished_tasks++;
				this._progressHandler?.(result, this._finished_tasks, this._items.length);
			})
			.catch((error) => {
				this._tasks.splice(this._tasks.indexOf(task), 1);

				this._finished_tasks++;
				this._progressHandler?.(error, this._finished_tasks, this._items.length);

				if (this._errorHandler) {
					return this._errorHandler(error, item);
				}

				this.errors.push(PromisePoolError.createFrom(error, item));
			});

		this._tasks.push(task);
	}

	/**
	 * Ensures a returned promise for the processing of the given `item`.
	 *
	 * @param item
	 *
	 * @returns {*}
	 */
	async createTaskFor(item: T): Promise<any> {
		return this._handler(item);
	}

	/**
	 * Wait for all active tasks to finish. Once all the tasks finished
	 * processing, returns an object containing the results and errors.
	 *
	 * @returns {Object}
	 */
	async drained(): Promise<ReturnValue<T, R>> {
		await this.drainActiveTasks();

		return {
			results: this._results,
			errors: this.errors,
		};
	}

	/**
	 * Wait for all of the active tasks to finish processing.
	 */
	async drainActiveTasks(): Promise<void> {
		await Promise.all(this._tasks);
	}
}
