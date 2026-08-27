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
          else if (suffix === '/packs') sendJson(res, 200, store.listStylePacks())
          else if (suffix === '/effectiveness') sendJson(res, 200, store.listEffectiveness())
          else if (suffix === '/reviews') sendJson(res, 200, store.listReviews())
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
        'palate_packs',
        'List opt-in visual-reference packs for the palate. Packs contain transparent, abstracted observations from public reference pages (not brand assets, copy, or reproduction templates). Check this before using palate_seed for a named style.',
        obj({}),
        async () => ({ packs: store.listStylePacks(), stats: store.stats() }),
        value => [{
          type: 'text',
          text: [
            'Available visual-reference packs (opt-in; abstract principles only):',
            ...value.packs.map(pack => `  - ${pack.id} — ${pack.name}: ${pack.examples} examples, ${pack.principles} principles, tags: ${pack.tags.join(', ')} [${pack.applied ? 'applied' : 'not applied'}]`),
            '',
            'Use palate_seed with one or more exact pack_ids to add a pack. Applying a pack never replaces existing palate records.',
          ].join('\n'),
        }],
      ),
      define(
        'palate_seed',
        'Explicitly add one or more visual-reference packs to the local palate. Use palate_packs first. Packs add abstract, auditable examples and principles; they never copy brand assets or overwrite existing user taste. Use the returned tags in palate_review to keep reference styles separated.',
        obj({
          pack_ids: { type: 'array', items: { type: 'string' }, description: 'One or more exact IDs returned by palate_packs.' },
        }, ['pack_ids']),
        async args => store.applyStylePacks(args.pack_ids),
        value => [{
          type: 'text',
          text: [
            ...value.packs.map(pack => pack.already_applied
              ? `Kept ${pack.name}: it was already applied.`
              : `Applied ${pack.name}: added ${pack.examples_added} examples and ${pack.principles_added} principles.`),
            `Palate now has ${value.stats.examples} examples, ${value.stats.principles} principles, and ${value.stats.style_packs} applied style pack(s).`,
          ].join('\n'),
        }],
      ),
      define(
        'palate_review',
        'Create a tracked design review from the agent\'s accumulated taste. Returns a review_id, codified principles, relevant past examples (good to emulate, bad to avoid), and guidance. A tag filters both examples and tagged style-pack principles while keeping universal principles. YOU then write the actual critique grounded in this learned taste. After the user responds, call palate_feedback with the review_id to record whether the advice helped.',
        obj({
          subject: str('Description of the design/UI to critique (or the path/url of an image you have already described).'),
          tag: str('Optional tag to focus examples and style-specific principles (for example apple or x after applying a visual-reference pack).'),
        }, ['subject']),
        async args => store.createReview(args.subject, { tag: args.tag }),
        value => [{
          type: 'text',
          text: [
            `Review #${value.review_id}: ${value.subject}`,
            '',
            'Codified taste (apply each):',
            ...value.principles.map(p => `  - ${p}`),
            '',
            `Relevant examples (${value.relevant_examples.length}):`,
            ...value.relevant_examples.map(e => `  - [${e.verdict}] ${e.ref}${e.reason ? ' — ' + e.reason : ''}${e.matched_terms?.length ? ` (matched: ${e.matched_terms.join(', ')})` : ''}`),
            '',
            value.guidance,
            '',
            `After the user evaluates this critique, call palate_feedback with review_id ${value.review_id}. Use exact principle text from palate_principles for accepted_principles/rejected_principles.`,
          ].join('\n'),
        }],
      ),
      define(
        'palate_feedback',
        'Close the loop on a tracked palate_review after the user evaluates the critique. Record whether it was helpful, which reviewed principles were accepted or rejected, and an optional note. Accepted principles gain evidence; effectiveness stays auditable instead of treating more examples as automatically better.',
        obj({
          review_id: { type: 'number', description: 'The review_id returned by palate_review.' },
          outcome: str("Overall outcome: 'helpful' | 'mixed' | 'unhelpful'."),
          accepted_principles: { type: 'array', items: { type: 'string' }, description: 'Optional exact principle strings from palate_principles that helped.' },
          rejected_principles: { type: 'array', items: { type: 'string' }, description: 'Optional exact principle strings from palate_principles that did not help.' },
          note: str('Optional user feedback or a concise explanation of the outcome.'),
        }, ['review_id', 'outcome']),
        async args => store.recordFeedback({
          reviewId: args.review_id,
          outcome: args.outcome,
          acceptedPrinciples: args.accepted_principles ?? [],
          rejectedPrinciples: args.rejected_principles ?? [],
          note: args.note ?? '',
        }),
        value => [{ type: 'text', text: `Recorded ${value.outcome} feedback for review #${value.review_id}: ${value.accepted_principles.length} accepted, ${value.rejected_principles.length} rejected${value.reinforced ? `; reinforced ${value.reinforced} principle(s)` : ''}. Palate now has ${value.stats.feedback} feedback record(s).` }],
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
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags. Tagged principles are included only for matching palate_review tags; untagged principles stay universal.' },
        }, ['principle']),
        async args => store.addPrinciple(args.principle, args.category ?? '', args.tags ?? []),
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
        'List the codified design principles (the agent\'s current taste), ordered by evidence. Pass a tag to see universal principles plus principles scoped to that visual style.',
        obj({ tag: str('Optional style tag, for example apple or x.') }),
        async args => ({ principles: store.listPrinciples({ tag: args.tag }), stats: store.stats() }),
        value => [{ type: 'text', text: value.principles.map(p => `[${p.category}] ${p.principle} (evidence ${p.evidence})${p.tags.length ? ` [tags: ${p.tags.join(', ')}]` : ''}`).join('\n') }],
      ),
      define(
        'palate_effectiveness',
        'Show which design principles have actually helped across recorded review feedback, separate from their raw evidence count.',
        obj({}),
        async () => ({ principles: store.listEffectiveness(), stats: store.stats() }),
        value => [{ type: 'text', text: value.principles.some(principle => principle.feedback > 0)
          ? value.principles.filter(principle => principle.feedback > 0).map(principle => `[${principle.category}] ${principle.principle} — ${principle.accepted} accepted / ${principle.rejected} rejected (${principle.acceptance_rate}% acceptance; evidence ${principle.evidence})`).join('\n')
          : 'No review feedback yet — call palate_feedback after a user evaluates a palate_review.' }],
      ),
      define(
        'palate_stats',
        'Show how much taste the agent has accumulated and whether reviews have been evaluated: examples studied, principles distilled, applied style packs, reviews, and helpful/mixed/unhelpful feedback.',
        obj({}),
        async () => store.stats(),
        value => [{ type: 'text', text: `Palate: ${value.examples} examples (${value.good} good, ${value.bad} bad, ${value.notes} notes), ${value.principles} principles, ${value.style_packs} applied style pack(s), ${value.reviews} tracked reviews, ${value.feedback} feedback (${value.helpful} helpful, ${value.mixed} mixed, ${value.unhelpful} unhelpful).` }],
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
