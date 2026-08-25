/**
 * dsh-palate taste store — the accumulated palate.
 *
 * A growing corpus of design examples (good/bad/notes with reasons) plus a set
 * of codified principles. The differentiator vs a fixed design-audit: this store
 * *accumulates*. Every example fed in and every principle learned sharpens the
 * judgment the agent draws on. Backed by node:sqlite with human-readable
 * Markdown mirrors.
 *
 * Honest framing: this is accumulated retrieval + codified principles, not model
 * fine-tuning. The plugin supplies the learned taste as context; the model renders
 * the actual critique.
 */
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Foundational taste seeded on first run — the starter palate. */
export const SEED_PRINCIPLES = [
  { principle: 'One primary focal point per view; everything else supports it.', category: 'hierarchy' },
  { principle: 'Body text contrast at least 4.5:1 against its background.', category: 'contrast' },
  { principle: 'Use a consistent type scale (a fixed ratio, few sizes), not ad-hoc font sizes.', category: 'typography' },
  { principle: 'Space on a consistent rhythm (e.g. a 4/8px grid); prefer generous whitespace.', category: 'spacing' },
  { principle: 'Align everything to a grid; no arbitrary offsets.', category: 'alignment' },
  { principle: 'Limit the palette: one primary, one accent, plus neutrals; use color semantically.', category: 'color' },
  { principle: 'Same pattern, same treatment — consistency beats cleverness.', category: 'consistency' },
  { principle: 'Interactive elements must look interactive (affordance).', category: 'affordance' },
  { principle: 'Group related items by proximity; separate unrelated ones.', category: 'proximity' },
  { principle: 'Every action gets visible feedback.', category: 'feedback' },
  { principle: 'Reduce cognitive load: one decision at a time, progressive disclosure.', category: 'clarity' },
  { principle: 'Avoid generic AI-slop: no gradient-hero + three-cards + testimonial boilerplate.', category: 'originality' },
]

const VERDICTS = new Set(['good', 'bad', 'note'])
const REVIEW_OUTCOMES = new Set(['helpful', 'mixed', 'unhelpful'])
const MAX_FEEDBACK_PRINCIPLES = 30

/**
 * A dependency-free local tokenizer. Word tokens cover alphabetic languages;
 * Han bigrams make short Chinese design descriptions useful retrieval queries
 * without requiring embeddings or an online model.
 */
function tokensOf(value) {
  const text = String(value ?? '').normalize('NFKC').toLocaleLowerCase()
  const tokens = new Set(text.match(/[\p{L}\p{N}_-]{2,}/gu) ?? [])
  for (const run of text.match(/[\p{Script=Han}]+/gu) ?? []) {
    if (run.length === 1) tokens.add(run)
    for (let i = 0; i < run.length - 1; i++) tokens.add(run.slice(i, i + 2))
  }
  return tokens
}

function searchableText(example) {
  return [example.ref, example.reason, ...(example.tags ?? []), example.source]
    .filter(Boolean)
    .join('\n')
    .normalize('NFKC')
    .toLocaleLowerCase()
}

