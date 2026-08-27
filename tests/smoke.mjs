/**
 * dsh-palate smoke test — pure logic, no browser needed (CI runs on ubuntu).
 * Exercises the PalateStore: seed, add, list, learn, reinforce, tracked review,
 * feedback, effectiveness, stats, and mirrors.
 * Run: node tests/smoke.mjs
 */
import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { PalateStore, SEED_EXAMPLES, SEED_PRINCIPLES, STYLE_PACKS } from '../src/store.js'

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
  const starterExamples = store.listExamples()
  check('seed: examples loaded for first review', starterExamples.length === SEED_EXAMPLES.length && starterExamples.every(example => example.source === 'dsh-palate starter palate'), `${starterExamples.length} examples`)
  check('seed: mirrors written', existsSync(join(dir, 'principles.md')) && existsSync(join(dir, 'taste.md')) && existsSync(join(dir, 'training.md')))

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
  check('list: returns starter and user examples', all.length === SEED_EXAMPLES.length + 2, `${all.length}`)
  const goods = store.listExamples({ verdict: 'good' })
  check('list: filter by verdict', goods.length === SEED_EXAMPLES.filter(example => example.verdict === 'good').length + 1 && goods.every(example => example.verdict === 'good'))
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
  const recentReviews = store.listReviews()
  check('review: evidence is visible in recent reviews', recentReviews[0]?.review_id === tracked.review_id && recentReviews[0].relevant_examples.length === 2)
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
  check('stats: counts', stats.examples === SEED_EXAMPLES.length + 2 && stats.good === 3 && stats.bad === 3 && stats.principles === SEED_PRINCIPLES.length + 1 && stats.reviews === 1 && stats.feedback === 1 && stats.helpful === 1, JSON.stringify(stats))

  // mirror content reflects corpus
  const tasteMd = readFileSync(join(dir, 'taste.md'), 'utf8')
  check('mirror: taste.md lists example', tasteMd.includes('stripe.com homepage'))
  const feedbackMd = readFileSync(join(dir, 'feedback.md'), 'utf8')
  check('mirror: feedback.md lists effectiveness', feedbackMd.includes(target) && feedbackMd.includes('1 accepted / 0 rejected'))

  // Style packs remain opt-in, add auditable records once, and keep tagged taste isolated.
  const packsBefore = store.listStylePacks()
  check('packs: references are available but not auto-applied', packsBefore.length === STYLE_PACKS.length && packsBefore.every(pack => !pack.applied))
  const beforePacks = store.stats()
  const applied = store.applyStylePacks(['apple-product-storytelling', 'x-direct-utility'])
  const styleExamples = STYLE_PACKS.reduce((sum, pack) => sum + pack.examples.length, 0)
  const stylePrinciples = STYLE_PACKS.reduce((sum, pack) => sum + pack.principles.length, 0)
  check('packs: applies Apple and X references once', applied.packs.length === 2 && applied.packs.every(pack => !pack.already_applied))
  check('packs: records the expected corpus growth', applied.stats.examples === beforePacks.examples + styleExamples && applied.stats.principles === beforePacks.principles + stylePrinciples && applied.stats.style_packs === 2, JSON.stringify(applied.stats))
  const appleExamples = store.listExamples({ tag: 'apple' })
  const applePrinciples = store.listPrinciples({ tag: 'apple' })
  const appleRule = STYLE_PACKS.find(pack => pack.id === 'apple-product-storytelling').principles[0].principle
  const xRule = STYLE_PACKS.find(pack => pack.id === 'x-direct-utility').principles[0].principle
  check('packs: Apple tag retrieves only Apple examples', appleExamples.length === 5 && appleExamples.every(example => example.tags.includes('apple')))
  check('packs: Apple tag keeps universal rules and excludes X-specific rules', applePrinciples.some(principle => principle.principle === appleRule) && !applePrinciples.some(principle => principle.principle === xRule))
  const appleReview = store.reviewContext('A cinematic product launch page with a single product and one action.', { tag: 'apple' })
  check('packs: Apple review carries Apple evidence, not X evidence', appleReview.relevant_examples.length === 5 && appleReview.principles.some(principle => principle.includes(appleRule)) && !appleReview.principles.some(principle => principle.includes(xRule)))
  const beforeReapply = store.stats()
  const reapply = store.applyStylePacks(['apple-product-storytelling'])
  check('packs: reapplying is idempotent', reapply.packs[0]?.already_applied === true && reapply.stats.examples === beforeReapply.examples && reapply.stats.principles === beforeReapply.principles)
  let unknownPack = false
  try { store.applyStylePacks(['not-a-real-pack']) } catch { unknownPack = true }
  check('packs: rejects unknown pack IDs', unknownPack)
  const styleTasteMd = readFileSync(join(dir, 'taste.md'), 'utf8')
  const stylePrinciplesMd = readFileSync(join(dir, 'principles.md'), 'utf8')
  check('packs: mirrors expose source examples and tags', styleTasteMd.includes('Apple reference: single-subject launch hero') && stylePrinciplesMd.includes('tags: apple, product-storytelling'))

  // The visual-training desk stages structured analysis first; it cannot silently teach the palate.
  const appleLaunchRule = STYLE_PACKS.find(pack => pack.id === 'apple-product-storytelling').principles[0].principle
  const intake = store.createTrainingIntake({
    subject: 'B2B analytics landing page screenshot',
    source: 'https://example.test/analytics',
    verdict: 'note',
    summary: 'A clear product proof block leads the page, but the CTA group gives three actions the same visual weight.',
    observations: [
      { area: 'hierarchy', finding: 'The proof-led product screenshot is the first visual subject and the only full-width image.', confidence: 'high' },
      { area: 'interaction', finding: 'Demo, Start free, and Contact sales use equal filled buttons in one row.', confidence: 'high' },
      { area: 'spacing', finding: 'The next product story starts after a calm visual reset instead of competing with the hero.', confidence: 'medium' },
    ],
    proposedPrinciples: [
      { principle: 'When a landing page has multiple CTA paths, visibly rank one commitment above alternatives.', category: 'conversion', evidence: 'All three CTA buttons have the same fill, size, and placement, so no primary route is clear.', tags: ['landing-page'] },
      { principle: 'Let product proof lead the first viewport before decorative campaign treatment.', category: 'product-storytelling', evidence: 'The full-width product screenshot explains the offer before ornamental graphics appear.' },
    ],
    tags: ['landing-page', 'b2b'],
    comparisons: [{
      pack_id: 'apple-product-storytelling',
      status: 'aligned',
      evidence: 'The first viewport has one proof-led product subject and a visual reset before the next story.',
      reference_principles: [appleLaunchRule],
    }],
  })
  check('training: intake stages example and principle candidates without mutating taste', intake.candidates.length === 3 && intake.candidates.every(candidate => candidate.status === 'pending') && store.stats().examples === 16 && store.stats().principles === 23)
  check('training: preserves structured observations and active-pack comparison', intake.observations.length === 3 && intake.comparisons[0]?.scope === 'active_palate' && intake.comparisons[0]?.status === 'aligned')
  const pendingTraining = store.listTrainingCandidates({ status: 'pending' })
  check('training: pending queue is queryable with source session', pendingTraining.length === 3 && pendingTraining.every(candidate => candidate.session_id === intake.session_id) && pendingTraining[0].session_subject === intake.subject)
  const acceptedTraining = store.decideTrainingCandidates({
    candidateIds: [intake.candidates[0].candidate_id, intake.candidates[1].candidate_id],
    decision: 'accept',
    note: 'Keep the evidence-backed example and the CTA ranking rule.',
  })
  check('training: explicit acceptance alone mutates corpus and principles', acceptedTraining.results.every(result => result.status === 'accepted') && acceptedTraining.results.every(result => result.created) && store.stats().examples === 17 && store.stats().principles === 24 && store.stats().accepted_candidates === 2 && store.stats().pending_candidates === 1)
  const acceptedExample = store.listExamples({ tag: 'b2b' }).find(example => example.ref === intake.subject)
  const acceptedRule = store.listPrinciples().find(principle => principle.principle === intake.candidates[1].principle)
  check('training: accepted records retain session provenance', acceptedExample?.source.includes(`training session #${intake.session_id}`) && acceptedRule?.source.includes(`training session #${intake.session_id}`))
  const rejectedTraining = store.decideTrainingCandidates({ candidateIds: [intake.candidates[2].candidate_id], decision: 'reject', note: 'This one is too broad for the current palate.' })
  check('training: rejection is auditable but never adds taste', rejectedTraining.results[0]?.status === 'rejected' && store.stats().examples === 17 && store.stats().principles === 24 && store.stats().rejected_candidates === 1)
  const trainingSummary = store.trainingSummary()
  check('training: summary exposes resolved queue state', trainingSummary.stats.sessions === 1 && trainingSummary.stats.pending === 0 && trainingSummary.stats.accepted === 2 && trainingSummary.stats.rejected === 1 && trainingSummary.sessions[0]?.candidate_counts.rejected === 1)
  let repeatDecision = false
  try { store.decideTrainingCandidates({ candidateIds: [intake.candidates[0].candidate_id], decision: 'accept' }) } catch { repeatDecision = true }
  check('training: candidates cannot be decided twice', repeatDecision)
  const trainingMd = readFileSync(join(dir, 'training.md'), 'utf8')
  check('training: mirror preserves comparison, candidates, and decision note', trainingMd.includes('Apple reference: product storytelling') && trainingMd.includes('candidate #') && trainingMd.includes('Keep the evidence-backed example'))

  const referenceOnlyDir = mkdtempSync(join(tmpdir(), 'dsh-palate-reference-only-'))
  const referenceOnly = new PalateStore(referenceOnlyDir)
  const referenceOnlySession = referenceOnly.createTrainingIntake({
    subject: 'Untested signup screen', verdict: 'note', summary: 'The screenshot is too cropped to judge the primary route.',
    observations: [{ area: 'interaction', finding: 'Only a partial input field is visible; no primary action is shown.', confidence: 'low' }],
    comparisons: [{ pack_id: 'x-direct-utility', status: 'insufficient_evidence', evidence: 'The screenshot does not show enough of the entry flow to assess action ranking.', reference_principles: [] }],
  })
  check('training: reference-only comparison never auto-applies a style pack', referenceOnlySession.comparisons[0]?.scope === 'reference_only' && referenceOnly.stats().style_packs === 0 && referenceOnly.stats().examples === SEED_EXAMPLES.length)
  referenceOnly.close()

  const examplesBeforeReopen = store.stats().examples
  store.close()
  const reopened = new PalateStore(dir)
  check('seed: reopening does not duplicate examples', reopened.stats().examples === examplesBeforeReopen)
  reopened.close()

  // Existing palates from before tagged principles must migrate without losing records.
  const legacyDir = mkdtempSync(join(tmpdir(), 'dsh-palate-legacy-'))
  const legacyDb = new DatabaseSync(join(legacyDir, 'palate.db'))
  legacyDb.exec(`
    CREATE TABLE taste (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref TEXT NOT NULL,
      verdict TEXT NOT NULL,
      reason TEXT,
      tags TEXT,
      source TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE principles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      principle TEXT NOT NULL UNIQUE,
      category TEXT,
      evidence INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO taste (ref, verdict, reason, tags, source) VALUES ('legacy user example', 'good', 'kept through migration', '["legacy"]', 'user');
    INSERT INTO principles (principle, category) VALUES ('Legacy user principle stays intact.', 'legacy');
  `)
  legacyDb.close()
  const migrated = new PalateStore(legacyDir)
  const legacyPrinciple = migrated.listPrinciples().find(principle => principle.principle === 'Legacy user principle stays intact.')
  const migratedPack = migrated.applyStylePacks(['apple-product-storytelling'])
  check('migration: adds source and tagged-principle support without replacing old taste', legacyPrinciple?.tags.length === 0 && legacyPrinciple?.source === '' && migrated.listExamples({ tag: 'legacy' }).some(example => example.ref === 'legacy user example') && migratedPack.stats.style_packs === 1)
  migrated.close()
} catch (error) {
  failed++
  console.error('FATAL', error)
} finally {
  store.close()
}

console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILURES`}`)
process.exit(failed === 0 ? 0 : 1)
