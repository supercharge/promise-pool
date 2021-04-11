# Changelog


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
