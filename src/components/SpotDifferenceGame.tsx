'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { zoomFit } from '@/lib/zoomFit'
import { Game, ImageSet } from '@/lib/types'
import Link from 'next/link'
import TeamSpinner from '@/components/TeamSpinner'
import { useConfirm } from '@/components/ConfirmDialog'

interface Props {
  game: Game
  onBack?: (e: React.MouseEvent) => void
  onOpenSettings?: () => void
}

type Phase = 'setup' | 'countdown' | 'playing' | 'scoring'

export default function SpotDifferenceGame({ game, onBack, onOpenSettings }: Props) {
  const { teams, scores, addScore, isSynced } = useStore()
  // Teams with a saved score for this game have already played and can't be picked again.
  const playedPoints = new Map(scores.filter((sc) => sc.gameId === game.id).map((sc) => [sc.teamId, sc.points]))
  const availableTeams = teams.filter((t) => !playedPoints.has(t.id))
  const allPlayed = teams.length > 0 && availableTeams.length === 0
  const sets = game.imageSets ?? []
  const timerSeconds = game.timerSeconds ?? 30

  const [phase, setPhase] = useState<Phase>('setup')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [customTimer, setCustomTimer] = useState(timerSeconds)
  const [timeLeft, setTimeLeft] = useState(timerSeconds)
  const [revealed, setRevealed] = useState(false)
  const [finalScores, setFinalScores] = useState<Record<string, number>>({})
  const [countdownNum, setCountdownNum] = useState(3)
  const [uiScale, setUiScale] = useState(1.0)
  // Bonus round: once every team has played, all teams play together and the
  // bonus is added on top of each team's recorded score.
  const [bonus, setBonus] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const confirm = useConfirm()

  const selectedSet = sets.find((s) => s.id === selectedSetId) ?? null
  const pairs = selectedSet?.pairs ?? []
  const currentPair = pairs[currentIndex]
  const isLast = currentIndex === pairs.length - 1
  const activeTimer = currentPair?.timerSeconds ?? customTimer
  const pct = activeTimer > 0 ? timeLeft / activeTimer : 0
  const timerColor = pct > 0.5 ? 'bg-green-400' : pct > 0.2 ? 'bg-yellow-400' : 'bg-red-500'

  const tickAudioRef = useRef<HTMLAudioElement | null>(null)

  const playSound = (src?: string) => {
    if (!src) return
    try { const a = new Audio(src); a.play(); return a } catch {}
  }

  const playBeep = (freq = 880, duration = 0.12, type: OscillatorType = 'sine') => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = type
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.5, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.start(); osc.stop(ctx.currentTime + duration)
    } catch {}
  }

  const startTickLoop = () => {
    stopTick()
    if (!game.soundTick) return
    try {
      const a = new Audio(game.soundTick)
      a.loop = true
      a.play()
      tickAudioRef.current = a
    } catch {}
  }

  const stopTick = () => {
    if (tickAudioRef.current) {
      tickAudioRef.current.pause()
      tickAudioRef.current.currentTime = 0
      tickAudioRef.current = null
    }
  }

  useEffect(() => {
    if (phase !== 'playing' || revealed || timeLeft <= 0) return
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, phase, revealed])

  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing') { stopTick(); setRevealed(true) }
  }, [timeLeft, phase])

  useEffect(() => {
    if (revealed && phase === 'playing') { stopTick(); playSound(game.soundTimeUp ?? undefined) }
  }, [revealed])

  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdownNum(3)
    playBeep(660, 0.15)
    let n = 3
    const tick = () => {
      n -= 1
      if (n <= 0) {
        playBeep(1320, 0.3)
        setPhase('playing')
      } else {
        playBeep(660, 0.15)
        setCountdownNum(n)
        setTimeout(tick, 1000)
      }
    }
    const id = setTimeout(tick, 1000)
    return () => clearTimeout(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'playing') {
      setCurrentIndex(0)
      setTimeLeft(pairs[0]?.timerSeconds ?? customTimer)
      setRevealed(false)
      playSound(game.soundStart ?? undefined); startTickLoop()
    } else { stopTick() }
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return
    stopTick()
    setTimeLeft(pairs[currentIndex]?.timerSeconds ?? customTimer)
    setRevealed(false); startTickLoop()
  }, [currentIndex])

  const bonusDone = !!game.bonusRoundPlayed
  const playedSetIds = new Set(game.playedSetIds ?? [])
  const availableSets = sets.filter((st) => !playedSetIds.has(st.id))
  const updateGame = (patch: Partial<typeof game>) => {
    const st = useStore.getState()
    st.setGames(st.games.map((g) => (g.id === game.id ? { ...g, ...patch } : g)))
  }
  const setBonusPlayed = (played: boolean) => updateGame({ bonusRoundPlayed: played })
  // Scores were cleared (no team has played): every image set becomes playable again.
  useEffect(() => {
    if (isSynced && playedPoints.size === 0 && (game.playedSetIds?.length ?? 0) > 0) updateGame({ playedSetIds: [] })
  }, [isSynced, playedPoints.size, game.playedSetIds?.length])
  // A set selected here but marked played elsewhere (another device) gets deselected.
  useEffect(() => { if (selectedSetId && playedSetIds.has(selectedSetId)) setSelectedSetId(null) }, [selectedSetId, game.playedSetIds])
  useEffect(() => { if (!allPlayed || bonusDone) setBonus(false) }, [allPlayed, bonusDone])
  // Scores were reset (not every team has played any more): allow a fresh bonus round later.
  useEffect(() => { if (isSynced && bonusDone && !allPlayed) setBonusPlayed(false) }, [isSynced, bonusDone, allPlayed])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [menuOpen])

  // Clears every team's score for this game and the bonus round, back to a fresh start.
  const resetGame = async () => {
    setMenuOpen(false)
    const ok = await confirm({
      title: 'เริ่มเกมใหม่ตั้งแต่ต้น?',
      message: `คะแนน ${game.name} ของทุกทีม (เล่นแล้ว ${playedPoints.size} ทีม), ชุดภาพที่ใช้ไปแล้ว และรอบโบนัสจะถูกล้าง ทุกทีมและทุกชุดจะกลับมาเล่นได้อีกครั้ง`,
      confirmLabel: 'ล้างและเริ่มใหม่',
      tone: 'danger',
    })
    if (!ok) return
    const st = useStore.getState()
    st.setScores(st.scores.filter((sc) => sc.gameId !== game.id))
    updateGame({ bonusRoundPlayed: false, playedSetIds: [] })
    setBonus(false); setSelectedTeamIds([]); setSelectedSetId(null); setCurrentIndex(0); setPhase('setup')
  }

  const startBonus = () => { setBonus(true); setSelectedTeamIds(teams.map((t) => t.id)) }
  const cancelBonus = () => { setBonus(false); setSelectedTeamIds([]) }

  const toggleTeam = (id: string) =>
    !playedPoints.has(id) && setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )

  const canStart = selectedTeamIds.length > 0 && (sets.length === 0 || selectedSetId !== null)

  const goNext = () => {
    if (isLast) setPhase('scoring')
    else setCurrentIndex((i) => i + 1)
  }

  const handleSave = () => {
    selectedTeamIds.forEach((teamId) =>
      addScore({
        teamId, gameId: game.id,
        points: (bonus ? playedPoints.get(teamId) ?? 0 : 0) + (finalScores[teamId] ?? 0),
      })
    )
    updateGame({
      ...(bonus ? { bonusRoundPlayed: true } : {}),
      ...(selectedSetId && !playedSetIds.has(selectedSetId) ? { playedSetIds: [...(game.playedSetIds ?? []), selectedSetId] } : {}),
    })
    setBonus(false)
    setPhase('setup'); setSelectedTeamIds([]); setSelectedSetId(null); setCurrentIndex(0)
  }

  const selectedTeams = teams.filter((t) => selectedTeamIds.includes(t.id))

  // ── Shared theme (matches Human Bingo) ────────────────────────────────────
  const headerCls = 'flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4 bg-white border-b border-orange-100 shadow-sm'
  const outlineBtnCls = 'bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 transition-colors'
  const primaryBtnCls = 'bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-[0_6px_20px_rgba(194,65,12,0.35)] transition-all'
  const stepBtnCls = 'flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors flex-shrink-0'

  const chevronLeft = <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
  const chevronRight = <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
  const minusIcon = <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M3.5 8h9" /></svg>
  const plusIcon = <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M3.5 8h9M8 3.5v9" /></svg>
  const clockIcon = (cls: string) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9.5 2.5h5M12 2.5V5" />
    </svg>
  )
  const alarmIcon = (cls: string) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9.5V13l2.5 2M5 3.5 2.5 6M19 3.5 21.5 6M6.5 19.5 5 21M17.5 19.5 19 21" />
    </svg>
  )
  const playIcon = <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
  const flagIcon = <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
  const arrowIcon = <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  const eyeIcon = <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.75" /></svg>

  const backBtn = (onClick: (e: React.MouseEvent) => void) => (
    <button onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm flex-shrink-0 ${outlineBtnCls}`}>
      {chevronLeft}กลับ
    </button>
  )

  const scaleControls = (
    <div className="flex items-center border border-orange-200 bg-white rounded-lg overflow-hidden flex-shrink-0">
      <button
        onClick={() => setUiScale(s => Math.max(0.75, +(s - 0.1).toFixed(1)))}
        className="w-8 h-8 flex items-center justify-center text-orange-700 hover:bg-orange-50 transition-colors"
        title="ลดขนาด"
      >{minusIcon}</button>
      <span className="text-orange-800/60 text-xs w-11 text-center tabular-nums border-x border-orange-100 h-8 flex items-center justify-center">
        {Math.round(uiScale * 100)}%
      </span>
      <button
        onClick={() => setUiScale(s => Math.min(2.0, +(s + 0.1).toFixed(1)))}
        className="w-8 h-8 flex items-center justify-center text-orange-700 hover:bg-orange-50 transition-colors"
        title="เพิ่มขนาด"
      >{plusIcon}</button>
    </div>
  )

  const moreMenu = (withReset: boolean) => (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className={`w-8 h-8 flex items-center justify-center rounded-lg ${outlineBtnCls} ${menuOpen ? 'bg-orange-50' : ''}`}
        title="เพิ่มเติม" aria-haspopup="menu" aria-expanded={menuOpen}
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="13" cy="8" r="1.5" /></svg>
      </button>
      {menuOpen && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-72 z-50 bg-white border border-orange-100 rounded-xl shadow-lg p-1.5">
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="flex items-center gap-3 text-gray-700 text-sm font-semibold">
              <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="6.5" /><path d="M20.5 20.5 16 16M8.5 11h5M11 8.5v5" />
              </svg>
              ขนาดหน้าจอ
            </span>
            {scaleControls}
          </div>
          <button role="menuitem" onClick={() => { setMenuOpen(false); onOpenSettings?.() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-gray-700 text-sm font-semibold hover:bg-orange-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            ตั้งค่าเกม
          </button>
          {withReset && <>
          <div className="my-1 border-t border-orange-100" />
          <button role="menuitem" onClick={resetGame}
            className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-red-50 transition-colors">
            <svg className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
            </svg>
            <span className="flex flex-col">
              <span className="text-red-700 font-semibold text-sm">เริ่มเกมใหม่ตั้งแต่ต้น</span>
              <span className="text-gray-500 text-xs mt-0.5">ล้างคะแนนเกมนี้ของทุกทีม ชุดภาพที่ใช้แล้ว และรอบโบนัส</span>
            </span>
          </button>
          </>}
        </div>
      )}
    </div>
  )

  const checkIcon = (
    <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
    </span>
  )

  const cardCls = (selected: boolean) => selected
    ? 'border-orange-500 bg-orange-50 shadow-sm'
    : 'border-orange-100 bg-white hover:border-orange-300'

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    const startLabel = sets.length > 0 && availableSets.length === 0
      ? 'ใช้ชุดภาพครบทุกชุดแล้ว'
      : sets.length > 0 && !selectedSetId
      ? 'เลือกชุดภาพก่อน'
      : selectedTeamIds.length === 0
      ? 'เลือกทีมก่อน'
      : pairs.length > 0 ? 'เริ่มเกม' : 'ข้ามไปใส่คะแนน'
    return (
      <div className="h-screen bg-orange-50 flex flex-col overflow-hidden" style={zoomFit(uiScale)}>
        <div className={headerCls}>
          {backBtn(onBack ?? (() => {}))}
          <h1 className="text-gray-900 text-xl font-bold flex-1 text-center">{game.name}</h1>
          <div className="flex items-center gap-2">
            {moreMenu(true)}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Team random spinner: draws N teams and selects them */}
          <div className="w-[clamp(18rem,28vw,24rem)] flex-shrink-0 flex flex-col p-5 overflow-hidden border-r border-orange-100">
            {allPlayed ? (
              <>
                <div className="flex items-baseline gap-2 mb-3 flex-shrink-0">
                  <h2 className="text-gray-900 text-base font-bold">รอบโบนัส</h2>
                  <span className="text-gray-500 text-xs">{bonusDone ? 'เล่นไปแล้ว' : 'ทุกทีมเล่นครบแล้ว'}</span>
                </div>
                <div className={`flex-1 min-h-0 rounded-2xl border-2 flex flex-col items-center justify-center gap-4 px-6 text-center transition-colors ${bonusDone ? 'border-gray-200 bg-gray-50 [&>span:first-child]:grayscale [&>span:first-child]:opacity-50' : bonus ? 'border-orange-500 bg-white shadow-[0_6px_20px_rgba(194,65,12,0.18)]' : 'border-orange-100 bg-white'}`}>
                  <span className="w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
                    <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" /></svg>
                  </span>
                  <h3 className="text-gray-900 font-extrabold text-2xl">{bonusDone ? 'เล่นรอบโบนัสแล้ว' : bonus ? 'พร้อมเล่นรอบโบนัส' : 'รอบโบนัส'}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {bonusDone
                      ? <>เกมนี้เล่นครบทุกรอบแล้ว<br />รอบโบนัสเล่นได้ครั้งเดียว</>
                      : <>ทุกทีมเล่นพร้อมกัน<br />คะแนนที่ได้จะบวกเพิ่มจากคะแนนเดิม</>}
                  </p>
                </div>
                {bonusDone ? null : bonus ? (
                  <button onClick={cancelBonus} className={`mt-3 flex-shrink-0 h-14 flex items-center justify-center gap-2 font-semibold rounded-xl ${outlineBtnCls}`}>
                    ยกเลิกรอบโบนัส
                  </button>
                ) : (
                  <button onClick={startBonus} className={`mt-3 flex-shrink-0 h-14 flex items-center justify-center gap-2 font-bold text-lg rounded-xl ${primaryBtnCls}`}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" /></svg>
                    เล่นรอบโบนัส ({teams.length} ทีม)
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-3 flex-shrink-0">
                  <h2 className="text-gray-900 text-base font-bold">สุ่มทีม</h2>
                  <span className="text-gray-500 text-xs">ทีมที่สุ่มได้จะถูกเลือกให้อัตโนมัติ</span>
                </div>
                <TeamSpinner teams={availableTeams} onPicked={setSelectedTeamIds} />
              </>
            )}
          </div>

          {/* Teams */}
          <div className="flex-1 flex flex-col pt-5 pr-2 overflow-hidden border-r border-orange-100">
            <div className="flex items-baseline gap-2 mb-3 flex-shrink-0 pl-5 pr-3">
              <h2 className="text-gray-900 text-base font-bold">เลือกทีม</h2>
              <span className="text-gray-500 text-xs">{selectedTeamIds.length > 0 ? `${selectedTeamIds.length} ทีม` : 'ยังไม่ได้เลือก'}</span>
              {bonus ? (
                <span className="ml-auto text-orange-600 text-xs font-semibold">รอบโบนัส · ทุกทีม</span>
              ) : playedPoints.size > 0 && (
                <span className="ml-auto text-gray-400 text-xs">เล่นแล้ว {playedPoints.size} / {teams.length} ทีม</span>
              )}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-3 flex-1 overflow-y-auto content-start pl-5 pr-3 pb-5">
              {teams.map((team) => {
                const selected = selectedTeamIds.includes(team.id)
                const played = playedPoints.get(team.id)
                if (played !== undefined && bonus) {
                  return (
                    <div key={team.id}
                      className="flex items-center gap-3 px-5 py-3 min-h-[76px] rounded-xl border-2 border-orange-500 bg-orange-50 shadow-sm font-semibold text-lg text-orange-900 select-none">
                      <span className={`w-4 h-4 rounded-full flex-shrink-0 ${team.color}`} />
                      <span className="flex flex-col items-start leading-tight min-w-0">
                        <span className="truncate">{team.name}</span>
                        <span className="text-xs font-medium text-orange-700/70">คะแนนเดิม {played} + โบนัส</span>
                      </span>
                      <span className="ml-auto flex-shrink-0">{checkIcon}</span>
                    </div>
                  )
                }
                if (played !== undefined) {
                  return (
                    <div key={team.id} title="ทีมนี้เล่นเกมนี้และบันทึกคะแนนแล้ว"
                      className="flex items-center gap-3 px-5 py-3 min-h-[76px] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 font-semibold text-lg text-gray-400 cursor-not-allowed select-none">
                      <span className={`w-4 h-4 rounded-full flex-shrink-0 opacity-40 ${team.color}`} />
                      <span className="flex flex-col items-start leading-tight min-w-0">
                        <span className="truncate line-through decoration-gray-300">{team.name}</span>
                        <span className="text-xs font-medium">เล่นแล้ว · {played} คะแนน</span>
                      </span>
                    </div>
                  )
                }
                return (
                  <button
                    key={team.id}
                    onClick={() => toggleTeam(team.id)}
                    className={`flex items-center gap-3 px-5 py-3 min-h-[76px] rounded-xl border-2 transition-all font-semibold text-lg ${selected ? 'text-orange-900' : 'text-gray-800'} ${cardCls(selected)}`}
                  >
                    <span className={`w-4 h-4 rounded-full flex-shrink-0 ${team.color}`} />
                    <span className="flex flex-col items-start leading-tight min-w-0">
                      <span className="truncate">{team.name}</span>
                      {team.captain && <span className="text-gray-400 text-sm font-normal">({team.captain})</span>}
                    </span>
                    {selected && <span className="ml-auto flex-shrink-0">{checkIcon}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sets */}
          <div className="flex-1 flex flex-col pt-5 pr-2 overflow-hidden">
            {sets.length > 0 && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex items-baseline gap-2 mb-3 flex-shrink-0 pl-5 pr-3">
                  <h2 className="text-gray-900 text-base font-bold">ชุดภาพ</h2>
                  <span className="text-gray-500 text-xs">แต่ละชุดเล่นได้ครั้งเดียว</span>
                  {playedSetIds.size > 0 && (
                    <span className="ml-auto text-gray-400 text-xs">{availableSets.length === 0 ? 'ใช้ครบทุกชุดแล้ว' : `ใช้แล้ว ${sets.length - availableSets.length} / ${sets.length} ชุด`}</span>
                  )}
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 min-h-0 overflow-y-auto content-start pl-5 pr-3 pb-5">
                  {sets.map((set) => {
                    const selected = selectedSetId === set.id
                    if (playedSetIds.has(set.id)) {
                      return (
                        <div key={set.id} title="ชุดนี้เล่นไปแล้ว"
                          className="flex flex-col items-start justify-center px-5 py-3 min-h-[76px] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-left cursor-not-allowed select-none">
                          <span className="font-semibold text-sm text-gray-400 line-through decoration-gray-300">{set.name}</span>
                          <span className="text-gray-400 text-xs mt-0.5">เล่นแล้ว · {set.pairs.length} โจทย์</span>
                        </div>
                      )
                    }
                    return (
                      <button
                        key={set.id}
                        onClick={() => setSelectedSetId(selected ? null : set.id)}
                        className={`flex flex-col items-start justify-center px-5 py-3 min-h-[76px] rounded-xl border-2 transition-all text-left ${cardCls(selected)}`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className={`font-semibold text-sm ${selected ? 'text-orange-900' : 'text-gray-900'}`}>{set.name}</span>
                          {selected && <span className="ml-auto flex-shrink-0">{checkIcon}</span>}
                        </div>
                        <span className="text-gray-500 text-xs mt-0.5">{set.pairs.length} โจทย์</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Bottom bar: timer + start */}
        <div className="flex-shrink-0 flex items-center gap-4 px-5 py-4 bg-white border-t border-orange-100">
            <div className="flex-shrink-0 h-14 flex items-center gap-2 bg-white border border-orange-200 rounded-xl px-3">
              {clockIcon('w-6 h-6 text-orange-500 flex-shrink-0')}
              <span className="text-gray-500 text-sm whitespace-nowrap">เวลาต่อข้อ</span>
              <button onClick={() => setCustomTimer(t => Math.max(5, t - 5))} className={`w-8 h-8 ${stepBtnCls}`} title="ลดเวลา">{minusIcon}</button>
              <input
                type="number"
                min={5}
                max={300}
                value={customTimer}
                onChange={(e) => setCustomTimer(Math.max(1, Number(e.target.value)))}
                className="w-12 text-center font-extrabold text-orange-600 text-xl tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button onClick={() => setCustomTimer(t => Math.min(300, t + 5))} className={`w-8 h-8 ${stepBtnCls}`} title="เพิ่มเวลา">{plusIcon}</button>
              <span className="text-gray-400 text-sm">วินาที</span>
            </div>

            <button
              onClick={() => {
                if (!canStart) return
                setFinalScores(Object.fromEntries(selectedTeamIds.map((id) => [id, 0])))
                setPhase(pairs.length > 0 ? 'countdown' : 'scoring')
              }}
              disabled={!canStart}
              className={`flex-1 h-14 flex items-center justify-center gap-2 font-bold text-lg rounded-xl ${canStart ? primaryBtnCls : 'bg-orange-100 text-orange-300 cursor-not-allowed'}`}
            >
              {canStart && playIcon}
              {startLabel}
            </button>
        </div>
      </div>
    )
  }

  // ── COUNTDOWN ─────────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <div className="h-screen overflow-hidden bg-orange-50 flex flex-col items-center justify-center" style={zoomFit(uiScale)}>
        <div className="text-orange-900/40 text-xl mb-6 tracking-widest uppercase font-semibold">เตรียมพร้อม</div>
        <div
          key={countdownNum}
          className="font-black tabular-nums select-none bg-gradient-to-b from-orange-500 to-red-600 bg-clip-text text-transparent"
          style={{
            fontSize: 'clamp(160px, 40vw, 400px)',
            lineHeight: 1,
            filter: 'drop-shadow(0 10px 30px rgba(194,65,12,0.35))',
            animation: 'countdownPop 0.4s cubic-bezier(0.36,0.07,0.19,0.97)',
          }}
        >
          {countdownNum}
        </div>
        <div className="text-orange-900/50 text-lg mt-8 font-medium">{game.name}{bonus && ' · รอบโบนัส'}</div>
        <style>{`
          @keyframes countdownPop {
            0%   { transform: scale(1.6); opacity: 0; }
            60%  { transform: scale(0.95); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  if (phase === 'playing') {
    const correct = currentPair?.correctImage
    const isImgChoice = (val?: string) => !!val && val.startsWith('data:image')
    const bothTextChoices = currentPair && !isImgChoice(currentPair.imageA) && !isImgChoice(currentPair.imageB)
    const showBigQuestion = !!currentPair?.questionImage && bothTextChoices
    const timerTextCls = pct > 0.5 ? 'text-emerald-600' : pct > 0.2 ? 'text-amber-500' : 'text-red-600'
    const meta = (
      <>
        {game.name}{selectedSet && <span className="ml-1.5">[{selectedSet.name}]</span>}
        {' · '}ข้อที่ {currentIndex + 1} / {pairs.length}
      </>
    )

    return (
      <div className="h-screen bg-orange-50 flex flex-col overflow-hidden" style={zoomFit(uiScale)}>
        <div className={headerCls}>
          {backBtn((e) => { e.preventDefault(); setPhase('setup') })}
          <div className="text-center flex-1 min-w-0 flex flex-col items-center justify-center">
            {!showBigQuestion && currentPair?.questionImage ? (
              <>
                <img src={currentPair.questionImage} alt="คำถาม" className="max-h-14 max-w-xs object-contain rounded-lg" />
                <span className="text-gray-500 text-xs mt-0.5 truncate block">{meta}</span>
              </>
            ) : currentPair?.question ? (
              <>
                <p className="text-gray-900 text-2xl font-bold leading-tight truncate">{currentPair.question}</p>
                <span className="text-gray-500 text-sm truncate block">{meta}</span>
              </>
            ) : (
              <>
                <h1 className="text-gray-900 text-lg font-bold leading-tight truncate">{game.name}</h1>
                <span className="text-gray-500 text-sm">
                  {selectedSet && <span className="text-orange-700 mr-2">[{selectedSet.name}]</span>}
                  ข้อที่ {currentIndex + 1} / {pairs.length}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center min-w-[3.5rem] text-4xl font-bold tabular-nums flex-shrink-0 ${revealed ? 'text-red-600' : timerTextCls} ${timeLeft <= 5 && !revealed ? 'animate-pulse' : ''}`}>
              {revealed ? alarmIcon('w-9 h-9') : timeLeft}
            </div>
            {scaleControls}
          </div>
        </div>

        <div className="h-1.5 bg-orange-100 flex-shrink-0">
          <div className={`h-full transition-all duration-1000 ease-linear ${timerColor}`} style={{ width: `${pct * 100}%` }} />
        </div>

        {showBigQuestion && (
          <div className="flex-1 flex items-center justify-center bg-white border-b border-orange-100 py-3 px-6 min-h-0 relative">
            <img
              src={revealed && currentPair!.revealImage ? currentPair!.revealImage : currentPair!.questionImage}
              alt={revealed && currentPair!.revealImage ? 'เฉลย' : 'คำถาม'}
              className="max-h-full max-w-full object-contain rounded-xl"
              draggable={false}
            />
            {revealed && currentPair!.revealImage && (
              <span className="absolute top-2 right-3 text-white text-xs font-bold tracking-wide bg-amber-500 px-2.5 py-0.5 rounded-full shadow">เฉลย</span>
            )}
          </div>
        )}

        <div className={showBigQuestion ? 'flex-shrink-0 flex gap-4 px-4 pb-3 pt-3' : 'flex-1 flex gap-4 p-4 min-h-0'}
          style={showBigQuestion ? { height: 220 } : undefined}>
          {(['A', 'B'] as const).map((side) => {
            const imgSrc = side === 'A' ? currentPair?.imageA : currentPair?.imageB
            const isCorrect = correct === side
            return (
              <div key={side} className="flex-1 flex flex-col min-w-0 min-h-0">
                <div className={`flex flex-col flex-1 min-h-0 transition-all duration-300 rounded-2xl overflow-hidden bg-white border border-orange-100 shadow-sm ${
                  revealed && correct !== undefined
                    ? isCorrect
                      ? 'ring-4 ring-green-500 shadow-[0_0_24px_4px_rgba(34,197,94,0.35)]'
                      : 'ring-4 ring-red-500 shadow-[0_0_24px_4px_rgba(239,68,68,0.3)]'
                    : ''
                }`}>
                  {revealed && correct !== undefined && (
                    <div className={`flex-shrink-0 flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: showBigQuestion ? 56 : 100 }}>
                      {isCorrect ? (
                        <svg width={showBigQuestion ? 44 : 80} height={showBigQuestion ? 44 : 80} viewBox="0 0 48 48" fill="none">
                          <polyline points="6,26 18,40 42,10" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width={showBigQuestion ? 44 : 80} height={showBigQuestion ? 44 : 80} viewBox="0 0 48 48" fill="none">
                          <line x1="8" y1="8" x2="40" y2="40" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                          <line x1="40" y1="8" x2="8" y2="40" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                  )}
                  <div className="relative flex-1 min-h-0">
                    {imgSrc && imgSrc.startsWith('data:image') ? (
                      <>
                        <img src={imgSrc} alt={side} className="w-full h-full object-contain block" draggable={false} />
                        {revealed && correct === undefined && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <span className="text-white/80 text-sm">ยังไม่ได้ตั้งเฉลย</span>
                          </div>
                        )}
                      </>
                    ) : imgSrc ? (
                      <div className="w-full h-full flex items-center justify-center p-6">
                        <span className="text-gray-900 font-bold text-center leading-snug" style={{ fontSize: 'clamp(1.5rem, 5vw, 3.5rem)' }}>{imgSrc}</span>
                      </div>
                    ) : (
                      <div className="h-48 flex items-center justify-center"><span className="text-gray-400">ไม่มีภาพ</span></div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white border-t border-orange-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold disabled:opacity-30 disabled:cursor-not-allowed ${outlineBtnCls}`}
          >
            {chevronLeft}
            ก่อนหน้า
          </button>

          <div className="flex gap-1.5">
            {pairs.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentIndex ? 'bg-orange-500 scale-125' : 'bg-orange-200 hover:bg-orange-300'}`} />
            ))}
          </div>

          {revealed ? (
            <button onClick={goNext} className={`flex items-center gap-2 px-5 py-2 font-bold rounded-lg ${primaryBtnCls}`}>
              {isLast ? <>{flagIcon}จบเกม{arrowIcon}ใส่คะแนน</> : <>ข้อถัดไป{chevronRight}</>}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setRevealed(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors">
                {eyeIcon}
                เฉลยก่อนเวลา
              </button>
              {!isLast && (
                <button onClick={goNext} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold ${outlineBtnCls}`}>
                  ถัดไป{chevronRight}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── SCORING ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-orange-50 flex flex-col overflow-hidden" style={zoomFit(uiScale)}>
      <div className={headerCls}>
        {backBtn((e) => { e.preventDefault(); setPhase(pairs.length > 0 ? 'playing' : 'setup') })}
        <h1 className="text-gray-900 text-xl font-bold flex-1 text-center">บันทึกคะแนน — {game.name}</h1>
        <div className="flex items-center gap-2">
          {moreMenu(false)}
        </div>
      </div>
      {/* Card fits the screen: title and save button stay put, the team list scrolls inside */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-6">
        <div className={`bg-white border border-orange-100 shadow-sm rounded-3xl w-full max-h-full flex flex-col overflow-hidden ${bonus ? 'max-w-xl' : 'max-w-md'}`}>
          <div className="flex-shrink-0 px-8 pt-7 pb-4 border-b border-orange-100 text-center">
            <h2 className="text-gray-900 text-2xl font-bold mb-1">{bonus ? 'คะแนนรอบโบนัส' : 'ใส่คะแนนแต่ละทีม'}</h2>
            <p className="text-gray-500 text-sm">{bonus ? 'คะแนนโบนัสจะบวกเพิ่มจากคะแนนเดิมของแต่ละทีม' : 'นับจากจำนวนผู้เล่นที่เหลือหรือคะแนนที่ได้'}</p>
            {selectedTeams.length > 5 && <p className="text-orange-700/70 text-xs font-semibold mt-2">{selectedTeams.length} ทีม</p>}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-8 divide-y divide-orange-50">
            {selectedTeams.map((team, rank) => (
              <div key={team.id} className="flex items-center gap-4 py-2.5">
                <span className="text-gray-400 text-sm w-6 text-right">{rank + 1}.</span>
                <span className={`w-5 h-5 rounded-full flex-shrink-0 ${team.color}`} />
                <span className="text-gray-900 font-medium flex-1">
                  {team.name}
                  {team.captain && <span className="text-gray-400 text-sm font-normal ml-1">({team.captain})</span>}
                </span>
                {bonus && (
                  <span className="text-gray-400 text-sm whitespace-nowrap tabular-nums">เดิม {playedPoints.get(team.id) ?? 0} +</span>
                )}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setFinalScores((prev) => ({ ...prev, [team.id]: Math.max(0, (prev[team.id] ?? 0) - 1) }))}
                    disabled={(finalScores[team.id] ?? 0) <= 0}
                    className={`w-10 h-10 ${stepBtnCls} disabled:opacity-40`} title="ลดคะแนน"
                  >{minusIcon}</button>
                  <input
                    type="number" min="0" inputMode="numeric"
                    value={finalScores[team.id] ?? 0}
                    onChange={(e) => setFinalScores((prev) => ({ ...prev, [team.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    onFocus={(e) => e.target.select()}
                    className="w-20 px-2 py-2 rounded-lg bg-orange-50 text-orange-700 text-center text-xl font-bold tabular-nums border border-orange-200 focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setFinalScores((prev) => ({ ...prev, [team.id]: (prev[team.id] ?? 0) + 1 }))}
                    className={`w-10 h-10 ${stepBtnCls}`} title="เพิ่มคะแนน"
                  >{plusIcon}</button>
                </div>
                {bonus ? (
                  <span className="text-gray-500 text-sm w-16 text-right tabular-nums">= <b className="text-gray-900 text-base">{(playedPoints.get(team.id) ?? 0) + (finalScores[team.id] ?? 0)}</b></span>
                ) : (
                  <span className="text-gray-500 text-sm w-12">คะแนน</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex-shrink-0 px-8 pt-4 pb-7 border-t border-orange-100">
            <button onClick={handleSave} className={`w-full py-3 flex items-center justify-center gap-2 font-bold text-lg rounded-xl ${primaryBtnCls}`}>
              <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
              บันทึกคะแนน
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
