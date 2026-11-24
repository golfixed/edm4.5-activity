'use client'

import { useEffect, useRef } from 'react'
import { ref, onValue, set as fbSet, update as fbUpdate } from 'firebase/database'
import { db, isFirebaseConfigured } from './firebase'
import { useStore, defaultTeams, defaultGames, defaultRankBonuses } from './store'
import type { FirebaseStatus } from './store'
import { Game, GameState } from './types'
import { loadCachedState, saveCachedState } from './stateCache'

const ROOT = 'edm-activity'

// Strip any data-URI string larger than this to avoid Firebase's 10 MB write limit
const MAX_BINARY_CHARS = 500_000

// ── Firebase array fix ────────────────────────────────────────────────────────

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

function fixFirebaseData(data: any) {
  const teams = toArray(data.teams)
  const scores = toArray(data.scores)
  const rankBonuses = toArray(data.rankBonuses)

  const games = toArray(data.games).map((g: any) => {
    if (!g) return g
    const imageSets = toArray(g.imageSets).map((s: any) => ({
      ...s,
      pairs: toArray(s?.pairs),
    }))
    const auctionItems = toArray(g.auctionItems)
    return { ...g, imageSets, auctionItems }
  })

  return {
    teams,
    games,
    scores,
    rankBonuses,
    appTitle: data.appTitle ?? 'Active Fun Games',
    appTitleSize: data.appTitleSize ?? 20,
    dockGameIds: toArray(data.dockGameIds),
    gameOrder: toArray(data.gameOrder),
    wallpaperColor: data.wallpaperColor ?? '#cacdd8',
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function writeState(state: Omit<GameState, 'activeGameId'>) {
  const payload = stripLargeBinary({
    teams: state.teams,
    games: state.games,
    scores: state.scores,
    rankBonuses: state.rankBonuses,
    appTitle: state.appTitle,
    appTitleSize: state.appTitleSize,
    dockGameIds: state.dockGameIds.length ? state.dockGameIds : null,
    gameOrder: state.gameOrder.length ? state.gameOrder : null,
    wallpaperColor: state.wallpaperColor ?? '#cacdd8',
  })
  // JSON round-trip removes undefined values (Firebase rejects them)
  await fbSet(ref(db, ROOT), JSON.parse(JSON.stringify(payload)))
}

export async function writeField<K extends keyof Omit<GameState, 'activeGameId'>>(
  key: K,
  value: Omit<GameState, 'activeGameId'>[K]
) {
  await fbSet(ref(db, `${ROOT}/${key}`), value)
}

const SYNC_KEYS = ['teams', 'games', 'scores', 'rankBonuses', 'appTitle', 'appTitleSize', 'dockGameIds', 'gameOrder', 'wallpaperColor'] as const
type SyncKey = typeof SYNC_KEYS[number]
type SyncState = Pick<GameState, SyncKey>

function toFirebaseValue(v: unknown): unknown {
  const stripped = stripLargeBinary(v)
  return stripped === undefined || stripped === null ? null : JSON.parse(JSON.stringify(stripped))
}

// Firebase paths that differ between what the server has and the new state. Games are diffed per field,
// so editing one setting writes a few bytes instead of re-uploading every game's images.
function buildUpdates(server: SyncState, next: SyncState): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  for (const k of SYNC_KEYS) {
    const a = server[k]
    const b = next[k]
    if (a === b) continue
    if (k === 'games') {
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
            if (ov !== nv) updates[`games/${i}/${f}`] = toFirebaseValue(nv)
          })
        })
        continue
      }
    }
    const emptyList = (k === 'dockGameIds' || k === 'gameOrder') && Array.isArray(b) && b.length === 0
    updates[k] = emptyList ? null : toFirebaseValue(b)
  }
  return updates
}

