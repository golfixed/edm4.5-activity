'use client'

import { useEffect, useRef } from 'react'
import { ref, onValue, update as fbUpdate } from 'firebase/database'
import { db, isFirebaseConfigured } from './firebase'
import { useStore, defaultTeams, defaultGames, defaultRankBonuses } from './store'
import { Game, GameState } from './types'
import { loadCachedState, saveCachedState } from './stateCache'

// Light data (teams, scores, game names/settings) lives under ROOT and loads on every page.
// Heavy per-game data (images, sounds, videos) lives under ASSETS_ROOT/<gameId> and only loads
// when a page asks for that game via useGameAssets().
const ROOT = 'edm-activity'
const ASSETS_ROOT = 'edm-activity-assets'

export const HEAVY_FIELDS = ['imageSets', 'backgroundImage', 'soundStart', 'soundTick', 'soundTimeUp', 'auctionItems'] as const
type HeavyField = typeof HEAVY_FIELDS[number]
type GameAssets = Partial<Pick<Game, HeavyField>>
const isHeavy = (f: string): f is HeavyField => (HEAVY_FIELDS as readonly string[]).includes(f)

// Strip any data-URI string larger than this to avoid Firebase's 10 MB write limit
const MAX_BINARY_CHARS = 500_000

// ── Helpers ─────────────────────────────────────────────────────────────────

function toArray(val: any): any[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'object') {
    const keys = Object.keys(val)
    const allNumeric = keys.every((k) => /^\d+$/.test(k))
    if (allNumeric) {
      const arr: any[] = []
      keys.forEach((k) => { arr[Number(k)] = val[k] })
      return arr.filter((x) => x !== undefined)
    }
  }
  return []
}

// Recursively strip large base64/data-URI strings so writes stay under Firebase limits
function stripLargeBinary(val: any, depth = 0): any {
  if (depth > 12) return val
  if (typeof val === 'string') {
    return val.startsWith('data:') && val.length > MAX_BINARY_CHARS ? null : val
  }
  if (Array.isArray(val)) {
    return val.map((v) => stripLargeBinary(v, depth + 1))
  }
  if (val !== null && typeof val === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(val)) {
      const stripped = stripLargeBinary(v, depth + 1)
      if (stripped !== null && stripped !== undefined) out[k] = stripped
    }
    return out
  }
  if (val === undefined) return null
  return val
}

function toFirebaseValue(v: unknown): unknown {
  const stripped = stripLargeBinary(v)
  return stripped === undefined || stripped === null ? null : JSON.parse(JSON.stringify(stripped))
}

function fixAssets(raw: any): GameAssets {
  if (!raw) return {}
  const out: GameAssets = {}
  if (raw.imageSets != null) out.imageSets = toArray(raw.imageSets).map((s: any) => ({ ...s, pairs: toArray(s?.pairs) }))
  if (raw.auctionItems != null) out.auctionItems = toArray(raw.auctionItems)
  for (const f of ['backgroundImage', 'soundStart', 'soundTick', 'soundTimeUp'] as const) {
    if (raw[f] != null) out[f] = raw[f]
  }
  return out
}

function lightOf(g: Game): Game {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(g)) if (!isHeavy(k)) out[k] = v
  return out as unknown as Game
}

function assetsOf(g: Game): GameAssets {
  const out: Record<string, unknown> = {}
  for (const f of HEAVY_FIELDS) if ((g as any)[f] !== undefined) out[f] = (g as any)[f]
  return out as GameAssets
}

function hasAssets(g: any): boolean {
  return HEAVY_FIELDS.some((f) => g?.[f] !== undefined)
}

function mergeGame(light: Game, assets?: GameAssets): Game {
  return assets ? { ...light, ...assets } : light
}

function fixFirebaseData(data: any) {
  return {
    teams: toArray(data.teams),
    games: toArray(data.games) as Game[],
    scores: toArray(data.scores),
    rankBonuses: toArray(data.rankBonuses),
    appTitle: data.appTitle ?? 'Active Fun Games',
    appTitleSize: data.appTitleSize ?? 20,
    dockGameIds: toArray(data.dockGameIds),
    gameOrder: toArray(data.gameOrder),
    wallpaperColor: data.wallpaperColor ?? '#cacdd8',
  }
}

const SYNC_KEYS = ['teams', 'games', 'scores', 'rankBonuses', 'appTitle', 'appTitleSize', 'dockGameIds', 'gameOrder', 'wallpaperColor'] as const
type SyncKey = typeof SYNC_KEYS[number]
type SyncState = Pick<GameState, SyncKey>

