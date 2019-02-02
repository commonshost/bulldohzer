# bulldohzer 🚜

Find the fastest DNS resolver for you.

**Bulldohzer** is a performance measurement tool for DNS. It supports HTTPS (DoH) and DNS over UDP.

Many public DNS benchmark reports measure from test machines in datacentres to DNS servers in datacentres. Good for marketing but irrelevant for end users. The best benchmark is the one you run yourself from your network on your device.

Traditional DNS is heavily optimised due to decades of widespread use. Unfortunately it is susceptible to tampering and monitoring. DoH is a new and secure DNS protocol. DoH transports DNS over long-lived HTTP/2 connections. Because DoH is so new, some implementations are not yet optimised nor widely deployed.

Benchmarking DoH resolvers can help implementors and operators to improve services for users. Feel free to share your findings. *"If you can not measure it, you can not improve it."*

Bulldohzer reports measurements in a human friendly table with graphs (`--report`), or export as JSON for developers and machines alike (`--json`).

Requires Node.js v11.7.0 or later. Fancy magic.

## Usage

### Run a Benchmark

```
$ npx bulldohzer --doh commonshost cloudflare

Resolvers

█ Commons Host DoH
  https://commons.host
   2.4 ms  2.9 ms  4.3 ms
  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▂▂▂▄▄

█ Cloudflare DoH
  https://cloudflare-dns.com/dns-query
   4.3 ms  5.0 ms  8.2 ms
  ▂▂▂▂▂▂▂▂▂▂▂▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▄▄▄▄▄▄▄▅▅▅██


Response Times

p5   ▁▂      2.4 ms 🥇 Commons Host DoH

p50  ▁▃      2.9 ms 🥇 Commons Host DoH

p95  ▂▅      4.3 ms 🥇 Commons Host DoH


Made by a young walrus at 🐑 Commons Host https://commons.host
```

### Measure a lot of public DoH & DNS Resolvers

```
$ npx bulldohzer \
  --doh commonshost cleanbrowsing cloudflare \
        quad9 powerdns securedns keoweon \
  --dns cleanbrowsing cloudflare quad9 google
```

### Comparing DNS with DoH from the same providers

```
$ npx bulldohzer \
  --dns cleanbrowsing cloudflare quad9 \
  --doh cleanbrowsing cloudflare quad9
```

### Output as NDJSON

```
$ npx bulldohzer --ndjson --no-report --dns google cloudflare quad9
```

### Export to CSV

```
$ npx bulldohzer --json --doh commonshost | npx ndjson2csv > data.csv
```

### Run a load test against a private resolver

```
$ npx bulldohzer --dns 10.53.53.53 -q 1000000
```

### Ignore TLS warnings

```
$ NODE_TLS_REJECT_UNAUTHORIZED=0 bulldozer --doh https://localhost:8443/doh-query
```

### Help

```
$ npx bulldohzer --help

Options:
  --doh                      URLs or shortnames of DNS over HTTPS resolvers
                                                           [array] [default: []]
  --dns                      IPs or shortnames of DNS over UDP resolvers
                                                           [array] [default: []]
  --queries, -q              Number of domain resolutions to perform
                                                          [number] [default: 10]
  --names, -n                Domain names to resolve
                                                [array] [default: "example.com"]
  --rrtype, --rr             Resource record type of the query
                                                         [string] [default: "A"]
  --proxy                    Use a DNS to DoH proxy server
                                                      [boolean] [default: false]
  --percentiles, -p          Percentile measurement times in milliseconds
                                                    [array] [default: [5,50,95]]
  --histogram                Include all percentiles from 1 through 100 (only
                             with --ndjson)           [boolean] [default: false]
  --ndjson, --jsonl, --json  Output as NDJSON         [boolean] [default: false]
  --report                   View results as table and graphs
                                                       [boolean] [default: true]
  --spinner                  Animation to soothe the mind while waiting
                                                       [boolean] [default: true]
  --version                  Show version number                       [boolean]
  --help                     Show help                                 [boolean]

Examples:
  --doh commonshost cleanbrowsing cloudflare quad9 powerdns
  Compare several DoH resolvers.

  --dns cleanbrowsing cloudflare quad9 --doh cleanbrowsing cloudflare quad9
  Compare DoH and DNS latency from the same providers.

  --doh www.machinesung.com --ndjson --no-report
  Benchmark a custom DoH resolver URL and output only raw NDJSON data.

  --doh commonshost --ndjson | npx ndjson2csv > results.csv
  Pipe JSON output to save as a Comma Separated Values (CSV) file.

  Shortnames mapping to an IP (DNS) or URL (DoH):
  - DoH: cleanbrowsing, cloudflare, commonshost, google, keoweon, mozilla,
  nekomimi, powerdns, quad9, rubyfish, securedns
  - DNS: cleanbrowsing, cloudflare, google, quad9
```

## Imaginary Property Rights

All content in this repository is published under the [ISC License](https://opensource.org/licenses/ISC).

Made with ❤️ by [Sebastiaan Deckers](https://twitter.com/sebdeckers) for 🐑 [Commons Host](https://commons.host).
