'use client'

import { useState, useRef } from 'react'
import { useStore, TEAM_COLORS_LIST } from '@/lib/store'
import { Team, Game, Score, ImagePair, ImageSet, AuctionItem } from '@/lib/types'
import Link from 'next/link'

type Tab = 'teams' | 'games' | 'scores' | 'settings'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('scores')

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="flex items-center gap-1 px-3 py-1.5 border border-school-primary/40 rounded-lg text-school-primary hover:bg-school-primary/10 transition-colors text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            กลับ
          </Link>
          <h1 className="text-3xl font-bold text-school-primary-dark">
            ⚙️ Admin Panel
          </h1>
        </div>

        <div className="flex gap-2 mb-6">
          {(['scores', 'teams', 'games', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg font-semibold transition-colors ${tab === t
                ? 'bg-school-primary text-white'
                : 'bg-white text-school-primary border border-school-primary hover:bg-school-bg'
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

  const handleBgUpload = (id: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => updateGame(id, { backgroundImage: e.target?.result as string })
    reader.readAsDataURL(file)
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
      <div className="space-y-4">
        {games.map((game) => (
          <div key={game.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex gap-3 items-center">
              <input
                value={game.icon ?? '🎮'}
                onChange={(e) => updateGame(game.id, { icon: e.target.value })}
                className="w-14 border border-gray-200 rounded px-2 py-1 text-center text-xl focus:outline-none focus:border-school-primary"
                maxLength={2}
                title="Emoji icon"
              />
              <input
                value={game.name}
                onChange={(e) => updateGame(game.id, { name: e.target.value })}
                className="flex-1 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-school-primary"
              />
              <select
                value={game.type}
                onChange={(e) => updateGame(game.id, { type: e.target.value as Game['type'] })}
                className="border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-school-primary"
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
                  className="w-16 border border-gray-200 rounded px-2 py-1 text-center focus:outline-none focus:border-school-primary"
                  title="% weight"
                />
                <span className="text-gray-400 text-sm">%</span>
              </div>
              <button onClick={() => deleteGame(game.id)} className="text-red-500 hover:text-red-700 text-sm">
                ลบ
              </button>
            </div>

            {game.type === 'physical' && (
              <>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600">ภาพพื้นหลัง:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgUpload(game.id, f) }}
                    className="text-sm"
                  />
                  {game.backgroundImage && <span className="text-green-600 text-sm">✓ อัปโหลดแล้ว</span>}
                </div>
                <AuctionItemsEditor game={game} updateGame={updateGame} />
              </>
            )}

            {game.type === 'human-bingo' && (
              <BingoKeywordsEditor game={game} updateGame={updateGame} handleBgUpload={handleBgUpload} />
            )}

            {game.type === 'spot-difference' && (
              <>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600">⏱ เวลาต่อข้อ (วินาที):</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={game.timerSeconds ?? 10}
                    onChange={(e) => updateGame(game.id, { timerSeconds: parseInt(e.target.value) || 30 })}
                    className="w-20 border border-gray-200 rounded px-2 py-1 text-center focus:outline-none focus:border-school-primary"
                  />
                </div>
                <SoundUploader game={game} updateGame={updateGame} />
                <ImageSetsEditor game={game} updateGame={updateGame} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function BingoKeywordsEditor({
  game,
  updateGame,
  handleBgUpload,
}: {
  game: Game
  updateGame: (id: string, partial: Partial<Game>) => void
  handleBgUpload: (id: string, file: File) => void
}) {
  const keywords = game.bingoKeywords ?? []
  const count = keywords.length

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600 font-medium">Keywords (1 บรรทัด / คำ)</label>
          <span className={`text-xs font-semibold ${count >= 24 ? 'text-green-600' : 'text-orange-500'}`}>
            {count} / 24 keywords (ต้องการ 24 คำขึ้นไปสำหรับ 5×5)
          </span>
        </div>
        <textarea
          value={keywords.join('\n')}
          onChange={(e) => {
            const value = e.target.value
            updateGame(game.id, { bingoKeywords: value.split('\n').map((s) => s.trim()).filter(Boolean) })
          }}
          placeholder="เคยไปญี่ปุ่น&#10;ใช้ Mechanical Keyboard&#10;มีแมว&#10;..."
          rows={10}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-school-primary font-mono"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">ภาพพื้นหลัง:</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgUpload(game.id, f) }}
          className="text-sm"
        />
        {game.backgroundImage && <span className="text-green-600 text-sm">✓ อัปโหลดแล้ว</span>}
      </div>
    </div>
  )
}

function SoundUploader({
  game,
  updateGame,
}: {
  game: Game
  updateGame: (id: string, partial: Partial<Game>) => void
}) {
  const readAudio = (file: File, key: 'soundStart' | 'soundTick' | 'soundTimeUp') => {
    const reader = new FileReader()
    reader.onload = (e) => updateGame(game.id, { [key]: e.target?.result as string })
    reader.readAsDataURL(file)
  }

  const previewSound = (src?: string) => {
    if (!src) return
    new Audio(src).play()
  }

  const soundFields: { key: 'soundStart' | 'soundTick' | 'soundTimeUp'; label: string; hint: string }[] = [
    { key: 'soundStart', label: '▶ เริ่มเกม', hint: 'เล่นครั้งเดียวตอนเริ่ม' },
    { key: 'soundTick', label: '🎵 เพลง Countdown', hint: 'เล่น loop ตลอดการนับถอยหลัง' },
    { key: 'soundTimeUp', label: '⏰ หมดเวลา', hint: 'เล่นเมื่อเวลาหมด' },
  ]

  return (
    <div className="bg-school-bg/50 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-school-primary-dark text-sm">🔊 เสียงเกม</h3>
      <div className="space-y-2">
        {soundFields.map(({ key, label, hint }) => (
          <div key={key} className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${game[key] ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
            <span className="text-sm font-medium text-gray-700 w-28 flex-shrink-0">{label}</span>
            <span className="text-xs text-gray-400 flex-1">{hint}</span>
            {game[key] && (
              <span className="text-xs text-green-600 font-medium flex-shrink-0">✓ มีไฟล์แล้ว</span>
            )}
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) readAudio(f, key) }}
              className="text-xs w-32 flex-shrink-0"
            />
            {game[key] ? (
              <button
                onClick={() => previewSound(game[key] as string)}
                className="px-2 py-1 bg-school-primary text-white text-xs rounded hover:bg-school-primary-dark transition-colors flex-shrink-0"
              >
                ▶ ทดสอบ
              </button>
            ) : (
              <span className="text-xs text-gray-300 w-16 text-center flex-shrink-0">ไม่มีไฟล์</span>
            )}
            {game[key] && (
              <button
                onClick={() => updateGame(game.id, { [key]: undefined })}
                className="text-red-400 hover:text-red-600 text-xs flex-shrink-0"
              >
                ลบ
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ImageSetsEditor({
  game,
  updateGame,
}: {
  game: Game
  updateGame: (id: string, partial: Partial<Game>) => void
}) {
  const sets = game.imageSets ?? []
  const [expandedSetIds, setExpandedSetIds] = useState<Set<string>>(() => new Set(sets.map(s => s.id)))
  const [newSetName, setNewSetName] = useState('')

  const saveSets = (next: ImageSet[]) => updateGame(game.id, { imageSets: next })

  const addSet = () => {
    const name = newSetName.trim() || `ชุดที่ ${sets.length + 1}`
    saveSets([...sets, { id: String(Date.now()), name, pairs: [] }])
    setNewSetName('')
  }

  const deleteSet = (setId: string) => {
    saveSets(sets.filter((s) => s.id !== setId))
    setExpandedSetIds(prev => { const next = new Set(prev); next.delete(setId); return next })
  }

  const renameSet = (setId: string, name: string) => {
    saveSets(sets.map((s) => (s.id === setId ? { ...s, name } : s)))
  }

  const updatePairs = (setId: string, pairs: ImagePair[]) => {
    saveSets(sets.map((s) => (s.id === setId ? { ...s, pairs } : s)))
  }

  return (
    <div className="bg-school-bg/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-school-primary-dark text-sm">ชุดภาพ ({sets.length} ชุด)</h3>
      </div>

      {/* Sets list */}
      <div className="space-y-2">
        {sets.map((set, si) => (
          <div key={set.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Set header */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-gray-400 text-sm w-5 flex-shrink-0">{si + 1}.</span>
              <input
                value={set.name}
                onChange={(e) => renameSet(set.id, e.target.value)}
                className="flex-1 font-semibold text-sm text-school-primary-dark border-b border-transparent hover:border-gray-200 focus:border-school-primary focus:outline-none py-0.5"
              />
              <span className="text-xs text-gray-400">{set.pairs.length} โจทย์</span>
              <button
                onClick={() => setExpandedSetIds(prev => { const next = new Set(prev); next.has(set.id) ? next.delete(set.id) : next.add(set.id); return next })}
                className="px-2 py-1 bg-school-bg text-school-primary rounded text-xs hover:bg-school-accent/30 transition-colors"
              >
                {expandedSetIds.has(set.id) ? '▲ ซ่อน' : '▼ จัดการ'}
              </button>
              <button onClick={() => deleteSet(set.id)} className="text-red-400 hover:text-red-600 text-xs">ลบ</button>
            </div>

            {/* Pairs editor (expanded) */}
            {expandedSetIds.has(set.id) && (
              <div className="border-t border-gray-100 p-3">
                <PairsEditor
                  pairs={set.pairs}
                  onChange={(pairs) => updatePairs(set.id, pairs)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new set */}
      <div className="flex gap-2">
        <input
          value={newSetName}
          onChange={(e) => setNewSetName(e.target.value)}
          placeholder={`ชื่อชุด (เช่น ชุดที่ ${sets.length + 1})`}
          className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-school-primary"
          onKeyDown={(e) => e.key === 'Enter' && addSet()}
        />
        <button
          onClick={addSet}
          className="px-4 py-1.5 bg-school-primary text-white rounded text-sm hover:bg-school-primary-dark transition-colors"
        >
          + เพิ่มชุด
        </button>
      </div>
    </div>
  )
}

function PairsEditor({
  pairs,
  onChange,
}: {
  pairs: ImagePair[]
  onChange: (pairs: ImagePair[]) => void
}) {
  const [pendingA, setPendingA] = useState<string | null>(null)
  const [pendingB, setPendingB] = useState<string | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')
  const [pendingCorrect, setPendingCorrect] = useState<'A' | 'B'>('A')

  const readFile = (file: File, setter: (v: string) => void) => {
    const reader = new FileReader()
    reader.onload = (e) => setter(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const addPair = () => {
    if (!pendingA || !pendingB) return
    onChange([...pairs, {
      id: String(Date.now()),
      imageA: pendingA,
      imageB: pendingB,
      label: pendingLabel || `ข้อที่ ${pairs.length + 1}`,
      correctImage: pendingCorrect,
    }])
    setPendingA(null); setPendingB(null); setPendingLabel(''); setPendingCorrect('A')
  }

  const deletePair = (id: string) => onChange(pairs.filter((p) => p.id !== id))

  const setCorrect = (id: string, correct: 'A' | 'B') =>
    onChange(pairs.map((p) => (p.id === id ? { ...p, correctImage: correct } : p)))

  return (
    <div className="space-y-3">
      {pairs.map((pair, i) => (
        <div key={pair.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
          <span className="text-gray-400 text-xs w-4">{i + 1}.</span>
          <div className="relative flex-shrink-0">
            <img src={pair.imageA} alt="A" className="w-12 h-8 object-cover rounded border" />
            {pair.correctImage === 'A' && <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-3.5 h-3.5 flex items-center justify-center">✓</span>}
          </div>
          <span className="text-gray-300 text-xs">vs</span>
          <div className="relative flex-shrink-0">
            <img src={pair.imageB} alt="B" className="w-12 h-8 object-cover rounded border" />
            {pair.correctImage === 'B' && <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-3.5 h-3.5 flex items-center justify-center">✓</span>}
          </div>
          <span className="text-gray-600 text-xs flex-1 truncate">{pair.label}</span>
          <span className="text-xs text-gray-400">เฉลย:</span>
          {(['A', 'B'] as const).map((side) => (
            <button key={side} onClick={() => setCorrect(pair.id, side)}
              className={`px-2 py-0.5 rounded text-xs font-bold ${pair.correctImage === side ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
              {side}
            </button>
          ))}
          <button onClick={() => deletePair(pair.id)} className="text-red-400 hover:text-red-600 text-xs">ลบ</button>
        </div>
      ))}

      {/* Add pair */}
      <div className="border border-dashed border-school-primary/30 rounded-lg p-2 space-y-2">
        <p className="text-xs text-school-primary font-medium">+ เพิ่มโจทย์</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">ภาพ A</label>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, setPendingA) }} className="text-xs w-full" />
            {pendingA && <img src={pendingA} className="mt-1 h-12 object-contain rounded" />}
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">ภาพ B</label>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, setPendingB) }} className="text-xs w-full" />
            {pendingB && <img src={pendingB} className="mt-1 h-12 object-contain rounded" />}
          </div>
        </div>
        <div className="flex gap-1.5 items-center">
          <input value={pendingLabel} onChange={(e) => setPendingLabel(e.target.value)}
            placeholder={`ชื่อข้อ`}
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-school-primary" />
          <span className="text-xs text-gray-400">เฉลย:</span>
          {(['A', 'B'] as const).map((side) => (
            <button key={side} onClick={() => setPendingCorrect(side)}
              className={`px-2.5 py-1 rounded text-xs font-bold ${pendingCorrect === side ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {side}
            </button>
          ))}
          <button onClick={addPair} disabled={!pendingA || !pendingB}
            className="px-3 py-1 bg-school-primary text-white rounded text-xs hover:bg-school-primary-dark disabled:opacity-40 disabled:cursor-not-allowed">
            เพิ่ม
          </button>
        </div>
      </div>
    </div>
  )
}

function AuctionItemsEditor({
  game,
  updateGame,
}: {
  game: Game
  updateGame: (id: string, patch: Partial<Game>) => void
}) {
  const items: AuctionItem[] = game.auctionItems ?? []

  const addItem = () => {
    const newItem: AuctionItem = { id: Date.now().toString(), name: `อุปกรณ์ ${items.length + 1}` }
    updateGame(game.id, { auctionItems: [...items, newItem] })
  }

  const updateItem = (itemId: string, patch: Partial<AuctionItem>) => {
    updateGame(game.id, { auctionItems: items.map((it) => it.id === itemId ? { ...it, ...patch } : it) })
  }

  const removeItem = (itemId: string) => {
    updateGame(game.id, { auctionItems: items.filter((it) => it.id !== itemId) })
  }

  const handleVideoUpload = (itemId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => updateItem(itemId, { videoBase64: e.target?.result as string })
    reader.readAsDataURL(file)
  }


  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-school-primary">🎁 อุปกรณ์ประมูล ({items.length})</h4>
        {(
          <button
            onClick={addItem}
            className="px-3 py-1 bg-school-primary text-white text-xs rounded-lg hover:bg-school-primary-dark transition-colors"
          >
            + เพิ่มอุปกรณ์
          </button>
        )}
      </div>
      {items.length === 0 && (
        <p className="text-gray-400 text-sm">ยังไม่มีอุปกรณ์ — กด "+ เพิ่มอุปกรณ์" เพื่อเริ่ม</p>
      )}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-bold w-5">{idx + 1}.</span>
              <input
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                placeholder="ชื่ออุปกรณ์ (เฉลย)"
                className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-school-primary"
              />
              <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 text-xs">ลบ</button>
            </div>
            <div className="flex items-center gap-3 pl-7">
              <label className="text-xs text-gray-500">วิดีโอ:</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(item.id, f) }}
                className="text-xs"
              />
              {item.videoBase64 && <span className="text-green-600 text-xs">✓ อัปโหลดแล้ว</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoresTab() {
  const { teams, games, scores, addScore, resetScores } = useStore()
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
    games.forEach((g) => {
      const points = localScores[key(teamId, g.id)] ?? 0
      addScore({ teamId, gameId: g.id, points })
    })
  }

  const saveAll = () => {
    teams.forEach((t) => saveRow(t.id))
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
  const { rankBonuses, setRankBonuses } = store
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
