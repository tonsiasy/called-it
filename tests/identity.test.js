import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { STORAGE_KEY, resolveDeviceId } from '../src/lib/identity.js'

/** A localStorage stand-in; `failing` models a browser in private mode. */
function fakeStorage({ seed = {}, failing = false } = {}) {
  const data = { ...seed }
  return {
    getItem(key) {
      if (failing) throw new Error('storage unavailable')
      return key in data ? data[key] : null
    },
    setItem(key, value) {
      if (failing) throw new Error('storage unavailable')
      data[key] = value
    },
    read: () => ({ ...data }),
  }
}

let counter = 0
const newId = () => `device-${(counter += 1)}`

describe('resolveDeviceId', () => {
  test('issues an identifier on first run and keeps it', () => {
    const storage = fakeStorage()
    const first = resolveDeviceId({ storage, newId })

    assert.ok(first)
    assert.equal(storage.read()[STORAGE_KEY], first)
  })

  test('returns the same identifier on the next run', () => {
    const storage = fakeStorage()
    const first = resolveDeviceId({ storage, newId })
    const second = resolveDeviceId({ storage, newId })

    assert.equal(second, first)
  })

  test('prefers an identifier supplied by the host over its own', () => {
    // inside Nimiq Pay the per-device identifier comes from the host; the
    // locally issued key is only the standalone-browser fallback
    const storage = fakeStorage()
    const id = resolveDeviceId({ storage, newId, hostDeviceId: 'nimiq-pay-abc' })

    assert.equal(id, 'nimiq-pay-abc')
  })

  test('does not overwrite a stored identifier with a host one', () => {
    const storage = fakeStorage({ seed: { [STORAGE_KEY]: 'local-1' } })
    resolveDeviceId({ storage, newId, hostDeviceId: 'nimiq-pay-abc' })

    assert.equal(storage.read()[STORAGE_KEY], 'local-1')
  })

  test('still returns an identifier when storage is unavailable', () => {
    // private mode throws on access; a record that cannot persist is better
    // than a board that will not load
    const id = resolveDeviceId({ storage: fakeStorage({ failing: true }), newId })
    assert.ok(id)
  })
})
