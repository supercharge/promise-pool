<div align="center">
  <a href="https://superchargejs.com">
    <img width="471" style="max-width:100%;" src="https://superchargejs.com/images/supercharge-text.svg" />
  </a>
  <br/>
  <br/>
  <p>
    <h3>Promise Pool</h3>
  </p>
  <p>
    Map-like, concurrent promise processing for Node.js.
  </p>
  <br/>
  <p>
    <a href="#installation"><strong>Installation</strong></a> ·
    <a href="#docs"><strong>Docs</strong></a> ·
    <a href="#usage"><strong>Usage</strong></a>
  </p>
  <br/>
  <br/>
  <p>
    <a href="https://www.npmjs.com/package/@supercharge/promise-pool"><img src="https://img.shields.io/npm/v/@supercharge/promise-pool.svg" alt="Latest Version"></a>
    <a href="https://www.npmjs.com/package/@supercharge/promise-pool"><img src="https://img.shields.io/npm/dm/@supercharge/promise-pool.svg" alt="Monthly downloads"></a>
  </p>
  <p>
    <em>Follow <a href="http://twitter.com/marcuspoehls">@marcuspoehls</a> and <a href="http://twitter.com/superchargejs">@superchargejs</a> for updates!</em>
  </p>
</div>

---

## Installation

```
npm i @supercharge/promise-pool
```


## Docs

- 📖 [Documentation](https://superchargejs.com/docs/promise-pool)


## Usage
Using the promise pool is pretty straightforward. The package exposes a class and you can create a promise pool instance using the fluent interface.

Here’s an example using a concurrency of 2:

```js
const { PromisePool } = require('@supercharge/promise-pool')

const users = [
  { name: 'Marcus' },
  { name: 'Norman' },
  { name: 'Christian' }
]

const { results, errors } = await PromisePool
  .withConcurrency(2)
  .for(users)
  .process(async (userData, index, pool) => {
    const user = await User.createIfNotExisting(userData)

    return user
  })
```

The promise pool uses a default concurrency of 10:

```js
await PromisePool
  .for(users)
  .process(async data => {
    // processes 10 items in parallel by default
  })
```


## Manually Stop the Pool
You can stop the processing of a promise pool using the `pool` instance provided to the `.process()` and `.handleError()` methods. Here’s an example how you can stop an active promise pool from within the `.process()` method:

```js
await PromisePool
  .for(users)
  .process(async (user, index, pool) => {
    if (condition) {
      return pool.stop()
    }

    // processes the `user` data
  })
```

You may also stop the pool from within the `.handleError()` method in case you need to:

```js
const { PromisePool } = require('@supercharge/promise-pool')

await PromisePool
  .for(users)
  .handleError(async (error, user, pool) => {
    if (error instanceof SomethingBadHappenedError) {
      return pool.stop()
    }

    // handle the given `error`
  })
  .process(async (user, index, pool) => {
    // processes the `user` data
  })
```


## Bring Your Own Error Handling
The promise pool allows for custom error handling. You can take over the error handling by implementing an error handler using the `.handleError(handler)`.

> If you provide an error handler, the promise pool doesn’t collect any errors. You must then collect errors yourself.

Providing a custom error handler allows you to exit the promise pool early by throwing inside the error handler function. Throwing errors is in line with Node.js error handling using async/await.

```js
const { PromisePool } = require('@supercharge/promise-pool')

try {
  const errors = []

  const { results } = await PromisePool
    .for(users)
    .withConcurrency(4)
    .handleError(async (error, user) => {
      if (error instanceof ValidationError) {
        errors.push(error) // you must collect errors yourself
        return
      }

      if (error instanceof ThrottleError) { // Execute error handling on specific errors
        await retryUser(user)
        return
      }

      throw error // Uncaught errors will immediately stop PromisePool
    })
    .process(async data => {
      // the harder you work for something,
      // the greater you’ll feel when you achieve it
    })

  await handleCollected(errors) // this may throw

  return { results }
} catch (error) {
  await handleThrown(error)
}
```

## Callback for Started and Finished Tasks
You can use the `onTaskStarted` and `onTaskFinished` methods to hook into the processing of tasks. The provided callback for each method will be called when a task started/finished processing:


```js
const { PromisePool } = require('@supercharge/promise-pool')

await PromisePool
  .for(users)
  .onTaskStarted((item, pool) => {
    console.log(`Progress: ${pool.processedPercentage()}%`);
    console.log(`Active tasks: ${pool.activeTasksCount()}`);
    console.log(`Finished tasks: ${pool.processedItems().length}`);
    console.log(`Finished tasks: ${pool.processedCount()}`);
  })
  .onTaskFinished((item, pool) => {
    // update a progress bar or something else :)
  })
  .process(async (user, index, pool) => {
    // processes the `user` data
  })
```

You can also chain multiple `onTaskStarted` and `onTaskFinished` handling (in case you want to separate some functionality):

```js
const { PromisePool } = require('@supercharge/promise-pool')

await PromisePool
  .for(users)
  .onTaskStarted(() => {})
  .onTaskStarted(() => {})
  .onTaskFinished(() => {})
  .onTaskFinished(() => {})
  .process(async (user, index, pool) => {
    // processes the `user` data
  })
```


## Contributing

1.  Create a fork
2.  Create your feature branch: `git checkout -b my-feature`
3.  Commit your changes: `git commit -am 'Add some feature'`
4.  Push to the branch: `git push origin my-new-feature`
5.  Submit a pull request 🚀


## License
MIT © [Supercharge](https://superchargejs.com)

---

> [superchargejs.com](https://superchargejs.com) &nbsp;&middot;&nbsp;
> GitHub [@supercharge](https://github.com/supercharge) &nbsp;&middot;&nbsp;
> Twitter [@superchargejs](https://twitter.com/superchargejs)
