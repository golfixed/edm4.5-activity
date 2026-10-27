'use client'

import { useState, useRef } from 'react'
import { useStore, TEAM_COLORS_LIST } from '@/lib/store'
import { Team, Game, Score } from '@/lib/types'
import Link from 'next/link'

type Tab = 'teams' | 'games' | 'scores' | 'settings'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('scores')

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #2563eb, transparent)' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/80 hover:text-white transition-colors text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            กลับ
          </Link>
          <h1 className="text-2xl font-bold text-white">⚙️ Admin Panel</h1>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-2xl mb-6 w-fit"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {(['scores', 'teams', 'games', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${tab === t
                ? 'bg-white text-gray-900 shadow-lg'
                : 'text-white/70 hover:text-white'
              }`}
            >
              {t === 'teams' ? 'ทีม' : t === 'games' ? 'เกม' : t === 'settings' ? 'ตั้งค่า' : 'คะแนน'}
            </button>
          ))}
        </div>

        {tab === 'teams' && <TeamsTab />}
        {tab === 'games' && <GamesTab />}
        {tab === 'scores' && <ScoresTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

function TeamsTab() {
  const { teams, setTeams } = useStore()

  const updateName = (id: string, name: string) => {
    setTeams(teams.map((t) => (t.id === id ? { ...t, name } : t)))
  }

  const updateCaptain = (id: string, captain: string) => {
    setTeams(teams.map((t) => (t.id === id ? { ...t, captain } : t)))
  }

  const deleteTeam = (id: string) => {
    setTeams(teams.filter((t) => t.id !== id))
  }

  const addTeam = () => {
    const newId = String(Date.now())
    const color = TEAM_COLORS_LIST[teams.length % TEAM_COLORS_LIST.length]
    setTeams([...teams, { id: newId, name: `ทีม ${teams.length + 1}`, color }])
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-school-primary">จัดการทีม</h2>
        <button
          onClick={addTeam}
          className="px-4 py-2 bg-school-primary text-white rounded-lg hover:bg-school-primary-dark transition-colors"
        >
          + เพิ่มทีม
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-school-bg">
            <th className="px-4 py-2 text-left text-school-primary-dark">สี</th>
            <th className="px-4 py-2 text-left text-school-primary-dark">ชื่อทีม</th>
            <th className="px-4 py-2 text-left text-school-primary-dark">หัวหน้าทีม</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id} className="border-b border-gray-100">
              <td className="px-4 py-2">
                <span className={`inline-block w-6 h-6 rounded-full ${team.color}`} />
              </td>
              <td className="px-4 py-2">
                <input
                  value={team.name}
                  onChange={(e) => updateName(team.id, e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:border-school-primary"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  value={team.captain ?? ''}
                  onChange={(e) => updateCaptain(team.id, e.target.value)}
                  placeholder="ชื่อหัวหน้าทีม"
                  className="border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:border-school-primary text-gray-600"
                />
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => deleteTeam(team.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ลบ
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GamesTab() {
  const { games, setGames } = useStore()

  const updateGame = (id: string, partial: Partial<Game>) => {
    setGames(games.map((g) => (g.id === id ? { ...g, ...partial } : g)))
  }

  const deleteGame = (id: string) => {
    setGames(games.filter((g) => g.id !== id))
  }

  const addGame = () => {
    const newId = String(Date.now())
    setGames([...games, { id: newId, name: `เกม ${games.length + 1}`, type: 'physical' }])
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-school-primary">จัดการเกม</h2>
        <button
          onClick={addGame}
          className="px-4 py-2 bg-school-primary text-white rounded-lg hover:bg-school-primary-dark transition-colors"
        >
          + เพิ่มเกม
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">ตั้งค่าชื่อ ไอคอน สี และเนื้อหาเกมได้ในหน้าเกมโดยกดปุ่ม ⚙️</p>
      <div className="space-y-3">
        {games.map((game) => (
          <div key={game.id} className="border border-gray-100 rounded-xl p-3">
            <div className="flex gap-3 items-center">
              <span className="text-xl w-8 text-center">{game.icon ?? '🎮'}</span>
              <span className="flex-1 font-medium text-gray-800">{game.name}</span>
              <select
                value={game.type}
                onChange={(e) => updateGame(game.id, { type: e.target.value as Game['type'] })}
                className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-school-primary"
              >
                <option value="spot-difference">จับผิดภาพ</option>
                <option value="physical">กีฬา/กิจกรรม</option>
                <option value="human-bingo">Human Bingo</option>
              </select>
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={game.weight ?? 100}
                  onChange={(e) => updateGame(game.id, { weight: parseInt(e.target.value) || 0 })}
                  className="w-16 border border-gray-200 rounded px-2 py-1 text-center text-sm focus:outline-none focus:border-school-primary"
                  title="% weight"
                />
                <span className="text-gray-400 text-sm">%</span>
              </div>
              <button onClick={() => deleteGame(game.id)} className="text-red-500 hover:text-red-700 text-sm">
                ลบ
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



function ScoresTab() {
  const { teams, games, scores, addScore, setScores, resetScores } = useStore()
  const [localScores, setLocalScores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    scores.forEach((s) => {
      map[`${s.teamId}-${s.gameId}`] = s.points
    })
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
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-school-primary">บันทึกคะแนน</h2>
        <div className="flex gap-2">
          <button
            onClick={saveAll}
            className="px-4 py-2 bg-school-primary text-white rounded-lg hover:bg-school-primary-dark transition-colors"
          >
            บันทึกทั้งหมด
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            รีเซ็ตคะแนน
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-school-bg">
              <th className="px-4 py-2 text-left text-school-primary-dark">ทีม</th>
              {games.map((g) => (
                <th key={g.id} className="px-4 py-2 text-center text-school-primary-dark">
                  {g.name}
                </th>
              ))}
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b border-gray-100">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${team.color}`} />
                    <span>{team.name}</span>
                  </div>
                </td>
                {games.map((g) => (
                  <td key={g.id} className="px-4 py-2 text-center">
                    <input
                      type="number"
                      min="0"
                      value={localScores[key(team.id, g.id)] ?? ''}
                      onChange={(e) => handleChange(team.id, g.id, e.target.value)}
                      className="w-20 border border-gray-200 rounded px-2 py-1 text-center focus:outline-none focus:border-school-primary"
                      placeholder="0"
                    />
                  </td>
                ))}
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => saveRow(team.id)}
                    className="px-3 py-1 bg-school-primary-light text-white rounded text-sm hover:bg-school-primary transition-colors"
                  >
                    บันทึก
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SettingsTab() {
  const store = useStore()
  const { rankBonuses, setRankBonuses, appTitle, setAppTitle } = store
  const bonuses = rankBonuses ?? [10, 8, 7, 6, 5]
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [importError, setImportError] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const updateBonus = (idx: number, val: number) => {
    const next = [...bonuses]
    next[idx] = val
    setRankBonuses(next)
  }

  const addRow = () => { if (bonuses.length >= 12) return; setRankBonuses([...bonuses, bonuses[bonuses.length - 1] ?? 0]) }
  const removeRow = (idx: number) => {
    if (bonuses.length <= 1) return
    setRankBonuses(bonuses.filter((_, i) => i !== idx))
  }

  const handleExport = () => {
    const data = {
      teams: store.teams,
      games: store.games,
      scores: store.scores,
      rankBonuses: store.rankBonuses,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `edm-activity-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.teams || !data.games) throw new Error('ไฟล์ไม่มี teams หรือ games')
        store._hydrate({
          teams: data.teams,
          games: data.games,
          scores: data.scores ?? [],
          rankBonuses: data.rankBonuses ?? [10, 8, 7, 6, 4],
        })
        setImportStatus('ok')
        setTimeout(() => setImportStatus('idle'), 3000)
      } catch (err) {
        setImportStatus('err')
        setImportError(err instanceof Error ? err.message : String(err))
        setTimeout(() => setImportStatus('idle'), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-6 max-w-md">

      {/* App title */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold text-school-primary mb-4">ชื่อแอป</h2>
        <input
          value={appTitle}
          onChange={(e) => setAppTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-school-primary"
          placeholder="Active Fun Games (EDM 4.5)"
        />
      </div>

      {/* Import error modal */}
      {importError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-red-600 mb-2">นำเข้าไม่สำเร็จ</h3>
            <pre className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-all">{importError}</pre>
            <button
              onClick={() => setImportError(null)}
              className="mt-4 w-full py-2 bg-school-primary text-white rounded-xl font-semibold hover:bg-school-primary-dark transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Import / Export */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold text-school-primary mb-1">นำเข้า / ส่งออกข้อมูล</h2>
        <p className="text-gray-500 text-sm mb-4">
          ข้อมูลทั้งหมดเก็บใน localStorage ของเบราว์เซอร์นี้ — Export เพื่อสำรองหรือย้ายไปเครื่องอื่น
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-school-primary text-white hover:bg-school-primary-dark transition-colors"
          >
            ⬇️ Export JSON
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${importStatus === 'ok' ? 'bg-green-500 text-white' :
              importStatus === 'err' ? 'bg-red-500 text-white' :
                'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {importStatus === 'ok' ? '✓ นำเข้าสำเร็จ' : importStatus === 'err' ? '✗ ไฟล์ไม่ถูกต้อง' : '⬆️ Import JSON'}
          </button>
          <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
          <button
            onClick={() => {
              if (!confirm('รีเซ็ตข้อมูลทั้งหมดกลับค่าเริ่มต้น?')) return
              localStorage.removeItem('edm-activity')
              window.location.reload()
            }}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          >
            🗑️ Reset
          </button>
        </div>
      </div>

      {/* Rank bonuses */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold text-school-primary mb-1">ตั้งค่าคะแนน Rank</h2>
        <p className="text-gray-500 text-sm mb-6">
          คะแนนที่ได้ต่อ rank ในแต่ละเกม — รวมทุกเกมเป็นคะแนนรวม — แถวสุดท้ายใช้กับอันดับที่เหลือทั้งหมด
        </p>

        <div className="space-y-2 mb-4">
          {bonuses.map((val, idx) => {
            const isLast = idx === bonuses.length - 1
            const label = isLast && bonuses.length > 1
              ? `อันดับ ${idx + 1} ขึ้นไป`
              : `อันดับที่ ${idx + 1}`
            return (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-36 text-sm text-gray-600 flex-shrink-0">{label}</span>
                <input
                  type="number"
                  min="0"
                  value={val}
                  onChange={(e) => updateBonus(idx, parseInt(e.target.value) || 0)}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-center font-bold text-amber-600 focus:outline-none focus:border-amber-400"
                />
                <span className="text-gray-400 text-sm">คะแนน</span>
                {bonuses.length > 1 && (
                  <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 text-sm ml-auto">
                    ลบ
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={addRow}
          disabled={bonuses.length >= 12}
          className="px-4 py-2 border-2 border-dashed border-school-primary/40 text-school-primary rounded-lg hover:border-school-primary text-sm w-full disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {bonuses.length >= 12 ? `ครบ ${bonuses.length} อันดับแล้ว` : '+ เพิ่มอันดับ'}
        </button>
      </div>

    </div>
  )
}
