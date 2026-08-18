/**
 * dsh-palate host plugin — accumulated design taste for DSH agents.
 *
 * Wires the PalateStore into model tools and loopback routes for the growth
 * panel. Zero runtime dependencies (node:sqlite is built into Node >= 22).
 * The store lives in $DSH_HOME/palate (SQLite + human-readable Markdown mirrors).
 */
import { join } from 'node:path'
import { homedir } from 'node:os'
import { PalateStore } from './store.js'

export const name = 'dsh-palate'
export const inject = ['webServer', 'tools']

function storeDir() {
  const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(dshHome, 'palate')
}

export function apply(ctx) {
  const store = new PalateStore(storeDir())

  const webServer = ctx.webServer
  if (webServer !== undefined) {
    ctx.effect(() => webServer.register({
      kind: 'prefix',
      path: '/palate',
      handler: async (req, res) => {
        const remote = req.socket.remoteAddress ?? ''
        if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) {
          sendJson(res, 403, { error: 'loopback only' })
          return
        }
        const suffix = new URL(req.url ?? '/', 'http://x').pathname.slice('/palate'.length) || '/'
        try {
          if (suffix === '/stats') sendJson(res, 200, store.stats())
          else if (suffix === '/principles') sendJson(res, 200, store.listPrinciples())
          else if (suffix === '/recent') sendJson(res, 200, store.listExamples({ limit: 12 }))
          else sendJson(res, 404, { error: 'no such endpoint' })
        } catch (error) {
          sendJson(res, 500, { error: String(error.message ?? error) })
        }
      },
    }), 'dsh-palate: web routes')
  }

  const tools = ctx.tools
  if (tools !== undefined) {
    const define = (toolName, description, parameters, execute, render) => ({
      name: toolName,
      description,
      parameters,
      timeoutMs: 30000,
      output: {
        schema: { type: 'object' },
        render(_args, value) {
          const blocks = render(value)
          return blocks.length > 0 ? blocks : [{ type: 'text', text: JSON.stringify(value) }]
        },
      },
      async execute(args, exec) {
        if (exec?.signal?.aborted) throw new Error('aborted')
        return execute(args, exec)
      },
    })
    const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false })
    const str = description => ({ type: 'string', description })

    const defs = [
      define(
        'palate_review',
        'Assemble the agent\'s accumulated design taste as context to critique a design. Returns the codified principles plus relevant past examples (good to emulate, bad to avoid), with guidance. YOU then write the actual critique grounded in this learned taste. Feed it a description of the design; for a screenshot, read it with a vision tool first and pass the description.',
        obj({
          subject: str('Description of the design/UI to critique (or the path/url of an image you have already described).'),
          tag: str('Optional tag to focus which past examples to draw on.'),
        }, ['subject']),
        async args => store.reviewContext(args.subject, { tag: args.tag }),
        value => [{
          type: 'text',
          text: [
            `Review target: ${value.subject}`,
            '',
            'Codified taste (apply each):',
            ...value.principles.map(p => `  - ${p}`),
            '',
            `Relevant examples (${value.relevant_examples.length}):`,
            ...value.relevant_examples.map(e => `  - [${e.verdict}] ${e.ref}${e.reason ? ' — ' + e.reason : ''}`),
            '',
            value.guidance,
          ].join('\n'),
        }],
      ),
      define(
        'palate_add',
        'Feed an example into the taste corpus to grow the agent\'s palate. Record a design you judged good or bad, why, and optional tags. The more you feed, the sharper future reviews get.',
        obj({
          ref: str('What the example is: a URL, file path, or short description of the design.'),
          verdict: str("Your judgment: 'good' | 'bad' | 'note'."),
          reason: str('Why — the lesson this example teaches.'),
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags (e.g. landing-page, dark-mode, typography).' },
          source: str('Optional provenance.'),
          reinforces: { type: 'array', items: { type: 'string' }, description: 'Optional: principles this example supports (bumps their evidence).' },
        }, ['ref', 'verdict']),
        async args => {
          const entry = store.addExample(args)
          const reinforced = args.reinforces ? store.reinforce(args.reinforces) : 0
          return { ...entry, reinforced, stats: store.stats() }
        },
        value => [{ type: 'text', text: `Added example #${value.id} [${value.verdict}]. Palate now: ${value.stats.examples} examples, ${value.stats.principles} principles${value.reinforced ? `, reinforced ${value.reinforced} principle(s)` : ''}.` }],
      ),
      define(
        'palate_learn',
        'Distill a new design principle from experience and add it to the codified taste. Use when you notice a recurring rule worth remembering.',
        obj({
          principle: str('The principle, stated as a concrete rule.'),
          category: str('Optional category (hierarchy, color, spacing, typography, ...).'),
        }, ['principle']),
        async args => store.addPrinciple(args.principle, args.category ?? ''),
        value => [{ type: 'text', text: value.created ? `Learned principle #${value.id}: ${value.principle}` : `Already known (principle #${value.id}).` }],
      ),
      define(
        'palate_list',
        'Browse the accumulated taste corpus (examples fed so far).',
        obj({
          verdict: str("Filter by 'good' | 'bad' | 'note'."),
          tag: str('Filter by tag.'),
          limit: { type: 'number', description: 'Max results (default 50).' },
        }),
        async args => ({ examples: store.listExamples(args), stats: store.stats() }),
        value => [{ type: 'text', text: value.examples.length ? value.examples.map(e => `[${e.verdict}] ${e.ref}${e.reason ? ' — ' + e.reason : ''}`).join('\n') : 'No examples yet — feed some with palate_add.' }],
      ),
      define(
        'palate_principles',
        'List the codified design principles (the agent\'s current taste), ordered by evidence.',
        obj({}),
        async () => ({ principles: store.listPrinciples(), stats: store.stats() }),
        value => [{ type: 'text', text: value.principles.map(p => `[${p.category}] ${p.principle} (evidence ${p.evidence})`).join('\n') }],
      ),
      define(
        'palate_stats',
        'Show how much taste the agent has accumulated: examples studied (good/bad), principles distilled.',
        obj({}),
        async () => store.stats(),
        value => [{ type: 'text', text: `Palate: ${value.examples} examples (${value.good} good, ${value.bad} bad, ${value.notes} notes), ${value.principles} principles.` }],
      ),
    ]
    for (const def of defs) {
      ctx.effect(() => tools.register(def), 'dsh-palate: tool ' + def.name)
    }
  }

  ctx.effect(() => () => store.close(), 'dsh-palate: store cleanup')
}

function sendJson(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}
