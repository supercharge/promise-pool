# Changelog


## [1.5.0](https://github.com/supercharge/streams/compare/v1.4.0...v1.5.0) - 2020-09-20

### Updated
- return types for `results` and `errors` now resolve properly for sync and async action handlers


## [1.4.0](https://github.com/supercharge/streams/compare/v1.3.0...v1.4.0) - 2020-09-17

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
