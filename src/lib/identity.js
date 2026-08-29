/**
 * Who the record belongs to.
 *
 * §9.3 settles identity as a per-device key: one paid entry per Nimiq Pay
 * device identifier per cycle, with free play uncapped because an identity that
 * cannot win costs nothing to create and gains nothing. Cycle 2 ships free-only,
 * so nothing here gates a prize — it only decides whose record is whose.
 *
 * `hostDeviceId` is the seam. Running inside Nimiq Pay, the host supplies the
 * identifier and it is used as-is. Standalone in a browser there is no host, so
 * a key is issued locally and kept. The fallback is deliberately not dressed up
 * as the real thing: it identifies a browser profile, not a device, and it is
 * the standing — not the record — that would need the host's identifier to mean
 * anything across players.
 */

export const STORAGE_KEY = 'called-it:device'

const randomId = () =>
  globalThis.crypto?.randomUUID?.() ?? `local-${Math.random().toString(36).slice(2, 12)}`

/**
 * The identifier this device's record is filed under.
 *
 * A stored key wins over a host-supplied one so an existing record does not
 * change hands when the app is first opened inside Nimiq Pay.
 */
export function resolveDeviceId({ storage, newId = randomId, hostDeviceId = null } = {}) {
  try {
    const stored = storage?.getItem(STORAGE_KEY)
    if (stored) return stored

    const issued = hostDeviceId ?? newId()
    storage?.setItem(STORAGE_KEY, issued)
    return issued
  } catch {
    // Private mode throws on access. A record that cannot persist is worse than
    // one that can, but far better than a board that refuses to load.
    return hostDeviceId ?? newId()
  }
}
