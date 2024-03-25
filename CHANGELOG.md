# Changelog

## [3.2.0](https://github.com/supercharge/promise-pool/compare/v3.1.1...v3.2.0) - 2024-03-25

### Added
- add `"sideEffects": false` to `package.json` [#83](https://github.com/supercharge/promise-pool/issues/83)

### Updated
- updated types for the handler function in the promise pool processor

### Updated
- bump dependencies


## [3.1.1](https://github.com/supercharge/promise-pool/compare/v3.1.0...v3.1.1) - 2024-01-31

### Updated
- bump dependencies

### Fixed
- removed duplicated build files from `dist` (fixing https://github.com/supercharge/promise-pool/issues/82)


## [3.1.0](https://github.com/supercharge/promise-pool/compare/v3.0.0...v3.1.0) - 2023-09-25

### Added
- clear timers from task timeouts to remove them from the event loop: this is helpful to clear up resources for long-running timeouts and fastly resolving tasks. If not cleared, the timeouts stay in the event loop until they’re due
- add keep error handler when calling `pool.handleError` after `pool.for`: previously the error handler was lost

### Updated
- bump dependencies


## [3.0.0](https://github.com/supercharge/promise-pool/compare/v2.4.0...v3.0.0) - 2023-07-09

### Added
- [Accept iterables and async iterables](https://github.com/supercharge/promise-pool/pull/72) and not just arrays
- add performance testing script in `performance` directory: this is helpful to detect whether the promise pool is significantly slower than `Promise.all`

### Updated
- bump dependencies
- [call `Error.captureStackTrace` only when available](https://github.com/supercharge/promise-pool/issues/74)

### Breaking Changes
- require Node.js v16
- require `ecmaScript` 2021
- the `pool.items()` method changed from the narrower type `T[]` to the wider type `T[] | Iterable<T> | AsyncIterable<T>` which might be a breaking change for your code base


## [2.4.0](https://github.com/supercharge/promise-pool/compare/v2.3.2...v2.4.0) - 2023-02-10

### Added
- [support task timeouts](https://github.com/supercharge/promise-pool#task-timeouts)
- [support corresponding results](https://github.com/supercharge/promise-pool#correspond-source-items-and-their-results)

### Updated
- bump dependencies
- refined types when a promise or non-promise resuult will be handled


## [2.3.2](https://github.com/supercharge/promise-pool/compare/v2.3.1...v2.3.2) - 2022-08-05

### Fixed
- remove active task after handling the result or error [#51](https://github.com/supercharge/promise-pool/issues/51)
  - we previously removed the active tasks before handling the result or error, which caused the pool to pick up the next task too early


## [2.3.1](https://github.com/supercharge/promise-pool/compare/v2.3.0...v2.3.1) - 2022-08-05

### Updated
- bump dependencies

### Fixed
- stop processing items after throwing an error from inside the `pool.handleError()` method [#51](https://github.com/supercharge/promise-pool/issues/51)


## [2.3.0](https://github.com/supercharge/promise-pool/compare/v2.2.0...v2.3.0) - 2022-06-08

### Added
- `pool.useConcurrency(<num>)`: adjust the concurrency of a running pool

### Updated
- bump dependencies


## [2.2.0](https://github.com/supercharge/promise-pool/compare/v2.1.0...v2.2.0) - 2022-05-20

### Added
- `pool.onTaskStarted((item, pool) => { … })`: configure a callback that runs when an item is about to be processed
- `pool.onTaskFinished((item, pool) => { … })`: configure a callback that runs when an item finished processing

### Updated
- bump dependencies


## [2.1.0](https://github.com/supercharge/promise-pool/compare/v2.0.0...v2.1.0) - 2021-12-14

### Added
- keep the original error in `error.raw`
  - this is useful if your errors store some kind of context
  - the `PromisePoolError` instance would otherwise loose the original error context

```js
class CustomError extends Error { … }

const { errors } = await PromisePool
  .withConcurrency(2)
  .for([1, 2, 3])
  .process(() => {
    throw new CustomError('Oh no')
  })

errors[0].raw instanceof CustomError
// true
```

### Updated
- bump dependencies
- run tests for Node.js v17


## [2.0.0](https://github.com/supercharge/promise-pool/compare/v1.9.0...v2.0.0) - 2021-11-09

### Breaking Changes
The `2.x` release line changes the exports of this package:

```js
// Now: 2.x
import { PromisePool } from '@supercharge/promise-pool'
// or
const { PromisePool } = require('@supercharge/promise-pool')

// Before: 1.x
import PromisePool from '@supercharge/promise-pool' // required the `esModuleInterop` flag in tsconfig.json
// or
const PromisePool = require('@supercharge/promise-pool')
```

The `1.x` releases used CommonJS- and ESM-compatible default exports. That required TypeScript packages using ESM imports to enable the `esModuleInterop` flag in their `tsconfig.json` file. The named exports in `2.x` don’t require that flag anymore.


## [1.9.0](https://github.com/supercharge/promise-pool/compare/v1.8.0...v1.9.0) - 2021-11-03

### Added
- `pool.stop()` method
- add `downlevelIteration: true` option to `tsconfig.json`

### Updated
- bump dependencies
- use UVU and c8 for testing (instead of Jest)
- refined example output (in `examples/promise-pool.js`)
- extend `README` with examples on how to stop an active promise pool


## [1.8.0](https://github.com/supercharge/promise-pool/compare/v1.7.0...v1.8.0) - 2021-09-24

### Added
- test code on Node.js v16
- provide `index` as the second argument in the `process` function
  ```js
    await PromisePool
      .withConcurrency(2)
      .for([1,2,3,4])
      .process(async (num, index) => {
        // processing …
      })
  ```

### Updated
- bump dependencies

### Removed
- testing on Node.js v15


## [1.7.0](https://github.com/supercharge/promise-pool/compare/v1.6.2...v1.7.0) - 2021-04-11

### Updated
- bump dependencies
- refactored code to not use the `@supercharge/goodies` package

### Removed
- dependency to `@supercharge/goodies`


## [1.6.2](https://github.com/supercharge/promise-pool/compare/v1.6.1...v1.6.2) - 2021-04-09

### Updated
- bump dependencies

### Fixed
- missing concurrency in certain cases when not calling `.withConcurrency()`


## [1.6.1](https://github.com/supercharge/promise-pool/compare/v1.6.0...v1.6.1) - 2021-03-28

### Fixed
- typing error when processing a promise pool that was created from non-static methods


## [1.6.0](https://github.com/supercharge/promise-pool/compare/v1.5.0...v1.6.0) - 2020-11-03

### Added
- `.handleError(handler)` method: aka “bring your own error handling”. This allows you to take over error handling from the pool. If you impelement the `.handleError` method, the pool won’t collect errors anymore. It puts error handling in your hands.

### Updated
- bump dependencies

### Fixed
- failed tasks are handled properly now and the pool ensures the concurrency limit. Before, the pool started to process all items as soon as one failed


## [1.5.0](https://github.com/supercharge/promise-pool/compare/v1.4.0...v1.5.0) - 2020-09-20

### Updated
- bump dependencies
- return types for `results` and `errors` now resolve properly for sync and async action handlers


## [1.4.0](https://github.com/supercharge/promise-pool/compare/v1.3.0...v1.4.0) - 2020-09-17

### Added
- improved types supporting typed return values
- improved error handling when rejecting a promise without an error instance (thank you [wzh](https://github.com/supercharge/promise-pool/pull/19))

### Updated
- bump dependencies
- change `main` entrypoint in `package.json` to `dist` folder
- move test runner from `@hapi/lab` to `jest`
- move assertions from `@hapi/code` to `jest`


## [1.3.0](https://github.com/superchargejs/promise-pool/compare/v1.2.0...v1.3.0) - 2020-07-16

### Added
- TypeScript typings

### Updated
- bump dependencies
- moved code base to TypeScript to automatically generate type definitions



## [1.2.0](https://github.com/superchargejs/promise-pool/compare/v1.1.1...v1.2.0) - 2019-10-15

### Added
- static methods for `.withConcurrency` and `.for`
  - moves boilerplate from your code to the promise pool package
  - `new Pool().for(items)` is now `Pool.for(items)`)
  - `new Pool().withConcurrency(2)` is now `Pool.withConcurrency(2)`)
  - it’s always the details :)

### Updated
- bump dependencies


## [1.1.1](https://github.com/superchargejs/promise-pool/compare/v1.1.0...v1.1.1) - 2019-09-24

### Updated
- bump dependencies
- move package docs to Supercharge docs


## [1.1.0](https://github.com/superchargejs/promise-pool/compare/v1.0.0...v1.1.0) - 2019-08-14

### Added
- `module.exports.default`

### Updated
- bump dependencies
- update NPM scripts


## 1.0.0 - 2019-07-15

### Added
- `1.0.0` release 🚀 🎉
