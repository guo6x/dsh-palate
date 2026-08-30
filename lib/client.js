window.__ModuleLoader__.load({ id: 'dsh-palate', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"), 1);
var name = "dsh-palate";
var inject = ["slots"];
var panelStyle = {
  // Keep the growth panel below the pilot cockpit by default. All three
  // floating panels remain draggable, but their initial docks should not
  // steal each other's controls when opened together.
  position: "fixed",
  top: "calc(4.5rem + 390px)",
  left: "20rem",
  zIndex: 1200,
  width: 350,
  maxHeight: "calc(100vh - 7rem)",
  borderRadius: 12,
  overflow: "auto",
  background: "rgba(24, 22, 26, 0.96)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
  fontFamily: "system-ui, sans-serif",
  color: "#ece8ee",
  userSelect: "none"
};
var barStyle = { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "move", background: "rgba(255,255,255,0.06)" };
var btnStyle = { background: "rgba(255,255,255,0.12)", color: "#ece8ee", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 };
var statStyle = { display: "flex", gap: 8, padding: "8px 10px", fontSize: 12 };
var chipStyle = { background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 10px", textAlign: "center", flex: 1 };
var bigStyle = { fontSize: 18, fontWeight: 700 };
var listStyle = { padding: "0 10px 10px", fontSize: 11, lineHeight: 1.5, opacity: 0.85, maxHeight: 150, overflow: "auto" };
var statusStyle = { margin: "0 10px 8px", padding: "6px 8px", borderRadius: 7, fontSize: 11, background: "rgba(127,212,138,0.12)", color: "#a9e5b0" };
var onboardingStyle = { margin: "0 10px 10px", padding: 9, borderRadius: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, lineHeight: 1.45 };
var promptStyle = { margin: "7px 0", padding: 7, borderRadius: 6, background: "rgba(0,0,0,0.22)", color: "#f2edf4", userSelect: "text", whiteSpace: "normal" };
var FIRST_RUN_PROMPT = "\u8C03\u7528 palate_stats\uFF0C\u7136\u540E\u7528 palate_review \u8BC4\u5BA1\u201C\u4E00\u4E2A\u6709 12 \u5F20\u7B49\u6743 KPI \u5361\u3001\u4E00\u4E2A\u4E3B\u8981\u8425\u6536\u6307\u6807\u548C\u4E00\u5F20\u5C0F\u8D8B\u52BF\u56FE\u7684\u5206\u6790\u4EEA\u8868\u76D8\u201D\u3002\u544A\u8BC9\u6211\u7528\u4E86\u54EA\u4E9B\u5DF2\u5B58\u539F\u5219\u548C\u6848\u4F8B\uFF0C\u5E76\u8FD4\u56DE review_id\u3002";
async function getJson(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
async function copyText(value) {
  if (typeof navigator === "undefined" || typeof navigator.clipboard?.writeText !== "function") return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
function PalatePanel() {
  const open = useModuleOpen();
  const [stats, setStats] = (0, import_react.useState)(null);
  const [principles, setPrinciples] = (0, import_react.useState)([]);
  const [effectiveness, setEffectiveness] = (0, import_react.useState)([]);
  const [recent, setRecent] = (0, import_react.useState)([]);
  const [reviews, setReviews] = (0, import_react.useState)([]);
  const [packs, setPacks] = (0, import_react.useState)([]);
  const [training, setTraining] = (0, import_react.useState)(null);
  const [pos, setPos] = (0, import_react.useState)({ x: null, y: null });
  const [loadState, setLoadState] = (0, import_react.useState)("loading");
  const [promptState, setPromptState] = (0, import_react.useState)("idle");
  (0, import_react.useEffect)(() => {
    let alive = true;
    const load = async () => {
      const [s, p, e, r, v, k, t] = await Promise.all([
        getJson("/palate/stats"),
        getJson("/palate/principles"),
        getJson("/palate/effectiveness"),
        getJson("/palate/recent"),
        getJson("/palate/reviews"),
        getJson("/palate/packs"),
        getJson("/palate/training")
      ]);
      if (!alive) return;
      if (s) {
        setStats(s);
        setLoadState("ready");
      } else {
        setLoadState("error");
      }
      if (Array.isArray(p)) setPrinciples(p);
      if (Array.isArray(e)) setEffectiveness(e);
      if (Array.isArray(r)) setRecent(r);
      if (Array.isArray(v)) setReviews(v);
      if (Array.isArray(k)) setPacks(k);
      if (t && typeof t === "object") setTraining(t);
    };
    load();
    const timer = setInterval(load, 4e3);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  if (!open) return null;
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    const start = { x: event.clientX, y: event.clientY, left: pos.x ?? 0, top: pos.y ?? 0 };
    const move = (ev) => setPos({ x: start.left + ev.clientX - start.x, y: start.top + ev.clientY - start.y });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const style = pos.x === null ? panelStyle : { ...panelStyle, left: pos.x, top: pos.y };
  const verdictColor = (v) => v === "good" ? "#7fd48a" : v === "bad" ? "#e08a8a" : "#c9c2d0";
  return import_react.default.createElement(
    "div",
    { style },
    import_react.default.createElement(
      "div",
      { style: barStyle, onPointerDown },
      import_react.default.createElement("span", { style: { fontSize: 13, fontWeight: 700 } }, "\u{1F377} dsh-palate"),
      import_react.default.createElement("span", { style: { flex: 1, fontSize: 11, opacity: 0.6 } }, "\u4F1A\u957F\u5927\u7684\u773C"),
      import_react.default.createElement("button", { style: btnStyle, onClick: () => closePanel(), title: "\u6536\u8D77" }, "\xD7")
    ),
    import_react.default.createElement(
      "div",
      { style: { ...statusStyle, ...loadState === "error" ? { background: "rgba(224,138,138,0.13)", color: "#f0b0b0" } : {} }, role: "status", "aria-live": "polite" },
      loadState === "loading" ? "\u6B63\u5728\u8BFB\u53D6\u672C\u5730\u54C1\u5473\u5E93\u2026" : loadState === "ready" ? "\u25CF \u672C\u5730\u54C1\u5473\u5E93\u5DF2\u5C31\u7EEA \xB7 \u81EA\u52A8\u540C\u6B65" : "\u26A0\uFE0F \u8BFB\u4E0D\u5230\u672C\u5730\u9762\u677F\u6570\u636E \xB7 \u8BF7\u91CD\u542F dsh web \u540E\u518D\u8BD5"
    ),
    loadState === "ready" && stats && (stats.reviews ?? 0) === 0 ? import_react.default.createElement(
      "div",
      { style: onboardingStyle },
      import_react.default.createElement("div", { style: { fontWeight: 700 } }, "\u9996\u4E2A\u6210\u529F\u4F53\u9A8C"),
      import_react.default.createElement("div", { style: { opacity: 0.75 } }, "\u5728\u65B0\u5BF9\u8BDD\u8FD0\u884C\u4E00\u6B21\u8BC4\u5BA1\uFF0C\u786E\u8BA4\u63D2\u4EF6\u3001\u5B58\u50A8\u548C\u9762\u677F\u90FD\u5DF2\u63A5\u901A\u3002"),
      import_react.default.createElement("div", { style: promptStyle }, FIRST_RUN_PROMPT),
      import_react.default.createElement("button", {
        style: btnStyle,
        onPointerDown: (event) => event.stopPropagation(),
        onClick: async () => setPromptState(await copyText(FIRST_RUN_PROMPT) ? "copied" : "unavailable"),
        title: "\u590D\u5236\u9996\u4E2A\u6F14\u793A\u63D0\u793A\u8BCD"
      }, promptState === "copied" ? "\u5DF2\u590D\u5236\u63D0\u793A\u8BCD" : promptState === "unavailable" ? "\u8BF7\u4ECE\u6587\u6863\u590D\u5236" : "\u590D\u5236\u9996\u4E2A\u63D0\u793A\u8BCD")
    ) : null,
    stats ? import_react.default.createElement(
      "div",
      { style: statStyle },
      import_react.default.createElement(
        "div",
        { style: chipStyle },
        import_react.default.createElement("div", { style: bigStyle }, stats.examples),
        import_react.default.createElement("div", { style: { opacity: 0.6 } }, `\u4F8B\u5B50 ${stats.good}\u597D/${stats.bad}\u574F`)
      ),
      import_react.default.createElement(
        "div",
        { style: chipStyle },
        import_react.default.createElement("div", { style: bigStyle }, stats.principles),
        import_react.default.createElement("div", { style: { opacity: 0.6 } }, `\u539F\u5219 \xB7 ${stats.feedback ?? 0}\u53CD\u9988 \xB7 ${stats.pending_candidates ?? 0}\u5F85\u786E\u8BA4`)
      ),
      import_react.default.createElement(
        "div",
        { style: chipStyle },
        import_react.default.createElement("div", { style: bigStyle }, stats.reviews ?? 0),
        import_react.default.createElement("div", { style: { opacity: 0.6 } }, `\u8BC4\u5BA1 ${stats.helpful ?? 0}\u6709\u6548`)
      )
    ) : null,
    packs.length ? import_react.default.createElement(
      "div",
      { style: listStyle },
      import_react.default.createElement("div", { style: { fontWeight: 700, marginBottom: 2 } }, "\u53C2\u8003\u98CE\u683C\u5305\uFF08\u7528 palate_seed \u542F\u7528\uFF09"),
      packs.map((pack) => import_react.default.createElement("div", { key: pack.id }, `\xB7 ${pack.applied ? "\u2713" : "\u25CB"} ${pack.name} \u2014 ${pack.applied ? "\u5DF2\u542F\u7528" : "\u53EF\u542F\u7528"} (${pack.tags.join(", ")})`))
    ) : null,
    training?.stats?.sessions ? import_react.default.createElement(
      "div",
      { style: listStyle },
      import_react.default.createElement("div", { style: { fontWeight: 700, marginBottom: 2 } }, "\u89C6\u89C9\u8BAD\u7EC3\u53F0\uFF08\u5019\u9009\u987B\u7ECF\u786E\u8BA4\uFF09"),
      import_react.default.createElement("div", { style: { opacity: 0.7, marginBottom: 3 } }, `${training.stats.pending ?? 0} \u5F85\u786E\u8BA4 \xB7 ${training.stats.accepted ?? 0} \u5DF2\u63A5\u7EB3 \xB7 ${training.stats.rejected ?? 0} \u5DF2\u62D2\u7EDD`),
      ...(training.sessions ?? []).slice(0, 2).map((session) => import_react.default.createElement(
        "div",
        { key: session.session_id, style: { marginBottom: 5 } },
        import_react.default.createElement("div", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, `#${session.session_id} [${session.verdict}] ${session.subject}`),
        import_react.default.createElement("div", { style: { opacity: 0.65 } }, `${session.candidate_counts?.pending ?? 0} \u5F85\u786E\u8BA4 \xB7 ${(session.observations ?? []).slice(0, 2).map((observation) => `[${observation.area}] ${observation.finding}`).join(" \xB7 ")}`),
        ...(session.comparisons ?? []).slice(0, 2).map((comparison) => import_react.default.createElement("div", { key: comparison.pack_id, style: { opacity: 0.65 } }, `\u21B3 ${comparison.pack_name}: ${comparison.status}${comparison.scope === "reference_only" ? "\uFF08\u4EC5\u53C2\u8003\uFF0C\u672A\u542F\u7528\uFF09" : ""}`))
      ))
    ) : null,
    principles.length ? import_react.default.createElement(
      "div",
      { style: listStyle },
      import_react.default.createElement("div", { style: { fontWeight: 700, marginBottom: 2 } }, "\u5F53\u524D\u54C1\u5473\uFF08\u6309\u8BC1\u636E\u6392\u5E8F\uFF09"),
      principles.slice(0, 6).map((p) => import_react.default.createElement("div", { key: p.id }, `\xB7 [${p.category}] ${p.principle} (${p.evidence})`))
    ) : null,
    effectiveness.some((item) => item.feedback > 0) ? import_react.default.createElement(
      "div",
      { style: listStyle },
      import_react.default.createElement("div", { style: { fontWeight: 700, marginBottom: 2 } }, "\u53CD\u9988\u6548\u679C\uFF08\u91C7\u7EB3 / \u62D2\u7EDD\uFF09"),
      effectiveness.filter((item) => item.feedback > 0).slice(0, 4).map((item) => import_react.default.createElement("div", { key: item.id }, `\xB7 [${item.category}] ${item.principle} \u2014 ${item.accepted}/${item.rejected}`))
    ) : null,
    reviews.length ? import_react.default.createElement(
      "div",
      { style: listStyle },
      import_react.default.createElement("div", { style: { fontWeight: 700, marginBottom: 2 } }, "\u6700\u8FD1\u8BC4\u5BA1\uFF08\u5F15\u7528\u8BC1\u636E\uFF09"),
      reviews.slice(0, 4).map((review) => import_react.default.createElement(
        "div",
        { key: review.review_id },
        import_react.default.createElement("div", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, `#${review.review_id} ${review.subject}`),
        import_react.default.createElement("div", { style: { opacity: 0.65 } }, review.relevant_examples?.length ? `\u8BC1\u636E\uFF1A${review.relevant_examples.map((example) => `[${example.verdict}] ${example.ref}`).join(" \xB7 ")}` : "\u8BC1\u636E\uFF1A\u6682\u65E0\u5339\u914D\u6848\u4F8B")
      ))
    ) : null,
    recent.length ? import_react.default.createElement(
      "div",
      { style: listStyle },
      import_react.default.createElement("div", { style: { fontWeight: 700, marginBottom: 2 } }, "\u6700\u8FD1\u7684\u5224\u65AD"),
      recent.slice(0, 5).map((e) => import_react.default.createElement(
        "div",
        { key: e.id },
        import_react.default.createElement("span", { style: { color: verdictColor(e.verdict) } }, `[${e.verdict}] `),
        e.ref
      ))
    ) : null
  );
}
function PalateButton() {
  const open = useModuleOpen();
  return import_react.default.createElement("button", {
    title: "\u54C1\u5473\u9762\u677F",
    "aria-label": "\u54C1\u5473\u9762\u677F",
    style: { background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: 4 },
    onClick: () => setModuleOpen(!open)
  }, open ? "\u{1F377}" : "\u{1F441}\uFE0F");
}
var _open = false;
var _subs = /* @__PURE__ */ new Set();
function moduleOpen() {
  return _open;
}
function setModuleOpen(v) {
  _open = v;
  for (const s of _subs) s();
}
function closePanel() {
  setModuleOpen(false);
}
function useModuleOpen() {
  const [open, setOpen] = (0, import_react.useState)(moduleOpen());
  (0, import_react.useEffect)(() => {
    const update = () => setOpen(moduleOpen());
    _subs.add(update);
    return () => _subs.delete(update);
  }, []);
  return open;
}
function apply(ctx) {
  const slots = ctx.slots;
  if (slots === void 0) return;
  slots.inject("sidebar.footer.action", () => slots.register(
    { name: "sidebar.footer.action", id: "dsh-palate", order: 910, label: "\u54C1\u5473\u9762\u677F" },
    () => import_react.default.createElement(PalateButton)
  ));
  slots.inject("shell.overlay", () => slots.register(
    { name: "shell.overlay", id: "dsh-palate-panel", order: 210, label: "\u54C1\u5473\u9762\u677F" },
    () => import_react.default.createElement(PalatePanel)
  ));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
