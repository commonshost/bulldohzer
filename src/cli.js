#!/usr/bin/env node

const { bulldohzer } = require('./bulldohzer')
const { aliased } = require('@commonshost/resolvers')
const yargs = require('yargs')
const sparkly = require('sparkly')
const chalk = require('chalk')
const ora = require('ora')
const adjectives = require('@commonshost/word-lists/adjectives-en.json')
const animals = require('@commonshost/word-lists/animals-en.json')

async function main () {
  const { argv } = yargs
    .option('doh', {
      type: 'array',
      describe: 'URLs or shortnames of DNS over HTTPS resolvers',
      default: []
    })
    .option('dns', {
      type: 'array',
      describe: 'IPs or shortnames of DNS over UDP resolvers',
      default: []
    })
    .option('queries', {
      type: 'number',
      alias: 'q',
      describe: 'Number of domain resolutions to perform',
      default: 10
    })
    .option('names', {
      type: 'array',
      alias: ['n'],
      describe: 'Domain names to resolve',
      default: 'example.com'
    })
    .options('rrtype', {
      type: 'string',
      alias: 'rr',
      describe: 'Resource record type of the query',
      default: 'A'
    })
    .options('proxy', {
      type: 'boolean',
      describe: 'Use a DNS to DoH proxy server',
      default: false
    })
    .options('percentiles', {
      type: 'array',
      alias: 'p',
      describe: 'Percentile measurement times in milliseconds',
      default: [5, 50, 95]
    })
    .option('histogram', {
      type: 'boolean',
      describe: 'Include all percentiles from 1 through 100 (only with --ndjson)',
      default: false
    })
    .option('ndjson', {
      type: 'boolean',
      alias: ['jsonl', 'json'],
      describe: 'Output as NDJSON',
      default: false
    })
    .option('report', {
      type: 'boolean',
      describe: 'View results as table and graphs',
      default: true
    })
    .options('spinner', {
      type: 'boolean',
      describe: 'Animation to soothe the mind while waiting',
      default: true
    })
    .example('--doh commonshost cleanbrowsing cloudflare quad9 powerdns')
    .example('Compare several DoH resolvers.')
    .example('')
    .example('--dns cleanbrowsing cloudflare quad9 --doh cleanbrowsing cloudflare quad9')
    .example('Compare DoH and DNS latency from the same providers.')
    .example('')
    .example('--doh www.machinesung.com --ndjson --no-report')
    .example('Benchmark a custom DoH resolver URL and output only raw NDJSON data.')
    .example('')
    .example('--doh commonshost --ndjson | npx ndjson2csv > results.csv')
    .example('Pipe JSON output to save as a Comma Separated Values (CSV) file.')
    .example('')
    .example('Shortnames mapping to an IP (DNS) or URL (DoH):')
    .example('- DoH: ' + Array.from(aliased.doh.keys()).sort().join(', '))
    .example('- DNS: ' + Array.from(aliased.dns.keys()).sort().join(', '))
    .version()
    .help()

  const resolvers = [
    ...argv.dns.map((dns) => {
      const code = dns.replace(/\W/g, '').toLowerCase()
      if (aliased.dns.has(code)) {
        const resolver = aliased.dns.get(code)
        return { name: resolver.name, dns: resolver.dns4[0] }
      } else return { dns }
    }),
    ...argv.doh.map((doh) => {
      const code = doh.replace(/\W/g, '').toLowerCase()
      if (aliased.doh.has(code)) return aliased.doh.get(code)
      else if (!/\//.test(doh)) return { doh: `https://${doh}` }
      else return { doh }
    })
  ]

  if (resolvers.length === 0) {
    console.error('Specify at least one DoH or DNS resolver.')
    console.error()
    yargs.showHelp()
    process.exit(1)
  }

  if (!argv.percentiles.every(
    (percentile) => percentile > 0 && percentile <= 100
  )) {
    console.error('Percentiles must be greater than 0 and less than or equal to 100.')
    console.error()
    yargs.showHelp()
    process.exit(1)
  }

  const options = { ...argv, percentiles: [...argv.percentiles] }
  for (let i = 1; i <= 100; i++) {
    options.percentiles.push(i)
  }

  const spinner = ora({
    text: `🚜 Bulldohzering ${resolvers.length} x ${argv.queries} queries`,
    spinner: 'growVertical'
  })

  if (argv.spinner === true && argv.proxy === false && argv.dns.length === 0) {
    spinner.start()
  }

  const rows = []
  for await (const result of bulldohzer(resolvers, options)) {
    rows.push(result)
    if (argv.ndjson === true) {
      console.log(JSON.stringify(result, (key, value) => {
        if (
          /p([\d.]+)/.test(key) &&
          !argv.percentiles.includes(Number(RegExp.$1))
        ) {
          return undefined
        }
        return value
      }))
    }
  }

  spinner.stop()

  if (rows.length === 0) {
    throw new Error('No test results')
  }

  if (argv.report === true) {
    let fastest = Number.POSITIVE_INFINITY
    let slowest = Number.NEGATIVE_INFINITY
    const palettes = {
      basic: [
        'dodgerblue',
        'aquamarine',
        'yellowgreen',
        'gold',
        'tomato',
        'hotpink'
      ],
      extended: [
        'indigo',
        'sienna',
        'silver',
        'gray'
      ]
    }
    const palette = spread(
      rows.length <= palettes.basic.length
        ? palettes.basic
        : [...palettes.basic, ...palettes.extended],
      rows.length
    )
    const percentiles = new Set()
    const dataset = rows.map((row) => {
      const resolver = {
        name: row.name,
        service: row.service,
        protocol: row.protocol,
        pass: row.pass,
        fail: row.fail,
        percentiles: [],
        times: [],
        colour: palette.shift()
      }
      const pairs = Object.entries(row)
        .filter(([key, value]) => /p[\d.]+/.test(key) && Number.isFinite(value))
        .map(([key, value]) => [Number.parseFloat(key.replace('p', '')), value])
        .sort(([p1], [p2]) => p1 - p2)
      for (const [percentile, time] of pairs) {
        resolver.percentiles.push(percentile)
        resolver.times.push(time)
        percentiles.add(percentile)
      }
      fastest = Math.min(fastest, ...resolver.times)
      slowest = Math.max(slowest, ...resolver.times)
      return resolver
    })
    console.log()
    console.log(chalk.underline('Resolvers'))
    console.log()
    for (const resolver of dataset) {
      const tick = '█'
      let line = ''
      line += resolver.colour ? chalk.keyword(resolver.colour)(tick) : tick
      line += ' '
      line += chalk.bold(resolver.name)
      line += ' ' + chalk.dim(protocolName(resolver.protocol))
      if (resolver.fail > 0) {
        line += ` pass: ${chalk.green(resolver.pass)}, `
        line += `fail: ${chalk.red(resolver.fail)}`
      }
      console.log(line)

      console.log(`  ${chalk.underline(resolver.service)}`)

      const numberFieldLength = locale(slowest).length
      line = ' '
      argv.percentiles.forEach((percentile) => {
        const index = resolver.percentiles.indexOf(percentile)
        const time = resolver.times[index]
        if (time !== undefined) {
          line += locale(time).padStart(numberFieldLength + 1) + ' ms'
        } else {
          line += ''.padEnd(numberFieldLength + 4)
        }
      })
      console.log(line)

      console.log('  ' + sparkly(
        resolver.times
          .filter((time, index) => Number.isInteger(
            resolver.percentiles[index]
          ))
          .filter((time, index) => index % 2)
          .map((time) => Math.log10(time - fastest)),
        { min: 0, max: Math.log10(slowest) }
      ))
      console.log()
    }
    console.log()

    console.log(chalk.underline('Response Times'))
    console.log()
    const longestPercentile = Math.max(
      ...Array.from(percentiles)
        .map((percentile) => percentile.toString().length)
    )
    for (const percentile of Array.from(percentiles)
      .sort((p1, p2) => p1 - p2)
    ) {
      if (!argv.percentiles.includes(percentile)) continue
      let line = ''
      const padded = percentile.toString().padEnd(longestPercentile)
      line += chalk.bold(`p${padded} `)
      const times = []
      let fastestTime = Number.POSITIVE_INFINITY
      let fastestResolver
      for (const resolver of dataset) {
        const index = resolver.percentiles.indexOf(percentile)
        const time = index === -1 ? NaN : resolver.times[index]
        if (time < fastestTime) {
          fastestTime = time
          fastestResolver = resolver
        }
        times.push(time)
      }
      line += gradient(
        dataset.map(({ colour }) => colour),
        sparkly(
          times.map((time) => time - fastest).map(Math.log10),
          { min: 0, max: Math.log10(slowest - fastest) }
        )
      )
      line += `  ${locale(fastestTime).padStart(7)} ms`
      line += ` 🥇 ${fastestResolver.name}`
      line += ` ${chalk.dim(protocolName(fastestResolver.protocol))}`
      console.log(line)
      console.log()
    }
    console.log()
    console.log(
      chalk.dim(`${(statement())} 🐑 Commons Host `) +
      chalk.dim.green.underline('https://commons.host')
    )
    console.log()
  }
}

function locale (number) {
  return number.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
}

function protocolName (name) {
  switch (name) {
    case 'doh': return 'DoH'
    case 'dns': return 'DNS'
    default: return name.toUpperCase()
  }
}

function spread (list, count) {
  if (count <= 0) return []
  if (count >= list.length) return list
  const mapped = []
  for (let i = 0; i < count; i++) {
    const index = Math.floor(i / count * list.length)
    mapped.push(list[index])
  }
  return mapped
}

function gradient (colours, text) {
  let output = ''
  for (const character of text) {
    const colour = colours.shift()
    output += colour ? chalk.keyword(colour)(character) : character
  }
  return output
}

function pickOne (list) {
  const index = Math.floor(Math.random() * list.length)
  return list[index]
}

function statement () {
  const verbs = [
    'Made', 'Built', 'Crafted', 'Tweaked', 'As told', 'Created', 'Coded',
    'Performed', 'Managed', 'Brought to you', 'Perfected', 'Over-engineered',
    'Thought up', 'Handwritten', 'Measured', 'Calibrated', 'Articulated'
  ]
  const verb = pickOne(verbs)
  const adjective = pickOne(adjectives)
  const article = adjective.startsWith('a') ? 'an' : 'a'
  const noun = pickOne(animals)
  return `${verb} by ${article} ${adjective} ${noun} at`
}

main()
  .catch((error) => {
    console.trace(chalk.red(error))
    process.exit(1)
  })