// ── Public API ──────────────────────────────────────────────────────────────

// Full overwrite (admin "push to Firebase"): light tree replaced, assets written for games that have them loaded.
export async function writeState(state: SyncState) {
  const updates: Record<string, unknown> = {
    [ROOT]: toFirebaseValue({
      teams: state.teams,
      games: state.games.map(lightOf),
      scores: state.scores,
      rankBonuses: state.rankBonuses,
      appTitle: state.appTitle,
      appTitleSize: state.appTitleSize,
      dockGameIds: state.dockGameIds.length ? state.dockGameIds : null,
      gameOrder: state.gameOrder.length ? state.gameOrder : null,
      wallpaperColor: state.wallpaperColor ?? '#cacdd8',
    }),
  }
  state.games.forEach((g) => {
    if (hasAssets(g)) updates[`${ASSETS_ROOT}/${g.id}`] = toFirebaseValue(assetsOf(g))
  })
  await fbUpdate(ref(db), updates)
}

/** Ask for a game's images/sounds; returns true once they're in the store (from cache or live). */
export function useGameAssets(gameId?: string): boolean {
  const ready = useStore((s) => !isFirebaseConfigured || !gameId || !!s.assetsReady[gameId])
  useEffect(() => {
    if (gameId) useStore.getState().requestAssets(gameId)
  }, [gameId])
  return ready
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

// Recursively record only the leaves that changed (unchanged branches are skipped by reference),
// so renaming one image set or editing one question doesn't re-upload every image.
function diffInto(updates: Record<string, unknown>, path: string, a: unknown, b: unknown) {
  if (a === b) return
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (i >= b.length) updates[`${path}/${i}`] = null
      else diffInto(updates, `${path}/${i}`, a[i], b[i])
    }
    return
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => diffInto(updates, `${path}/${k}`, a[k], b[k]))
    return
  }
  updates[path] = toFirebaseValue(b)
}

// Firebase paths (from the db root) that differ between what the server holds and the new state.
// Games are diffed per field; heavy fields go to the game's asset node, and only once that node's
// live data has loaded (otherwise a partial local copy could overwrite the real images).
function buildUpdates(server: SyncState, next: SyncState, liveAssetIds: Set<string>): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  for (const k of SYNC_KEYS) {
    const a = server[k]
    const b = next[k]
    if (a === b) continue
    if (k !== 'games') {
      const emptyList = (k === 'dockGameIds' || k === 'gameOrder') && Array.isArray(b) && b.length === 0
      updates[`${ROOT}/${k}`] = emptyList ? null : toFirebaseValue(b)
      continue
    }
    const oldGames = a as Game[]
    const newGames = b as Game[]
    const sameShape = oldGames.length === newGames.length && oldGames.every((g, i) => g?.id === newGames[i]?.id)
    if (sameShape) {
      newGames.forEach((g, i) => {
        const old = oldGames[i]
        if (g === old) return
        const fields = new Set([...Object.keys(old), ...Object.keys(g)])
        fields.forEach((f) => {
          const ov = (old as unknown as Record<string, unknown>)[f]
          const nv = (g as unknown as Record<string, unknown>)[f]
          if (ov === nv) return
          if (isHeavy(f)) {
            if (liveAssetIds.has(g.id)) diffInto(updates, `${ASSETS_ROOT}/${g.id}/${f}`, ov, nv)
          } else {
            updates[`${ROOT}/games/${i}/${f}`] = toFirebaseValue(nv)
          }
        })
      })
      continue
    }
    // games added/removed/reordered: rewrite the light list, sync heavy fields per game
    updates[`${ROOT}/games`] = toFirebaseValue(newGames.map(lightOf))
    newGames.forEach((g) => {
      const old = oldGames.find((o) => o.id === g.id)
      if (old && !liveAssetIds.has(g.id)) return
      HEAVY_FIELDS.forEach((f) => {
        if ((old as any)?.[f] !== (g as any)[f]) updates[`${ASSETS_ROOT}/${g.id}/${f}`] = toFirebaseValue((g as any)[f])
      })
    })
    oldGames.forEach((o) => {
      if (!newGames.some((g) => g.id === o.id)) updates[`${ASSETS_ROOT}/${o.id}`] = null
    })
  }
  return updates
}

