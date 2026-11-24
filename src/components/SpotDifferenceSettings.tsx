'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Game, ImageSet, ImagePair } from '@/lib/types'
import { compressImage } from '@/lib/compressImage'
import { resolveIconColor } from '@/lib/iconColors'
import GameSettings from './GameSettings'

interface Props {
  game: Game
  onClose: () => void
}

type SoundKey = 'soundStart' | 'soundTick' | 'soundTimeUp'

const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const ICON = {
  x: <svg className="w-3.5 h-3.5" {...svgProps} strokeWidth={2.5}><path d="M6 6l12 12M18 6 6 18" /></svg>,
  plus: (cls = 'w-4 h-4') => <svg className={cls} {...svgProps} strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>,
  minus: <svg className="w-4 h-4" {...svgProps} strokeWidth={2.5}><path d="M5 12h14" /></svg>,
  check: (cls = 'w-3.5 h-3.5') => <svg className={cls} {...svgProps} strokeWidth={2.75}><path d="M5 12.5l4.5 4.5L19 7" /></svg>,
  play: (cls = 'w-3 h-3') => <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>,
  clock: (cls: string) => <svg className={cls} {...svgProps}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9.5 2.5h5M12 2.5V5" /></svg>,
  alarm: <svg className="w-3.5 h-3.5" {...svgProps}><circle cx="12" cy="13" r="7.5" /><path d="M12 9.5V13l2.5 2M5 3.5 2.5 6M19 3.5 21.5 6" /></svg>,
  music: <svg className="w-3.5 h-3.5" {...svgProps}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>,
  speaker: <svg className="w-4 h-4" {...svgProps}><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>,
  image: (cls = 'w-3 h-3') => <svg className={cls} {...svgProps}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="1.75" /><path d="m21 16-5-5-9 9" /></svg>,
  folder: <svg className="w-3.5 h-3.5" {...svgProps}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.5h7.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /></svg>,
  chevronRight: <svg className="w-3.5 h-3.5" {...svgProps} strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>,
}

