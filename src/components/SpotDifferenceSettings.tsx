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
  text: (cls = 'w-4 h-4') => <svg className={cls} {...svgProps} strokeWidth={2.25}><path d="M5 6V4.5h14V6M12 4.5v15M9 19.5h6" /></svg>,
  move: <svg className="w-4 h-4" {...svgProps}><path d="M3 12h13M12 7l5 5-5 5M20 5v14" /></svg>,
  trash: <svg className="w-4 h-4" {...svgProps}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" /></svg>,
  download: <svg className="w-4 h-4" {...svgProps} strokeWidth={2.25}><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5 5-5M12 15V3" /></svg>,
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
          <h1 className="text-gray-900 text-xl font-bold truncate">ตั้งค่าเกม</h1>
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
          <div className="flex items-center gap-1.5 border border-orange-200 bg-white rounded-lg pl-2.5 pr-1 h-9" title="เวลาเริ่มต้นต่อข้อ">
            {ICON.clock('w-4 h-4 text-orange-500')}
            <span className="text-gray-600 text-xs whitespace-nowrap mr-0.5">วิ/ข้อ</span>
            <button onClick={() => updateGame({ timerSeconds: Math.max(1, (liveGame.timerSeconds ?? 10) - 1) })}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors" title="ลดเวลา">
              {ICON.minus}
            </button>
            <input
              type="number" min={1} max={300}
              value={liveGame.timerSeconds ?? 10}
              onChange={e => updateGame({ timerSeconds: Math.min(300, Math.max(1, parseInt(e.target.value) || 10)) })}
              className="w-9 text-center bg-transparent text-orange-600 font-extrabold focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button onClick={() => updateGame({ timerSeconds: Math.min(300, (liveGame.timerSeconds ?? 10) + 1) })}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors" title="เพิ่มเวลา">
              {ICON.plus()}
            </button>
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
            <span className="text-gray-500 text-xs w-10 text-center border-x border-orange-100 h-9 flex items-center justify-center tabular-nums">
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
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider flex-shrink-0">เสียง</span>
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
                    className="text-gray-600 hover:text-orange-600 transition-colors px-1" title="ฟังเสียง">{ICON.play()}</button>
                </>
              )}
              <label className="text-gray-600 hover:text-gray-700 text-xs cursor-pointer transition-colors">
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
          <div className="h-12 px-4 flex items-center justify-between border-b border-orange-100 flex-shrink-0">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">ชุดภาพ</span>
            <span className="text-gray-500 text-xs">{totalPairs} โจทย์รวม</span>
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
                      : 'text-gray-600 hover:bg-orange-50 hover:text-gray-700'
                  }`}
                >
                  <div className="text-gray-500 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0 select-none" title="ลากเพื่อเรียงลำดับ">
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
                      <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
                      <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{set.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
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
              <p className="text-gray-500 text-xs text-center py-6 px-2">ยังไม่มีชุดภาพ</p>
            )}
          </div>

          <div className="p-2.5 border-t border-orange-100 flex-shrink-0">
            <div className="flex gap-1.5">
              <input
                value={newSetName}
                onChange={e => setNewSetName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSet()}
                placeholder="ชื่อชุดใหม่..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-orange-100 rounded-lg text-gray-600 text-xs placeholder-gray-400 focus:outline-none focus:border-orange-400"
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
              <div className="h-12 flex items-center gap-3 px-5 border-b border-orange-100 flex-shrink-0">
                <input
                  value={selectedSet.name}
                  onChange={e => renameSet(selectedSet.id, e.target.value)}
                  className="text-gray-900 font-bold text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-orange-300 rounded-md px-1.5 py-0.5 flex-1"
                />
                <span className="text-gray-500 text-xs flex-shrink-0">
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
              <div className="text-center text-gray-500">
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
    <div className="p-5 space-y-4 max-w-4xl mx-auto">

      {/* Existing pairs */}
      {pairs.map((pair, i) => {
        const dragCls = dragIndex === i ? 'opacity-30 border-orange-100'
          : dropIndex === i && dragIndex !== null ? 'border-orange-400 bg-orange-50'
          : 'border-orange-100 hover:border-orange-200'
        const updatePair = (patch: Partial<ImagePair>) => onChange(pairs.map(p => p.id === pair.id ? { ...p, ...patch } : p))
        const canMove = !!onMovePair && !!sets && sets.some(s => s.id !== currentSetId)
        const segBtn = (active: boolean) => `flex items-center gap-1.5 px-3 h-9 text-sm font-medium transition-colors ${active ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-orange-50'}`
        const imageSlot = (label: string, value: string | undefined, set: (v: string | undefined) => void, tone: 'orange' | 'amber') => (
          <div className="flex flex-col gap-1.5">
            <span className={`text-sm font-semibold ${tone === 'amber' ? 'text-amber-700' : 'text-gray-700'}`}>{label}</span>
            {value ? (
              <div className="flex items-center gap-3">
                <img src={value} alt={label} className={`h-24 w-40 rounded-lg object-contain bg-white border ${tone === 'amber' ? 'border-amber-200' : 'border-orange-100'}`} />
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-orange-200 bg-white hover:bg-orange-50 text-orange-700 text-sm font-medium cursor-pointer transition-colors">
                    {ICON.image('w-4 h-4')}เปลี่ยนรูป
                    <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) compressImage(f, 900, 0.72).then(set) }} />
                  </label>
                  <button onClick={() => set(undefined)}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-500 text-sm font-medium transition-colors">
                    {ICON.trash}ลบรูป
                  </button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className={`h-24 w-40 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${tone === 'amber' ? 'border-amber-300 hover:border-amber-400 bg-amber-50/40 text-amber-600' : 'border-orange-200 hover:border-orange-300 bg-orange-50/40 text-gray-600'}`}>
                  {ICON.plus('w-5 h-5')}
                  <span className="text-sm">อัพโหลดรูป</span>
                </div>
                <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) compressImage(f, 900, 0.72).then(set) }} />
              </label>
            )}
          </div>
        )
        return (
        <div key={pair.id}
          onDragOver={e => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          className={`bg-white border-2 rounded-2xl shadow-sm transition-all ${dragCls}`}
        >
          {/* ── Header: number, name, timer, actions ───────── */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-orange-100">
            <div draggable onDragStart={() => handleDragStart(i)}
              className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none flex-shrink-0" title="ลากเพื่อเรียงลำดับ">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
                <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
                <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
              </svg>
              <span className="min-w-[2.25rem] h-9 px-2 rounded-lg bg-orange-100 text-orange-700 font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
            </div>
            <input
              value={pair.label ?? ''}
              onChange={e => updatePair({ label: e.target.value })}
              className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-orange-200 bg-white text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:border-orange-400"
              placeholder="ชื่อโจทย์ (ไว้อ้างอิง)"
            />
            <label className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-orange-200 bg-white flex-shrink-0 cursor-text" title="เวลาเฉพาะข้อนี้ — เว้นว่างเพื่อใช้เวลาเริ่มต้นของเกม">
              {ICON.clock('w-4 h-4 text-orange-500')}
              <input
                type="number" min={1} max={300}
                value={pair.timerSeconds ?? ''}
                onChange={e => updatePair({ timerSeconds: e.target.value === '' ? undefined : parseInt(e.target.value) || undefined })}
                className="w-10 text-center bg-transparent text-gray-900 font-semibold focus:outline-none tabular-nums placeholder-gray-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="—"
              />
              <span className="text-gray-600 text-sm">วินาที</span>
            </label>
            {canMove && (
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
                  className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-orange-200 bg-white hover:bg-orange-50 text-orange-700 text-sm font-medium transition-colors">
                  {ICON.move}ย้ายชุด
                </button>
                {moveDropdownPairId === pair.id && dropdownPos && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setMoveDropdownPairId(null); setDropdownPos(null) }} />
                    <div
                      className="fixed z-50 bg-white border border-orange-100 rounded-xl shadow-2xl min-w-[160px] py-1 overflow-hidden"
                      style={{ top: dropdownPos.top, right: dropdownPos.right }}
                    >
                      <p className="text-gray-500 text-xs font-semibold px-3 py-1.5">ย้ายไปชุด</p>
                      {sets!.filter(s => s.id !== currentSetId).map(s => (
                        <button key={s.id}
                          onClick={() => { onMovePair!(pair.id, s.id); setMoveDropdownPairId(null); setDropdownPos(null) }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-gray-900 transition-colors truncate">
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <button onClick={() => onChange(pairs.filter(p => p.id !== pair.id))} title="ลบโจทย์นี้"
              className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-500 text-sm font-medium transition-colors flex-shrink-0">
              {ICON.trash}ลบ
            </button>
          </div>

          {/* ── Choices A / B ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 p-4">
            {(['A', 'B'] as const).map(side => {
              const key = side === 'A' ? 'imageA' : 'imageB'
              const val = pair[key]
              const isCorrect = pair.correctImage === side
              return (
                <div key={side} className={`flex flex-col gap-3 p-3 rounded-xl border-2 transition-colors ${isCorrect ? 'border-green-500 bg-green-50/40' : 'border-orange-100'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-bold text-gray-900">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${isCorrect ? 'bg-green-500 text-white' : 'bg-orange-100 text-orange-700'}`}>{side}</span>
                      ตัวเลือก {side}
                    </span>
                    <div className="flex rounded-lg border border-orange-200 overflow-hidden">
                      <button onClick={() => { if (isImg(val)) updatePair({ [key]: '' }) }} className={segBtn(!isImg(val))}>
                        {ICON.text()}ข้อความ
                      </button>
                      <label className={`${segBtn(isImg(val))} border-l border-orange-200 cursor-pointer`}>
                        {ICON.image('w-4 h-4')}รูปภาพ
                        <input type="file" accept="image/*" hidden onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) compressImage(f, 900, 0.72).then(img => updatePair({ [key]: img }))
                        }} />
                      </label>
                    </div>
                  </div>

                  <div className="relative group h-36 rounded-lg overflow-hidden bg-orange-50/50 border border-orange-100">
                    {isImg(val) ? (
                      <>
                        <img src={val} alt={side} className="w-full h-full object-contain" />
                        <button
                          onClick={() => downloadImage(val, `${(pair.label ?? 'pair').replace(/\s+/g, '_')}_${side}.jpg`)}
                          className="absolute bottom-2 right-2 flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-black/60 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          {ICON.download}ดาวน์โหลด
                        </button>
                      </>
                    ) : (
                      <textarea
                        value={val || ''}
                        onChange={e => updatePair({ [key]: e.target.value })}
                        className="w-full h-full bg-transparent p-3 text-center text-lg font-semibold text-gray-900 leading-snug resize-none focus:outline-none placeholder-gray-400 placeholder:font-normal placeholder:text-base"
                        placeholder="พิมพ์ข้อความตัวเลือก..."
                      />
                    )}
                  </div>

                  <button onClick={() => updatePair({ correctImage: side })}
                    className={`h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-colors ${isCorrect ? 'bg-green-500 text-white shadow-sm' : 'bg-white border border-orange-200 text-gray-600 hover:border-green-400 hover:text-green-700'}`}>
                    {ICON.check('w-4 h-4')}{isCorrect ? 'คำตอบที่ถูก' : 'ตั้งเป็นคำตอบที่ถูก'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* ── Question shown during play ────────────────── */}
          <div className="px-4 pb-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-gray-900">คำถามที่แสดงระหว่างเล่น <span className="font-normal text-gray-500">(ไม่บังคับ)</span></span>
              <div className="flex rounded-lg border border-orange-200 overflow-hidden">
                <button
                  onClick={() => {
                    setImageModePairIds(s => { const n = new Set(s); n.delete(pair.id); return n })
                    updatePair({ questionImage: undefined })
                  }}
                  className={segBtn(!isImageMode(pair))}>
                  {ICON.text()}ข้อความ
                </button>
                <button
                  onClick={() => {
                    setImageModePairIds(s => { const n = new Set(s); n.add(pair.id); return n })
                    updatePair({ question: undefined })
                  }}
                  className={`${segBtn(isImageMode(pair))} border-l border-orange-200`}>
                  {ICON.image('w-4 h-4')}รูปภาพ
                </button>
              </div>
            </div>
            {isImageMode(pair) ? (
              <div className="grid grid-cols-2 gap-4">
                {imageSlot('รูปโจทย์', pair.questionImage, v => updatePair({ questionImage: v }), 'orange')}
                {imageSlot('รูปเฉลย (แสดงเมื่อหมดเวลา)', pair.revealImage, v => updatePair({ revealImage: v }), 'amber')}
              </div>
            ) : (
              <input
                value={pair.question ?? ''}
                onChange={e => updatePair({ question: e.target.value || undefined })}
                className="w-full h-11 px-3 rounded-lg border border-orange-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400"
                placeholder="เช่น 'ลูกค้า Jobthai' — แสดงตัวใหญ่ระหว่างเล่น"
              />
            )}
          </div>
        </div>
        )
      })}

      {/* Add new pair form */}
      {(() => {
        const segBtn = (active: boolean) => `flex items-center gap-1.5 px-3 h-9 text-sm font-medium transition-colors ${active ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-orange-50'}`
        const valA = pendingAMode === 'text' ? pendingAText : pendingA
        const valB = pendingBMode === 'text' ? pendingBText : pendingB
        const missing = [!valA && 'ตัวเลือก A', !valB && 'ตัวเลือก B'].filter(Boolean)
        const slot = (label: string, value: string | null, set: (v: string | null) => void, tone: 'orange' | 'amber') => (
          <div className="flex flex-col gap-1.5">
            <span className={`text-sm font-semibold ${tone === 'amber' ? 'text-amber-700' : 'text-gray-700'}`}>{label}</span>
            {value ? (
              <div className="flex items-center gap-3">
                <img src={value} alt={label} className={`h-24 w-40 rounded-lg object-contain bg-white border ${tone === 'amber' ? 'border-amber-200' : 'border-orange-100'}`} />
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-orange-200 bg-white hover:bg-orange-50 text-orange-700 text-sm font-medium cursor-pointer transition-colors">
                    {ICON.image('w-4 h-4')}เปลี่ยนรูป
                    <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) compressImage(f, 900, 0.72).then(set) }} />
                  </label>
                  <button onClick={() => set(null)}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-500 text-sm font-medium transition-colors">
                    {ICON.trash}ลบรูป
                  </button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className={`h-24 w-40 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${tone === 'amber' ? 'border-amber-300 hover:border-amber-400 bg-amber-50/40 text-amber-600' : 'border-orange-200 hover:border-orange-300 bg-orange-50/40 text-gray-600'}`}>
                  {ICON.plus('w-5 h-5')}
                  <span className="text-sm">อัพโหลดรูป</span>
                </div>
                <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) compressImage(f, 900, 0.72).then(set) }} />
              </label>
            )}
          </div>
        )
        const choices = [
          { side: 'A' as const, mode: pendingAMode, setMode: setPendingAMode, img: pendingA, setImg: setPendingA, text: pendingAText, setText: setPendingAText },
          { side: 'B' as const, mode: pendingBMode, setMode: setPendingBMode, img: pendingB, setImg: setPendingB, text: pendingBText, setText: setPendingBText },
        ]
        return (
          <div className="bg-white/70 border-2 border-dashed border-orange-300 rounded-2xl">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-dashed border-orange-200">
              <span className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center flex-shrink-0">{ICON.plus('w-5 h-5')}</span>
              <span className="font-bold text-gray-900 flex-shrink-0">เพิ่มโจทย์ใหม่</span>
              <input
                value={pendingLabel}
                onChange={e => setPendingLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPair()}
                placeholder="ชื่อโจทย์ (ไม่บังคับ)"
                className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-orange-200 bg-white text-gray-900 font-semibold placeholder-gray-400 placeholder:font-normal focus:outline-none focus:border-orange-400"
              />
              <label title="เลือกหลายรูปพร้อมกัน — จับคู่เป็น A, B ตามลำดับ"
                className="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-orange-200 bg-white hover:bg-orange-50 text-orange-700 text-sm font-medium cursor-pointer transition-colors flex-shrink-0">
                {ICON.folder}นำเข้าหลายรูป
                <input type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files?.length) handleBulkUpload(e.target.files) }} />
              </label>
            </div>

            {/* Choices */}
            <div className="grid grid-cols-2 gap-4 p-4">
              {choices.map(c => {
                const isCorrect = pendingCorrect === c.side
                return (
                  <div key={c.side} className={`flex flex-col gap-3 p-3 rounded-xl border-2 bg-white transition-colors ${isCorrect ? 'border-green-500' : 'border-orange-100'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-bold text-gray-900">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${isCorrect ? 'bg-green-500 text-white' : 'bg-orange-100 text-orange-700'}`}>{c.side}</span>
                        ตัวเลือก {c.side}
                      </span>
                      <div className="flex rounded-lg border border-orange-200 overflow-hidden">
                        <button onClick={() => { c.setMode('text'); c.setImg(null) }} className={segBtn(c.mode === 'text')}>{ICON.text()}ข้อความ</button>
                        <button onClick={() => { c.setMode('image'); c.setText('') }} className={`${segBtn(c.mode === 'image')} border-l border-orange-200`}>{ICON.image('w-4 h-4')}รูปภาพ</button>
                      </div>
                    </div>

                    <div className="relative group h-36 rounded-lg overflow-hidden bg-orange-50/50 border border-orange-100">
                      {c.mode === 'text' ? (
                        <textarea
                          value={c.text}
                          onChange={e => c.setText(e.target.value)}
                          className="w-full h-full bg-transparent p-3 text-center text-lg font-semibold text-gray-900 leading-snug resize-none focus:outline-none placeholder-gray-400 placeholder:font-normal placeholder:text-base"
                          placeholder="พิมพ์ข้อความตัวเลือก..."
                        />
                      ) : (
                        <label className="absolute inset-0 cursor-pointer">
                          {c.img ? (
                            <>
                              <img src={c.img} alt={c.side} className="w-full h-full object-contain" />
                              <span className="absolute bottom-2 right-2 flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-black/60 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                {ICON.image('w-4 h-4')}เปลี่ยนรูป
                              </span>
                            </>
                          ) : (
                            <span className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-gray-600 border-2 border-dashed border-orange-200 rounded-lg hover:border-orange-300 transition-colors">
                              {ICON.plus('w-6 h-6')}
                              <span className="text-sm">คลิกเพื่ออัพโหลดรูป</span>
                            </span>
                          )}
                          <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f, c.setImg) }} />
                        </label>
                      )}
                    </div>

                    <button onClick={() => setPendingCorrect(c.side)}
                      className={`h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-colors ${isCorrect ? 'bg-green-500 text-white shadow-sm' : 'bg-white border border-orange-200 text-gray-600 hover:border-green-400 hover:text-green-700'}`}>
                      {ICON.check('w-4 h-4')}{isCorrect ? 'คำตอบที่ถูก' : 'ตั้งเป็นคำตอบที่ถูก'}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Question */}
            <div className="px-4 pb-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-gray-900">คำถามที่แสดงระหว่างเล่น <span className="font-normal text-gray-500">(ไม่บังคับ)</span></span>
                <div className="flex rounded-lg border border-orange-200 overflow-hidden">
                  <button onClick={() => { setPendingQMode('text'); setPendingQuestionImage(null); setPendingRevealImage(null) }} className={segBtn(pendingQMode === 'text')}>{ICON.text()}ข้อความ</button>
                  <button onClick={() => { setPendingQMode('image'); setPendingQuestion('') }} className={`${segBtn(pendingQMode === 'image')} border-l border-orange-200`}>{ICON.image('w-4 h-4')}รูปภาพ</button>
                </div>
              </div>
              {pendingQMode === 'image' ? (
                <div className="grid grid-cols-2 gap-4">
                  {slot('รูปโจทย์', pendingQuestionImage, setPendingQuestionImage, 'orange')}
                  {slot('รูปเฉลย (แสดงเมื่อหมดเวลา)', pendingRevealImage, setPendingRevealImage, 'amber')}
                </div>
              ) : (
                <input
                  value={pendingQuestion}
                  onChange={e => setPendingQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPair()}
                  className="w-full h-11 px-3 rounded-lg border border-orange-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400"
                  placeholder="เช่น 'ลูกค้า Jobthai' — แสดงตัวใหญ่ระหว่างเล่น"
                />
              )}
            </div>

            {/* Add */}
            <div className="px-4 pb-4">
              <button onClick={addPair} disabled={missing.length > 0}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-white bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 shadow-[0_6px_20px_rgba(194,65,12,0.3)] transition-all disabled:from-orange-100 disabled:to-orange-100 disabled:text-orange-700 disabled:shadow-none disabled:cursor-not-allowed">
                {ICON.plus('w-5 h-5')}
                {missing.length > 0 ? `ใส่${missing.join(' และ ')} ก่อน` : 'เพิ่มโจทย์'}
              </button>
            </div>
          </div>
        )
      })()}

      {pairs.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-2">ยังไม่มีโจทย์ — เพิ่มโจทย์แรกด้านบน</p>
      )}
    </div>
  )
}
