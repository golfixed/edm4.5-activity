'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, TEAM_COLORS_LIST } from '@/lib/store'
import { Score } from '@/lib/types'

type Tab = 'scores' | 'teams'

export default function ManagerPage() {
  const router = useRouter()
  const [closing, setClosing] = useState(false)
  const handleBack = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (closing) return
    setClosing(true)
    try { sessionStorage.setItem('returnFromGame', '__util_manager') } catch {}
    router.push('/')
  }, [closing, router])

  const [tab, setTab] = useState<Tab>('scores')

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={handleBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          กลับ
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">📋 จัดการคะแนน</h1>
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button onClick={() => setTab('scores')} className="px-4 py-1.5 text-sm font-semibold transition-colors" style={{ background: tab === 'scores' ? '#111827' : 'white', color: tab === 'scores' ? 'white' : '#6b7280' }}>📊 คะแนน</button>
          <button onClick={() => setTab('teams')} className="px-4 py-1.5 text-sm font-semibold transition-colors border-l border-gray-200" style={{ background: tab === 'teams' ? '#111827' : 'white', color: tab === 'teams' ? 'white' : '#6b7280' }}>👥 ทีม</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === 'scores' && <ScoresTab />}
        {tab === 'teams' && <TeamsTab />}
      </div>
    </div>
  )
}

/* ── Scores Tab ─────────────────────────────────────────────────────── */
function ScoresTab() {
  const { teams, games, scores, setScores, resetScores } = useStore()
  const [localScores, setLocalScores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    scores.forEach((s) => { map[`${s.teamId}-${s.gameId}`] = s.points })
    return map
  })

  const key = (teamId: string, gameId: string) => `${teamId}-${gameId}`

  const handleChange = (teamId: string, gameId: string, val: string) => {
    const num = parseInt(val) || 0
    setLocalScores((prev) => ({ ...prev, [key(teamId, gameId)]: num }))
  }

  const saveRow = (teamId: string) => {
    const updated = scores.filter((s) => s.teamId !== teamId)
    games.forEach((g) => updated.push({ teamId, gameId: g.id, points: localScores[key(teamId, g.id)] ?? 0 }))
    setScores(updated)
  }

  const saveAll = () => {
    const next: Score[] = []
    teams.forEach((t) => games.forEach((g) => next.push({ teamId: t.id, gameId: g.id, points: localScores[key(t.id, g.id)] ?? 0 })))
    setScores(next)
  }

  const handleReset = () => {
    if (confirm('รีเซ็ตคะแนนทั้งหมด?')) {
      resetScores()
      setLocalScores({})
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">บันทึกคะแนน</span>
        <div className="flex gap-2">
          <button onClick={saveAll} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">บันทึกทั้งหมด</button>
          <button onClick={handleReset} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">รีเซ็ต</button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4">
        <span className="w-4 flex-shrink-0" />
        <span className="flex-1 text-xs font-bold uppercase tracking-widest text-gray-400">ทีม</span>
        {games.map((g) => (
          <span key={g.id} className="w-24 text-center text-xs font-bold uppercase tracking-widest text-gray-400">{g.name}</span>
        ))}
        <span className="w-20 flex-shrink-0" />
      </div>

      <div className="flex flex-col gap-1">
        {teams.map((team) => (
          <div key={team.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl">
            <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${team.color}`} />
            <span className="flex-1 font-bold text-gray-900">{team.name}</span>
            {games.map((g) => (
              <div key={g.id} className="w-24 flex justify-center">
                <input
                  type="number" min="0"
                  value={localScores[key(team.id, g.id)] ?? ''}
                  onChange={(e) => handleChange(team.id, g.id, e.target.value)}
                  placeholder="0"
                  className="w-full text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50"
                />
              </div>
            ))}
            <div className="w-20 flex justify-end">
              <button onClick={() => saveRow(team.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-colors">บันทึก</button>
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <span className="text-5xl opacity-20">📊</span>
          <p className="text-sm text-gray-400">ยังไม่มีทีม</p>
        </div>
      )}
    </div>
  )
}

/* ── Teams Tab ──────────────────────────────────────────────────────── */
function TeamsTab() {
  const { teams, setTeams } = useStore()

  const updateName = (id: string, name: string) => setTeams(teams.map((t) => (t.id === id ? { ...t, name } : t)))
  const updateCaptain = (id: string, captain: string) => setTeams(teams.map((t) => (t.id === id ? { ...t, captain } : t)))
  const deleteTeam = (id: string) => {
    if (confirm('ลบทีมนี้?')) setTeams(teams.filter((t) => t.id !== id))
  }
  const addTeam = () => {
    const newId = String(Date.now())
    const color = TEAM_COLORS_LIST[teams.length % TEAM_COLORS_LIST.length]
    setTeams([...teams, { id: newId, name: `ทีม ${teams.length + 1}`, color }])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">จัดการทีม</span>
        <button onClick={addTeam} className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">+ เพิ่มทีม</button>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4">
        <span className="w-4 flex-shrink-0" />
        <span className="flex-1 text-xs font-bold uppercase tracking-widest text-gray-400">ชื่อทีม</span>
        <span className="flex-1 text-xs font-bold uppercase tracking-widest text-gray-400">หัวหน้าทีม</span>
        <span className="w-10 flex-shrink-0" />
      </div>

      <div className="flex flex-col gap-1">
        {teams.map((team) => (
          <div key={team.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl">
            <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${team.color}`} />
            <div className="flex-1">
              <input
                value={team.name}
                onChange={(e) => updateName(team.id, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50"
              />
            </div>
            <div className="flex-1">
              <input
                value={team.captain ?? ''}
                onChange={(e) => updateCaptain(team.id, e.target.value)}
                placeholder="ชื่อหัวหน้าทีม"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50 placeholder-gray-300"
              />
            </div>
            <button onClick={() => deleteTeam(team.id)} className="w-10 text-center rounded-lg py-1.5 text-xs font-bold text-red-500 border border-red-100 hover:bg-red-50 transition-colors">ลบ</button>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <span className="text-5xl opacity-20">👥</span>
          <p className="text-sm text-gray-400">ยังไม่มีทีม</p>
        </div>
      )}
    </div>
  )
}
