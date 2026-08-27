// src/index.js
import { join as join2 } from "node:path";
import { homedir } from "node:os";

// src/store.js
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
var SEED_PRINCIPLES = [
  { principle: "One primary focal point per view; everything else supports it.", category: "hierarchy" },
  { principle: "Body text contrast at least 4.5:1 against its background.", category: "contrast" },
  { principle: "Use a consistent type scale (a fixed ratio, few sizes), not ad-hoc font sizes.", category: "typography" },
  { principle: "Space on a consistent rhythm (e.g. a 4/8px grid); prefer generous whitespace.", category: "spacing" },
  { principle: "Align everything to a grid; no arbitrary offsets.", category: "alignment" },
  { principle: "Limit the palette: one primary, one accent, plus neutrals; use color semantically.", category: "color" },
  { principle: "Same pattern, same treatment \u2014 consistency beats cleverness.", category: "consistency" },
  { principle: "Interactive elements must look interactive (affordance).", category: "affordance" },
  { principle: "Group related items by proximity; separate unrelated ones.", category: "proximity" },
  { principle: "Every action gets visible feedback.", category: "feedback" },
  { principle: "Reduce cognitive load: one decision at a time, progressive disclosure.", category: "clarity" },
  { principle: "Avoid generic AI-slop: no gradient-hero + three-cards + testimonial boilerplate.", category: "originality" }
];
var SEED_EXAMPLES = [
  {
    ref: "Starter: focused analytics dashboard",
    verdict: "good",
    reason: "One revenue metric leads; the supporting trend and secondary metrics are visibly subordinate.",
    tags: ["starter", "analytics", "hierarchy"],
    source: "dsh-palate starter palate"
  },
  {
    ref: "Starter: equal-weight KPI wall",
    verdict: "bad",
    reason: "Twelve KPI cards share identical weight and color, so the decision signal is buried.",
    tags: ["starter", "analytics", "hierarchy"],
    source: "dsh-palate starter palate"
  },
  {
    ref: "Starter: readable dark data table",
    verdict: "good",
    reason: "Strong text contrast, aligned columns, and explicit status color make scanning predictable.",
    tags: ["starter", "analytics", "contrast"],
    source: "dsh-palate starter palate"
  },
  {
    ref: "Starter: gradient hero plus three cards",
    verdict: "bad",
    reason: "Generic boilerplate spends the strongest contrast on decoration instead of the product decision.",
    tags: ["starter", "marketing", "originality"],
    source: "dsh-palate starter palate"
  }
];
var STYLE_PACKS = [
  {
    id: "apple-product-storytelling",
    name: "Apple reference: product storytelling",
    description: "A calm product-launch rhythm: one visual subject, proof-led imagery, restrained choices, and clear reset space between stories.",
    tags: ["apple", "product-storytelling"],
    source: "Public reference: https://www.apple.com/ (observed 2026-08-27; abstract principles only, with no Apple assets or copy).",
    principles: [
      { principle: "Give each launch viewport one visual subject, a short claim, one readable supporting line, and one clear next action.", category: "product-storytelling" },
      { principle: "Use full-bleed product imagery as evidence; if the image could belong to any brand, it is decoration rather than proof.", category: "product-storytelling" },
      { principle: "Keep global navigation quiet while the current product story owns the visual field.", category: "hierarchy" },
      { principle: "When visitors are near a purchase, pair a learning action with one transaction action; otherwise keep the choice singular.", category: "conversion" },
      { principle: "Sequence multiple offerings as distinct mini-campaigns with reset space between them instead of making them compete in one equal-weight grid.", category: "narrative" }
    ],
    examples: [
      {
        ref: "Apple reference: single-subject launch hero",
        verdict: "good",
        reason: "A single large visual subject, a short event claim, one supporting sentence, and one action make the first decision immediate."
      },
      {
        ref: "Apple reference: quiet global navigation",
        verdict: "good",
        reason: "The navigation remains compact and low-noise while the hero carries the page\u2019s strongest contrast and emotional weight."
      },
      {
        ref: "Apple reference: learn-to-buy CTA pair",
        verdict: "good",
        reason: "Product sections separate education from transaction with a restrained Learn more / Buy-or-preorder pairing."
      },
      {
        ref: "Derived counterexample: cinematic hero without product proof",
        verdict: "bad",
        reason: "Large type, glow, and whitespace cannot create product conviction when the image offers no concrete evidence of the thing being sold.",
        source: "dsh-palate Apple-reference counterexample; not an Apple page."
      },
      {
        ref: "Derived counterexample: every product fights for the hero",
        verdict: "bad",
        reason: "Giving every offering equal scale and visual drama removes the pause that lets one product story land before the next begins.",
        source: "dsh-palate Apple-reference counterexample; not an Apple page."
      }
    ]
  },
  {
    id: "x-direct-utility",
    name: "X reference: direct utility",
    description: "A direct entry-flow language: stark contrast, a decisive identity field, ranked actions, and nearly invisible secondary detail.",
    tags: ["x", "direct-utility"],
    source: "Public reference: https://x.com/ (observed 2026-08-27; abstract principles only, with no X assets or copy).",
    principles: [
      { principle: "Use a stark visual identity only when the action column is simple enough to remain immediately usable.", category: "hierarchy" },
      { principle: "In an entry flow, rank one primary path above alternatives; secondary methods should support rather than compete.", category: "conversion" },
      { principle: "Use monochrome contrast to establish hierarchy; reserve accent color for focus, errors, and irreversible states.", category: "color" },
      { principle: "Keep legal and transactional detail at the edge of attention after the primary task is already clear.", category: "clarity" },
      { principle: "Let layout, spacing, and type carry the product\u2019s conviction instead of adding ornamental chrome.", category: "originality" }
    ],
    examples: [
      {
        ref: "X reference: direct black-and-white entry screen",
        verdict: "good",
        reason: "A short headline, a giant identity field, and a compact action column establish a decisive first impression without visual clutter."
      },
      {
        ref: "X reference: ranked sign-in routes",
        verdict: "good",
        reason: "The primary continuation path receives the strongest fill while alternatives and the manual field route are visibly secondary."
      },
      {
        ref: "X reference: secondary links at the edge of attention",
        verdict: "good",
        reason: "Legal and footer links remain available but do not interrupt the account-entry decision."
      },
      {
        ref: "Derived counterexample: monochrome without state hierarchy",
        verdict: "bad",
        reason: "A black-and-white interface becomes inert when primary action, input focus, disabled states, and errors all look equally quiet.",
        source: "dsh-palate X-reference counterexample; not an X page."
      },
      {
        ref: "Derived counterexample: identity mark blocks the primary task",
        verdict: "bad",
        reason: "A large logo helps only when it frames the action; it fails when the task is pushed below the fold or loses visual priority.",
        source: "dsh-palate X-reference counterexample; not an X page."
      }
    ]
  }
];
var VERDICTS = /* @__PURE__ */ new Set(["good", "bad", "note"]);
var REVIEW_OUTCOMES = /* @__PURE__ */ new Set(["helpful", "mixed", "unhelpful"]);
var MAX_FEEDBACK_PRINCIPLES = 30;
function tokensOf(value) {
  const text = String(value ?? "").normalize("NFKC").toLocaleLowerCase();
  const tokens = new Set(text.match(/[\p{L}\p{N}_-]{2,}/gu) ?? []);
  for (const run of text.match(/[\p{Script=Han}]+/gu) ?? []) {
    if (run.length === 1) tokens.add(run);
    for (let i = 0; i < run.length - 1; i++) tokens.add(run.slice(i, i + 2));
  }
  return tokens;
}
function searchableText(example) {
  return [example.ref, example.reason, ...example.tags ?? [], example.source].filter(Boolean).join("\n").normalize("NFKC").toLocaleLowerCase();
}
var PalateStore = class {
  constructor(dir) {
    this.dir = dir;
    mkdirSync(dir, { recursive: true });
    this.db = new DatabaseSync(join(dir, "palate.db"));
    this.init();
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
        tags TEXT NOT NULL DEFAULT '[]',
        evidence INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS applied_style_packs (
        pack_id TEXT PRIMARY KEY,
        applied_at TEXT DEFAULT (datetime('now'))
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
    `);
    const principleColumns = this.db.prepare("PRAGMA table_info(principles)").all();
    if (!principleColumns.some((column) => column.name === "tags")) {
      this.db.exec("ALTER TABLE principles ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
    }
    const { c } = this.db.prepare("SELECT COUNT(*) AS c FROM principles").get();
    if (c === 0) {
      const ins = this.db.prepare("INSERT INTO principles (principle, category, tags) VALUES (?, ?, ?)");
      for (const p of SEED_PRINCIPLES) ins.run(p.principle, p.category, JSON.stringify(p.tags ?? []));
    }
    const { c: examples } = this.db.prepare("SELECT COUNT(*) AS c FROM taste").get();
    if (examples === 0) {
      const ins = this.db.prepare("INSERT INTO taste (ref, verdict, reason, tags, source) VALUES (?, ?, ?, ?, ?)");
      for (const e of SEED_EXAMPLES) ins.run(e.ref, e.verdict, e.reason, JSON.stringify(e.tags), e.source);
    }
    this.writeMirrors();
  }
  addExample({ ref, verdict, reason = "", tags = [], source = "" }) {
    if (!ref) throw new Error("palate: ref is required");
    if (!VERDICTS.has(verdict)) throw new Error(`palate: verdict must be one of ${[...VERDICTS].join(", ")}`);
    const normalizedTags = normalizeTags(tags);
    const tagsJson = JSON.stringify(normalizedTags);
    const res = this.db.prepare("INSERT INTO taste (ref, verdict, reason, tags, source) VALUES (?, ?, ?, ?, ?)").run(ref, verdict, reason, tagsJson, source);
    this.writeMirrors();
    return { id: Number(res.lastInsertRowid), ref, verdict, reason, tags: normalizedTags, source };
  }
  listExamples({ verdict, tag, limit = 50 } = {}) {
    let sql = "SELECT * FROM taste";
    const where = [];
    const params = [];
    if (verdict) {
      where.push("verdict = ?");
      params.push(verdict);
    }
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY id DESC LIMIT ?";
    params.push(limit);
    const rows = this.db.prepare(sql).all(...params);
    const out = rows.map((r) => ({ ...r, tags: safeParse(r.tags) }));
    if (!tag) return out;
    const normalizedTag = normalizeTag(tag, "tag");
    return out.filter((e) => e.tags.includes(normalizedTag));
  }
  addPrinciple(principle, category = "", tags = []) {
    if (!principle) throw new Error("palate: principle is required");
    const normalizedTags = normalizeTags(tags);
    const existing = this.db.prepare("SELECT id, category, tags FROM principles WHERE principle = ?").get(principle);
    if (existing) return { id: existing.id, principle, category: existing.category, tags: safeParse(existing.tags), created: false };
    const res = this.db.prepare("INSERT INTO principles (principle, category, tags) VALUES (?, ?, ?)").run(principle, category, JSON.stringify(normalizedTags));
    this.writeMirrors();
    return { id: Number(res.lastInsertRowid), principle, category, tags: normalizedTags, created: true };
  }
  /** Bump the evidence count for principles an example supports. */
  reinforce(principles) {
    const stmt = this.db.prepare("UPDATE principles SET evidence = evidence + 1 WHERE principle = ?");
    let n = 0;
    for (const p of principles) {
      if (stmt.run(p).changes > 0) n++;
    }
    if (n > 0) this.writeMirrors();
    return n;
  }
  listPrinciples({ tag } = {}) {
    const principles = this.db.prepare("SELECT * FROM principles ORDER BY evidence DESC, id ASC").all().map((principle) => ({ ...principle, tags: safeParse(principle.tags) }));
    if (!tag) return principles;
    const normalizedTag = normalizeTag(tag, "tag");
    return principles.filter((principle) => principle.tags.length === 0 || principle.tags.includes(normalizedTag));
  }
  stats() {
    const examples = this.db.prepare("SELECT COUNT(*) AS c FROM taste").get().c;
    const good = this.db.prepare("SELECT COUNT(*) AS c FROM taste WHERE verdict='good'").get().c;
    const bad = this.db.prepare("SELECT COUNT(*) AS c FROM taste WHERE verdict='bad'").get().c;
    const principles = this.db.prepare("SELECT COUNT(*) AS c FROM principles").get().c;
    const reviews = this.db.prepare("SELECT COUNT(*) AS c FROM reviews").get().c;
    const feedback = this.db.prepare("SELECT COUNT(*) AS c FROM review_feedback").get().c;
    const helpful = this.db.prepare("SELECT COUNT(*) AS c FROM review_feedback WHERE outcome='helpful'").get().c;
    const mixed = this.db.prepare("SELECT COUNT(*) AS c FROM review_feedback WHERE outcome='mixed'").get().c;
    const unhelpful = this.db.prepare("SELECT COUNT(*) AS c FROM review_feedback WHERE outcome='unhelpful'").get().c;
    const stylePacks = this.db.prepare("SELECT COUNT(*) AS c FROM applied_style_packs").get().c;
    return { examples, good, bad, notes: examples - good - bad, principles, reviews, feedback, helpful, mixed, unhelpful, style_packs: stylePacks };
  }
  /** List the available opt-in visual-reference packs and whether this palate has applied them. */
  listStylePacks() {
    const applied = new Set(this.db.prepare("SELECT pack_id FROM applied_style_packs").all().map((row) => row.pack_id));
    return STYLE_PACKS.map((pack) => ({
      id: pack.id,
      name: pack.name,
      description: pack.description,
      source: pack.source,
      tags: pack.tags,
      examples: pack.examples.length,
      principles: pack.principles.length,
      applied: applied.has(pack.id)
    }));
  }
  /** Apply one or more style packs exactly once; existing user records are never replaced. */
  applyStylePacks(packIds) {
    const requested = stylePackIdList(packIds);
    const byId = new Map(STYLE_PACKS.map((pack) => [pack.id, pack]));
    const existing = new Set(this.db.prepare("SELECT pack_id FROM applied_style_packs").all().map((row) => row.pack_id));
    const results = [];
    let changed = false;
    this.db.exec("BEGIN");
    try {
      const addPrinciple = this.db.prepare("INSERT OR IGNORE INTO principles (principle, category, tags) VALUES (?, ?, ?)");
      const addExample = this.db.prepare("INSERT INTO taste (ref, verdict, reason, tags, source) VALUES (?, ?, ?, ?, ?)");
      const markApplied = this.db.prepare("INSERT INTO applied_style_packs (pack_id) VALUES (?)");
      for (const id of requested) {
        const pack = byId.get(id);
        if (pack === void 0) throw new Error(`palate: unknown style pack: ${id}`);
        if (existing.has(id)) {
          results.push({ id, name: pack.name, already_applied: true, examples_added: 0, principles_added: 0 });
          continue;
        }
        let principlesAdded = 0;
        for (const principle of pack.principles) {
          const result = addPrinciple.run(principle.principle, principle.category, JSON.stringify(normalizeTags(principle.tags ?? pack.tags)));
          principlesAdded += result.changes;
        }
        for (const example of pack.examples) {
          addExample.run(example.ref, example.verdict, example.reason, JSON.stringify(normalizeTags(example.tags ?? pack.tags)), example.source ?? pack.source);
        }
        markApplied.run(id);
        existing.add(id);
        changed = true;
        results.push({ id, name: pack.name, already_applied: false, examples_added: pack.examples.length, principles_added: principlesAdded });
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    if (changed) this.writeMirrors();
    return { packs: results, stats: this.stats() };
  }
  /** Persist the exact evidence supplied for a review, then give the caller an ID to close the loop later. */
  createReview(subject, { tag, limit = 12 } = {}) {
    if (typeof subject !== "string" || subject.trim().length === 0) throw new Error("palate: review subject is required");
    const context = this.reviewContext(subject, { tag, limit });
    const principles = this.listPrinciples({ tag }).map((principle) => principle.principle);
    const examples = context.relevant_examples.map((example) => ({ ref: example.ref, verdict: example.verdict }));
    const res = this.db.prepare("INSERT INTO reviews (subject, tag, principles, examples) VALUES (?, ?, ?, ?)").run(subject, typeof tag === "string" && tag.length > 0 ? tag : null, JSON.stringify(principles), JSON.stringify(examples));
    return { review_id: Number(res.lastInsertRowid), principle_names: principles, ...context };
  }
  /** Return recent tracked reviews with the exact example refs captured as evidence. */
  listReviews({ limit = 8 } = {}) {
    return this.db.prepare(`
      SELECT id, subject, tag, principles, examples, created_at
      FROM reviews
      ORDER BY id DESC
      LIMIT ?
    `).all(Math.max(1, Math.min(50, Number(limit) || 8))).map((row) => ({
      review_id: row.id,
      subject: row.subject,
      tag: row.tag,
      principle_count: safeParse(row.principles).length,
      relevant_examples: safeParse(row.examples),
      created_at: row.created_at
    }));
  }
  /** Record one outcome for a review and reinforce only principles the user says helped. */
  recordFeedback({ reviewId, outcome, acceptedPrinciples = [], rejectedPrinciples = [], note = "" }) {
    const id = Number(reviewId);
    if (!Number.isInteger(id) || id <= 0) throw new Error("palate: review_id must be a positive integer");
    if (!REVIEW_OUTCOMES.has(outcome)) throw new Error(`palate: outcome must be one of ${[...REVIEW_OUTCOMES].join(", ")}`);
    if (typeof note !== "string" || note.length > 4e3) throw new Error("palate: note must be a string up to 4000 characters");
    const accepted = stringList(acceptedPrinciples, "accepted_principles");
    const rejected = stringList(rejectedPrinciples, "rejected_principles");
    const duplicated = accepted.filter((principle) => rejected.includes(principle));
    if (duplicated.length > 0) throw new Error(`palate: a principle cannot be both accepted and rejected: ${duplicated.join(", ")}`);
    const review = this.db.prepare("SELECT principles FROM reviews WHERE id = ?").get(id);
    if (review === void 0) throw new Error(`palate: review #${id} does not exist`);
    const allowed = new Set(safeParse(review.principles));
    const unknown = [...accepted, ...rejected].filter((principle) => !allowed.has(principle));
    if (unknown.length > 0) throw new Error(`palate: feedback principles must come from review #${id}: ${unknown.join(", ")}`);
    const existing = this.db.prepare("SELECT id FROM review_feedback WHERE review_id = ?").get(id);
    if (existing !== void 0) throw new Error(`palate: review #${id} already has feedback`);
    let feedbackId;
    this.db.exec("BEGIN");
    try {
      const res = this.db.prepare("INSERT INTO review_feedback (review_id, outcome, note) VALUES (?, ?, ?)").run(id, outcome, note);
      feedbackId = Number(res.lastInsertRowid);
      const insert = this.db.prepare("INSERT INTO review_feedback_items (feedback_id, principle, verdict) VALUES (?, ?, ?)");
      for (const principle of accepted) insert.run(feedbackId, principle, "accepted");
      for (const principle of rejected) insert.run(feedbackId, principle, "rejected");
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    const reinforced = this.reinforce(accepted);
    if (reinforced === 0) this.writeMirrors();
    return {
      feedback_id: feedbackId,
      review_id: id,
      outcome,
      accepted_principles: accepted,
      rejected_principles: rejected,
      reinforced,
      stats: this.stats()
    };
  }
  /** Per-principle adoption history from feedback, separate from raw evidence count. */
  listEffectiveness({ limit = 50 } = {}) {
    const rows = this.db.prepare(`
        SELECT p.id, p.principle, p.category, p.tags, p.evidence,
        COUNT(i.principle) AS feedback,
        COALESCE(SUM(CASE WHEN i.verdict = 'accepted' THEN 1 ELSE 0 END), 0) AS accepted,
        COALESCE(SUM(CASE WHEN i.verdict = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected
      FROM principles p
      LEFT JOIN review_feedback_items i ON i.principle = p.principle
      GROUP BY p.id
      ORDER BY feedback DESC, accepted DESC, rejected ASC, p.evidence DESC, p.id ASC
      LIMIT ?
    `).all(Math.max(1, Math.min(100, Number(limit) || 50)));
    return rows.map((row) => ({
      ...row,
      tags: safeParse(row.tags),
      acceptance_rate: row.feedback > 0 ? Math.round(row.accepted / row.feedback * 100) : null
    }));
  }
  /**
   * Rank past examples against the concrete design currently under review.
   * `tag` remains a hard user-directed filter; without it, unrelated recent
   * entries are deliberately omitted instead of pretending to be evidence.
   */
  searchExamples(subject, { tag, limit = 12 } = {}) {
    const query = String(subject ?? "").normalize("NFKC").toLocaleLowerCase().trim();
    const queryTokens = tokensOf(query);
    const normalizedTag = tag ? normalizeTag(tag, "tag") : "";
    const examples = this.listExamples({ tag: normalizedTag || void 0, limit: 1e3 });
    const ranked = examples.map((example) => {
      const text = searchableText(example);
      const exampleTokens = tokensOf(text);
      const terms = [...queryTokens].filter((token) => exampleTokens.has(token));
      const tagTerms = new Set((example.tags ?? []).flatMap((value) => [...tokensOf(value)]));
      const score = terms.reduce((sum, token) => sum + (tagTerms.has(token) ? 3 : 1), 0) + (query.length >= 8 && text.includes(query) ? 4 : 0) + (normalizedTag && example.tags.includes(normalizedTag) ? 2 : 0);
      return { ...example, score, matched_terms: terms.slice(0, 12) };
    });
    const relevant = normalizedTag ? ranked : ranked.filter((example) => example.score > 0);
    return relevant.sort((left, right) => right.score - left.score || right.id - left.id).slice(0, Math.max(1, Math.min(50, Number(limit) || 12)));
  }
  /**
   * Assemble the learned taste as context for a review. The plugin supplies this
   * accumulated knowledge; the model renders the critique grounded in it.
   */
  reviewContext(subject, { tag, limit = 12 } = {}) {
    const principles = this.listPrinciples({ tag }).map((p) => `[${p.category}] ${p.principle} (evidence ${p.evidence})`);
    const relevant = this.searchExamples(subject, { tag, limit }).map((e) => ({
      ref: e.ref,
      verdict: e.verdict,
      reason: e.reason,
      tags: e.tags,
      score: e.score,
      matched_terms: e.matched_terms
    }));
    return {
      subject,
      principles,
      relevant_examples: relevant,
      guidance: relevant.length > 0 ? "Critique the subject against each principle. Cite specific relevant examples (good ones to emulate, bad ones to avoid). Be concrete: name what to change and why." : "Critique the subject against each principle. No sufficiently relevant prior examples were found, so do not invent precedent; say what evidence would make the palate more specific."
    };
  }
  writeMirrors() {
    const taste = this.listExamples({ limit: 1e3 });
    const lines = ["# taste.md \u2014 dsh-palate corpus", "", "<!-- Read-only mirror of the taste corpus. -->", ""];
    for (const e of taste) {
      lines.push(`## [${e.verdict}] ${e.ref}`);
      if (e.reason) lines.push(`- why: ${e.reason}`);
      if (e.tags.length) lines.push(`- tags: ${e.tags.join(", ")}`);
      lines.push("");
    }
    writeFileSync(join(this.dir, "taste.md"), lines.join("\n"));
    const ps = this.listPrinciples();
    const plines = ["# principles.md \u2014 dsh-palate codified taste", "", "<!-- Read-only mirror of the principles. -->", ""];
    for (const p of ps) plines.push(`- [${p.category}] ${p.principle} _(evidence ${p.evidence})_${p.tags.length ? ` \xB7 tags: ${p.tags.join(", ")}` : ""}`);
    writeFileSync(join(this.dir, "principles.md"), plines.join("\n"));
    const effectiveness = this.listEffectiveness().filter((item) => item.feedback > 0);
    const flines = ["# feedback.md \u2014 dsh-palate review outcomes", "", "<!-- Read-only mirror of review feedback. -->", ""];
    if (effectiveness.length === 0) flines.push("No review feedback recorded yet.");
    for (const item of effectiveness) {
      flines.push(`- [${item.category}] ${item.principle} \u2014 ${item.accepted} accepted / ${item.rejected} rejected (${item.acceptance_rate}% acceptance)`);
    }
    writeFileSync(join(this.dir, "feedback.md"), flines.join("\n"));
  }
  close() {
    try {
      this.db.close();
    } catch {
    }
  }
};
function safeParse(s) {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function stringList(values, name2) {
  if (!Array.isArray(values)) throw new Error(`palate: ${name2} must be an array`);
  if (values.length > MAX_FEEDBACK_PRINCIPLES) throw new Error(`palate: ${name2} accepts at most ${MAX_FEEDBACK_PRINCIPLES} principles`);
  const output = [];
  for (const value of values) {
    if (typeof value !== "string" || value.trim().length === 0 || value.length > 500) {
      throw new Error(`palate: ${name2} must contain non-empty strings up to 500 characters`);
    }
    const principle = value.trim();
    if (!output.includes(principle)) output.push(principle);
  }
  return output;
}
function normalizeTag(value, name2 = "tag") {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 80) {
    throw new Error(`palate: ${name2} must be a non-empty string up to 80 characters`);
  }
  return value.trim().normalize("NFKC").toLocaleLowerCase();
}
function normalizeTags(values, name2 = "tags") {
  if (!Array.isArray(values)) throw new Error(`palate: ${name2} must be an array`);
  if (values.length > 30) throw new Error(`palate: ${name2} accepts at most 30 tags`);
  const output = [];
  for (const value of values) {
    const tag = normalizeTag(value, name2);
    if (!output.includes(tag)) output.push(tag);
  }
  return output;
}
function stylePackIdList(values) {
  if (!Array.isArray(values) || values.length === 0) throw new Error("palate: pack_ids must be a non-empty array");
  if (values.length > STYLE_PACKS.length) throw new Error(`palate: pack_ids accepts at most ${STYLE_PACKS.length} packs`);
  const output = [];
  for (const value of values) {
    if (typeof value !== "string" || value.trim().length === 0 || value.length > 100) {
      throw new Error("palate: pack_ids must contain non-empty style-pack IDs");
    }
    const id = value.trim().toLocaleLowerCase();
    if (!output.includes(id)) output.push(id);
  }
  return output;
}

// src/index.js
var name = "dsh-palate";
var inject = ["webServer", "tools"];
function storeDir() {
  const dshHome = process.env.DSH_HOME || join2(homedir(), ".dsh");
  return join2(dshHome, "palate");
}
function apply(ctx) {
  const store = new PalateStore(storeDir());
  const webServer = ctx.webServer;
  if (webServer !== void 0) {
    ctx.effect(() => webServer.register({
      kind: "prefix",
      path: "/palate",
      handler: async (req, res) => {
        const remote = req.socket.remoteAddress ?? "";
        if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) {
          sendJson(res, 403, { error: "loopback only" });
          return;
        }
        const suffix = new URL(req.url ?? "/", "http://x").pathname.slice("/palate".length) || "/";
        try {
          if (suffix === "/stats") sendJson(res, 200, store.stats());
          else if (suffix === "/principles") sendJson(res, 200, store.listPrinciples());
          else if (suffix === "/packs") sendJson(res, 200, store.listStylePacks());
          else if (suffix === "/effectiveness") sendJson(res, 200, store.listEffectiveness());
          else if (suffix === "/reviews") sendJson(res, 200, store.listReviews());
          else if (suffix === "/recent") sendJson(res, 200, store.listExamples({ limit: 12 }));
          else sendJson(res, 404, { error: "no such endpoint" });
        } catch (error) {
          sendJson(res, 500, { error: String(error.message ?? error) });
        }
      }
    }), "dsh-palate: web routes");
  }
  const tools = ctx.tools;
  if (tools !== void 0) {
    const define = (toolName, description, parameters, execute, render) => ({
      name: toolName,
      description,
      parameters,
      timeoutMs: 3e4,
      output: {
        schema: { type: "object" },
        render(_args, value) {
          const blocks = render(value);
          return blocks.length > 0 ? blocks : [{ type: "text", text: JSON.stringify(value) }];
        }
      },
      async execute(args, exec) {
        if (exec?.signal?.aborted) throw new Error("aborted");
        return execute(args, exec);
      }
    });
    const obj = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });
    const str = (description) => ({ type: "string", description });
    const defs = [
      define(
        "palate_packs",
        "List opt-in visual-reference packs for the palate. Packs contain transparent, abstracted observations from public reference pages (not brand assets, copy, or reproduction templates). Check this before using palate_seed for a named style.",
        obj({}),
        async () => ({ packs: store.listStylePacks(), stats: store.stats() }),
        (value) => [{
          type: "text",
          text: [
            "Available visual-reference packs (opt-in; abstract principles only):",
            ...value.packs.map((pack) => `  - ${pack.id} \u2014 ${pack.name}: ${pack.examples} examples, ${pack.principles} principles, tags: ${pack.tags.join(", ")} [${pack.applied ? "applied" : "not applied"}]`),
            "",
            "Use palate_seed with one or more exact pack_ids to add a pack. Applying a pack never replaces existing palate records."
          ].join("\n")
        }]
      ),
      define(
        "palate_seed",
        "Explicitly add one or more visual-reference packs to the local palate. Use palate_packs first. Packs add abstract, auditable examples and principles; they never copy brand assets or overwrite existing user taste. Use the returned tags in palate_review to keep reference styles separated.",
        obj({
          pack_ids: { type: "array", items: { type: "string" }, description: "One or more exact IDs returned by palate_packs." }
        }, ["pack_ids"]),
        async (args) => store.applyStylePacks(args.pack_ids),
        (value) => [{
          type: "text",
          text: [
            ...value.packs.map((pack) => pack.already_applied ? `Kept ${pack.name}: it was already applied.` : `Applied ${pack.name}: added ${pack.examples_added} examples and ${pack.principles_added} principles.`),
            `Palate now has ${value.stats.examples} examples, ${value.stats.principles} principles, and ${value.stats.style_packs} applied style pack(s).`
          ].join("\n")
        }]
      ),
      define(
        "palate_review",
        "Create a tracked design review from the agent's accumulated taste. Returns a review_id, codified principles, relevant past examples (good to emulate, bad to avoid), and guidance. A tag filters both examples and tagged style-pack principles while keeping universal principles. YOU then write the actual critique grounded in this learned taste. After the user responds, call palate_feedback with the review_id to record whether the advice helped.",
        obj({
          subject: str("Description of the design/UI to critique (or the path/url of an image you have already described)."),
          tag: str("Optional tag to focus examples and style-specific principles (for example apple or x after applying a visual-reference pack).")
        }, ["subject"]),
        async (args) => store.createReview(args.subject, { tag: args.tag }),
        (value) => [{
          type: "text",
          text: [
            `Review #${value.review_id}: ${value.subject}`,
            "",
            "Codified taste (apply each):",
            ...value.principles.map((p) => `  - ${p}`),
            "",
            `Relevant examples (${value.relevant_examples.length}):`,
            ...value.relevant_examples.map((e) => `  - [${e.verdict}] ${e.ref}${e.reason ? " \u2014 " + e.reason : ""}${e.matched_terms?.length ? ` (matched: ${e.matched_terms.join(", ")})` : ""}`),
            "",
            value.guidance,
            "",
            `After the user evaluates this critique, call palate_feedback with review_id ${value.review_id}. Use exact principle text from palate_principles for accepted_principles/rejected_principles.`
          ].join("\n")
        }]
      ),
      define(
        "palate_feedback",
        "Close the loop on a tracked palate_review after the user evaluates the critique. Record whether it was helpful, which reviewed principles were accepted or rejected, and an optional note. Accepted principles gain evidence; effectiveness stays auditable instead of treating more examples as automatically better.",
        obj({
          review_id: { type: "number", description: "The review_id returned by palate_review." },
          outcome: str("Overall outcome: 'helpful' | 'mixed' | 'unhelpful'."),
          accepted_principles: { type: "array", items: { type: "string" }, description: "Optional exact principle strings from palate_principles that helped." },
          rejected_principles: { type: "array", items: { type: "string" }, description: "Optional exact principle strings from palate_principles that did not help." },
          note: str("Optional user feedback or a concise explanation of the outcome.")
        }, ["review_id", "outcome"]),
        async (args) => store.recordFeedback({
          reviewId: args.review_id,
          outcome: args.outcome,
          acceptedPrinciples: args.accepted_principles ?? [],
          rejectedPrinciples: args.rejected_principles ?? [],
          note: args.note ?? ""
        }),
        (value) => [{ type: "text", text: `Recorded ${value.outcome} feedback for review #${value.review_id}: ${value.accepted_principles.length} accepted, ${value.rejected_principles.length} rejected${value.reinforced ? `; reinforced ${value.reinforced} principle(s)` : ""}. Palate now has ${value.stats.feedback} feedback record(s).` }]
      ),
      define(
        "palate_add",
        "Feed an example into the taste corpus to grow the agent's palate. Record a design you judged good or bad, why, and optional tags. The more you feed, the sharper future reviews get.",
        obj({
          ref: str("What the example is: a URL, file path, or short description of the design."),
          verdict: str("Your judgment: 'good' | 'bad' | 'note'."),
          reason: str("Why \u2014 the lesson this example teaches."),
          tags: { type: "array", items: { type: "string" }, description: "Optional tags (e.g. landing-page, dark-mode, typography)." },
          source: str("Optional provenance."),
          reinforces: { type: "array", items: { type: "string" }, description: "Optional: principles this example supports (bumps their evidence)." }
        }, ["ref", "verdict"]),
        async (args) => {
          const entry = store.addExample(args);
          const reinforced = args.reinforces ? store.reinforce(args.reinforces) : 0;
          return { ...entry, reinforced, stats: store.stats() };
        },
        (value) => [{ type: "text", text: `Added example #${value.id} [${value.verdict}]. Palate now: ${value.stats.examples} examples, ${value.stats.principles} principles${value.reinforced ? `, reinforced ${value.reinforced} principle(s)` : ""}.` }]
      ),
      define(
        "palate_learn",
        "Distill a new design principle from experience and add it to the codified taste. Use when you notice a recurring rule worth remembering.",
        obj({
          principle: str("The principle, stated as a concrete rule."),
          category: str("Optional category (hierarchy, color, spacing, typography, ...)."),
          tags: { type: "array", items: { type: "string" }, description: "Optional tags. Tagged principles are included only for matching palate_review tags; untagged principles stay universal." }
        }, ["principle"]),
        async (args) => store.addPrinciple(args.principle, args.category ?? "", args.tags ?? []),
        (value) => [{ type: "text", text: value.created ? `Learned principle #${value.id}: ${value.principle}` : `Already known (principle #${value.id}).` }]
      ),
      define(
        "palate_list",
        "Browse the accumulated taste corpus (examples fed so far).",
        obj({
          verdict: str("Filter by 'good' | 'bad' | 'note'."),
          tag: str("Filter by tag."),
          limit: { type: "number", description: "Max results (default 50)." }
        }),
        async (args) => ({ examples: store.listExamples(args), stats: store.stats() }),
        (value) => [{ type: "text", text: value.examples.length ? value.examples.map((e) => `[${e.verdict}] ${e.ref}${e.reason ? " \u2014 " + e.reason : ""}`).join("\n") : "No examples yet \u2014 feed some with palate_add." }]
      ),
      define(
        "palate_principles",
        "List the codified design principles (the agent's current taste), ordered by evidence. Pass a tag to see universal principles plus principles scoped to that visual style.",
        obj({ tag: str("Optional style tag, for example apple or x.") }),
        async (args) => ({ principles: store.listPrinciples({ tag: args.tag }), stats: store.stats() }),
        (value) => [{ type: "text", text: value.principles.map((p) => `[${p.category}] ${p.principle} (evidence ${p.evidence})${p.tags.length ? ` [tags: ${p.tags.join(", ")}]` : ""}`).join("\n") }]
      ),
      define(
        "palate_effectiveness",
        "Show which design principles have actually helped across recorded review feedback, separate from their raw evidence count.",
        obj({}),
        async () => ({ principles: store.listEffectiveness(), stats: store.stats() }),
        (value) => [{ type: "text", text: value.principles.some((principle) => principle.feedback > 0) ? value.principles.filter((principle) => principle.feedback > 0).map((principle) => `[${principle.category}] ${principle.principle} \u2014 ${principle.accepted} accepted / ${principle.rejected} rejected (${principle.acceptance_rate}% acceptance; evidence ${principle.evidence})`).join("\n") : "No review feedback yet \u2014 call palate_feedback after a user evaluates a palate_review." }]
      ),
      define(
        "palate_stats",
        "Show how much taste the agent has accumulated and whether reviews have been evaluated: examples studied, principles distilled, applied style packs, reviews, and helpful/mixed/unhelpful feedback.",
        obj({}),
        async () => store.stats(),
        (value) => [{ type: "text", text: `Palate: ${value.examples} examples (${value.good} good, ${value.bad} bad, ${value.notes} notes), ${value.principles} principles, ${value.style_packs} applied style pack(s), ${value.reviews} tracked reviews, ${value.feedback} feedback (${value.helpful} helpful, ${value.mixed} mixed, ${value.unhelpful} unhelpful).` }]
      )
    ];
    for (const def of defs) {
      ctx.effect(() => tools.register(def), "dsh-palate: tool " + def.name);
    }
  }
  ctx.effect(() => () => store.close(), "dsh-palate: store cleanup");
}
function sendJson(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
