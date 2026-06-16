'use client'

import { useEffect, useRef } from 'react'
import { ref, onValue, set as fbSet } from 'firebase/database'
import { db, isFirebaseConfigured } from './firebase'
import { useStore, defaultTeams, defaultGames, defaultRankBonuses } from './store'
import { Game, GameState } from './types'

const ROOT = 'edm-activity'
const LS_KEY = 'edm-activity'
const IMG_PREFIX = 'edm-img'

// ── Image localStorage helpers ────────────────────────────────────────────────
// Base64 image blobs are too large for Firebase RTDB (10MB write limit).
// We store imageA/imageB in localStorage keyed by pair ID, and only sync
// metadata (id, label, correctImage) to Firebase.

function saveImagesToLocal(games: Game[]) {
  if (typeof localStorage === 'undefined') return
  games.forEach((game) => {
    ;(game.imageSets ?? []).forEach((set) => {
      set.pairs.forEach((pair) => {
        if (pair.imageA) localStorage.setItem(`${IMG_PREFIX}-${pair.id}-A`, pair.imageA)
        if (pair.imageB) localStorage.setItem(`${IMG_PREFIX}-${pair.id}-B`, pair.imageB)
      })
    })
  })
}

function restoreImagesFromLocal(games: Game[]): Game[] {
  if (typeof localStorage === 'undefined') return games
  return games.map((game) => ({
    ...game,
    imageSets: (game.imageSets ?? []).map((set) => ({
      ...set,
      pairs: set.pairs.map((pair) => ({
        ...pair,
        imageA: localStorage.getItem(`${IMG_PREFIX}-${pair.id}-A`) ?? pair.imageA,
        imageB: localStorage.getItem(`${IMG_PREFIX}-${pair.id}-B`) ?? pair.imageB,
      })),
    })),
  }))
}

function stripImagesFromGames(games: Game[]): Game[] {
  return games.map(({ backgroundImage: _bg, soundStart: _ss, soundTick: _st, soundTimeUp: _su, ...game }) => ({
    ...game,
    imageSets: (game.imageSets ?? []).map((set) => ({
      ...set,
      pairs: set.pairs.map((pair) => ({
        id: pair.id,
        label: pair.label,
        correctImage: pair.correctImage,
        imageA: '',
        imageB: '',
      })),
    })),
  }))
}

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

// ── Public API ────────────────────────────────────────────────────────────────

export function writeState(state: Omit<GameState, 'activeGameId'>) {
  saveImagesToLocal(state.games)
  return fbSet(ref(db, ROOT), {
    teams: state.teams,
    games: stripImagesFromGames(state.games),
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
        const withImages = { ...fixed, games: restoreImagesFromLocal(fixed.games) }
        writeState(withImages)
        skipNextWrite.current = true
        store._hydrate(withImages)
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
      const withImages = { ...fixed, games: restoreImagesFromLocal(fixed.games) }

      skipNextWrite.current = true
      store._hydrate(withImages)
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