export class PalateStore {
  constructor(dir) {
    this.dir = dir
    mkdirSync(dir, { recursive: true })
    this.db = new DatabaseSync(join(dir, 'palate.db'))
    this.init()
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS taste (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ref TEXT NOT NULL,
        verdict TEXT NOT NULL,
        reason TEXT,
        tags TEXT,
        source TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS principles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        principle TEXT NOT NULL UNIQUE,
        category TEXT,
        evidence INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        tag TEXT,
        principles TEXT NOT NULL,
        examples TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS review_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER NOT NULL UNIQUE,
        outcome TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (review_id) REFERENCES reviews(id)
      );
      CREATE TABLE IF NOT EXISTS review_feedback_items (
        feedback_id INTEGER NOT NULL,
        principle TEXT NOT NULL,
        verdict TEXT NOT NULL,
        PRIMARY KEY (feedback_id, principle),
        FOREIGN KEY (feedback_id) REFERENCES review_feedback(id)
      );
      PRAGMA foreign_keys = ON;
    `)
    const { c } = this.db.prepare('SELECT COUNT(*) AS c FROM principles').get()
    if (c === 0) {
      const ins = this.db.prepare('INSERT INTO principles (principle, category) VALUES (?, ?)')
      for (const p of SEED_PRINCIPLES) ins.run(p.principle, p.category)
    }
    this.writeMirrors()
  }

  addExample({ ref, verdict, reason = '', tags = [], source = '' }) {
    if (!ref) throw new Error('palate: ref is required')
    if (!VERDICTS.has(verdict)) throw new Error(`palate: verdict must be one of ${[...VERDICTS].join(', ')}`)
    const tagsJson = JSON.stringify(tags)
    const res = this.db
      .prepare('INSERT INTO taste (ref, verdict, reason, tags, source) VALUES (?, ?, ?, ?, ?)')
      .run(ref, verdict, reason, tagsJson, source)
    this.writeMirrors()
    return { id: Number(res.lastInsertRowid), ref, verdict, reason, tags, source }
  }

  listExamples({ verdict, tag, limit = 50 } = {}) {
    let sql = 'SELECT * FROM taste'
    const where = []
    const params = []
    if (verdict) { where.push('verdict = ?'); params.push(verdict) }
    if (where.length) sql += ' WHERE ' + where.join(' AND ')
    sql += ' ORDER BY id DESC LIMIT ?'
    params.push(limit)
    const rows = this.db.prepare(sql).all(...params)
    const out = rows.map(r => ({ ...r, tags: safeParse(r.tags) }))
    if (!tag) return out
    return out.filter(e => e.tags.includes(tag))
  }

  addPrinciple(principle, category = '') {
    if (!principle) throw new Error('palate: principle is required')
    const existing = this.db.prepare('SELECT id FROM principles WHERE principle = ?').get(principle)
    if (existing) return { id: existing.id, principle, created: false }
    const res = this.db.prepare('INSERT INTO principles (principle, category) VALUES (?, ?)').run(principle, category)
    this.writeMirrors()
    return { id: Number(res.lastInsertRowid), principle, category, created: true }
  }

  /** Bump the evidence count for principles an example supports. */
  reinforce(principles) {
    const stmt = this.db.prepare('UPDATE principles SET evidence = evidence + 1 WHERE principle = ?')
    let n = 0
    for (const p of principles) {
      if (stmt.run(p).changes > 0) n++
    }
    if (n > 0) this.writeMirrors()
    return n
  }

  listPrinciples() {
    return this.db.prepare('SELECT * FROM principles ORDER BY evidence DESC, id ASC').all()
  }

  stats() {
    const examples = this.db.prepare('SELECT COUNT(*) AS c FROM taste').get().c
    const good = this.db.prepare("SELECT COUNT(*) AS c FROM taste WHERE verdict='good'").get().c
    const bad = this.db.prepare("SELECT COUNT(*) AS c FROM taste WHERE verdict='bad'").get().c
    const principles = this.db.prepare('SELECT COUNT(*) AS c FROM principles').get().c
    const reviews = this.db.prepare('SELECT COUNT(*) AS c FROM reviews').get().c
    const feedback = this.db.prepare('SELECT COUNT(*) AS c FROM review_feedback').get().c
    const helpful = this.db.prepare("SELECT COUNT(*) AS c FROM review_feedback WHERE outcome='helpful'").get().c
    const mixed = this.db.prepare("SELECT COUNT(*) AS c FROM review_feedback WHERE outcome='mixed'").get().c
    const unhelpful = this.db.prepare("SELECT COUNT(*) AS c FROM review_feedback WHERE outcome='unhelpful'").get().c
    return { examples, good, bad, notes: examples - good - bad, principles, reviews, feedback, helpful, mixed, unhelpful }
  }

  /** Persist the exact evidence supplied for a review, then give the caller an ID to close the loop later. */
  createReview(subject, { tag, limit = 12 } = {}) {
    if (typeof subject !== 'string' || subject.trim().length === 0) throw new Error('palate: review subject is required')
    const context = this.reviewContext(subject, { tag, limit })
    const principles = this.listPrinciples().map(principle => principle.principle)
    const examples = context.relevant_examples.map(example => ({ ref: example.ref, verdict: example.verdict }))
    const res = this.db.prepare('INSERT INTO reviews (subject, tag, principles, examples) VALUES (?, ?, ?, ?)')
      .run(subject, typeof tag === 'string' && tag.length > 0 ? tag : null, JSON.stringify(principles), JSON.stringify(examples))
    return { review_id: Number(res.lastInsertRowid), principle_names: principles, ...context }
  }

  /** Record one outcome for a review and reinforce only principles the user says helped. */
  recordFeedback({ reviewId, outcome, acceptedPrinciples = [], rejectedPrinciples = [], note = '' }) {
    const id = Number(reviewId)
    if (!Number.isInteger(id) || id <= 0) throw new Error('palate: review_id must be a positive integer')
    if (!REVIEW_OUTCOMES.has(outcome)) throw new Error(`palate: outcome must be one of ${[...REVIEW_OUTCOMES].join(', ')}`)
    if (typeof note !== 'string' || note.length > 4000) throw new Error('palate: note must be a string up to 4000 characters')
    const accepted = stringList(acceptedPrinciples, 'accepted_principles')
    const rejected = stringList(rejectedPrinciples, 'rejected_principles')
    const duplicated = accepted.filter(principle => rejected.includes(principle))
    if (duplicated.length > 0) throw new Error(`palate: a principle cannot be both accepted and rejected: ${duplicated.join(', ')}`)

    const review = this.db.prepare('SELECT principles FROM reviews WHERE id = ?').get(id)
    if (review === undefined) throw new Error(`palate: review #${id} does not exist`)
    const allowed = new Set(safeParse(review.principles))
    const unknown = [...accepted, ...rejected].filter(principle => !allowed.has(principle))
    if (unknown.length > 0) throw new Error(`palate: feedback principles must come from review #${id}: ${unknown.join(', ')}`)
    const existing = this.db.prepare('SELECT id FROM review_feedback WHERE review_id = ?').get(id)
    if (existing !== undefined) throw new Error(`palate: review #${id} already has feedback`)

    let feedbackId
    this.db.exec('BEGIN')
    try {
      const res = this.db.prepare('INSERT INTO review_feedback (review_id, outcome, note) VALUES (?, ?, ?)').run(id, outcome, note)
      feedbackId = Number(res.lastInsertRowid)
      const insert = this.db.prepare('INSERT INTO review_feedback_items (feedback_id, principle, verdict) VALUES (?, ?, ?)')
      for (const principle of accepted) insert.run(feedbackId, principle, 'accepted')
      for (const principle of rejected) insert.run(feedbackId, principle, 'rejected')
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
    const reinforced = this.reinforce(accepted)
    if (reinforced === 0) this.writeMirrors()
    return {
      feedback_id: feedbackId,
      review_id: id,
      outcome,
      accepted_principles: accepted,
      rejected_principles: rejected,
      reinforced,
      stats: this.stats(),
    }
  }

  /** Per-principle adoption history from feedback, separate from raw evidence count. */
  listEffectiveness({ limit = 50 } = {}) {
    const rows = this.db.prepare(`
      SELECT p.id, p.principle, p.category, p.evidence,
        COUNT(i.principle) AS feedback,
        COALESCE(SUM(CASE WHEN i.verdict = 'accepted' THEN 1 ELSE 0 END), 0) AS accepted,
        COALESCE(SUM(CASE WHEN i.verdict = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected
      FROM principles p
      LEFT JOIN review_feedback_items i ON i.principle = p.principle
      GROUP BY p.id
      ORDER BY feedback DESC, accepted DESC, rejected ASC, p.evidence DESC, p.id ASC
      LIMIT ?
    `).all(Math.max(1, Math.min(100, Number(limit) || 50)))
    return rows.map(row => ({
      ...row,
      acceptance_rate: row.feedback > 0 ? Math.round((row.accepted / row.feedback) * 100) : null,
    }))
  }

  /**
   * Rank past examples against the concrete design currently under review.
   * `tag` remains a hard user-directed filter; without it, unrelated recent
   * entries are deliberately omitted instead of pretending to be evidence.
   */
  searchExamples(subject, { tag, limit = 12 } = {}) {
    const query = String(subject ?? '').normalize('NFKC').toLocaleLowerCase().trim()
    const queryTokens = tokensOf(query)
    const examples = this.listExamples({ tag, limit: 1000 })
    const ranked = examples.map(example => {
      const text = searchableText(example)
      const exampleTokens = tokensOf(text)
      const terms = [...queryTokens].filter(token => exampleTokens.has(token))
      const tagTerms = new Set((example.tags ?? []).flatMap(value => [...tokensOf(value)]))
      const score = terms.reduce((sum, token) => sum + (tagTerms.has(token) ? 3 : 1), 0)
        + (query.length >= 8 && text.includes(query) ? 4 : 0)
        + (tag && example.tags.includes(tag) ? 2 : 0)
      return { ...example, score, matched_terms: terms.slice(0, 12) }
    })
    const relevant = tag ? ranked : ranked.filter(example => example.score > 0)
    return relevant
      .sort((left, right) => right.score - left.score || right.id - left.id)
      .slice(0, Math.max(1, Math.min(50, Number(limit) || 12)))
  }

  /**
   * Assemble the learned taste as context for a review. The plugin supplies this
   * accumulated knowledge; the model renders the critique grounded in it.
   */
  reviewContext(subject, { tag, limit = 12 } = {}) {
    const principles = this.listPrinciples().map(p => `[${p.category}] ${p.principle} (evidence ${p.evidence})`)
    const relevant = this.searchExamples(subject, { tag, limit }).map(e => ({
      ref: e.ref, verdict: e.verdict, reason: e.reason, tags: e.tags,
      score: e.score, matched_terms: e.matched_terms,
    }))
    return {
      subject,
      principles,
      relevant_examples: relevant,
      guidance: relevant.length > 0
        ? 'Critique the subject against each principle. Cite specific relevant examples (good ones to emulate, bad ones to avoid). Be concrete: name what to change and why.'
        : 'Critique the subject against each principle. No sufficiently relevant prior examples were found, so do not invent precedent; say what evidence would make the palate more specific.',
    }
  }

  writeMirrors() {
    const taste = this.listExamples({ limit: 1000 })
    const lines = ['# taste.md — dsh-palate corpus', '', '<!-- Read-only mirror of the taste corpus. -->', '']
    for (const e of taste) {
      lines.push(`## [${e.verdict}] ${e.ref}`)
      if (e.reason) lines.push(`- why: ${e.reason}`)
      if (e.tags.length) lines.push(`- tags: ${e.tags.join(', ')}`)
      lines.push('')
    }
    writeFileSync(join(this.dir, 'taste.md'), lines.join('\n'))

    const ps = this.listPrinciples()
    const plines = ['# principles.md — dsh-palate codified taste', '', '<!-- Read-only mirror of the principles. -->', '']
    for (const p of ps) plines.push(`- [${p.category}] ${p.principle} _(evidence ${p.evidence})_`)
    writeFileSync(join(this.dir, 'principles.md'), plines.join('\n'))

    const effectiveness = this.listEffectiveness().filter(item => item.feedback > 0)
    const flines = ['# feedback.md — dsh-palate review outcomes', '', '<!-- Read-only mirror of review feedback. -->', '']
    if (effectiveness.length === 0) flines.push('No review feedback recorded yet.')
    for (const item of effectiveness) {
      flines.push(`- [${item.category}] ${item.principle} — ${item.accepted} accepted / ${item.rejected} rejected (${item.acceptance_rate}% acceptance)`)
    }
    writeFileSync(join(this.dir, 'feedback.md'), flines.join('\n'))
  }

  close() {
    try { this.db.close() } catch {}
  }
}

function safeParse(s) {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] }
}

function stringList(values, name) {
  if (!Array.isArray(values)) throw new Error(`palate: ${name} must be an array`)
  if (values.length > MAX_FEEDBACK_PRINCIPLES) throw new Error(`palate: ${name} accepts at most ${MAX_FEEDBACK_PRINCIPLES} principles`)
  const output = []
  for (const value of values) {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > 500) {
      throw new Error(`palate: ${name} must contain non-empty strings up to 500 characters`)
    }
    const principle = value.trim()
    if (!output.includes(principle)) output.push(principle)
  }
  return output
}