export default function SpotDifferenceSettings({ game, onClose }: Props) {
  const { games, setGames } = useStore()
  const [selectedSetId, setSelectedSetId] = useState<string | null>(
    () => game.imageSets?.[0]?.id ?? null
  )
  const [newSetName, setNewSetName] = useState('')
  const [showSounds, setShowSounds] = useState(false)
  const [showIdentity, setShowIdentity] = useState(false)
  const [uiScale, setUiScale] = useState(1.0)
  const [setDragIndex, setSetDragIndex] = useState<number | null>(null)
  const [setDropIndex, setSetDropIndex] = useState<number | null>(null)

  const updateGame = (partial: Partial<Game>) =>
    setGames(games.map(g => g.id === game.id ? { ...g, ...partial } : g))

  const liveGame = games.find(g => g.id === game.id) ?? game
  const sets = liveGame.imageSets ?? []
  const selectedSet = sets.find(s => s.id === selectedSetId) ?? null
  const totalPairs = sets.reduce((sum, s) => sum + s.pairs.length, 0)
  const iconColor = resolveIconColor(liveGame.iconColor, liveGame.colorIdx ?? null)
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
    <div className="h-screen bg-orange-50 flex flex-col overflow-hidden" style={{ zoom: uiScale }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-orange-100 shadow-sm flex-shrink-0">
        <button onClick={onClose}
          className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm transition-colors flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          กลับ
        </button>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-gray-500 text-sm">ตั้งค่า</span>
          <span className="text-gray-300">{ICON.chevronRight}</span>
          <span className="text-gray-900 font-semibold truncate">{liveGame.name}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Name & icon */}
          <button onClick={() => setShowIdentity(true)} title="แก้ไขชื่อเกมและไอคอน"
            className="flex items-center gap-2 pl-1.5 pr-3 h-9 bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm transition-colors">
            <span className="w-6 h-6 rounded-md flex items-center justify-center text-sm leading-none"
              style={{ background: `linear-gradient(145deg, ${iconColor.from}, ${iconColor.to})` }}>
              {liveGame.icon ?? '🎮'}
            </span>
            ชื่อและไอคอน
          </button>

          {/* Timer */}
          <div className="flex items-center gap-1.5 border border-orange-200 rounded-lg px-3 h-9">
            {ICON.clock('w-4 h-4 text-orange-500')}
            <input
              type="number" min={5} max={300}
              value={liveGame.timerSeconds ?? 10}
              onChange={e => updateGame({ timerSeconds: parseInt(e.target.value) || 10 })}
              className="w-10 text-center bg-transparent text-gray-900 font-bold text-sm focus:outline-none"
            />
            <span className="text-gray-400 text-xs">วิ/ข้อ</span>
          </div>

          {/* Sounds */}
          <button
            onClick={() => setShowSounds(v => !v)}
            className={`flex items-center gap-1.5 px-3 h-9 border rounded-lg text-sm transition-colors ${
              showSounds ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-orange-200 bg-white text-orange-700 hover:bg-orange-50'
            }`}>
            {ICON.speaker}
            {soundsSet > 0 && <span className="text-green-600 text-xs font-bold">{soundsSet}/3</span>}
          </button>

          {/* Scale */}
          <div className="flex items-center border border-orange-200 rounded-lg overflow-hidden">
            <button onClick={() => setUiScale(s => Math.max(0.75, +(s - 0.1).toFixed(1)))}
              className="w-7 h-9 flex items-center justify-center text-orange-700 hover:bg-orange-50 select-none">{ICON.minus}</button>
            <span className="text-gray-400 text-xs w-10 text-center border-x border-orange-100 h-9 flex items-center justify-center tabular-nums">
              {Math.round(uiScale * 100)}%
            </span>
            <button onClick={() => setUiScale(s => Math.min(2.0, +(s + 0.1).toFixed(1)))}
              className="w-7 h-9 flex items-center justify-center text-orange-700 hover:bg-orange-50 select-none">{ICON.plus()}</button>
          </div>
        </div>
      </div>

      {/* ── Sounds strip ────────────────────────────────────────────────── */}
      {showSounds && (
        <div className="bg-white border-b border-orange-100 px-5 py-3 flex items-center gap-3 flex-shrink-0 overflow-x-auto">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider flex-shrink-0">เสียง</span>
          {([
            { key: 'soundStart' as SoundKey, label: 'เริ่มเกม', icon: ICON.play('w-3.5 h-3.5') },
            { key: 'soundTick' as SoundKey, label: 'Countdown', icon: ICON.music },
            { key: 'soundTimeUp' as SoundKey, label: 'หมดเวลา', icon: ICON.alarm },
          ]).map(({ key, label, icon }) => (
            <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm flex-shrink-0 ${
              liveGame[key] ? 'border-green-300 bg-green-50' : 'border-orange-100 bg-white'
            }`}>
              <span className="flex items-center gap-1.5 text-gray-600 text-xs whitespace-nowrap"><span className="text-orange-500">{icon}</span>{label}</span>
              {liveGame[key] && (
                <>
                  <span className="text-green-600">{ICON.check()}</span>
                  <button onClick={() => new Audio(liveGame[key] as string).play()}
                    className="text-gray-500 hover:text-orange-600 transition-colors px-1" title="ฟังเสียง">{ICON.play()}</button>
                </>
              )}
              <label className="text-gray-500 hover:text-gray-700 text-xs cursor-pointer transition-colors">
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
                  className="text-red-300 hover:text-red-500 text-xs transition-colors">{ICON.x}</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: sets list */}
        <div className="w-56 flex flex-col border-r border-orange-100 flex-shrink-0">
          <div className="px-4 py-2 flex items-center justify-between border-b border-orange-100 flex-shrink-0">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">ชุดภาพ</span>
            <span className="text-gray-300 text-xs">{totalPairs} โจทย์รวม</span>
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
                      ? 'opacity-30 border border-orange-100'
                      : setDropIndex === i && setDragIndex !== null
                      ? 'border border-orange-400 bg-orange-50'
                      : isSelected
                      ? 'bg-orange-100 text-orange-900'
                      : 'text-gray-500 hover:bg-orange-50 hover:text-gray-700'
                  }`}
                >
                  <div className="text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0 select-none" title="ลากเพื่อเรียงลำดับ">
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
                      <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
                      <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{set.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {set.pairs.length} โจทย์
                      {set.pairs.length > 0 && (
                        <span className={`ml-1 ${isComplete ? 'text-green-600' : 'text-amber-600'}`}>
                          · {answered}/{set.pairs.length} <span className="inline-block align-[-1px]">{ICON.check('w-3 h-3')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteSet(set.id) }}
                    className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-opacity flex-shrink-0 p-0.5">
                    {ICON.x}
                  </button>
                </div>
              )
            })}

            {sets.length === 0 && (
              <p className="text-gray-300 text-xs text-center py-6 px-2">ยังไม่มีชุดภาพ</p>
            )}
          </div>

          <div className="p-2.5 border-t border-orange-100 flex-shrink-0">
            <div className="flex gap-1.5">
              <input
                value={newSetName}
                onChange={e => setNewSetName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSet()}
                placeholder="ชื่อชุดใหม่..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-orange-100 rounded-lg text-gray-600 text-xs placeholder-gray-300 focus:outline-none focus:border-orange-400"
              />
              <button onClick={addSet}
                className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-orange-700 transition-colors">
                {ICON.plus()}
              </button>
            </div>
          </div>
        </div>

        {/* Right: pairs editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedSet ? (
            <>
              <div className="flex items-center gap-3 px-5 py-2.5 border-b border-orange-100 flex-shrink-0">
                <input
                  value={selectedSet.name}
                  onChange={e => renameSet(selectedSet.id, e.target.value)}
                  className="text-gray-900 font-bold text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-orange-300 rounded-md px-1.5 py-0.5 flex-1"
                />
                <span className="text-gray-400 text-xs flex-shrink-0">
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
              <div className="text-center text-gray-300">
                <div className="flex justify-center mb-3 text-orange-200">{ICON.image('w-14 h-14')}</div>
                <p className="text-sm">{sets.length === 0 ? 'สร้างชุดภาพจากช่องด้านซ้าย' : 'เลือกชุดภาพจากซ้าย'}</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {showIdentity && <GameSettings game={liveGame} onClose={() => setShowIdentity(false)} identityOnly />}
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
        const dragCls = dragIndex === i ? 'opacity-30 border-orange-100'
          : dropIndex === i && dragIndex !== null ? 'border-orange-400 bg-orange-50'
          : 'border-orange-100 hover:border-orange-200'
        return (
        <div key={pair.id}
          onDragOver={e => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          className={`flex flex-col bg-white border rounded-xl transition-all overflow-hidden ${dragCls}`}
        >
          {/* ── Main row ─────────────────────────────────── */}
          <div className="flex items-stretch gap-0">

            {/* Drag + number */}
            <div
              draggable
              onDragStart={() => handleDragStart(i)}
              className="flex flex-col items-center justify-center gap-1 px-2 py-3 flex-shrink-0 border-r border-orange-100 cursor-grab active:cursor-grabbing"
            >
              <div className="text-gray-300 hover:text-gray-600 select-none" title="ลากเพื่อเรียงลำดับ">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
                  <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
                  <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
                </svg>
              </div>
              <span className="text-gray-300 text-xs font-mono leading-none">{i + 1}</span>
            </div>

            {/* Choices */}
            <div className="flex items-center gap-2 px-3 py-3 flex-shrink-0">
              {(['A', 'B'] as const).map((side, idx) => {
                const key = side === 'A' ? 'imageA' : 'imageB'
                const val = pair[key]
                const groupCls = side === 'A' ? 'group/imgA' : 'group/imgB'
                const hoverCls = side === 'A' ? 'group-hover/imgA:opacity-100' : 'group-hover/imgB:opacity-100'
                const badgeCls = pair.correctImage === side ? 'bg-green-500 text-white' : 'bg-white text-gray-400 border border-orange-200'
                return (
                  <div key={side} className="flex items-center gap-2">
                    {idx === 1 && <span className="text-gray-300 text-xs self-center">vs</span>}
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
                          <div className="w-20 h-14 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center px-1 relative">
                            <textarea
                              value={val || ''}
                              onChange={e => onChange(pairs.map(p => p.id === pair.id ? { ...p, [key]: e.target.value } : p))}
                              className="w-full h-full bg-transparent text-gray-700 text-xs text-center leading-tight resize-none focus:outline-none placeholder-gray-300 py-1"
                              placeholder="พิมพ์..."
                            />
                            <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shadow pointer-events-none ${badgeCls}`}>{side}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex border border-orange-100 rounded overflow-hidden">
                        <button
                          onClick={() => {
                            if (isImg(val)) onChange(pairs.map(p => p.id === pair.id ? { ...p, [key]: '' } : p))
                          }}
                          className={`px-1.5 py-0.5 text-[10px] leading-none transition-colors ${!isImg(val) ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-orange-50'}`}
                          title="ข้อความ">T</button>
                        <label className={`px-1.5 py-0.5 text-[10px] leading-none cursor-pointer transition-colors ${isImg(val) ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-orange-50'}`} title="ภาพ">
                          {ICON.image()}
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
            <div className="flex-1 flex flex-col justify-center gap-2 px-3 py-3 min-w-0 border-l border-orange-100">
              {/* Row 1: label + move + delete */}
              <div className="flex items-center gap-2">
                <input
                  value={pair.label ?? ''}
                  onChange={e => onChange(pairs.map(p => p.id === pair.id ? { ...p, label: e.target.value } : p))}
                  className="flex-1 bg-white border border-orange-100 rounded-lg px-2.5 py-1.5 text-gray-600 text-sm placeholder-gray-300 focus:outline-none focus:border-orange-400 focus:bg-white min-w-0"
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
                      className="w-7 h-7 flex items-center justify-center text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 8h10M9 5l3 3-3 3" />
                        <path d="M13 3v10" strokeWidth={1.5} />
                      </svg>
                    </button>
                    {moveDropdownPairId === pair.id && dropdownPos && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => { setMoveDropdownPairId(null); setDropdownPos(null) }} />
                        <div
                          className="fixed z-50 bg-white border border-orange-100 rounded-xl shadow-2xl min-w-[140px] py-1 overflow-hidden"
                          style={{ top: dropdownPos.top, right: dropdownPos.right }}
                        >
                          <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5">ย้ายไปชุด</p>
                          {sets.filter(s => s.id !== currentSetId).map(s => (
                            <button key={s.id}
                              onClick={() => { onMovePair(pair.id, s.id); setMoveDropdownPairId(null); setDropdownPos(null) }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-orange-50 hover:text-gray-900 transition-colors truncate">
                              {s.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <button onClick={() => onChange(pairs.filter(p => p.id !== pair.id))}
                  className="w-7 h-7 flex items-center justify-center text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">{ICON.x}</button>
              </div>
              {/* Row 2: timer + correct answer */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 border border-orange-100 rounded-lg px-2.5 h-8 flex-shrink-0">
                  {ICON.clock('w-3.5 h-3.5 text-orange-500')}
                  <input
                    type="number" min={1} max={300}
                    value={pair.timerSeconds ?? ''}
                    onChange={e => {
                      const v = e.target.value === '' ? undefined : parseInt(e.target.value) || undefined
                      onChange(pairs.map(p => p.id === pair.id ? { ...p, timerSeconds: v } : p))
                    }}
                    className="w-10 text-center bg-transparent text-gray-600 text-sm focus:outline-none tabular-nums"
                    placeholder="—"
                  />
                  <span className="text-gray-400 text-xs">วิ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 text-xs font-medium">เฉลย</span>
                  {(['A', 'B'] as const).map(side => (
                    <button key={side}
                      onClick={() => onChange(pairs.map(p => p.id === pair.id ? { ...p, correctImage: side } : p))}
                      className={`w-9 h-8 rounded-lg text-xs font-bold transition-all ${
                        pair.correctImage === side
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-orange-50 text-gray-400 hover:bg-orange-100 hover:text-gray-600'
                      }`}>{side}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Question / reveal row ─────────────────────── */}
          <div className="flex items-start gap-3 px-3 py-2.5 border-t border-orange-100 bg-orange-50/60">
            {/* text / image question toggle */}
            <div className="flex border border-orange-100 rounded-md overflow-hidden flex-shrink-0 mt-0.5">
              <button
                onClick={() => {
                  setImageModePairIds(s => { const n = new Set(s); n.delete(pair.id); return n })
                  onChange(pairs.map(p => p.id === pair.id ? { ...p, questionImage: undefined } : p))
                }}
                className={`px-2 py-1 text-xs transition-colors ${!isImageMode(pair) ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-orange-50'}`}
                title="คำถามข้อความ">T</button>
              <button
                onClick={() => {
                  setImageModePairIds(s => { const n = new Set(s); n.add(pair.id); return n })
                  onChange(pairs.map(p => p.id === pair.id ? { ...p, question: undefined } : p))
                }}
                className={`px-2 py-1 text-xs transition-colors ${isImageMode(pair) ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-orange-50'}`}
                title="คำถามภาพ">{ICON.image()}</button>
            </div>

            {isImageMode(pair) ? (
              <div className="flex gap-4 flex-1 min-w-0">
                {/* Question image slot */}
                <div className="flex flex-col gap-1">
                  <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">โจทย์</span>
                  {pair.questionImage ? (
                    <>
                      <img src={pair.questionImage} alt="Q" className="h-14 max-w-[140px] rounded-lg object-contain bg-white border border-orange-100" />
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <label className="text-gray-500 hover:text-gray-700 text-xs cursor-pointer transition-colors">
                          เปลี่ยน
                          <input type="file" accept="image/*" hidden onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) compressImage(f, 900, 0.72).then(img =>
                              onChange(pairs.map(p => p.id === pair.id ? { ...p, questionImage: img } : p))
                            )
                          }} />
                        </label>
                        <button onClick={() => onChange(pairs.map(p => p.id === pair.id ? { ...p, questionImage: undefined } : p))}
                          className="text-red-300 hover:text-red-500 text-xs transition-colors">{ICON.x}</button>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="h-14 w-24 rounded-lg border-2 border-dashed border-orange-200 flex flex-col items-center justify-center hover:border-orange-300 bg-orange-50/40 text-gray-300 transition-colors gap-0.5">
                        {ICON.plus('w-5 h-5')}
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
                  <span className="text-amber-600 text-[10px] font-semibold uppercase tracking-wider">เฉลย</span>
                  {pair.revealImage ? (
                    <>
                      <img src={pair.revealImage} alt="เฉลย" className="h-14 max-w-[140px] rounded-lg object-contain bg-white border border-amber-200" />
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <label className="text-amber-600 hover:text-amber-700 text-xs cursor-pointer transition-colors">
                          เปลี่ยน
                          <input type="file" accept="image/*" hidden onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) compressImage(f, 900, 0.72).then(img =>
                              onChange(pairs.map(p => p.id === pair.id ? { ...p, revealImage: img } : p))
                            )
                          }} />
                        </label>
                        <button onClick={() => onChange(pairs.map(p => p.id === pair.id ? { ...p, revealImage: undefined } : p))}
                          className="text-red-300 hover:text-red-500 text-xs transition-colors">{ICON.x}</button>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="h-14 w-24 rounded-lg border-2 border-dashed border-amber-300 flex flex-col items-center justify-center hover:border-amber-400 bg-orange-50/40 text-amber-400 transition-colors gap-0.5">
                        {ICON.plus('w-5 h-5')}
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
                className="flex-1 bg-white border border-orange-100 rounded-lg px-2.5 py-1.5 text-gray-700 text-sm placeholder-gray-300 focus:outline-none focus:border-orange-400 focus:bg-white"
                placeholder="คำถาม/บริบท เช่น 'ลูกค้า Jobthai' — แสดงใหญ่ระหว่างเล่น"
              />
            )}
          </div>
        </div>
        )
      })}

      {/* Add new pair form */}
      <div className="border border-dashed border-orange-200 rounded-xl p-4 mt-3">
        <div className="flex items-center justify-between mb-3">
          <p className="flex items-center gap-1.5 text-orange-700 text-xs font-semibold">{ICON.plus('w-3.5 h-3.5')}เพิ่มโจทย์ใหม่</p>
          <label className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-lg text-gray-500 text-xs cursor-pointer transition-colors">
            {ICON.folder}<span>นำเข้าหลายรูป</span>
            <input type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files?.length) handleBulkUpload(e.target.files) }} />
          </label>
        </div>

        <div className="flex items-start gap-4">
          {/* Slot A */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-xs">{pendingAMode === 'text' ? 'ข้อความ' : 'ภาพ'} A</span>
              <div className="flex border border-orange-100 rounded overflow-hidden">
                <button onClick={() => { setPendingAMode('text'); setPendingA(null) }}
                  className={`px-1.5 py-0.5 text-[10px] leading-none transition-colors ${pendingAMode === 'text' ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-orange-50'}`}>T</button>
                <button onClick={() => { setPendingAMode('image'); setPendingAText('') }}
                  className={`px-1.5 py-0.5 text-[10px] leading-none transition-colors ${pendingAMode === 'image' ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-orange-50'}`}>{ICON.image()}</button>
              </div>
            </div>
            {pendingAMode === 'text' ? (
              <textarea
                value={pendingAText}
                onChange={e => setPendingAText(e.target.value)}
                placeholder="พิมพ์ข้อความ..."
                className="w-24 h-16 rounded-lg border-2 border-orange-200 bg-white text-gray-700 text-sm p-1.5 resize-none focus:outline-none focus:border-orange-400 placeholder-gray-300"
              />
            ) : (
              <label className="cursor-pointer">
                {pendingA ? (
                  <img src={pendingA} className="w-24 h-16 object-cover rounded-lg border-2 border-orange-300" />
                ) : (
                  <div className="w-24 h-16 rounded-lg border-2 border-dashed border-orange-200 flex items-center justify-center hover:border-orange-300 transition-colors bg-white text-gray-300">{ICON.plus('w-6 h-6')}</div>
                )}
                <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f, setPendingA) }} />
              </label>
            )}
          </div>

          <div className="text-gray-300 text-sm pt-9">vs</div>

          {/* Slot B */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-xs">{pendingBMode === 'text' ? 'ข้อความ' : 'ภาพ'} B</span>
              <div className="flex border border-orange-100 rounded overflow-hidden">
                <button onClick={() => { setPendingBMode('text'); setPendingB(null) }}
                  className={`px-1.5 py-0.5 text-[10px] leading-none transition-colors ${pendingBMode === 'text' ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-orange-50'}`}>T</button>
                <button onClick={() => { setPendingBMode('image'); setPendingBText('') }}
                  className={`px-1.5 py-0.5 text-[10px] leading-none transition-colors ${pendingBMode === 'image' ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-orange-50'}`}>{ICON.image()}</button>
              </div>
            </div>
            {pendingBMode === 'text' ? (
              <textarea
                value={pendingBText}
                onChange={e => setPendingBText(e.target.value)}
                placeholder="พิมพ์ข้อความ..."
                className="w-24 h-16 rounded-lg border-2 border-orange-200 bg-white text-gray-700 text-sm p-1.5 resize-none focus:outline-none focus:border-orange-400 placeholder-gray-300"
              />
            ) : (
              <label className="cursor-pointer">
                {pendingB ? (
                  <img src={pendingB} className="w-24 h-16 object-cover rounded-lg border-2 border-orange-300" />
                ) : (
                  <div className="w-24 h-16 rounded-lg border-2 border-dashed border-orange-200 flex items-center justify-center hover:border-orange-300 transition-colors bg-white text-gray-300">{ICON.plus('w-6 h-6')}</div>
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
              className="w-full px-3 py-1.5 bg-white border border-orange-100 rounded-lg text-gray-600 text-sm placeholder-gray-300 focus:outline-none focus:border-orange-400"
            />
            <div className="flex items-center gap-2">
              <div className="flex border border-orange-100 rounded-md overflow-hidden flex-shrink-0">
                <button onClick={() => { setPendingQMode('text'); setPendingQuestionImage(null) }}
                  className={`px-2 py-1 text-xs transition-colors ${pendingQMode === 'text' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-orange-50'}`}
                  title="คำถามข้อความ">T</button>
                <button onClick={() => { setPendingQMode('image'); setPendingQuestion('') }}
                  className={`px-2 py-1 text-xs transition-colors ${pendingQMode === 'image' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-orange-50'}`}
                  title="คำถามภาพ">{ICON.image()}</button>
              </div>
              {pendingQMode === 'image' ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {pendingQuestionImage ? (
                    <img src={pendingQuestionImage} alt="Q" className="h-8 max-w-[120px] rounded object-contain bg-white" />
                  ) : (
                    <span className="text-gray-300 text-xs">ยังไม่มีภาพ</span>
                  )}
                  <label className="text-gray-500 hover:text-gray-700 text-xs cursor-pointer transition-colors">
                    {pendingQuestionImage ? 'เปลี่ยน' : '+ อัพโหลด'}
                    <input type="file" accept="image/*" hidden onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) compressImage(f, 900, 0.72).then(setPendingQuestionImage)
                    }} />
                  </label>
                  {pendingQuestionImage && (
                    <button onClick={() => setPendingQuestionImage(null)}
                      className="text-red-300 hover:text-red-500 text-xs transition-colors">{ICON.x}</button>
                  )}
                  {/* reveal image for new pair */}
                  <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-orange-100">
                    <span className="text-amber-600 text-xs flex-shrink-0">เฉลย</span>
                    {pendingRevealImage ? (
                      <img src={pendingRevealImage} alt="เฉลย" className="h-8 max-w-[80px] rounded object-contain bg-white" />
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                    <label className="text-gray-500 hover:text-gray-700 text-xs cursor-pointer transition-colors">
                      {pendingRevealImage ? 'เปลี่ยน' : '+ เพิ่ม'}
                      <input type="file" accept="image/*" hidden onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) compressImage(f, 900, 0.72).then(setPendingRevealImage)
                      }} />
                    </label>
                    {pendingRevealImage && (
                      <button onClick={() => setPendingRevealImage(null)}
                        className="text-red-300 hover:text-red-500 text-xs transition-colors">{ICON.x}</button>
                    )}
                  </div>
                </div>
              ) : (
                <input
                  value={pendingQuestion}
                  onChange={e => setPendingQuestion(e.target.value)}
                  placeholder="คำถาม/บริบท เช่น 'ลูกค้า Jobthai' — แสดงใหญ่ระหว่างเล่น"
                  onKeyDown={e => e.key === 'Enter' && addPair()}
                  className="flex-1 px-3 py-1.5 bg-white border border-orange-100 rounded-lg text-gray-700 text-sm font-medium placeholder-gray-300 focus:outline-none focus:border-orange-400"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">เฉลย:</span>
              {(['A', 'B'] as const).map(side => (
                <button key={side} onClick={() => setPendingCorrect(side)}
                  className={`w-10 h-8 rounded-lg text-sm font-bold transition-all ${
                    pendingCorrect === side ? 'bg-green-500 text-white' : 'bg-orange-50 text-gray-400 hover:bg-orange-100'
                  }`}>{side}</button>
              ))}
              <button onClick={addPair} disabled={!(pendingAMode === 'text' ? pendingAText : pendingA) || !(pendingBMode === 'text' ? pendingBText : pendingB)}
                className="ml-auto flex items-center gap-1.5 px-5 py-1.5 bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white rounded-lg text-sm font-bold shadow-[0_4px_14px_rgba(194,65,12,0.3)] transition-all disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed">
                {ICON.plus()}เพิ่ม
              </button>
            </div>
          </div>
        </div>
      </div>

      {pairs.length === 0 && (
        <p className="text-gray-300 text-xs text-center py-4">ยังไม่มีโจทย์ — เพิ่มรูปด้านบน</p>
      )}
    </div>
  )
}
