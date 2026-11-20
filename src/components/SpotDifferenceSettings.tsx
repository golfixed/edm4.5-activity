'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Game, ImageSet, ImagePair } from '@/lib/types'
import { compressImage } from '@/lib/compressImage'

interface Props {
  game: Game
  onClose: () => void
}

type SoundKey = 'soundStart' | 'soundTick' | 'soundTimeUp'

export default function SpotDifferenceSettings({ game, onClose }: Props) {
  const { games, setGames } = useStore()
  const [selectedSetId, setSelectedSetId] = useState<string | null>(
    () => game.imageSets?.[0]?.id ?? null
  )
  const [newSetName, setNewSetName] = useState('')
  const [showSounds, setShowSounds] = useState(false)
  const [uiScale, setUiScale] = useState(1.0)
  const [setDragIndex, setSetDragIndex] = useState<number | null>(null)
  const [setDropIndex, setSetDropIndex] = useState<number | null>(null)

  const updateGame = (partial: Partial<Game>) =>
    setGames(games.map(g => g.id === game.id ? { ...g, ...partial } : g))

  const liveGame = games.find(g => g.id === game.id) ?? game
  const sets = liveGame.imageSets ?? []
  const selectedSet = sets.find(s => s.id === selectedSetId) ?? null
  const totalPairs = sets.reduce((sum, s) => sum + s.pairs.length, 0)
  const soundsSet = [liveGame.soundStart, liveGame.soundTick, liveGame.soundTimeUp].filter(Boolean).length

  const addSet = () => {
    const name = newSetName.trim() || `ชุดที่ ${sets.length + 1}`
    const newSet: ImageSet = { id: String(Date.now()), name, pairs: [] }
    updateGame({ imageSets: [...sets, newSet] })
    setSelectedSetId(newSet.id)
    setNewSetName('')
  }

  const deleteSet = (id: string) => {
    const next = sets.filter(s => s.id !== id)
    updateGame({ imageSets: next })
    if (selectedSetId === id) setSelectedSetId(next[0]?.id ?? null)
  }

  const renameSet = (id: string, name: string) =>
    updateGame({ imageSets: sets.map(s => s.id === id ? { ...s, name } : s) })

  const handleSetDragStart = (i: number) => setSetDragIndex(i)
  const handleSetDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setSetDropIndex(i) }
  const handleSetDrop = (i: number) => {
    if (setDragIndex === null || setDragIndex === i) { setSetDragIndex(null); setSetDropIndex(null); return }
    const next = [...sets]
    const [item] = next.splice(setDragIndex, 1)
    next.splice(i, 0, item)
    updateGame({ imageSets: next })
    setSetDragIndex(null)
    setSetDropIndex(null)
  }
  const handleSetDragEnd = () => { setSetDragIndex(null); setSetDropIndex(null) }

  const updatePairs = (setId: string, pairs: ImagePair[]) =>
    updateGame({ imageSets: sets.map(s => s.id === setId ? { ...s, pairs } : s) })

  return (
    <div className="h-screen bg-neutral-800 flex flex-col overflow-hidden" style={{ zoom: uiScale }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 bg-neutral-700 border-b border-white/10 flex-shrink-0">
        <button onClick={onClose}
          className="w-9 h-9 flex items-center justify-center border border-white/25 rounded-lg text-white hover:bg-white/10 transition-colors flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-white/40 text-sm">ตั้งค่า</span>
          <span className="text-white/25 text-sm">›</span>
          <span className="text-white font-semibold truncate">{liveGame.name}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Timer */}
          <div className="flex items-center gap-1.5 border border-white/15 rounded-lg px-3 h-9">
            <span className="text-white/50 text-sm">⏱</span>
            <input
              type="number" min={5} max={300}
              value={liveGame.timerSeconds ?? 10}
              onChange={e => updateGame({ timerSeconds: parseInt(e.target.value) || 10 })}
              className="w-10 text-center bg-transparent text-white font-bold text-sm focus:outline-none"
            />
            <span className="text-white/35 text-xs">วิ/ข้อ</span>
          </div>

          {/* Sounds */}
          <button
            onClick={() => setShowSounds(v => !v)}
            className={`flex items-center gap-1.5 px-3 h-9 border rounded-lg text-sm transition-colors ${
              showSounds ? 'border-white/40 bg-white/10 text-white' : 'border-white/15 text-white/60 hover:bg-white/5'
            }`}>
            🔊
            {soundsSet > 0 && <span className="text-green-400 text-xs font-bold">{soundsSet}/3</span>}
          </button>

          {/* Scale */}
          <div className="flex items-center border border-white/15 rounded-lg overflow-hidden">
            <button onClick={() => setUiScale(s => Math.max(0.75, +(s - 0.1).toFixed(1)))}
              className="w-7 h-9 flex items-center justify-center text-white/50 hover:bg-white/10 text-base select-none">−</button>
            <span className="text-white/35 text-xs w-10 text-center border-x border-white/10 h-9 flex items-center justify-center tabular-nums">
              {Math.round(uiScale * 100)}%
            </span>
            <button onClick={() => setUiScale(s => Math.min(2.0, +(s + 0.1).toFixed(1)))}
              className="w-7 h-9 flex items-center justify-center text-white/50 hover:bg-white/10 text-base select-none">+</button>
          </div>
        </div>
      </div>

      {/* ── Sounds strip ────────────────────────────────────────────────── */}
      {showSounds && (
        <div className="bg-neutral-700/60 border-b border-white/10 px-5 py-3 flex items-center gap-3 flex-shrink-0 overflow-x-auto">
          <span className="text-white/35 text-xs font-semibold uppercase tracking-wider flex-shrink-0">เสียง</span>
          {([
            { key: 'soundStart' as SoundKey, label: '▶ เริ่มเกม' },
            { key: 'soundTick' as SoundKey, label: '🎵 Countdown' },
            { key: 'soundTimeUp' as SoundKey, label: '⏰ หมดเวลา' },
          ] as const).map(({ key, label }) => (
            <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm flex-shrink-0 ${
              liveGame[key] ? 'border-green-500/30 bg-green-500/8' : 'border-white/10 bg-white/5'
            }`}>
              <span className="text-white/60 text-xs whitespace-nowrap">{label}</span>
              {liveGame[key] && (
                <>
                  <span className="text-green-400 text-xs">✓</span>
                  <button onClick={() => new Audio(liveGame[key] as string).play()}
                    className="text-white/40 hover:text-white text-xs transition-colors px-1">▶</button>
                </>
              )}
              <label className="text-white/45 hover:text-white/80 text-xs cursor-pointer transition-colors">
                {liveGame[key] ? 'เปลี่ยน' : 'เลือก'}
                <input type="file" accept="audio/*" hidden onChange={e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const reader = new FileReader()
                  reader.onload = ev => updateGame({ [key]: ev.target?.result as string })
                  reader.readAsDataURL(f)
                }} />
              </label>
              {liveGame[key] && (
                <button onClick={() => updateGame({ [key]: null })}
                  className="text-red-400/50 hover:text-red-400 text-xs transition-colors">✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: sets list */}
        <div className="w-56 flex flex-col border-r border-white/10 flex-shrink-0">
          <div className="px-4 py-2 flex items-center justify-between border-b border-white/5 flex-shrink-0">
            <span className="text-white/35 text-xs font-semibold uppercase tracking-wider">ชุดภาพ</span>
            <span className="text-white/20 text-xs">{totalPairs} โจทย์รวม</span>
          </div>

          <div className="flex-1 overflow-y-auto py-1.5 px-2 space-y-0.5">
            {sets.map((set, i) => {
              const answered = set.pairs.filter(p => p.correctImage).length
              const isComplete = answered === set.pairs.length && set.pairs.length > 0
              const isSelected = selectedSetId === set.id
              return (
                <div
                  key={set.id}
                  draggable
                  onDragStart={() => handleSetDragStart(i)}
                  onDragOver={e => handleSetDragOver(e, i)}
                  onDrop={() => handleSetDrop(i)}
                  onDragEnd={handleSetDragEnd}
                  onClick={() => setSelectedSetId(set.id)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors group ${
                    setDragIndex === i
                      ? 'opacity-30 border border-white/10'
                      : setDropIndex === i && setDragIndex !== null
                      ? 'border border-blue-400/60 bg-blue-400/5'
                      : isSelected
                      ? 'bg-white/15 text-white'
                      : 'text-white/50 hover:bg-white/10 hover:text-white/75'
                  }`}
                >
                  <div className="text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing flex-shrink-0 select-none" title="ลากเพื่อเรียงลำดับ">
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
                      <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
                      <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{set.name}</div>
                    <div className="text-xs text-white/30 mt-0.5">
                      {set.pairs.length} โจทย์
                      {set.pairs.length > 0 && (
                        <span className={`ml-1 ${isComplete ? 'text-green-400' : 'text-amber-400'}`}>
                          · {answered}/{set.pairs.length} ✓
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteSet(set.id) }}
                    className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 text-xs transition-opacity flex-shrink-0 p-0.5">
                    ✕
                  </button>
                </div>
              )
            })}

            {sets.length === 0 && (
              <p className="text-white/20 text-xs text-center py-6 px-2">ยังไม่มีชุดภาพ</p>
            )}
          </div>

          <div className="p-2.5 border-t border-white/10 flex-shrink-0">
            <div className="flex gap-1.5">
              <input
                value={newSetName}
                onChange={e => setNewSetName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSet()}
                placeholder="ชื่อชุดใหม่..."
                className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/70 text-xs placeholder-white/20 focus:outline-none focus:border-white/25"
              />
              <button onClick={addSet}
                className="px-2.5 py-1.5 bg-white/8 hover:bg-white/15 border border-white/15 rounded-lg text-white/60 text-sm font-bold transition-colors">
                +
              </button>
            </div>
          </div>
        </div>

        {/* Right: pairs editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedSet ? (
            <>
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/10 flex-shrink-0">
                <input
                  value={selectedSet.name}
                  onChange={e => renameSet(selectedSet.id, e.target.value)}
                  className="text-white font-bold text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-white/20 rounded-md px-1.5 py-0.5 flex-1"
                />
                <span className="text-white/30 text-xs flex-shrink-0">
                  {selectedSet.pairs.filter(p => p.correctImage).length}/{selectedSet.pairs.length} ตั้งเฉลยแล้ว
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <PairsEditorFull
                  pairs={selectedSet.pairs}
                  onChange={pairs => updatePairs(selectedSet.id, pairs)}
                  sets={sets}
                  currentSetId={selectedSet.id}
                  onMovePair={(pairId, targetSetId) => {
                    const pair = selectedSet.pairs.find(p => p.id === pairId)
                    if (!pair) return
                    updateGame({
                      imageSets: sets.map(s => {
                        if (s.id === selectedSet.id) return { ...s, pairs: s.pairs.filter(p => p.id !== pairId) }
                        if (s.id === targetSetId) return { ...s, pairs: [...s.pairs, pair] }
                        return s
                      })
                    })
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white/25">
                <div className="text-5xl mb-3 opacity-50">🖼</div>
                <p className="text-sm">{sets.length === 0 ? 'สร้างชุดภาพจากช่องด้านซ้าย' : 'เลือกชุดภาพจากซ้าย'}</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

/* ── Pairs editor ───────────────────────────────────────────────────── */
interface PairsEditorProps {
  pairs: ImagePair[]
  onChange: (p: ImagePair[]) => void
  sets?: ImageSet[]
  currentSetId?: string
  onMovePair?: (pairId: string, targetSetId: string) => void
}
function PairsEditorFull({ pairs, onChange, sets, currentSetId, onMovePair }: PairsEditorProps) {
  const [pendingA, setPendingA] = useState<string | null>(null)
  const [pendingAMode, setPendingAMode] = useState<'image' | 'text'>('image')
  const [pendingAText, setPendingAText] = useState('')
  const [pendingB, setPendingB] = useState<string | null>(null)
  const [pendingBMode, setPendingBMode] = useState<'image' | 'text'>('image')
  const [pendingBText, setPendingBText] = useState('')
  const [pendingLabel, setPendingLabel] = useState('')
  const [pendingQuestion, setPendingQuestion] = useState('')
  const [pendingQuestionImage, setPendingQuestionImage] = useState<string | null>(null)
  const [pendingRevealImage, setPendingRevealImage] = useState<string | null>(null)
  const [pendingQMode, setPendingQMode] = useState<'text' | 'image'>('text')
  const [pendingCorrect, setPendingCorrect] = useState<'A' | 'B'>('A')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [moveDropdownPairId, setMoveDropdownPairId] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null)
  // tracks which pair IDs are in image-question mode (independent of whether image is uploaded yet)
  const [imageModePairIds, setImageModePairIds] = useState<Set<string>>(
    () => new Set(pairs.filter(p => p.questionImage).map(p => p.id))
  )
  const isImageMode = (pair: ImagePair) => imageModePairIds.has(pair.id) || !!pair.questionImage
  const isImg = (s?: string) => !!s && s.startsWith('data:image')

  const readFile = (file: File, setter: (v: string) => void) =>
    compressImage(file, 900, 0.72).then(setter)

  const addPair = () => {
    const valA = pendingAMode === 'text' ? pendingAText : pendingA
    const valB = pendingBMode === 'text' ? pendingBText : pendingB
    if (!valA || !valB) return
    onChange([...pairs, {
      id: String(Date.now()),
      imageA: valA, imageB: valB,
      label: pendingLabel || `ข้อที่ ${pairs.length + 1}`,
      question: pendingQuestion || undefined,
      questionImage: pendingQuestionImage || undefined,
      revealImage: pendingRevealImage || undefined,
      correctImage: pendingCorrect,
    }])
    setPendingA(null); setPendingAMode('image'); setPendingAText('')
    setPendingB(null); setPendingBMode('image'); setPendingBText('')
    setPendingLabel(''); setPendingQuestion(''); setPendingQuestionImage(null); setPendingRevealImage(null); setPendingQMode('text'); setPendingCorrect('A')
  }

  const handleBulkUpload = (files: FileList) => {
    const arr = Array.from(files)
    const promises: Promise<ImagePair>[] = []
    for (let i = 0; i + 1 < arr.length; i += 2) {
      const a = arr[i], b = arr[i + 1]
      promises.push(Promise.all([
        compressImage(a, 900, 0.72),
        compressImage(b, 900, 0.72),
      ]).then(([imgA, imgB]) => ({
        id: String(Date.now() + i),
        imageA: imgA, imageB: imgB,
        label: `ข้อที่ ${pairs.length + i / 2 + 1}`,
        correctImage: 'A' as const,
      })))
    }
    Promise.all(promises).then(newPairs => onChange([...pairs, ...newPairs]))
  }

  const downloadImage = (dataUrl: string, name: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = name
    a.click()
  }

  const handleDragStart = (i: number) => setDragIndex(i)
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    setDropIndex(i)
  }
  const handleDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i) { setDragIndex(null); setDropIndex(null); return }
    const next = [...pairs]
    const [item] = next.splice(dragIndex, 1)
    next.splice(i, 0, item)
    onChange(next)
    setDragIndex(null)
    setDropIndex(null)
  }
  const handleDragEnd = () => { setDragIndex(null); setDropIndex(null) }

  return (
    <div className="p-4 space-y-1.5">

      {/* Existing pairs */}
      {pairs.map((pair, i) => {
        const dragCls = dragIndex === i ? 'opacity-30 border-white/10'
          : dropIndex === i && dragIndex !== null ? 'border-blue-400/60 bg-blue-400/5'
          : 'border-white/10 hover:border-white/15'
        return (
        <div key={pair.id}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={e => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          className={`flex flex-col bg-white/5 border rounded-xl transition-all overflow-hidden ${dragCls}`}
        >
          {/* ── Main row ─────────────────────────────────── */}
          <div className="flex items-stretch gap-0">

            {/* Drag + number */}
            <div className="flex flex-col items-center justify-center gap-1 px-2 py-3 flex-shrink-0 border-r border-white/8">
              <div className="text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing select-none" title="ลากเพื่อเรียงลำดับ">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
                  <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
                  <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
                </svg>
              </div>
              <span className="text-white/25 text-xs font-mono leading-none">{i + 1}</span>
            </div>

            {/* Choices */}
            <div className="flex items-center gap-2 px-3 py-3 flex-shrink-0">
              {(['A', 'B'] as const).map((side, idx) => {
                const key = side === 'A' ? 'imageA' : 'imageB'
                const val = pair[key]
                const groupCls = side === 'A' ? 'group/imgA' : 'group/imgB'
                const hoverCls = side === 'A' ? 'group-hover/imgA:opacity-100' : 'group-hover/imgB:opacity-100'
                const badgeCls = pair.correctImage === side ? 'bg-green-500 text-white' : 'bg-black/60 text-white/50'
                return (
                  <div key={side} className="flex items-center gap-2">
                    {idx === 1 && <span className="text-white/20 text-xs self-center">vs</span>}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`relative ${groupCls}`}>
                        {isImg(val) ? (
                          <>
                            <img src={val} alt={side} className="w-20 h-14 object-cover rounded-lg" />
                            <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shadow ${badgeCls}`}>{side}</span>
                            <button
                              onClick={() => downloadImage(val, `${(pair.label ?? 'pair').replace(/\s+/g, '_')}_${side}.jpg`)}
                              title={`ดาวน์โหลด ${side}`}
                              className={`absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 ${hoverCls} transition-opacity`}>
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <div className="w-20 h-14 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center px-2 relative">
                            <span className="text-white/70 text-xs text-center leading-tight line-clamp-3 break-all">{val || '—'}</span>
                            <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shadow ${badgeCls}`}>{side}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex border border-white/10 rounded overflow-hidden">
                        <button
                          onClick={() => {
                            const text = prompt(`ข้อความสำหรับตัวเลือก ${side}:`, !isImg(val) ? (val ?? '') : '') ?? ''
                            onChange(pairs.map(p => p.id === pair.id ? { ...p, [key]: text } : p))
                          }}
                          className={`px-1.5 py-0.5 text-[10px] leading-none transition-colors ${!isImg(val) ? 'bg-white/15 text-white' : 'text-white/25 hover:bg-white/8'}`}
                          title="ข้อความ">T</button>
                        <label className={`px-1.5 py-0.5 text-[10px] leading-none cursor-pointer transition-colors ${isImg(val) ? 'bg-white/15 text-white' : 'text-white/25 hover:bg-white/8'}`} title="ภาพ">
                          🖼
                          <input type="file" accept="image/*" hidden onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) compressImage(f, 900, 0.72).then(img =>
                              onChange(pairs.map(p => p.id === pair.id ? { ...p, [key]: img } : p))
                            )
                          }} />
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Meta (flex-1) */}
            <div className="flex-1 flex flex-col justify-center gap-2 px-3 py-3 min-w-0 border-l border-white/8">
              {/* Row 1: label + move + delete */}
              <div className="flex items-center gap-2">
                <input
                  value={pair.label ?? ''}
                  onChange={e => onChange(pairs.map(p => p.id === pair.id ? { ...p, label: e.target.value } : p))}
                  className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-white/70 text-sm placeholder-white/25 focus:outline-none focus:border-white/20 focus:bg-white/8 min-w-0"
                  placeholder="ชื่อโจทย์..."
                />
                {onMovePair && sets && sets.filter(s => s.id !== currentSetId).length > 0 && (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={e => {
                        if (moveDropdownPairId === pair.id) {
                          setMoveDropdownPairId(null); setDropdownPos(null)
                        } else {
                          const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                          setDropdownPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
                          setMoveDropdownPairId(pair.id)
                        }
                      }}
                      title="ย้ายไปชุดอื่น"
                      className="w-7 h-7 flex items-center justify-center text-blue-400/40 hover:text-blue-400 hover:bg-blue-400/8 rounded-lg transition-colors text-sm">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 8h10M9 5l3 3-3 3" />
                        <path d="M13 3v10" strokeWidth={1.5} />
                      </svg>
                    </button>
                    {moveDropdownPairId === pair.id && dropdownPos && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => { setMoveDropdownPairId(null); setDropdownPos(null) }} />
                        <div
                          className="fixed z-50 bg-zinc-800 border border-white/15 rounded-xl shadow-2xl min-w-[140px] py-1 overflow-hidden"
                          style={{ top: dropdownPos.top, right: dropdownPos.right }}
                        >
                          <p className="text-white/35 text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5">ย้ายไปชุด</p>
                          {sets.filter(s => s.id !== currentSetId).map(s => (
                            <button key={s.id}
                              onClick={() => { onMovePair(pair.id, s.id); setMoveDropdownPairId(null); setDropdownPos(null) }}
                              className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors truncate">
                              {s.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <button onClick={() => onChange(pairs.filter(p => p.id !== pair.id))}
                  className="w-7 h-7 flex items-center justify-center text-red-400/40 hover:text-red-400 hover:bg-red-400/8 rounded-lg transition-colors text-sm flex-shrink-0">✕</button>
              </div>
              {/* Row 2: timer + correct answer */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 border border-white/10 rounded-lg px-2.5 h-8 flex-shrink-0">
                  <span className="text-white/35 text-xs">⏱</span>
                  <input
                    type="number" min={1} max={300}
                    value={pair.timerSeconds ?? ''}
                    onChange={e => {
                      const v = e.target.value === '' ? undefined : parseInt(e.target.value) || undefined
                      onChange(pairs.map(p => p.id === pair.id ? { ...p, timerSeconds: v } : p))
                    }}
                    className="w-10 text-center bg-transparent text-white/70 text-sm focus:outline-none tabular-nums"
                    placeholder="—"
                  />
                  <span className="text-white/30 text-xs">วิ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white/35 text-xs font-medium">เฉลย</span>
                  {(['A', 'B'] as const).map(side => (
                    <button key={side}
                      onClick={() => onChange(pairs.map(p => p.id === pair.id ? { ...p, correctImage: side } : p))}
                      className={`w-9 h-8 rounded-lg text-xs font-bold transition-all ${
                        pair.correctImage === side
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-white/8 text-white/35 hover:bg-white/15 hover:text-white/60'
                      }`}>{side}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Question / reveal row ─────────────────────── */}
          <div className="flex items-start gap-3 px-3 py-2.5 border-t border-white/8 bg-black/10">
            {/* T / 🖼 toggle */}
            <div className="flex border border-white/10 rounded-md overflow-hidden flex-shrink-0 mt-0.5">
              <button
                onClick={() => {
                  setImageModePairIds(s => { const n = new Set(s); n.delete(pair.id); return n })
                  onChange(pairs.map(p => p.id === pair.id ? { ...p, questionImage: undefined } : p))
                }}
                className={`px-2 py-1 text-xs transition-colors ${!isImageMode(pair) ? 'bg-white/15 text-white' : 'text-white/30 hover:bg-white/8'}`}
                title="คำถามข้อความ">T</button>
              <button
                onClick={() => {
                  setImageModePairIds(s => { const n = new Set(s); n.add(pair.id); return n })
                  onChange(pairs.map(p => p.id === pair.id ? { ...p, question: undefined } : p))
                }}
                className={`px-2 py-1 text-xs transition-colors ${isImageMode(pair) ? 'bg-white/15 text-white' : 'text-white/30 hover:bg-white/8'}`}
                title="คำถามภาพ">🖼</button>
            </div>

            {isImageMode(pair) ? (
              <div className="flex gap-4 flex-1 min-w-0">
                {/* Question image slot */}
                <div className="flex flex-col gap-1">
                  <span className="text-white/35 text-[10px] font-semibold uppercase tracking-wider">โจทย์</span>
                  {pair.questionImage ? (
                    <>
                      <img src={pair.questionImage} alt="Q" className="h-14 max-w-[140px] rounded-lg object-contain bg-white/5 border border-white/10" />
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <label className="text-white/40 hover:text-white/70 text-xs cursor-pointer transition-colors">
                          เปลี่ยน
                          <input type="file" accept="image/*" hidden onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) compressImage(f, 900, 0.72).then(img =>
                              onChange(pairs.map(p => p.id === pair.id ? { ...p, questionImage: img } : p))
                            )
                          }} />
                        </label>
                        <button onClick={() => onChange(pairs.map(p => p.id === pair.id ? { ...p, questionImage: undefined } : p))}
                          className="text-red-400/40 hover:text-red-400 text-xs transition-colors">✕</button>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="h-14 w-24 rounded-lg border-2 border-dashed border-white/15 flex flex-col items-center justify-center hover:border-white/30 bg-white/3 text-white/25 transition-colors gap-0.5">
                        <span className="text-lg">+</span>
                        <span className="text-[10px]">อัพโหลด</span>
                      </div>
                      <input type="file" accept="image/*" hidden onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) compressImage(f, 900, 0.72).then(img =>
                          onChange(pairs.map(p => p.id === pair.id ? { ...p, questionImage: img } : p))
                        )
                      }} />
                    </label>
                  )}
                </div>

                {/* Reveal image slot */}
                <div className="flex flex-col gap-1">
                  <span className="text-amber-400/60 text-[10px] font-semibold uppercase tracking-wider">เฉลย</span>
                  {pair.revealImage ? (
                    <>
                      <img src={pair.revealImage} alt="เฉลย" className="h-14 max-w-[140px] rounded-lg object-contain bg-white/5 border border-amber-400/20" />
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <label className="text-amber-400/50 hover:text-amber-400/80 text-xs cursor-pointer transition-colors">
                          เปลี่ยน
                          <input type="file" accept="image/*" hidden onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) compressImage(f, 900, 0.72).then(img =>
                              onChange(pairs.map(p => p.id === pair.id ? { ...p, revealImage: img } : p))
                            )
                          }} />
                        </label>
                        <button onClick={() => onChange(pairs.map(p => p.id === pair.id ? { ...p, revealImage: undefined } : p))}
                          className="text-red-400/40 hover:text-red-400 text-xs transition-colors">✕</button>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="h-14 w-24 rounded-lg border-2 border-dashed border-amber-400/15 flex flex-col items-center justify-center hover:border-amber-400/30 bg-white/3 text-amber-400/25 transition-colors gap-0.5">
                        <span className="text-lg">+</span>
                        <span className="text-[10px]">อัพโหลด</span>
                      </div>
                      <input type="file" accept="image/*" hidden onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) compressImage(f, 900, 0.72).then(img =>
                          onChange(pairs.map(p => p.id === pair.id ? { ...p, revealImage: img } : p))
                        )
                      }} />
                    </label>
                  )}
                </div>
              </div>
            ) : (
              <input
                value={pair.question ?? ''}
                onChange={e => onChange(pairs.map(p => p.id === pair.id ? { ...p, question: e.target.value || undefined } : p))}
                className="flex-1 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-white/85 text-sm placeholder-white/20 focus:outline-none focus:border-white/25 focus:bg-white/8"
                placeholder="คำถาม/บริบท เช่น 'ลูกค้า Jobthai' — แสดงใหญ่ระหว่างเล่น"
              />
            )}
          </div>
        </div>
        )
      })}

      {/* Add new pair form */}
      <div className="border border-dashed border-white/15 rounded-xl p-4 mt-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-xs font-semibold">+ เพิ่มโจทย์ใหม่</p>
          <label className="flex items-center gap-1.5 px-3 py-1 bg-white/8 hover:bg-white/12 border border-white/10 rounded-lg text-white/50 text-xs cursor-pointer transition-colors">
            <span>📂 นำเข้าหลายรูป</span>
            <input type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files?.length) handleBulkUpload(e.target.files) }} />
          </label>
        </div>

        <div className="flex items-start gap-4">
          {/* Slot A */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-white/35 text-xs">{pendingAMode === 'text' ? 'ข้อความ' : 'ภาพ'} A</span>
              <div className="flex border border-white/10 rounded overflow-hidden">
                <button onClick={() => { setPendingAMode('text'); setPendingA(null) }}
                  className={`px-1.5 py-0.5 text-[10px] leading-none transition-colors ${pendingAMode === 'text' ? 'bg-white/15 text-white' : 'text-white/25 hover:bg-white/8'}`}>T</button>
                <button onClick={() => { setPendingAMode('image'); setPendingAText('') }}
                  className={`px-1.5 py-0.5 text-[10px] leading-none transition-colors ${pendingAMode === 'image' ? 'bg-white/15 text-white' : 'text-white/25 hover:bg-white/8'}`}>🖼</button>
              </div>
            </div>
            {pendingAMode === 'text' ? (
              <textarea
                value={pendingAText}
                onChange={e => setPendingAText(e.target.value)}
                placeholder="พิมพ์ข้อความ..."
                className="w-24 h-16 rounded-lg border-2 border-white/20 bg-white/5 text-white/80 text-sm p-1.5 resize-none focus:outline-none focus:border-white/40 placeholder-white/20"
              />
            ) : (
              <label className="cursor-pointer">
                {pendingA ? (
                  <img src={pendingA} className="w-24 h-16 object-cover rounded-lg border-2 border-white/30" />
                ) : (
                  <div className="w-24 h-16 rounded-lg border-2 border-dashed border-white/15 flex items-center justify-center hover:border-white/30 transition-colors bg-white/5 text-white/25 text-2xl">+</div>
                )}
                <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f, setPendingA) }} />
              </label>
            )}
          </div>

          <div className="text-white/20 text-sm pt-9">vs</div>

          {/* Slot B */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-white/35 text-xs">{pendingBMode === 'text' ? 'ข้อความ' : 'ภาพ'} B</span>
              <div className="flex border border-white/10 rounded overflow-hidden">
                <button onClick={() => { setPendingBMode('text'); setPendingB(null) }}
                  className={`px-1.5 py-0.5 text-[10px] leading-none transition-colors ${pendingBMode === 'text' ? 'bg-white/15 text-white' : 'text-white/25 hover:bg-white/8'}`}>T</button>
                <button onClick={() => { setPendingBMode('image'); setPendingBText('') }}
                  className={`px-1.5 py-0.5 text-[10px] leading-none transition-colors ${pendingBMode === 'image' ? 'bg-white/15 text-white' : 'text-white/25 hover:bg-white/8'}`}>🖼</button>
              </div>
            </div>
            {pendingBMode === 'text' ? (
              <textarea
                value={pendingBText}
                onChange={e => setPendingBText(e.target.value)}
                placeholder="พิมพ์ข้อความ..."
                className="w-24 h-16 rounded-lg border-2 border-white/20 bg-white/5 text-white/80 text-sm p-1.5 resize-none focus:outline-none focus:border-white/40 placeholder-white/20"
              />
            ) : (
              <label className="cursor-pointer">
                {pendingB ? (
                  <img src={pendingB} className="w-24 h-16 object-cover rounded-lg border-2 border-white/30" />
                ) : (
                  <div className="w-24 h-16 rounded-lg border-2 border-dashed border-white/15 flex items-center justify-center hover:border-white/30 transition-colors bg-white/5 text-white/25 text-2xl">+</div>
                )}
                <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f, setPendingB) }} />
              </label>
            )}
          </div>

          {/* Label + question + correct + add */}
          <div className="flex-1 flex flex-col gap-2 pt-6 min-w-0">
            <input
              value={pendingLabel}
              onChange={e => setPendingLabel(e.target.value)}
              placeholder="ชื่ออ้างอิง (ไม่บังคับ)"
              onKeyDown={e => e.key === 'Enter' && addPair()}
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/65 text-sm placeholder-white/20 focus:outline-none focus:border-white/25"
            />
            <div className="flex items-center gap-2">
              <div className="flex border border-white/10 rounded-md overflow-hidden flex-shrink-0">
                <button onClick={() => { setPendingQMode('text'); setPendingQuestionImage(null) }}
                  className={`px-2 py-1 text-xs transition-colors ${pendingQMode === 'text' ? 'bg-white/15 text-white' : 'text-white/30 hover:bg-white/8'}`}
                  title="คำถามข้อความ">T</button>
                <button onClick={() => { setPendingQMode('image'); setPendingQuestion('') }}
                  className={`px-2 py-1 text-xs transition-colors ${pendingQMode === 'image' ? 'bg-white/15 text-white' : 'text-white/30 hover:bg-white/8'}`}
                  title="คำถามภาพ">🖼</button>
              </div>
              {pendingQMode === 'image' ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {pendingQuestionImage ? (
                    <img src={pendingQuestionImage} alt="Q" className="h-8 max-w-[120px] rounded object-contain bg-white/5" />
                  ) : (
                    <span className="text-white/20 text-xs">ยังไม่มีภาพ</span>
                  )}
                  <label className="text-white/40 hover:text-white/70 text-xs cursor-pointer transition-colors">
                    {pendingQuestionImage ? 'เปลี่ยน' : '+ อัพโหลด'}
                    <input type="file" accept="image/*" hidden onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) compressImage(f, 900, 0.72).then(setPendingQuestionImage)
                    }} />
                  </label>
                  {pendingQuestionImage && (
                    <button onClick={() => setPendingQuestionImage(null)}
                      className="text-red-400/40 hover:text-red-400 text-xs transition-colors">✕</button>
                  )}
                  {/* reveal image for new pair */}
                  <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-white/10">
                    <span className="text-amber-400/60 text-xs flex-shrink-0">เฉลย</span>
                    {pendingRevealImage ? (
                      <img src={pendingRevealImage} alt="เฉลย" className="h-8 max-w-[80px] rounded object-contain bg-white/5" />
                    ) : (
                      <span className="text-white/15 text-xs">—</span>
                    )}
                    <label className="text-white/40 hover:text-white/70 text-xs cursor-pointer transition-colors">
                      {pendingRevealImage ? 'เปลี่ยน' : '+ เพิ่ม'}
                      <input type="file" accept="image/*" hidden onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) compressImage(f, 900, 0.72).then(setPendingRevealImage)
                      }} />
                    </label>
                    {pendingRevealImage && (
                      <button onClick={() => setPendingRevealImage(null)}
                        className="text-red-400/40 hover:text-red-400 text-xs transition-colors">✕</button>
                    )}
                  </div>
                </div>
              ) : (
                <input
                  value={pendingQuestion}
                  onChange={e => setPendingQuestion(e.target.value)}
                  placeholder="คำถาม/บริบท เช่น 'ลูกค้า Jobthai' — แสดงใหญ่ระหว่างเล่น"
                  onKeyDown={e => e.key === 'Enter' && addPair()}
                  className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/85 text-sm font-medium placeholder-white/20 focus:outline-none focus:border-white/25"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs">เฉลย:</span>
              {(['A', 'B'] as const).map(side => (
                <button key={side} onClick={() => setPendingCorrect(side)}
                  className={`w-10 h-8 rounded-lg text-sm font-bold transition-all ${
                    pendingCorrect === side ? 'bg-green-500 text-white' : 'bg-white/8 text-white/40 hover:bg-white/15'
                  }`}>{side}</button>
              ))}
              <button onClick={addPair} disabled={!(pendingAMode === 'text' ? pendingAText : pendingA) || !(pendingBMode === 'text' ? pendingBText : pendingB)}
                className="ml-auto px-5 py-1.5 bg-white text-gray-900 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors disabled:opacity-25 disabled:cursor-not-allowed">
                + เพิ่ม
              </button>
            </div>
          </div>
        </div>
      </div>

      {pairs.length === 0 && (
        <p className="text-white/20 text-xs text-center py-4">ยังไม่มีโจทย์ — เพิ่มรูปด้านบน</p>
      )}
    </div>
  )
}
