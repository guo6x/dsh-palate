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
          else if (suffix === '/training') sendJson(res, 200, store.trainingSummary())
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
    const array = (items, description) => ({ type: 'array', items, description })
    const observation = obj({
      area: str('Visual dimension: hierarchy | typography | color | spacing | interaction | imagery | content | motion | accessibility | other.'),
      finding: str('Concrete observed signal, not a generic adjective.'),
      confidence: str("Optional evidence confidence: 'high' | 'medium' | 'low' (default medium)."),
    }, ['area', 'finding'])
    const proposedPrinciple = obj({
      principle: str('A concrete reusable rule inferred from this analysis.'),
      category: str('Optional category such as hierarchy, typography, or interaction.'),
      evidence: str('The concrete observation that makes this rule worth proposing.'),
      tags: array(str('Optional tag.'), 'Optional tags scoped to this proposed principle in addition to the session tags.'),
    }, ['principle', 'evidence'])
    const packComparison = obj({
      pack_id: str('Exact pack ID returned by palate_packs.'),
      status: str("Comparison result: 'aligned' | 'conflicts' | 'insufficient_evidence'."),
      evidence: str('Concrete observation supporting the comparison, or what is missing.'),
      reference_principles: array(str('Exact abstract pack principle returned by palate_packs.'), 'Relevant pack principles. Required for aligned/conflicts; optional when evidence is insufficient.'),
    }, ['pack_id', 'status', 'evidence'])

    const defs = [
      define(
        'palate_intake',
        'Stage a screenshot, URL, or design-description analysis as a visual-training session. First inspect the source with an appropriate browser or vision capability; this tool does not fetch or interpret a raw URL/image itself. It records hierarchy/typography/color/spacing/interaction observations, proposed examples and principles, and explicit style-pack comparisons as PENDING candidates. It NEVER changes learned taste until the user explicitly confirms candidates through palate_decide.',
        obj({
          subject: str('Human-readable name of the page, screen, or design being analyzed.'),
          source: str('Optional URL, local path, or provenance for the screenshot/design.'),
          verdict: str("Overall training judgment: 'good' | 'bad' | 'note'. Use note when the evidence is mixed."),
          summary: str('Concise evidence-grounded summary of the visual analysis.'),
          observations: array(observation, 'One to fifteen structured observations across visual dimensions.'),
          proposed_principles: array(proposedPrinciple, 'Optional reusable principles to propose; these remain pending until accepted.'),
          tags: array(str('Optional tag.'), 'Optional session tags, for example landing-page or dashboard.'),
          comparisons: array(packComparison, 'Optional Apple/X or other style-pack alignment, conflict, or evidence-gap records.'),
        }, ['subject', 'verdict', 'summary', 'observations']),
        async args => store.createTrainingIntake({
          subject: args.subject,
          source: args.source ?? '',
          verdict: args.verdict,
          summary: args.summary,
          observations: args.observations,
          proposedPrinciples: args.proposed_principles ?? [],
          tags: args.tags ?? [],
          comparisons: args.comparisons ?? [],
        }),
        value => [{
          type: 'text',
          text: [
            `Staged training session #${value.session_id}: ${value.subject}`,
            `${value.candidates.length} pending candidate(s); nothing has been added to learned taste.`,
            '',
            'Candidates:',
            ...value.candidates.map(candidate => `  - #${candidate.candidate_id} [${candidate.kind}] ${candidate.kind === 'example' ? `[${candidate.verdict}] ${candidate.ref}` : candidate.principle}`),
            value.comparisons.length ? '' : null,
            value.comparisons.length ? 'Style-pack comparison:' : null,
            ...value.comparisons.map(comparison => `  - ${comparison.pack_name} [${comparison.scope}] ${comparison.status}: ${comparison.evidence}`),
            '',
            'Show this evidence to the user. Call palate_decide only after their explicit accept/reject decision.',
          ].filter(Boolean).join('\n'),
        }],
      ),
      define(
        'palate_candidates',
        'Inspect the visual-training queue. Candidates are staged by palate_intake and remain non-operative until an explicit palate_decide call. Use this to present pending evidence, source sessions, and previous decisions to the user.',
        obj({
          status: str("Optional filter: 'pending' | 'accepted' | 'rejected'. Defaults to all statuses."),
          session_id: { type: 'number', description: 'Optional training session ID.' },
          limit: { type: 'number', description: 'Max candidates to return (default 20, max 50).' },
        }),
        async args => ({
          candidates: store.listTrainingCandidates({ status: args.status, sessionId: args.session_id, limit: args.limit }),
          training: store.trainingSummary(),
        }),
        value => [{
          type: 'text',
          text: value.candidates.length
            ? [
                `Training queue: ${value.training.stats.pending} pending, ${value.training.stats.accepted} accepted, ${value.training.stats.rejected} rejected.`,
                ...value.candidates.map(candidate => `  - #${candidate.candidate_id} [${candidate.status}/${candidate.kind}] ${candidate.kind === 'example' ? candidate.ref : candidate.principle} — session #${candidate.session_id}${candidate.session_subject ? `: ${candidate.session_subject}` : ''}`),
              ].join('\n')
            : 'No training candidates match that filter.',
        }],
      ),
      define(
        'palate_decide',
        'Apply the user\'s explicit accept/reject decision to pending visual-training candidates. Accepting an example adds it to the corpus; accepting a principle adds it to codified taste if it is not already known. Rejecting preserves the auditable session but changes neither corpus nor principles. Do not call this merely because the analysis looks plausible: first present the candidate evidence and obtain a clear user decision.',
        obj({
          candidate_ids: array({ type: 'number' }, 'One or more pending candidate IDs returned by palate_intake or palate_candidates.'),
          decision: str("User decision: 'accept' | 'reject'."),
          note: str('Optional explanation of the user decision.'),
        }, ['candidate_ids', 'decision']),
        async args => store.decideTrainingCandidates({ candidateIds: args.candidate_ids, decision: args.decision, note: args.note ?? '' }),
        value => [{
          type: 'text',
          text: [
            `${value.decision === 'accept' ? 'Accepted' : 'Rejected'} ${value.results.length} training candidate(s).`,
            ...value.results.map(result => `  - #${result.candidate_id} [${result.kind}] ${result.status}${value.decision === 'accept' ? (result.created ? ' — added to the palate' : ' — already known; decision recorded') : ' — kept only as an auditable decision'}`),
            `Training desk: ${value.training.stats.pending} pending, ${value.training.stats.accepted} accepted, ${value.training.stats.rejected} rejected.`,
          ].join('\n'),
        }],
      ),
      define(
        'palate_packs',
        'List opt-in visual-reference packs for the palate. Packs contain transparent, abstracted observations from public reference pages (not brand assets, copy, or reproduction templates). Check this before using palate_seed for a named style.',
        obj({}),
        async () => ({ packs: store.listStylePacks(), stats: store.stats() }),
        value => [{
          type: 'text',
          text: [
            'Available visual-reference packs (opt-in; abstract principles only):',
            ...value.packs.flatMap(pack => [
              `  - ${pack.id} — ${pack.name}: ${pack.examples} examples, ${pack.principles} principles, tags: ${pack.tags.join(', ')} [${pack.applied ? 'applied' : 'not applied'}]`,
              ...pack.reference_principles.map(principle => `      · [${principle.category}] ${principle.principle}`),
            ]),
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
          source: str('Optional provenance for this manually learned principle.'),
        }, ['principle']),
        async args => store.addPrinciple(args.principle, args.category ?? '', args.tags ?? [], args.source ?? ''),
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
        'Show how much taste the agent has accumulated and whether reviews have been evaluated: examples studied, principles distilled, applied style packs, reviews, feedback, and the visual-training candidate queue.',
        obj({}),
        async () => store.stats(),
        value => [{ type: 'text', text: `Palate: ${value.examples} examples (${value.good} good, ${value.bad} bad, ${value.notes} notes), ${value.principles} principles, ${value.style_packs} applied style pack(s), ${value.reviews} tracked reviews, ${value.feedback} feedback (${value.helpful} helpful, ${value.mixed} mixed, ${value.unhelpful} unhelpful), training desk ${value.training_sessions} session(s): ${value.pending_candidates} pending / ${value.accepted_candidates} accepted / ${value.rejected_candidates} rejected.` }],
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
