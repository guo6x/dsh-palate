/**
 * dsh-palate client — the growth panel.
 * A draggable overlay showing how much taste the agent has accumulated:
 * examples studied, principles distilled, and the most recent judgments.
 */
import React, { useEffect, useState } from 'react'

export const name = 'dsh-palate'
export const inject = ['slots']

const panelStyle = {
  position: 'fixed', top: '4.5rem', left: '20rem', zIndex: 1200, width: 330,
  borderRadius: 12, overflow: 'hidden',
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

async function getJson(path) {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

function PalatePanel() {
  const open = useModuleOpen()
  const [stats, setStats] = useState(null)
  const [principles, setPrinciples] = useState([])
  const [effectiveness, setEffectiveness] = useState([])
  const [recent, setRecent] = useState([])
  const [reviews, setReviews] = useState([])
  const [pos, setPos] = useState({ x: null, y: null })

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [s, p, e, r, v] = await Promise.all([
        getJson('/palate/stats'), getJson('/palate/principles'), getJson('/palate/effectiveness'),
        getJson('/palate/recent'), getJson('/palate/reviews'),
      ])
      if (!alive) return
      if (s) setStats(s)
      if (Array.isArray(p)) setPrinciples(p)
      if (Array.isArray(e)) setEffectiveness(e)
      if (Array.isArray(r)) setRecent(r)
      if (Array.isArray(v)) setReviews(v)
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
    stats
      ? React.createElement('div', { style: statStyle },
          React.createElement('div', { style: chipStyle },
            React.createElement('div', { style: bigStyle }, stats.examples),
          React.createElement('div', { style: { opacity: 0.6 } }, `例子 ${stats.good}好/${stats.bad}坏`)),
          React.createElement('div', { style: chipStyle },
            React.createElement('div', { style: bigStyle }, stats.principles),
            React.createElement('div', { style: { opacity: 0.6 } }, `原则 · ${stats.feedback ?? 0}反馈`)),
          React.createElement('div', { style: chipStyle },
            React.createElement('div', { style: bigStyle }, stats.reviews ?? 0),
            React.createElement('div', { style: { opacity: 0.6 } }, `评审 ${stats.helpful ?? 0}有效`)))
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
