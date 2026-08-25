/**
 * dsh-palate smoke test — pure logic, no browser needed (CI runs on ubuntu).
 * Exercises the PalateStore: seed, add, list, learn, reinforce, tracked review,
 * feedback, effectiveness, stats, and mirrors.
 * Run: node tests/smoke.mjs
 */
import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PalateStore, SEED_PRINCIPLES } from '../src/store.js'

let failed = 0
const check = (label, cond, extra = '') => {
  const ok = Boolean(cond)
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`)
}

const dir = mkdtempSync(join(tmpdir(), 'dsh-palate-test-'))
const store = new PalateStore(dir)

try {
  // seed
  const seeded = store.listPrinciples()
  check('seed: principles loaded', seeded.length === SEED_PRINCIPLES.length, `${seeded.length} principles`)
  check('seed: mirrors written', existsSync(join(dir, 'principles.md')) && existsSync(join(dir, 'taste.md')))

  // add examples
  const good = store.addExample({ ref: 'stripe.com homepage', verdict: 'good', reason: 'clear hierarchy, restrained palette, compact dashboard navigation', tags: ['landing', 'light', 'dashboard'] })
  const bad = store.addExample({ ref: 'generic ai landing', verdict: 'bad', reason: 'gradient-hero + three-cards boilerplate', tags: ['landing', 'ai-slop'] })
  check('add: good example id', good.id >= 1, `id=${good.id}`)
  check('add: bad example id', bad.id > good.id, `id=${bad.id}`)

  // invalid verdict rejected
  let threw = false
  try { store.addExample({ ref: 'x', verdict: 'meh' }) } catch { threw = true }
  check('add: rejects invalid verdict', threw)

  // list + filter
  const all = store.listExamples()
  check('list: returns both', all.length === 2, `${all.length}`)
  const goods = store.listExamples({ verdict: 'good' })
  check('list: filter by verdict', goods.length === 1 && goods[0].verdict === 'good')
  const tagged = store.listExamples({ tag: 'ai-slop' })
  check('list: filter by tag', tagged.length === 1 && tagged[0].ref === 'generic ai landing')

  // learn a new principle
  const learned = store.addPrinciple('Never center-align body text in dense UIs.', 'typography')
  check('learn: new principle created', learned.created === true, `id=${learned.id}`)
  const dupe = store.addPrinciple('Never center-align body text in dense UIs.')
  check('learn: duplicate not re-added', dupe.created === false)

  // reinforce bumps evidence
  const target = 'One primary focal point per view; everything else supports it.'
  const before = store.listPrinciples().find(p => p.principle === target).evidence
  const n = store.reinforce([target])
  const after = store.listPrinciples().find(p => p.principle === target).evidence
  check('reinforce: evidence bumped', n === 1 && after === before + 1, `${before} -> ${after}`)

  // review context assembles taste
  const rc = store.reviewContext('a dark-mode dashboard', { tag: 'landing' })
  check('review: has subject', rc.subject === 'a dark-mode dashboard')
  check('review: has principles', rc.principles.length === SEED_PRINCIPLES.length + 1)
  check('review: pulls relevant examples', rc.relevant_examples.length === 2)
  check('review: has guidance', typeof rc.guidance === 'string' && rc.guidance.length > 0)

  const ranked = store.searchExamples('Review a dark dashboard navigation with dense data tables')
  check('search: ranks target-relevant example first', ranked[0]?.ref === 'stripe.com homepage', JSON.stringify(ranked[0]))
  check('search: excludes unrelated example without a tag filter', ranked.every(example => example.ref !== 'generic ai landing'), JSON.stringify(ranked))
  check('search: exposes matching evidence', ranked[0]?.matched_terms.includes('dashboard'), JSON.stringify(ranked[0]?.matched_terms))

  // A review creates an auditable record; feedback closes the loop and changes effectiveness separately from corpus size.
  const tracked = store.createReview('a dark-mode dashboard', { tag: 'landing' })
  check('review: creates a tracked id', tracked.review_id >= 1 && tracked.principle_names.length === SEED_PRINCIPLES.length + 1, JSON.stringify({ id: tracked.review_id, principles: tracked.principle_names.length }))
  const rejectedPrinciple = 'Never center-align body text in dense UIs.'
  const evidenceBeforeFeedback = store.listPrinciples().find(p => p.principle === target).evidence
  const feedback = store.recordFeedback({
    reviewId: tracked.review_id,
    outcome: 'helpful',
    acceptedPrinciples: [target],
    rejectedPrinciples: [rejectedPrinciple],
    note: 'The hierarchy advice was actionable; the typography rule did not apply.',
  })
  check('feedback: records reviewed outcome', feedback.outcome === 'helpful' && feedback.reinforced === 1, JSON.stringify(feedback))
  check('feedback: reinforces accepted principle', store.listPrinciples().find(p => p.principle === target).evidence === evidenceBeforeFeedback + 1)
  const effectiveness = store.listEffectiveness()
  const targetEffect = effectiveness.find(p => p.principle === target)
  const rejectedEffect = effectiveness.find(p => p.principle === rejectedPrinciple)
  check('feedback: tracks accepted/rejected effectiveness', targetEffect?.accepted === 1 && rejectedEffect?.rejected === 1, JSON.stringify({ targetEffect, rejectedEffect }))
  let duplicateFeedback = false
  try { store.recordFeedback({ reviewId: tracked.review_id, outcome: 'helpful' }) } catch { duplicateFeedback = true }
  check('feedback: review only closes once', duplicateFeedback)

  // stats
  const stats = store.stats()
  check('stats: counts', stats.examples === 2 && stats.good === 1 && stats.bad === 1 && stats.principles === SEED_PRINCIPLES.length + 1 && stats.reviews === 1 && stats.feedback === 1 && stats.helpful === 1, JSON.stringify(stats))

  // mirror content reflects corpus
  const tasteMd = readFileSync(join(dir, 'taste.md'), 'utf8')
  check('mirror: taste.md lists example', tasteMd.includes('stripe.com homepage'))
  const feedbackMd = readFileSync(join(dir, 'feedback.md'), 'utf8')
  check('mirror: feedback.md lists effectiveness', feedbackMd.includes(target) && feedbackMd.includes('1 accepted / 0 rejected'))
} catch (error) {
  failed++
  console.error('FATAL', error)
} finally {
  store.close()
}

console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILURES`}`)
process.exit(failed === 0 ? 0 : 1)
