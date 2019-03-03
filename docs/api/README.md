# API

## Installation

```shell
$ npm install bulldohzer
```

## `bulldohzer(resolvers, options)`

This is a [generator function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) used to asynchronously iterate over the measurements as they are received.

`resolvers` is an array of objects with either a `dns` or `doh` property of the resolver's IP or URL respectively.

`options` are described in the [CLI](../cli) documentation.

Each yielded value contains the results of a single resolver:

- `name`: Label identifying the resolver as passed in the `resolvers` array.
- `service`: IP or URL of the resolver.
- `protocol`: Either `dns` or `doh`.
- `pass`: Number of successful measurements.
- `fail`: Number of unsuccessful measurements.
- `percentiles`: Object containing a time measurement, in milliseconds, at each requested percentile.

```js
const { bulldohzer } = require('bulldohzer')

const resolvers = [
  { dns: '8.8.8.8' },
  { dns: '9.9.9.9' },
  { doh: 'https://commons.host', name: 'Commons Host' },
  { doh: 'https://dns.quad9.net/dns-query' }
]

const options = {
  percentiles: [50, 99]
}

for await (const result of bulldohzer(resolvers, options)) {
  console.log(result)
  // {
  //   name: 'Commons Host',
  //   service: 'https://commons.host',
  //   protocol: 'doh',
  //   pass: 10,
  //   fail: 0,
  //   percentiles: {
  //     50: 6.48932421049,
  //     99: 9.00561249847
  //   }
  // }
}
```
