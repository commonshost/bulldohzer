# CLI

## Usage

Use NPM to install the system-wide `bulldohzer` command.

```shell
$ npm install --global bulldohzer
$ bulldohzer [OPTIONS]
```

Use `npx` to run Bulldohzer on-demand, with temporary installation and automatic cleanup.

```shell
$ npx bulldohzer [OPTIONS]
```

Use Docker to run the Bulldohzer CLI in an isolated container.

```shell
$ docker run commonshost/bulldohzer [OPTIONS]
```

## Examples

### Run a Benchmark

```shell
$ bulldohzer --doh commonshost cloudflare

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

```shell
$ bulldohzer \
  --doh commonshost cleanbrowsing cloudflare \
        quad9 powerdns securedns keoweon \
  --dns cleanbrowsing cloudflare quad9 google
```

### Comparing DNS with DoH from the same providers

```shell
$ bulldohzer \
  --dns cleanbrowsing cloudflare quad9 \
  --doh cleanbrowsing cloudflare quad9
```

### Output as NDJSON

Generates newline seperated JSON data for further processing.

Also known as JSON lines or JSONL.

```shell
$ bulldohzer \
  --dns google cloudflare quad9 \
  --doh cloudflare commonshost google \
  --json \
  --percentiles {1..100} \
  --no-spinner \
  --no-report
```

Note the use of Bash-style number range to generate a list of percentiles. Can alternatively be specified as: `--percentiles 5 10 50 75 95 99`

### Export to CSV

```shell
$ bulldohzer --json --doh commonshost | npx ndjson2csv > data.csv
```

### Run a load test against a private resolver

```shell
$ bulldohzer --dns 10.53.53.53 -q 1000000
```

### Ignore TLS warnings

```shell
$ NODE_TLS_REJECT_UNAUTHORIZED=0 bulldohzer --doh https://localhost:8443
```

## Examples

### Compare several DoH resolvers.

```shell
$ bulldohzer --doh commonshost cleanbrowsing cloudflare quad9 powerdns
```

### Compare DoH and DNS latency from the same providers.

```shell
$ bulldohzer --dns cleanbrowsing cloudflare quad9 --doh cleanbrowsing cloudflare quad9
```

### Benchmark a custom DoH resolver URL and output only raw NDJSON data.

```shell
$ bulldohzer --doh www.machinesung.com --ndjson --no-report
```

### Pipe JSON output to save as a Comma Separated Values (CSV) file.

```shell
$ bulldohzer --doh commonshost --ndjson | npx ndjson2csv > results.csv
```

### Help

```shell
$ bulldohzer --help
```

## Options

### `--doh`

Array of URLs or shortnames of DNS over HTTPS resolvers.

Default: `[]`

### `--dns`

Array of IPs or shortnames of DNS over UDP resolvers.

Default: `[]`

### `--queries`, `-q`

Number of domain resolutions to perform.

Default: `10`

### `--names`, `-n`

Array of domain names to resolve.

Default: `[ "example.com" ]`

### `--rrtype`, `--rr`

Resource record type of the query.

Default: `"A"`

### `--proxy`

Use a DNS to DoH proxy server.

Default: `false`

### `--percentiles`, `-p`

Array of percentile measurement times in milliseconds.

Default: `[ 5, 50, 95 ]`

### `--histogram`

Include all percentiles from 1 through 100 (only with --ndjson)

Default: `false`

### `--ndjson`, `--jsonl`, `--json`

Output as NDJSON

Default: `false`

### `--report`

View results as table and graphs

Default: `true`

### `--spinner`

Animation to soothe the mind while waiting

Default: `true`

### `--version`

Show version number

### `--help`

Show help

### Shortnames mapping to an IP (DNS) or URL (DoH)

- DoH:
  - cleanbrowsing
  - cloudflare
  - commonshost
  - google
  - keoweon
  - mozilla
  - nekomimi
  - powerdns
  - quad9
  - rubyfish
  - securedns
- DNS:
  - cleanbrowsing
  - cloudflare
  - google
  - quad9
  - verisign
