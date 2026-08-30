/**
 * dsh-palate client contract test.
 *
 * Evaluates the generated ModuleLoader bundle with a minimal host surface.
 * It catches missing client service injections before the Web UI attempts to
 * read ctx.slots, then verifies both client contributions are registered.
 * Run after build: node tests/client-contract.mjs
 */
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/client/index.jsx', import.meta.url), 'utf8')
assert.match(source, /top: 'calc\(4\.5rem \+ 390px\)'/)
assert.match(source, /maxHeight: 'calc\(100vh - 7rem\)'/)
assert.match(source, /getJson\('\/palate\/packs'\)/)
assert.match(source, /getJson\('\/palate\/training'\)/)
assert.match(source, /本地品味库已就绪/)
assert.match(source, /首个成功体验/)
assert.match(source, /navigator\.clipboard/)
assert.match(source, /'aria-live': 'polite'/)

let entry
globalThis.window = {
  __ModuleLoader__: {
    load(value) { entry = value },
  },
}

await import(`${pathToFileURL('lib/client.js').href}?client-contract=${Date.now()}`)
assert.equal(entry?.id, 'dsh-palate')

const stateUpdates = []
const cleanups = []
globalThis.fetch = async () => ({ ok: false })
const react = {
  createElement(type, props, ...children) {
    return typeof type === 'function'
      ? type(props ?? {})
      : { type, props: { ...(props ?? {}), children } }
  },
  useEffect(effect) {
    const cleanup = effect()
    if (typeof cleanup === 'function') cleanups.push(cleanup)
  },
  useState(initial) { return [initial, value => stateUpdates.push(value)] },
}
const client = entry.factory(name => {
  if (name === 'react') return react
  throw new Error(`unexpected client dependency: ${name}`)
})

assert.deepEqual(client.inject, ['slots'])

const registrations = []
const renders = new Map()
client.apply({
  slots: {
    inject(slot, mount) {
      registrations.push({ kind: 'inject', slot })
      mount()
    },
    register(definition, render) {
      registrations.push({ kind: 'register', slot: definition.name, id: definition.id })
      renders.set(definition.id, render)
      return () => {}
    },
  },
})

assert.deepEqual(registrations, [
  { kind: 'inject', slot: 'sidebar.footer.action' },
  { kind: 'register', slot: 'sidebar.footer.action', id: 'dsh-palate' },
  { kind: 'inject', slot: 'shell.overlay' },
  { kind: 'register', slot: 'shell.overlay', id: 'dsh-palate-panel' },
])

const button = renders.get('dsh-palate')()
const panel = renders.get('dsh-palate-panel')()
assert.equal(button.type, 'button')
assert.equal(panel, null, 'overlay starts hidden')
button.props.onClick()
assert.equal(stateUpdates.filter(value => value === true).length, 2, 'button and panel both subscribe to shared open state')
for (const cleanup of cleanups) cleanup()

console.log('PASS  client injects slots, registers sidebar + overlay, and keeps both in sync')
