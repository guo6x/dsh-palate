/**
 * dsh-palate first-run demo.
 *
 * Runs the committed host bundle through the small surface that DSH provides:
 * tool registration, the loopback route, the starter palate, and a tracked
 * review. It is intentionally keyless and makes no network or model calls.
 *
 * Run from the repository root:
 *   pnpm demo
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const demoHome = mkdtempSync(join(tmpdir(), 'dsh-palate-first-run-'))
const previousHome = process.env.DSH_HOME
const registeredTools = new Map()
const registeredRoutes = []
const disposers = []

function check(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`)
  console.log(`PASS ${label}`)
}

function makeContext() {
  return {
    tools: {
      register(definition) {
        registeredTools.set(definition.name, definition)
        return () => registeredTools.delete(definition.name)
      },
    },
    webServer: {
      register(route) {
        registeredRoutes.push(route)
        const dispose = () => {
          const index = registeredRoutes.indexOf(route)
          if (index >= 0) registeredRoutes.splice(index, 1)
        }
        return dispose
      },
    },
    effect(factory) {
      const dispose = factory()
      if (typeof dispose === 'function') disposers.push(dispose)
      return dispose
    },
  }
}

async function callTool(name, args = {}) {
  const definition = registeredTools.get(name)
  if (!definition) throw new Error(`Missing registered tool: ${name}`)
  const value = await definition.execute(args, { signal: new AbortController().signal })
  const blocks = definition.output.render(args, value)
  return { value, text: blocks.map(block => block.text ?? '').join('\n') }
}

async function readRoute(route, url) {
  let status = 0
  let body = ''
  await route.handler(
    { url, socket: { remoteAddress: '127.0.0.1' } },
    {
      writeHead(code) { status = code },
      end(value = '') { body += value },
    },
  )
  return { status, value: JSON.parse(body) }
}

process.env.DSH_HOME = demoHome
try {
  // Import after the isolated home is set; the plugin creates its store in
  // apply(), exactly as it does inside the real DSH host.
  const { apply, inject, name } = await import('../lib/index.js')
  apply(makeContext())

  check('plugin identifies itself as dsh-palate', name === 'dsh-palate')
  check('declares the host services it uses', JSON.stringify(inject) === JSON.stringify(['webServer', 'tools']))
  check('registers all thirteen tools', registeredTools.size === 13)
  check('registers the loopback /palate route', registeredRoutes.length === 1 && registeredRoutes[0].path === '/palate')

  const stats = (await callTool('palate_stats')).value
  check('seeds a useful first palate', stats.examples === 4 && stats.principles === 12)

  const packs = (await callTool('palate_packs')).value
  check('exposes two opt-in reference packs', packs.packs.length === 2 && packs.packs.every(pack => pack.applied === false))

  const review = await callTool('palate_review', {
    subject: 'A dashboard with twelve equal KPI cards, one primary revenue metric, and a small trend chart.',
  })
  check('creates a tracked review with grounded evidence', review.value.review_id === 1 && review.value.relevant_examples.length > 0)
  check('renders the review as a host tool message', review.text.includes('Review #1') && review.text.includes('Relevant examples'))

  const routeStats = await readRoute(registeredRoutes[0], '/palate/stats')
  check('serves the same state to the Web panel', routeStats.status === 200 && routeStats.value.reviews === 1 && routeStats.value.examples === 4)

  console.log('\nKeyless demo complete: host wiring, local SQLite, retrieval, and Web data are working.')
  console.log('The natural-language chat step still needs the provider configured in DSH; this demo never calls a model.')
} finally {
  for (const dispose of disposers.reverse()) dispose?.()
  if (previousHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousHome
  rmSync(demoHome, { recursive: true, force: true })
}
