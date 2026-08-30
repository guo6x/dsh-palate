/**
 * dsh-palate client — the growth panel.
 * A draggable overlay showing how much taste the agent has accumulated:
 * examples studied, principles distilled, and the most recent judgments.
 */
import React, { useEffect, useState } from 'react'

export const name = 'dsh-palate'
export const inject = ['slots']

const panelStyle = {
  // Keep the growth panel below the pilot cockpit by default. All three
  // floating panels remain draggable, but their initial docks should not
  // steal each other's controls when opened together.
  position: 'fixed', top: 'calc(4.5rem + 390px)', left: '20rem', zIndex: 1200, width: 350,
  maxHeight: 'calc(100vh - 7rem)', borderRadius: 12, overflow: 'auto',
  background: 'rgba(24, 22, 26, 0.96)', border: '1px solid rgba(255,255,255,0.14)',
  boxShadow: '0 12px 40px rgba(0,0,0,0.45)', fontFamily: 'system-ui, sans-serif',
  color: '#ece8ee', userSelect: 'none',
}
const barStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'move', background: 'rgba(255,255,255,0.06)' }
const btnStyle = { background: 'rgba(255,255,255,0.12)', color: '#ece8ee', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }
const statStyle = { display: 'flex', gap: 8, padding: '8px 10px', fontSize: 12 }
const chipStyle = { background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', textAlign: 'center', flex: 1 }
const bigStyle = { fontSize: 18, fontWeight: 700 }
const listStyle = { padding: '0 10px 10px', fontSize: 11, lineHeight: 1.5, opacity: 0.85, maxHeight: 150, overflow: 'auto' }
const statusStyle = { margin: '0 10px 8px', padding: '6px 8px', borderRadius: 7, fontSize: 11, background: 'rgba(127,212,138,0.12)', color: '#a9e5b0' }
const onboardingStyle = { margin: '0 10px 10px', padding: 9, borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, lineHeight: 1.45 }
const promptStyle = { margin: '7px 0', padding: 7, borderRadius: 6, background: 'rgba(0,0,0,0.22)', color: '#f2edf4', userSelect: 'text', whiteSpace: 'normal' }
const FIRST_RUN_PROMPT = '调用 palate_stats，然后用 palate_review 评审“一个有 12 张等权 KPI 卡、一个主要营收指标和一张小趋势图的分析仪表盘”。告诉我用了哪些已存原则和案例，并返回 review_id。'

async function getJson(path) {
  try {
    const res = await fetch(path, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function copyText(value) {
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') return false
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

function PalatePanel() {
  const open = useModuleOpen()
  const [stats, setStats] = useState(null)
  const [principles, setPrinciples] = useState([])
  const [effectiveness, setEffectiveness] = useState([])
  const [recent, setRecent] = useState([])
  const [reviews, setReviews] = useState([])
  const [packs, setPacks] = useState([])
  const [training, setTraining] = useState(null)
  const [pos, setPos] = useState({ x: null, y: null })
  const [loadState, setLoadState] = useState('loading')
  const [promptState, setPromptState] = useState('idle')

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [s, p, e, r, v, k, t] = await Promise.all([
        getJson('/palate/stats'), getJson('/palate/principles'), getJson('/palate/effectiveness'),
        getJson('/palate/recent'), getJson('/palate/reviews'), getJson('/palate/packs'), getJson('/palate/training'),
      ])
      if (!alive) return
      if (s) {
        setStats(s)
        setLoadState('ready')
      } else {
        setLoadState('error')
      }
      if (Array.isArray(p)) setPrinciples(p)
      if (Array.isArray(e)) setEffectiveness(e)
      if (Array.isArray(r)) setRecent(r)
      if (Array.isArray(v)) setReviews(v)
      if (Array.isArray(k)) setPacks(k)
      if (t && typeof t === 'object') setTraining(t)
    }
    load()
    const timer = setInterval(load, 4000)
    return () => { alive = false; clearInterval(timer) }
  }, [])

  if (!open) return null

  const onPointerDown = event => {
    if (event.button !== 0) return
    const start = { x: event.clientX, y: event.clientY, left: pos.x ?? 0, top: pos.y ?? 0 }
    const move = ev => setPos({ x: start.left + ev.clientX - start.x, y: start.top + ev.clientY - start.y })
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const style = pos.x === null ? panelStyle : { ...panelStyle, left: pos.x, top: pos.y }
  const verdictColor = v => (v === 'good' ? '#7fd48a' : v === 'bad' ? '#e08a8a' : '#c9c2d0')

  return React.createElement('div', { style },
    React.createElement('div', { style: barStyle, onPointerDown },
      React.createElement('span', { style: { fontSize: 13, fontWeight: 700 } }, '🍷 dsh-palate'),
      React.createElement('span', { style: { flex: 1, fontSize: 11, opacity: 0.6 } }, '会长大的眼'),
      React.createElement('button', { style: btnStyle, onClick: () => closePanel(), title: '收起' }, '×'),
    ),
    React.createElement('div', { style: { ...statusStyle, ...(loadState === 'error' ? { background: 'rgba(224,138,138,0.13)', color: '#f0b0b0' } : {}) }, role: 'status', 'aria-live': 'polite' },
      loadState === 'loading'
        ? '正在读取本地品味库…'
        : loadState === 'ready'
          ? '● 本地品味库已就绪 · 自动同步'
          : '⚠️ 读不到本地面板数据 · 请重启 dsh web 后再试'),
    loadState === 'ready' && stats && (stats.reviews ?? 0) === 0
      ? React.createElement('div', { style: onboardingStyle },
          React.createElement('div', { style: { fontWeight: 700 } }, '首个成功体验'),
          React.createElement('div', { style: { opacity: 0.75 } }, '在新对话运行一次评审，确认插件、存储和面板都已接通。'),
          React.createElement('div', { style: promptStyle }, FIRST_RUN_PROMPT),
          React.createElement('button', {
            style: btnStyle,
            onPointerDown: event => event.stopPropagation(),
            onClick: async () => setPromptState(await copyText(FIRST_RUN_PROMPT) ? 'copied' : 'unavailable'),
            title: '复制首个演示提示词',
          }, promptState === 'copied' ? '已复制提示词' : promptState === 'unavailable' ? '请从文档复制' : '复制首个提示词'),
        )
      : null,
    stats
      ? React.createElement('div', { style: statStyle },
          React.createElement('div', { style: chipStyle },
            React.createElement('div', { style: bigStyle }, stats.examples),
          React.createElement('div', { style: { opacity: 0.6 } }, `例子 ${stats.good}好/${stats.bad}坏`)),
          React.createElement('div', { style: chipStyle },
            React.createElement('div', { style: bigStyle }, stats.principles),
            React.createElement('div', { style: { opacity: 0.6 } }, `原则 · ${stats.feedback ?? 0}反馈 · ${stats.pending_candidates ?? 0}待确认`)),
          React.createElement('div', { style: chipStyle },
            React.createElement('div', { style: bigStyle }, stats.reviews ?? 0),
            React.createElement('div', { style: { opacity: 0.6 } }, `评审 ${stats.helpful ?? 0}有效`)))
      : null,
    packs.length
      ? React.createElement('div', { style: listStyle },
          React.createElement('div', { style: { fontWeight: 700, marginBottom: 2 } }, '参考风格包（用 palate_seed 启用）'),
          packs.map(pack =>
            React.createElement('div', { key: pack.id }, `· ${pack.applied ? '✓' : '○'} ${pack.name} — ${pack.applied ? '已启用' : '可启用'} (${pack.tags.join(', ')})`)))
      : null,
    training?.stats?.sessions
      ? React.createElement('div', { style: listStyle },
          React.createElement('div', { style: { fontWeight: 700, marginBottom: 2 } }, '视觉训练台（候选须经确认）'),
          React.createElement('div', { style: { opacity: 0.7, marginBottom: 3 } }, `${training.stats.pending ?? 0} 待确认 · ${training.stats.accepted ?? 0} 已接纳 · ${training.stats.rejected ?? 0} 已拒绝`),
          ...(training.sessions ?? []).slice(0, 2).map(session =>
            React.createElement('div', { key: session.session_id, style: { marginBottom: 5 } },
              React.createElement('div', { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, `#${session.session_id} [${session.verdict}] ${session.subject}`),
              React.createElement('div', { style: { opacity: 0.65 } }, `${session.candidate_counts?.pending ?? 0} 待确认 · ${(session.observations ?? []).slice(0, 2).map(observation => `[${observation.area}] ${observation.finding}`).join(' · ')}`),
              ...(session.comparisons ?? []).slice(0, 2).map(comparison =>
                React.createElement('div', { key: comparison.pack_id, style: { opacity: 0.65 } }, `↳ ${comparison.pack_name}: ${comparison.status}${comparison.scope === 'reference_only' ? '（仅参考，未启用）' : ''}`)),
            )))
      : null,
    principles.length
      ? React.createElement('div', { style: listStyle },
          React.createElement('div', { style: { fontWeight: 700, marginBottom: 2 } }, '当前品味（按证据排序）'),
          principles.slice(0, 6).map(p =>
            React.createElement('div', { key: p.id }, `· [${p.category}] ${p.principle} (${p.evidence})`)))
      : null,
    effectiveness.some(item => item.feedback > 0)
      ? React.createElement('div', { style: listStyle },
          React.createElement('div', { style: { fontWeight: 700, marginBottom: 2 } }, '反馈效果（采纳 / 拒绝）'),
          effectiveness.filter(item => item.feedback > 0).slice(0, 4).map(item =>
            React.createElement('div', { key: item.id }, `· [${item.category}] ${item.principle} — ${item.accepted}/${item.rejected}`)))
      : null,
    reviews.length
      ? React.createElement('div', { style: listStyle },
          React.createElement('div', { style: { fontWeight: 700, marginBottom: 2 } }, '最近评审（引用证据）'),
          reviews.slice(0, 4).map(review =>
            React.createElement('div', { key: review.review_id },
              React.createElement('div', { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, `#${review.review_id} ${review.subject}`),
              React.createElement('div', { style: { opacity: 0.65 } }, review.relevant_examples?.length
                ? `证据：${review.relevant_examples.map(example => `[${example.verdict}] ${example.ref}`).join(' · ')}`
                : '证据：暂无匹配案例'))))
      : null,
    recent.length
      ? React.createElement('div', { style: listStyle },
          React.createElement('div', { style: { fontWeight: 700, marginBottom: 2 } }, '最近的判断'),
          recent.slice(0, 5).map(e =>
            React.createElement('div', { key: e.id },
              React.createElement('span', { style: { color: verdictColor(e.verdict) } }, `[${e.verdict}] `), e.ref)))
      : null,
  )
}

function PalateButton() {
  const open = useModuleOpen()
  return React.createElement('button', {
    title: '品味面板',
    'aria-label': '品味面板',
    style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 },
    onClick: () => setModuleOpen(!open),
  }, open ? '🍷' : '👁️')
}

// module-level open state shared between the sidebar button and the panel
let _open = false
const _subs = new Set()
function moduleOpen() { return _open }
function setModuleOpen(v) { _open = v; for (const s of _subs) s() }
function closePanel() { setModuleOpen(false) }
function useModuleOpen() {
  const [open, setOpen] = useState(moduleOpen())
  useEffect(() => {
    const update = () => setOpen(moduleOpen())
    _subs.add(update)
    return () => _subs.delete(update)
  }, [])
  return open
}

export function apply(ctx) {
  const slots = ctx.slots
  if (slots === undefined) return
  slots.inject('sidebar.footer.action', () => slots.register(
    { name: 'sidebar.footer.action', id: 'dsh-palate', order: 910, label: '品味面板' },
    () => React.createElement(PalateButton),
  ))
  slots.inject('shell.overlay', () => slots.register(
    { name: 'shell.overlay', id: 'dsh-palate-panel', order: 210, label: '品味面板' },
    () => React.createElement(PalatePanel),
  ))
}
