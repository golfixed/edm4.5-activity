'use client'

import { useEffect, useRef } from 'react'
import { ref, onValue, set as fbSet, get } from 'firebase/database'
import { db, isFirebaseConfigured } from './firebase'
import { useStore, defaultTeams, defaultGames, defaultRankBonuses } from './store'
import { GameState, Score, Team, Game } from './types'

const ROOT = 'edm-activity'

// Write the entire state to Firebase (debounced)
function writeState(state: Omit<GameState, 'activeGameId'>) {
  // Strip base64 images from games to avoid hitting Firebase 10MB limit
  // Images are large — store them separately if needed; for now include them
  fbSet(ref(db, ROOT), {
    teams: state.teams,
    games: state.games,
    scores: state.scores,
    rankBonuses: state.rankBonuses,
  }).catch(console.error)
}

export function useFirebaseSync() {
  const store = useStore()
  const isHydrated = useRef(false)
  const skipNextWrite = useRef(false)

  // Subscribe: Firebase → local store (one-way on mount, then live)
  useEffect(() => {
    if (!isFirebaseConfigured) return
    const r = ref(db, ROOT)
    const unsub = onValue(r, (snap) => {
      const data = snap.val()
      if (!data) {
        // First time: push defaults to Firebase
        writeState({
          teams: defaultTeams,
          games: defaultGames,
          scores: [],
          rankBonuses: defaultRankBonuses,
        })
        return
      }
      skipNextWrite.current = true
      store._hydrate({
        teams: Array.isArray(data.teams) ? data.teams : defaultTeams,
        games: Array.isArray(data.games) ? data.games : defaultGames,
        scores: Array.isArray(data.scores) ? data.scores : [],
        rankBonuses: Array.isArray(data.rankBonuses) ? data.rankBonuses : defaultRankBonuses,
      })
      isHydrated.current = true
    })
    return () => unsub()
  }, []) // eslint-disable-line

  // Subscribe: local store → Firebase (write on change, after hydration)
  useEffect(() => {
    if (!isFirebaseConfigured || !isHydrated.current) return
    if (skipNextWrite.current) {
      skipNextWrite.current = false
      return
    }
    writeState({
      teams: store.teams,
      games: store.games,
      scores: store.scores,
      rankBonuses: store.rankBonuses,
    })
  }, [store.teams, store.games, store.scores, store.rankBonuses]) // eslint-disable-line
}