export function useFirebaseSync() {
  const store = useStore()
  const isHydrated = useRef(false)
  const skipNextWrite = useRef(false) // set true after Firebase hydration; cleared by write effect
  // state as loaded from the IndexedDB cache, and the keys the user edited before live data arrived
  const cacheBase = useRef<Partial<GameState> | null>(null)
  const pendingKeys = useRef(new Set<SyncKey>())
  // last state the server is known to hold; writes send only the difference from it
  const serverState = useRef<SyncState | null>(null)

  // If Firebase is not configured, mark as hydrated immediately so the UI doesn't block
  useEffect(() => {
    if (!isFirebaseConfigured) {
      isHydrated.current = true
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
      cacheBase.current = cached
      store._hydrate(cached)
      store.setHydrated(true)
      isHydrated.current = true
    })
  }, []) // eslint-disable-line

  // Track .info/connected for connection status
  useEffect(() => {
    if (!isFirebaseConfigured) {
      store.setFirebaseStatus('disconnected')
      return
    }
    store.setFirebaseStatus('connecting')
    const connRef = ref(db, '.info/connected')
    const unsub = onValue(connRef, (snap) => {
      store.setFirebaseStatus(snap.val() === true ? 'connected' : 'disconnected')
    })
    return () => unsub()
  }, []) // eslint-disable-line

  // Subscribe to Firebase and hydrate store
  useEffect(() => {
    if (!isFirebaseConfigured) return

    const r = ref(db, ROOT)
    const unsub = onValue(r, (snap) => {
      const raw = snap.val()

      if (!raw) {
        // First run — seed Firebase with defaults
        const fixed = fixFirebaseData({
          teams: defaultTeams,
          games: defaultGames,
          scores: [],
          rankBonuses: defaultRankBonuses,
          appTitle: 'Active Fun Games',
          dockGameIds: [],
          gameOrder: [],
        })
        skipNextWrite.current = true
        store._hydrate(fixed)
        store.setHydrated(true)
        store.setSynced(true)
        isHydrated.current = true
        saveCachedState(fixed)
        serverState.current = fixed as SyncState
        writeState(fixed as any).catch((err) => {
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

      // Edits made while showing cached data win for the keys they touched, then get pushed
      let next: typeof fixed = fixed
      const pending = useStore.getState().isSynced ? [] : Array.from(pendingKeys.current)
      if (pending.length) {
        const current = useStore.getState()
        next = { ...fixed }
        pending.forEach((k) => { (next as Record<string, unknown>)[k] = current[k] })
        pendingKeys.current.clear()
      }

      serverState.current = fixed as SyncState
      skipNextWrite.current = pending.length === 0
      store._hydrate(next)
      store.setHydrated(true)
      store.setSynced(true)
      isHydrated.current = true
      saveCachedState(next)
    })

    return () => unsub()
  }, []) // eslint-disable-line

  // Write to Firebase whenever store changes — only once live data has arrived (never from cache), skip the hydration-triggered run
  useEffect(() => {
    if (!isFirebaseConfigured || !store.isHydrated) return
    if (!store.isSynced) {
      // running on cached data: remember which parts the user changed, push them once live data arrives
      const base = cacheBase.current
      if (base) SYNC_KEYS.forEach((k) => { if (store[k] !== base[k]) pendingKeys.current.add(k) })
      return
    }
    if (skipNextWrite.current) {
      skipNextWrite.current = false
      return
    }
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
    const base = serverState.current
    serverState.current = current
    const write = base
      ? (() => {
          const updates = buildUpdates(base, current)
          return Object.keys(updates).length ? fbUpdate(ref(db, ROOT), updates) : Promise.resolve()
        })()
      : writeState(current)
    write.catch((err) => {
      console.error('[Firebase] write failed:', err)
      store.setFirebaseStatus('disconnected')
    })
  }, [store.isHydrated, store.isSynced, store.teams, store.games, store.scores, store.rankBonuses, store.appTitle, store.appTitleSize, store.dockGameIds, store.gameOrder, store.wallpaperColor]) // eslint-disable-line
}
