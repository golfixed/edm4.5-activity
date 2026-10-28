'use client'

import { useEffect, useRef } from 'react'
import { ref, onValue, set as fbSet } from 'firebase/database'
import { db, isFirebaseConfigured } from './firebase'
import { useStore, defaultTeams, defaultGames, defaultRankBonuses } from './store'
import type { FirebaseStatus } from './store'
import { Game, GameState } from './types'

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
    appTitle: data.appTitle ?? 'Active Fun Games (EDM 4.5)',
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

export function useFirebaseSync() {
  const store = useStore()
  const isHydrated = useRef(false)
  const skipNextWrite = useRef(false) // set true after Firebase hydration; cleared by write effect

  // If Firebase is not configured, mark as hydrated immediately so the UI doesn't block
  useEffect(() => {
    if (!isFirebaseConfigured) {
      isHydrated.current = true
      store.setHydrated(true)
    }
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
          appTitle: 'Active Fun Games (EDM 4.5)',
          dockGameIds: [],
          gameOrder: [],
        })
        skipNextWrite.current = true
        store._hydrate(fixed)
        store.setHydrated(true)
        isHydrated.current = true
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
        appTitle:       raw.appTitle       ?? 'Active Fun Games (EDM 4.5)',
        appTitleSize:   raw.appTitleSize   ?? 20,
        dockGameIds:    raw.dockGameIds    ?? [],
        gameOrder:      raw.gameOrder      ?? [],
        wallpaperColor: raw.wallpaperColor ?? '#cacdd8',
      })

      skipNextWrite.current = true
      store._hydrate(fixed)
      store.setHydrated(true)
      isHydrated.current = true
    })

    return () => unsub()
  }, []) // eslint-disable-line

  // Write to Firebase whenever store changes — only after hydration, skip the hydration-triggered run
  useEffect(() => {
    if (!isFirebaseConfigured || !store.isHydrated) return
    if (skipNextWrite.current) {
      skipNextWrite.current = false
      return
    }
    writeState({
      teams:          store.teams,
      games:          store.games,
      scores:         store.scores,
      rankBonuses:    store.rankBonuses,
      appTitle:       store.appTitle,
      appTitleSize:   store.appTitleSize,
      dockGameIds:    store.dockGameIds,
      gameOrder:      store.gameOrder,
      wallpaperColor: store.wallpaperColor,
    }).catch((err) => {
      console.error('[Firebase] write failed:', err)
      store.setFirebaseStatus('disconnected')
    })
  }, [store.isHydrated, store.teams, store.games, store.scores, store.rankBonuses, store.appTitle, store.appTitleSize, store.dockGameIds, store.gameOrder, store.wallpaperColor]) // eslint-disable-line
}
