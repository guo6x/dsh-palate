/**
 * dsh-palate host contract test.
 *
 * Loads the built host entry exactly as DSH does, supplies the small host
 * surface the plugin declares (`tools`, `webServer`, and `effect`), and
 * exercises every registered tool plus the loopback API. This guards the
 * integration boundary in addition to the PalateStore smoke test.
 * Run: node build.mjs && node tests/plugin-contract.mjs
 */
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const expectedTools = new Set([
  'palate_review',
  'palate_feedback',
  'palate_add',
  'palate_learn',
  'palate_list',
  'palate_principles',
  'palate_effectiveness',
  'palate_stats',
])

const home = mkdtempSync(join(tmpdir(), 'dsh-palate-host-'))
const previousHome = process.env.DSH_HOME
const registeredTools = new Map()
const registeredRoutes = []
const effects = []

function check(label, condition) {
  try {
    assert.ok(condition)
    console.log(`PASS  ${label}`)
  } catch (error) {
    console.error(`FAIL  ${label}`)
    throw error
  }
}

function makeContext() {
  return {
    tools: {
      register(definition) {
        assert.ok(!registeredTools.has(definition.name), `duplicate tool: ${definition.name}`)
        registeredTools.set(definition.name, definition)
        return () => registeredTools.delete(definition.name)
      },
    },
    webServer: {
      register(route) {
        registeredRoutes.push(route)
        return () => {
          const index = registeredRoutes.indexOf(route)
          if (index >= 0) registeredRoutes.splice(index, 1)
        }
      },
    },
    effect(factory, label) {
      const dispose = factory()
      effects.push({ dispose, label })
      return dispose
    },
  }
}

async function request(route, url, remoteAddress) {
  let status
  let headers
  let body = ''
  await route.handler(
    { url, socket: { remoteAddress } },
    {
      writeHead(code, value) {
        status = code
        headers = value
      },
      end(value = '') { body += value },
    },
  )
  return { status, headers, body: JSON.parse(body) }
}

function tool(name) {
  const definition = registeredTools.get(name)
  assert.ok(definition, `missing tool: ${name}`)
  return definition
}

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
check('package has Git-install build safety net', packageJson.scripts?.prepare === 'node build.mjs')
check('package ships both loader entrypoints', existsSync(new URL('../lib/index.js', import.meta.url)) && existsSync(new URL('../lib/client.js', import.meta.url)))

try {
  process.env.DSH_HOME = home
  const { apply, inject, name } = await import('../lib/index.js')
  check('host metadata declares required services', name === 'dsh-palate' && JSON.stringify(inject) === JSON.stringify(['webServer', 'tools']))

  apply(makeContext())

  check('registers exactly the eight documented tools', registeredTools.size === expectedTools.size && [...expectedTools].every(name => registeredTools.has(name)))
  check('all tools expose a DSH-compatible definition', [...registeredTools.values()].every(definition => (
    typeof definition.description === 'string'
    && definition.timeoutMs === 30000
    && definition.parameters?.type === 'object'
    && typeof definition.execute === 'function'
    && typeof definition.output?.render === 'function'
  )))
  check('registers one prefix route', registeredRoutes.length === 1 && registeredRoutes[0].kind === 'prefix' && registeredRoutes[0].path === '/palate')

  const initialStats = await tool('palate_stats').execute({})
  check('starter palate includes examples for first review', initialStats.examples === 4 && initialStats.principles === 12)

  const added = await tool('palate_add').execute({
    ref: 'product dashboard',
    verdict: 'good',
    reason: 'Clear hierarchy and purposeful spacing.',
    tags: ['dashboard'],
  })
  check('palate_add executes through its host definition', added.id >= 1 && added.stats.examples === 5)

  const learnedText = 'Keep dense dashboards scannable with a stable visual hierarchy.'
  const learned = await tool('palate_learn').execute({ principle: learnedText, category: 'hierarchy' })
  check('palate_learn executes through its host definition', learned.created === true)

  const listed = await tool('palate_list').execute({ tag: 'dashboard' })
  check('palate_list executes through its host definition', listed.examples.length === 1 && listed.examples[0].ref === 'product dashboard')

  const principles = await tool('palate_principles').execute({})
  check('palate_principles executes through its host definition', principles.principles.some(principle => principle.principle === learnedText))

  const review = await tool('palate_review').execute({ subject: 'A dense product dashboard', tag: 'dashboard' })
  check('palate_review creates a tracked review', review.review_id >= 1 && review.principle_names.includes(learnedText) && review.relevant_examples.length === 1)
  check('palate_review renders a content block', tool('palate_review').output.render({}, review)[0]?.type === 'text')

  const feedback = await tool('palate_feedback').execute({
    review_id: review.review_id,
    outcome: 'helpful',
    accepted_principles: [learnedText],
    rejected_principles: [],
    note: 'The hierarchy guidance was actionable.',
  })
  check('palate_feedback closes the review and reinforces accepted principles', feedback.reinforced === 1 && feedback.stats.feedback === 1)

  const effectiveness = await tool('palate_effectiveness').execute({})
  check('palate_effectiveness reports the recorded outcome', effectiveness.principles.some(principle => principle.principle === learnedText && principle.accepted === 1 && principle.acceptance_rate === 100))

  const stats = await tool('palate_stats').execute({})
  check('palate_stats reports the complete host call chain', stats.examples === 5 && stats.reviews === 1 && stats.feedback === 1 && stats.helpful === 1)

  const route = registeredRoutes[0]
  const local = await request(route, '/palate/effectiveness', '127.0.0.1')
  check('loopback effectiveness API returns JSON', local.status === 200 && local.headers['content-type'].startsWith('application/json') && local.body.some(principle => principle.principle === learnedText && principle.accepted === 1))
  const reviews = await request(route, '/palate/reviews', '127.0.0.1')
  check('loopback reviews API exposes evidence refs', reviews.status === 200 && reviews.body[0]?.relevant_examples.length === 1 && reviews.body[0].relevant_examples[0].ref === 'product dashboard')
  const remote = await request(route, '/palate/effectiveness', '203.0.113.10')
  check('loopback API rejects remote requests', remote.status === 403 && remote.body.error === 'loopback only')
} finally {
  for (const effect of effects.reverse()) effect.dispose?.()
  if (previousHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousHome
}

check('all registrations dispose cleanly', registeredTools.size === 0 && registeredRoutes.length === 0)
console.log('\nALL PASS')
