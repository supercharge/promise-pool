"use strict";

const PromisePool = require("../dist");

const pause = (timeout) => new Promise((resolve) => setTimeout(resolve, timeout));
jest.spyOn(global.console, "log").mockImplementation();

describe("Promise Pool", () => {
	it("creates a new PromisePool", async () => {
		const pool = new PromisePool();
		expect(pool.concurrency).toEqual(10);
	});

	it("supports a static .for method", async () => {
		const users = [1, 2, 3];
		const userPool = PromisePool.for(users);
		expect(userPool.items).toEqual(users);
		expect(userPool instanceof PromisePool).toBe(true);
	});

	it("supports a static .withConcurrency method", async () => {
		const pool = PromisePool.withConcurrency(4);
		expect(pool.concurrency).toEqual(4);
		expect(pool instanceof PromisePool).toBe(true);
	});

	it("allows method chaining for the promise pool setup", async () => {
		const users = [1, 2, 3];
		const userPool = new PromisePool().withConcurrency(2).for(users);
		expect(userPool.items).toEqual(users);
		expect(userPool.concurrency).toEqual(2);
		expect(userPool).toBeInstanceOf(PromisePool);

		const timeouts = [1, 2, 3];
		const timeoutPool = new PromisePool().for(timeouts).withConcurrency(5);
		expect(timeoutPool.items).toEqual(timeouts);
		expect(timeoutPool.concurrency).toEqual(5);
		expect(timeoutPool).toBeInstanceOf(PromisePool);
	});

	it("handles empty items", async () => {
		const pool = new PromisePool();
		const { results } = await pool.process(() => {});
		expect(results).toEqual([]);
	});

	it("ensures concurrency is a number", async () => {
		const pool = new PromisePool();
		const fn = () => {};

		await expect(pool.withConcurrency(1).process(fn)).not.toReject();
		await expect(pool.withConcurrency(0).process(fn)).toReject(TypeError);
		await expect(pool.withConcurrency(-1).process(fn)).toReject(TypeError);
		await expect(pool.withConcurrency(Infinity).process(fn)).not.toReject();
		await expect(pool.withConcurrency(null).process(fn)).toReject(TypeError);
	});

	it("ensures the items are an array", async () => {
		const pool = new PromisePool();
		const fn = () => {};

		await expect(pool.for([]).process(fn)).not.toReject();
		await expect(pool.for("non-array").process(fn)).toReject(TypeError);
	});

	it("throws when missing the callback in .process", async () => {
		const pool = new PromisePool();
		expect(pool.process()).toReject();
	});

	it("concurrency: 2", async () => {
		const start = Date.now();
		const timeouts = [400, 100, 200, 300, 100];

		const { results, errors } = await PromisePool.withConcurrency(2)
			.for(timeouts)
			.process(async (timeout) => {
				await pause(timeout);
				return timeout;
			});

		expect(errors).toEqual([]);
		expect(results).toEqual([100, 200, 400, 100, 300]);

		const elapsed = Date.now() - start;

		// expect 400ms because 2 tasks run in parallel,
		//   and task 1 and 2 start, waiting 400ms and 100ms
		//   and task 2 finishes (after 100ms)
		//   and the pool starts task 3 waiting 200ms
		//   and task 3 finishes (after 200ms)
		//   and the pool starts task 4 waiting 300ms
		//   and task 1 finishes (after 100ms (400ms in total))
		//   and the pool starts task 5 waiting 100ms
		//   and task 5 finishes (after 100ms)
		//   and task 4 finishes (after 300ms)
		expect(elapsed).toBeWithin(600, 650);
	});

	it("ensures concurrency", async () => {
		const start = Date.now();
		const timeouts = [1000, 200, 300, 100, 100, 100, 500];

		const { results } = await PromisePool.withConcurrency(2)
			.for(timeouts)
			.process(async (timeout) => {
				await pause(timeout);
				return timeout;
			});

		expect(results).toEqual([200, 300, 100, 100, 100, 1000, 500]);

		const elapsed = Date.now() - start;

		// expect the first task to take the longest processing time
		// and expect all other tasks to finish while task 1 is running
		expect(elapsed).toBeWithin(1300, 1600);
	});

	it("handles concurrency greater than items in the list", async () => {
		const ids = [1, 2, 3, 4, 5];

		const { results } = await PromisePool.withConcurrency(3000)
			.for(ids)
			.process(async (timeout) => {
				await pause(timeout);
				return timeout;
			});

		expect(results).toEqual([1, 2, 3, 4, 5]);
	});

	it("returns errors", async () => {
		const ids = [1, 2, 3, 4];

		const { results, errors } = await PromisePool.withConcurrency(2)
			.for(ids)
			.process((id) => {
				if (id === 3) throw new Error("Oh no, not a 3.");

				return id;
			});

		expect(results).toEqual([1, 2, 4]);

		expect(errors.length).toEqual(1);
		expect(errors[0].item).toEqual(3);
		expect(errors[0]).toBeInstanceOf(Error);
		expect(errors[0].message).toEqual("Oh no, not a 3.");
	});

	it("keeps processing with when errors occur", async () => {
		const ids = Array.from({ length: 10 }, (_, i) => i + 1);

		const start = Date.now();

		const { results, errors } = await PromisePool.withConcurrency(2)
			.for(ids)
			.process(async (id) => {
				await pause(20);

				if (id === 1) {
					throw new Error("I can’t keep the first item");
				}

				return id;
			});

		expect(results).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);

		expect(errors.length).toEqual(1);
		expect(errors).toSatisfyAll((error) => error.message === "I can’t keep the first item");

		const elapsed = Date.now() - start;

		// 10 tasks are in the pool
		// expect 20ms for 2 parally running tasks
		// results in 5 batches each batch taking about 20ms
		// takes around 100ms for all items to process
		expect(elapsed).toBeWithin(100, 200);
	});

	it("fails when not passing a function for the error handler", async () => {
		const pool = await PromisePool.for([1, 2, 3]).handleError("non-function");

		expect(pool.process(() => {})).toReject();
	});

	it("should handle error and continue processing", async () => {
		const ids = [1, 2, 3, 4];
		const collectedItemsOnError = [];

		const { results, errors } = await PromisePool.withConcurrency(2)
			.for(ids)
			.handleError((_, item) => {
				collectedItemsOnError.push(item);
			})
			.process((id) => {
				if (id === 3) throw new Error("Oh no, not a 3.");

				return id;
			});

		expect(errors).toEqual([]);
		expect(results).toEqual([1, 2, 4]);
		expect(collectedItemsOnError).toEqual([3]);
	});

	it("should call the onProgress function", async () => {
		const ids = [1, 2, 3, 4];
		const collectedProgress = [];

		const { results, errors } = await PromisePool.withConcurrency(2)
			.for(ids)
			.onProgress((result, prog, total) => {
				const progval = prog / total;
				collectedProgress.push(progval);
			})
			.process((id) => {
				return id;
			});

		expect(errors).toEqual([]);
		expect(results).toEqual([1, 2, 3, 4]);
		expect(collectedProgress).toEqual([0.25, 0.5, 0.75, 1]);
	});
	it("should call the onProgress function with result as input", async () => {
		const input = [1, "hello", 2, 3];
		const collectedProgress = [];

		const { results, errors } = await PromisePool.withConcurrency(2)
			.for(input)
			.onProgress((result, prog, total) => {
				if (typeof result === "number") collectedProgress.push(result * 2);
				else collectedProgress.push(result);
			})
			.process((id) => {
				return id;
			});

		expect(errors).toEqual([]);
		expect(results).toEqual([1, "hello", 2, 3]);
		expect(collectedProgress).toEqual([2, "hello", 4, 6]);
	});

	it("should allow custom processing on a specific error", async () => {
		const ids = [1, 2, 3, 4];

		const { results, errors } = await PromisePool.withConcurrency(2)
			.for(ids)
			.handleError(async (error) => {
				if (error instanceof RangeError) {
					console.log("RangeError");
				}
			})
			.process((id) => {
				if (id === 4) throw new RangeError("Oh no, too large");

				return id;
			});

		expect(errors).toEqual([]);
		expect(results).toEqual([1, 2, 3]);
		expect(console.log).toBeCalledWith("RangeError");
	});

	it("rethrowing an error from the error handler should stop promise pool immediately", async () => {
		const ids = [1, 2, 3, 4];

		await expect(
			PromisePool.withConcurrency(2)
				.for(ids)
				.handleError((error) => {
					throw error;
				})
				.process((id) => {
					if (id === 4) throw new RangeError("Oh no, too large");

					return id;
				})
		).rejects.toThrowError(RangeError);
	});

	it("fails without error", async () => {
		const ids = [1, 2, 3, 4, 5];

		const { errors } = await PromisePool.withConcurrency(2)
			.for(ids)
			.process(async (id) => {
				await new Promise((resolve, reject) => setTimeout(reject, 10));

				return id;
			});

		expect(errors.length).toEqual(ids.length);
		expect(errors).toSatisfyAll((error) => error.message === "");
	});

	it("fails with string", async () => {
		const ids = [1, 2, 3];

		const { errors } = await PromisePool.withConcurrency(2)
			.for(ids)
			.process(async () => {
				// eslint-disable-next-line prefer-promise-reject-errors
				return Promise.reject("failed");
			});

		expect(errors).toSatisfyAll((error) => error.message === "failed");
	});

	it("fails with Error and stacktrace", async () => {
		const ids = [1, 2, 3];

		const { errors } = await PromisePool.withConcurrency(2)
			.for(ids)
			.process(async () => {
				throw new Error("failing");
			});

		expect(errors).toSatisfyAll((error) => error.message === "failing");
	});

	it("fails with object", async () => {
		const ids = [1, 2, 3];

		const { errors } = await PromisePool.withConcurrency(2)
			.for(ids)
			.process(async () => {
				// eslint-disable-next-line prefer-promise-reject-errors
				return Promise.reject({ message: "failed" });
			});

		expect(errors).toSatisfyAll((error) => error.message === "failed");
	});
});
