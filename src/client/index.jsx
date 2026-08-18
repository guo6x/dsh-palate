/**
 * dsh-palate client — the growth panel.
 * A draggable overlay showing how much taste the agent has accumulated:
 * examples studied, principles distilled, and the most recent judgments.
 */
import React, { useEffect, useState } from 'react'

export const name = 'dsh-palate'
export const inject = []

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
  const [open, setOpen] = useState(moduleOpen())
  const [stats, setStats] = useState(null)
  const [principles, setPrinciples] = useState([])
  const [recent, setRecent] = useState([])
  const [pos, setPos] = useState({ x: null, y: null })
  const [drag, setDrag] = useState(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [s, p, r] = await Promise.all([getJson('/palate/stats'), getJson('/palate/principles'), getJson('/palate/recent')])
      if (!alive) return
      if (s) setStats(s)
      if (Array.isArray(p)) setPrinciples(p)
      if (Array.isArray(r)) setRecent(r)
    }
    load()
    const timer = setInterval(load, 4000)
    return () => { alive = false; clearInterval(timer) }
  }, [])

  if (!open) return null

  const onPointerDown = e => {
    setDrag({ sx: e.clientX, sy: e.clientY, bx: pos.x ?? 0, by: pos.y ?? 0 })
    const move = ev => setPos(d => ({ x: drag.bx + ev.clientX - drag.sx, y: drag.by + ev.clientY - drag.sy }))
    const up = () => { setDrag(null); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const style = pos.x === null ? panelStyle : { ...panelStyle, left: pos.x, top: pos.y }
  const verdictColor = v => (v === 'good' ? '#7fd48a' : v === 'bad' ? '#e08a8a' : '#c9c2d0')

  return React.createElement('div', { style, onPointerDown },
    React.createElement('div', { style: barStyle },
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
            React.createElement('div', { style: { opacity: 0.6 } }, '原则')))
      : null,
    principles.length
      ? React.createElement('div', { style: listStyle },
          React.createElement('div', { style: { fontWeight: 700, marginBottom: 2 } }, '当前品味（按证据排序）'),
          principles.slice(0, 6).map(p =>
            React.createElement('div', { key: p.id }, `· [${p.category}] ${p.principle} (${p.evidence})`)))
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
  const [open, setOpen] = useState(moduleOpen())
  return React.createElement('button', {
    title: '品味面板',
    style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 },
    onClick: () => { const next = !open; setModuleOpen(next); setOpen(next) },
  }, open ? '🍷' : '👁️')
}

// module-level open state shared between the sidebar button and the panel
let _open = false
const _subs = new Set()
function moduleOpen() { return _open }
function setModuleOpen(v) { _open = v; for (const s of _subs) s() }
function closePanel() { setModuleOpen(false) }

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
