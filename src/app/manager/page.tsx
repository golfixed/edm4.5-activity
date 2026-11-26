'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, TEAM_COLORS_LIST } from '@/lib/store'
import { Score } from '@/lib/types'
import { useConfirm } from '@/components/ConfirmDialog'
import { FirebaseMark } from '@/components/FirebaseLoading'

type Tab = 'scores' | 'teams'

const PRIMARY_BTN = 'px-4 h-9 rounded-xl text-sm font-bold text-white bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 shadow-[0_4px_14px_rgba(194,65,12,0.3)] transition-all'

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
  // The score fields are copied from the store when the tab mounts, so wait for live data;
  // otherwise they start blank and บันทึกทั้งหมด would overwrite every score with 0.
  const isSynced = useStore((s) => s.isSynced)
  const segBtn = (active: boolean) =>
    `px-4 h-[34px] text-sm font-semibold transition-colors ${active
      ? 'bg-gradient-to-b from-orange-500 to-red-600 text-white'
      : 'bg-white text-orange-700 hover:bg-orange-50'}`

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-orange-50">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 bg-white border-b border-orange-100 shadow-sm flex-shrink-0">
        <button onClick={handleBack} className="flex items-center gap-1 px-3 h-9 rounded-lg text-sm bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          กลับ
        </button>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
          </svg>
          จัดการคะแนน
        </h1>
        <div className="flex rounded-lg overflow-hidden border border-orange-200 shadow-sm">
          <button onClick={() => setTab('scores')} className={segBtn(tab === 'scores')}>คะแนน</button>
          <button onClick={() => setTab('teams')} className={`${segBtn(tab === 'teams')} border-l border-orange-200`}>ทีม</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {tab === 'scores' && (isSynced ? <ScoresTab /> : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-orange-900/50">
            <FirebaseMark className="w-10 h-10 animate-pulse" />
            <p className="text-sm font-medium">กำลังโหลดคะแนนล่าสุด…</p>
          </div>
        ))}
        {tab === 'teams' && <TeamsTab />}
      </div>
    </div>
  )
}

/* ── Scores Tab ─────────────────────────────────────────────────────── */
function ScoresTab() {
  const { teams, games, scores, setScores, resetScores } = useStore()
  const confirm = useConfirm()
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

  const saveAll = () => {
    const next: Score[] = []
    teams.forEach((t) => games.forEach((g) => next.push({ teamId: t.id, gameId: g.id, points: localScores[key(t.id, g.id)] ?? 0 })))
    setScores(next)
  }

  const handleReset = async () => {
    if (await confirm({ title: 'รีเซ็ตคะแนนทั้งหมด?', message: 'คะแนนของทุกทีมในทุกเกมจะถูกล้าง', confirmLabel: 'รีเซ็ตคะแนน', tone: 'danger' })) {
      resetScores()
      setLocalScores({})
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-orange-900/40">บันทึกคะแนน</span>
        <div className="flex gap-2">
          <button onClick={saveAll} className={PRIMARY_BTN}>บันทึกทั้งหมด</button>
          <button onClick={handleReset} className="px-4 h-9 rounded-xl text-sm font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors">รีเซ็ต</button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4">
        <span className="w-4 flex-shrink-0" />
        <span className="flex-1 text-xs font-bold uppercase tracking-wider text-orange-900/40">ทีม</span>
        {games.map((g) => (
          <span key={g.id} className="w-36 text-center text-xs font-bold uppercase tracking-wider text-orange-900/40 leading-tight">{g.name}</span>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {teams.map((team) => (
          <div key={team.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-orange-100 rounded-2xl shadow-sm">
            <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${team.color}`} />
            <span className="flex-1 font-bold text-gray-900 text-lg">{team.name}</span>
            {games.map((g) => (
              <div key={g.id} className="w-36 flex justify-center">
                <input
                  type="number" min="0"
                  value={localScores[key(team.id, g.id)] ?? ''}
                  onChange={(e) => handleChange(team.id, g.id, e.target.value)}
                  placeholder="0"
                  className="w-full text-center border border-orange-200 rounded-lg px-2 py-1.5 text-lg font-bold tabular-nums text-orange-700 bg-orange-50 placeholder-orange-200 focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-orange-900/40">ยังไม่มีทีม</p>
        </div>
      )}
    </div>
  )
}

/* ── Teams Tab ──────────────────────────────────────────────────────── */
function TeamsTab() {
  const { teams, setTeams } = useStore()
  const confirm = useConfirm()

  const updateName = (id: string, name: string) => setTeams(teams.map((t) => (t.id === id ? { ...t, name } : t)))
  const updateCaptain = (id: string, captain: string) => setTeams(teams.map((t) => (t.id === id ? { ...t, captain } : t)))
  const deleteTeam = async (id: string) => {
    const team = teams.find(t => t.id === id)
    if (await confirm({ title: `ลบ ${team?.name ?? 'ทีมนี้'}?`, confirmLabel: 'ลบทีม', tone: 'danger' })) setTeams(teams.filter((t) => t.id !== id))
  }
  const addTeam = () => {
    const newId = String(Date.now())
    const color = TEAM_COLORS_LIST[teams.length % TEAM_COLORS_LIST.length]
    setTeams([...teams, { id: newId, name: `ทีม ${teams.length + 1}`, color }])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-orange-900/40">จัดการทีม</span>
        <button onClick={addTeam} className={PRIMARY_BTN}>+ เพิ่มทีม</button>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4">
        <span className="w-4 flex-shrink-0" />
        <span className="flex-1 text-xs font-bold uppercase tracking-wider text-orange-900/40">ชื่อทีม</span>
        <span className="flex-1 text-xs font-bold uppercase tracking-wider text-orange-900/40">หัวหน้าทีม</span>
        <span className="w-10 flex-shrink-0" />
      </div>

      <div className="flex flex-col gap-2">
        {teams.map((team) => (
          <div key={team.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-orange-100 rounded-2xl shadow-sm">
            <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${team.color}`} />
            <div className="flex-1">
              <input
                value={team.name}
                onChange={(e) => updateName(team.id, e.target.value)}
                className="w-full border border-orange-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-orange-50/60 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
            <div className="flex-1">
              <input
                value={team.captain ?? ''}
                onChange={(e) => updateCaptain(team.id, e.target.value)}
                placeholder="ชื่อหัวหน้าทีม"
                className="w-full border border-orange-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-orange-50/60 placeholder-orange-300 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
            <button onClick={() => deleteTeam(team.id)} className="w-10 text-center rounded-lg py-1.5 text-xs font-bold bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors">ลบ</button>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-orange-900/40">ยังไม่มีทีม</p>
        </div>
      )}
    </div>
  )
}