export function useFirebaseSync() {
  const store = useStore()
  // state as loaded from the IndexedDB cache, and the keys the user edited before live data arrived
  const cacheBase = useRef<Partial<GameState> | null>(null)
  const pendingKeys = useRef(new Set<SyncKey>())
  // last state the server is known to hold; writes send only the difference from it
  const serverState = useRef<SyncState | null>(null)
  // per-game heavy data: from the cache (until live), and from live asset subscriptions
  const cachedAssets = useRef(new Map<string, GameAssets>())
  const liveAssets = useRef(new Map<string, GameAssets>())
  const liveAssetIds = useRef(new Set<string>())
  const assetSubs = useRef(new Map<string, () => void>())
  const migrated = useRef(false)

  const assetsFor = (id: string) => liveAssetIds.current.has(id) ? liveAssets.current.get(id) : cachedAssets.current.get(id)

  const persistCache = () => {
    const s = useStore.getState()
    saveCachedState({
      teams: s.teams, games: s.games, scores: s.scores, rankBonuses: s.rankBonuses, appTitle: s.appTitle,
      appTitleSize: s.appTitleSize, dockGameIds: s.dockGameIds, gameOrder: s.gameOrder, wallpaperColor: s.wallpaperColor,
    })
  }

  // If Firebase is not configured, mark as hydrated immediately so the UI doesn't block
  useEffect(() => {
    if (!isFirebaseConfigured) {
      store.setHydrated(true)
      store.setSynced(true)
    }
  }, []) // eslint-disable-line

  // Render from the last cached snapshot while the live data downloads.
  // Writes stay blocked (see write effect) until the live snapshot arrives.
  useEffect(() => {
    if (!isFirebaseConfigured) return
    loadCachedState().then((cached) => {
      if (!cached || useStore.getState().isSynced) return
      cached.games.forEach((g) => {
        if (hasAssets(g)) {
          cachedAssets.current.set(g.id, assetsOf(g))
          store.setAssetsReady(g.id)
        }
      })
      cacheBase.current = cached
      store._hydrate(cached)
      store.setHydrated(true)
    })
  }, []) // eslint-disable-line

  // Track .info/connected for connection status
  useEffect(() => {
    if (!isFirebaseConfigured) {
      store.setFirebaseStatus('disconnected')
      return
    }
    store.setFirebaseStatus('connecting')
    const unsub = onValue(ref(db, '.info/connected'), (snap) => {
      store.setFirebaseStatus(snap.val() === true ? 'connected' : 'disconnected')
    })
    return () => unsub()
  }, []) // eslint-disable-line

  // Subscribe to the light tree and hydrate the store
  useEffect(() => {
    if (!isFirebaseConfigured) return

    const unsub = onValue(ref(db, ROOT), (snap) => {
      const raw = snap.val()

      if (!raw) {
        // First run — seed Firebase with defaults
        const seed = fixFirebaseData({
          teams: defaultTeams, games: defaultGames, scores: [], rankBonuses: defaultRankBonuses,
          appTitle: 'Active Fun Games', dockGameIds: [], gameOrder: [],
        })
        serverState.current = seed
        store._hydrate(seed)
        store.setHydrated(true)
        store.setSynced(true)
        persistCache()
        writeState(seed).catch((err) => {
          console.error('[Firebase] seed write failed:', err)
          store.setFirebaseStatus('disconnected')
        })
        return
      }

      const fixed = fixFirebaseData({
        teams:          raw.teams          ?? defaultTeams,
        games:          raw.games          ?? defaultGames,
        scores:         raw.scores         ?? [],
        rankBonuses:    raw.rankBonuses    ?? defaultRankBonuses,
        appTitle:       raw.appTitle       ?? 'Active Fun Games',
        appTitleSize:   raw.appTitleSize   ?? 20,
        dockGameIds:    raw.dockGameIds    ?? [],
        gameOrder:      raw.gameOrder      ?? [],
        wallpaperColor: raw.wallpaperColor ?? '#cacdd8',
      })

      // One-time migration: move heavy fields that still live inside the light tree to their asset nodes
      const inline = fixed.games.filter(hasAssets)
      if (inline.length && !migrated.current) {
        migrated.current = true
        const updates: Record<string, unknown> = {}
        fixed.games.forEach((g, i) => {
          HEAVY_FIELDS.forEach((f) => {
            if ((g as any)[f] === undefined) return
            updates[`${ASSETS_ROOT}/${g.id}/${f}`] = (g as any)[f]
            updates[`${ROOT}/games/${i}/${f}`] = null
          })
        })
        inline.forEach((g) => {
          liveAssets.current.set(g.id, fixAssets(assetsOf(g)))
          liveAssetIds.current.add(g.id)
          store.setAssetsReady(g.id)
        })
        fbUpdate(ref(db), updates).catch((err) => console.error('[Firebase] asset migration failed:', err))
      }

      const games = fixed.games.map((g) => mergeGame(lightOf(g), assetsFor(g.id)))
      const server: SyncState = { ...fixed, games }

      // Edits made while showing cached data win for the keys they touched, then get pushed
      let next: SyncState = server
      const pending = useStore.getState().isSynced ? [] : Array.from(pendingKeys.current)
      if (pending.length) {
        const current = useStore.getState()
        next = { ...server }
        pending.forEach((k) => { (next as Record<string, unknown>)[k] = current[k] })
        pendingKeys.current.clear()
      }

      serverState.current = server
      store._hydrate(next)
      store.setHydrated(true)
      store.setSynced(true)
      persistCache()
    })

    return () => unsub()
  }, []) // eslint-disable-line

  // Subscribe to each requested game's asset node (kept open once requested)
  useEffect(() => {
    if (!isFirebaseConfigured) return
    store.assetRequests.forEach((id) => {
      if (assetSubs.current.has(id)) return
      const unsub = onValue(ref(db, `${ASSETS_ROOT}/${id}`), (snap) => {
        const server = fixAssets(snap.val())
        const wasLive = liveAssetIds.current.has(id)
        // what the store's heavy fields were based on: previous live data, or the cache
        const base = wasLive ? liveAssets.current.get(id) : cachedAssets.current.get(id)
        liveAssets.current.set(id, server)
        liveAssetIds.current.add(id)
        cachedAssets.current.delete(id)

        const st = useStore.getState()
        const idx = st.games.findIndex((g) => g.id === id)
        if (idx >= 0) {
          const local = st.games[idx]
          // keep heavy fields the user changed locally since `base`; take the server's for the rest
          const chosen: Record<string, unknown> = {}
          HEAVY_FIELDS.forEach((f) => {
            const localChanged = (local as any)[f] !== (base as any)?.[f]
            const v = localChanged ? (local as any)[f] : (server as any)[f]
            if (v !== undefined) chosen[f] = v
          })
          const games = [...st.games]
          games[idx] = { ...lightOf(local), ...chosen } as Game
          if (serverState.current) {
            const sIdx = serverState.current.games.findIndex((g) => g.id === id)
            if (sIdx >= 0) {
              const sGames = [...serverState.current.games]
              sGames[sIdx] = mergeGame(lightOf(sGames[sIdx]), server)
              serverState.current = { ...serverState.current, games: sGames }
            }
          }
          store._hydrate({ games })
          persistCache()
        }
        store.setAssetsReady(id)
      })
      assetSubs.current.set(id, unsub)
    })
  }, [store.assetRequests]) // eslint-disable-line

  useEffect(() => () => { assetSubs.current.forEach((u) => u()) }, [])

  // Write to Firebase whenever the store changes — only the difference from what the server holds,
  // and only once live data has arrived (never from cache)
  useEffect(() => {
    if (!isFirebaseConfigured || !store.isHydrated) return
    if (!store.isSynced) {
      // running on cached data: remember which parts the user changed, push them once live data arrives
      const base = cacheBase.current
      if (base) SYNC_KEYS.forEach((k) => { if (store[k] !== base[k]) pendingKeys.current.add(k) })
      return
    }
    const base = serverState.current
    if (!base) return
    const current: SyncState = {
      teams:          store.teams,
      games:          store.games,
      scores:         store.scores,
      rankBonuses:    store.rankBonuses,
      appTitle:       store.appTitle,
      appTitleSize:   store.appTitleSize,
      dockGameIds:    store.dockGameIds,
      gameOrder:      store.gameOrder,
      wallpaperColor: store.wallpaperColor,
    }
    const updates = buildUpdates(base, current, liveAssetIds.current)
    serverState.current = current
    if (!Object.keys(updates).length) return
    fbUpdate(ref(db), updates).catch((err) => {
      console.error('[Firebase] write failed:', err)
      store.setFirebaseStatus('disconnected')
    })
  }, [store.isHydrated, store.isSynced, store.teams, store.games, store.scores, store.rankBonuses, store.appTitle, store.appTitleSize, store.dockGameIds, store.gameOrder, store.wallpaperColor]) // eslint-disable-line
}
