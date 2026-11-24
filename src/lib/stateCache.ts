'use client'

import type { GameState } from './types'

// Last Firebase snapshot kept in IndexedDB (localStorage is too small for the base64 images),
// so a reload can render immediately while the live data downloads.
const DB_NAME = 'active-fun-games'
const STORE = 'cache'
const KEY = 'state-v1'

type CachedState = Omit<GameState, 'activeGameId'>

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadCachedState(): Promise<CachedState | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve((req.result as CachedState | undefined) ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export function saveCachedState(state: CachedState) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      const db = await openDb()
      db.transaction(STORE, 'readwrite').objectStore(STORE).put(state, KEY)
    } catch {}
  }, 1500)
}
