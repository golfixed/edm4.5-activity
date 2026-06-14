'use client'

import { useEffect, useRef } from 'react'
import { ref, onValue, set as fbSet } from 'firebase/database'
import { db, isFirebaseConfigured } from './firebase'
import { useStore, defaultTeams, defaultGames, defaultRankBonuses } from './store'
import { GameState } from './types'

const ROOT = 'edm-activity'
const LS_KEY = 'edm-activity'

/**
 * Firebase RTDB stores JS arrays as objects with numeric string keys.
 * This converts them back to proper arrays recursively.
 */
function toArray(val: any): any[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  // Firebase object-as-array: { "0": x, "1": y, ... }
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

/**
 * Deep-convert Firebase snapshot data — arrays at every level get fixed.
 * Also recursively fixes nested arrays like game.imageSets[].pairs[].
 */
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
    return { ...g, imageSets }
  })

  return { teams, games, scores, rankBonuses }
}

export function writeState(state: Omit<GameState, 'activeGameId'>) {
  return fbSet(ref(db, ROOT), {
    teams: state.teams,
    games: state.games,
    scores: state.scores,
    rankBonuses: state.rankBonuses,
  })
}

function readAndClearLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const state = parsed?.state ?? parsed
    localStorage.removeItem(LS_KEY)
    return state
  } catch {
    return null
  }
}

export function useFirebaseSync() {
  const store = useStore()
  const isHydrated = useRef(false)
  const skipNextWrite = useRef(false)

  useEffect(() => {
    if (!isFirebaseConfigured) return

    const r = ref(db, ROOT)
    const unsub = onValue(r, (snap) => {
      const raw = snap.val()

      if (!raw) {
        const ls = readAndClearLocalStorage()
        const fixed = fixFirebaseData({
          teams:       ls?.teams       ?? defaultTeams,
          games:       ls?.games       ?? defaultGames,
          scores:      ls?.scores      ?? [],
          rankBonuses: ls?.rankBonuses ?? defaultRankBonuses,
        })
        writeState(fixed)
        skipNextWrite.current = true
        store._hydrate(fixed)
        isHydrated.current = true
        return
      }

      readAndClearLocalStorage()

      const fixed = fixFirebaseData({
        teams:       raw.teams       ?? defaultTeams,
        games:       raw.games       ?? defaultGames,
        scores:      raw.scores      ?? [],
        rankBonuses: raw.rankBonuses ?? defaultRankBonuses,
      })

      skipNextWrite.current = true
      store._hydrate(fixed)
      isHydrated.current = true
    })

    return () => unsub()
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!isFirebaseConfigured || !isHydrated.current) return
    if (skipNextWrite.current) {
      skipNextWrite.current = false
      return
    }
    writeState({
      teams:       store.teams,
      games:       store.games,
      scores:      store.scores,
      rankBonuses: store.rankBonuses,
    })
  }, [store.teams, store.games, store.scores, store.rankBonuses]) // eslint-disable-line
}
