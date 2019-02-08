const { Dohnut } = require('dohnut')
const percentile = require('@elstats/percentile')
const dns = require('dns')
const { performance, PerformanceObserver } = require('perf_hooks')
const dnsPacket = require('dns-packet')
const waste = require('waste')
const {
  connect,
  constants: {
    HTTP2_METHOD_POST,
    HTTP2_HEADER_ACCEPT,
    HTTP2_HEADER_CONTENT_LENGTH,
    HTTP2_HEADER_CONTENT_TYPE,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_STATUS
  }
} = require('http2')

const TIMEOUT_REQUEST = 5000 // ms
const RATE_LIMIT_COOLDOWN = 100 // ms

async function measureDns (dnsServer, options) {
  let fail = 0
  let pass = 0
  const resolver = new dns.promises.Resolver()
  resolver.setServers([dnsServer])
  for (let i = 0; i < options.queries; i++) {
    const name = options.names[i % options.names.length]
    try {
      performance.mark('dns-before')
      await resolver.resolve(name, options.rrtype)
      performance.mark('dns-after')
      performance.measure('dns', 'dns-before', 'dns-after')
      pass++
    } catch (error) {
      fail++
    } finally {
      performance.clearMarks()
    }
  }
  return { pass, fail }
}

async function measureProxy (dohUrl, options) {
  const configuration = {
    dns: [{ type: 'udp4', addres: '127.0.0.1', port: 55553 }],
    doh: [{ uri: dohUrl }]
  }
  const dnsServer = '127.0.0.1:55553'
  const dohnut = new Dohnut(configuration)
  await dohnut.start()
  const result = await measureDns(dnsServer, options)
  await dohnut.stop()
  return result
}

function connectServer (url) {
  return new Promise((resolve, reject) => {
    const session = connect(url)
    session.on('error', reject)
    session.on('connect', resolve)
    session.on('close', reject)
  })
}

function resolveDoh (session, path, name, rrtype) {
  return new Promise((resolve, reject) => {
    const message = dnsPacket.encode({
      id: 0,
      type: 'query',
      flags: dnsPacket.RECURSION_DESIRED,
      questions: [{ name, type: rrtype }]
    })
    const headers = {}
    headers[HTTP2_HEADER_ACCEPT] = 'application/dns-message'
    headers[HTTP2_HEADER_METHOD] = HTTP2_METHOD_POST
    headers[HTTP2_HEADER_CONTENT_TYPE] = 'application/dns-message'
    headers[HTTP2_HEADER_CONTENT_LENGTH] = message.byteLength
    headers[HTTP2_HEADER_PATH] = path
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'))
    }, TIMEOUT_REQUEST)
    performance.mark('dns-before')
    let stream
    try {
      stream = session.request(headers)
    } catch (error) {
      clearTimeout(timeout)
      reject(error)
    }
    stream.end(message)
    stream.on('response', async (headers) => {
      const status = headers[HTTP2_HEADER_STATUS]
      if (status !== 200) {
        clearTimeout(timeout)
        stream.close()
        await waste(RATE_LIMIT_COOLDOWN)
        reject(new Error(`HTTP response status code ${status}`))
      }
      const chunks = []
      stream.on('data', (chunk) => {
        chunks.push(chunk)
      })
      stream.on('end', () => {
        performance.mark('dns-after')
        performance.measure('dns', 'dns-before', 'dns-after')
        clearTimeout(timeout)
        let packet
        try {
          packet = dnsPacket.decode(Buffer.concat(chunks))
        } catch (error) {
          reject(error)
          return
        }
        if (packet.rcode === 'NOERROR' && packet.type === 'response') {
          resolve()
        } else {
          reject(new Error(`Bad DNS message: ${packet.rcode}`))
        }
      })
    })
    stream.on('error', (error) => {
      clearTimeout(timeout)
      stream.close()
      reject(error)
    })
  })
}

async function measureDoh (dohUrl, options) {
  let pass = 0
  let fail = 0
  const session = await connectServer(dohUrl)
  const { pathname, search } = new URL(dohUrl)
  const path = search
    ? pathname + '?' + search
    : pathname
  for (let i = 0; i < options.queries; i++) {
    const name = options.names[i % options.names.length]
    try {
      await resolveDoh(session, path, name, options.rrtype)
      pass++
    } catch (error) {
      console.error(error.message)
      fail++
    } finally {
      performance.clearMarks()
    }
  }
  session.close()
  return { pass, fail }
}

async function * bulldohzer (resolvers, options) {
  for (const resolver of resolvers) {
    const measures = []
    const obs = new PerformanceObserver((list, observer) => {
      measures.push(...list.getEntries().filter(({ name }) => name === 'dns'))
    })
    obs.observe({ entryTypes: ['measure'], buffered: true })

    let result
    if ('dns' in resolver) {
      result = await measureDns(resolver.dns, options)
    } else if ('doh' in resolver) {
      if (options.proxy === true) {
        result = await measureProxy(resolver.doh, options)
      } else {
        try {
          result = await measureDoh(resolver.doh, options)
        } catch (error) {
          console.error(error.message)
          continue
        }
      }
    } else {
      throw new Error('Unknown resolver')
    }

    const durations = measures.map(({ duration }) => duration)

    const percentiles = {}
    for (const number of options.percentiles) {
      if (Number.isFinite(number) && number > 0 && number <= 100) {
        percentiles[`p${number}`] = percentile(durations, number)
      }
    }

    yield {
      name: resolver.name || resolver.dns || new URL(resolver.doh).hostname,
      service: resolver.dns || resolver.doh,
      protocol: resolver.dns ? 'dns' : 'doh',
      pass: result.pass,
      fail: result.fail,
      ...percentiles
    }
  }
}

module.exports.bulldohzer = bulldohzer
