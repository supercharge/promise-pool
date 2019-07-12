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
    <a href="#usage"><strong>Usage</strong></a> ·
    <a href="#api"><strong>API</strong></a>
  </p>
  <br/>
  <br/>
  <p>
    <a href="https://travis-ci.com/superchargejs/promise-pool"><img src="https://travis-ci.com/superchargejs/promise-pool.svg?branch=master" alt="Build Status" data-canonical-src="https://travis-ci.com/superchargejs/promise-pool.svg?branch=master" style="max-width:100%;"></a>
    <a href="https://www.npmjs.com/package/@supercharge/promise-pool"><img src="https://img.shields.io/npm/v/@supercharge/promise-pool.svg" alt="Latest Version"></a>
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


## Usage
Using the queue data structure is pretty straightforward. The library exposes a `Queue` class and you need to create a queue instance. You can create a queue from existing data or an empty one:

```js
const PromisePool = require('@supercharge/promise-pool')

const users = [
  { name: 'Marcus' },
  { name: 'Norman' },
  { name: 'Christian' }
]

const { results, errors } = await new PromisePool()
  .for(users)
  .withConcurrency(2)
  .process(async user => {
    const user = await User.createIfNotExisting(user)

    return user
  })
```


## API

#### `new PromisePool({ concurrency?, items? })` constructor
Creates a new promise pool. The constructor takes an optional `options` object allowing you to passing in the `concurrency` and `items`.

```js
const pool = new PromisePool({ concurrency: 2, items: [1, 2, 3] })
```


#### `.withConcurrency(amount)`
Set the maximum number of functions to process in parallel. Default `concurrency: 10`. Returns the promise pool instance.

```js
const pool = new PromisePool().withConcurrency(5)
```


#### `.for(items)`
Set the items to be processed in the promise pool. Returns the promise pool instance.

```js
const users = [
  { name: 'Marcus' },
  { name: 'Norman' },
  { name: 'Christian' }
]

const pool = new PromisePool().withConcurrency(5).for(users)
```


#### `.process(callback)`
Starts processing the promise pool by iterating over the items and passing each item to the async mapper function. Returns an object containing the results and errors.

```js
const users = [
  { name: 'Marcus' },
  { name: 'Norman' },
  { name: 'Christian' }
]

const pool = new PromisePool().withConcurrency(5).for(users)

const { results, errors } = await pool.process(async (user) => {
  await User.createIfNotExisting(user)
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
> GitHub [@superchargejs](https://github.com/superchargejs/) &nbsp;&middot;&nbsp;
> Twitter [@superchargejs](https://twitter.com/superchargejs)
