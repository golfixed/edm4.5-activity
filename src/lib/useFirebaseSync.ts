'use client'

import { useEffect, useRef } from 'react'
import { ref, onValue, set as fbSet, get } from 'firebase/database'
import { db, isFirebaseConfigured } from './firebase'
import { useStore, defaultTeams, defaultGames, defaultRankBonuses } from './store'
import { GameState } from './types'

const ROOT = 'edm-activity'
const LS_KEY = 'edm-activity' // old Zustand persist key

export function writeState(state: Omit<GameState, 'activeGameId'>) {
  return fbSet(ref(db, ROOT), {
    teams: state.teams,
    games: state.games,
    scores: state.scores,
    rankBonuses: state.rankBonuses,
  })
}

/** Read and clear old Zustand-persist localStorage data */
function readAndClearLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Zustand persist wraps in { state: {...}, version: N }
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

  // On mount: subscribe Firebase → store, with localStorage migration on first run
  useEffect(() => {
    if (!isFirebaseConfigured) return

    const r = ref(db, ROOT)
    const unsub = onValue(r, (snap) => {
      const data = snap.val()

      if (!data) {
        // Firebase is empty — check for localStorage data to migrate
        const ls = readAndClearLocalStorage()
        const migrated = {
          teams:       Array.isArray(ls?.teams)       ? ls.teams       : defaultTeams,
          games:       Array.isArray(ls?.games)       ? ls.games       : defaultGames,
          scores:      Array.isArray(ls?.scores)      ? ls.scores      : [],
          rankBonuses: Array.isArray(ls?.rankBonuses) ? ls.rankBonuses : defaultRankBonuses,
        }
        writeState(migrated)
        // hydrate immediately so UI doesn't flash defaults
        skipNextWrite.current = true
        store._hydrate(migrated)
        isHydrated.current = true
        return
      }

      // Firebase has data — clear any leftover localStorage and hydrate
      readAndClearLocalStorage()

      skipNextWrite.current = true
      store._hydrate({
        teams:       Array.isArray(data.teams)       ? data.teams       : defaultTeams,
        games:       Array.isArray(data.games)       ? data.games       : defaultGames,
        scores:      Array.isArray(data.scores)      ? data.scores      : [],
        rankBonuses: Array.isArray(data.rankBonuses) ? data.rankBonuses : defaultRankBonuses,
      })
      isHydrated.current = true
    })

    return () => unsub()
  }, []) // eslint-disable-line

  // Store changes → Firebase (only after hydration, skip echo from Firebase writes)
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
