'use client'

import { useState } from 'react'
import { Game } from '@/lib/types'
import AuctionPhase from './AuctionPhase'
import ScoreRecordPanel from './ScoreRecordPanel'
import { getGameInstructions } from './instructions'
import GameMenu from './GameMenu'
import { zoomFit } from '@/lib/zoomFit'

interface Props {
  game: Game
  onBack?: (e: React.MouseEvent) => void
  onOpenSettings?: () => void
}

export default function PhysicalGame({ game, onBack, onOpenSettings }: Props) {
  const [showAuction, setShowAuction] = useState(false)
  const [scorePanelOpen, setScorePanelOpen] = useState(false)
  const [uiScale, setUiScale] = useState(1.0)
  // games with an instructions page open on it; the rest open on the home menu
  const howTo = getGameInstructions(game.name)

  const auctionItems = game.auctionItems ?? []

  if (showAuction && auctionItems.length > 0) {
    return <AuctionPhase items={auctionItems} gameName={game.name} onClose={() => setShowAuction(false)} />
  }

  // same score entry pop-up as Human Bingo
  const scorePanel = scorePanelOpen && (
    <ScoreRecordPanel
      game={game}
      quickAdd={howTo?.quickAdd}
      onClose={() => setScorePanelOpen(false)}
    />
  )

  if (howTo) {
    return (
      <>
      <howTo.Page title={game.name} onBack={onBack} onRecordScore={() => setScorePanelOpen(true)} onOpenSettings={onOpenSettings}
        headerExtra={auctionItems.length > 0 && (
          <button onClick={() => setShowAuction(true)}
            className="flex items-center gap-1 px-3 py-1.5 border border-orange-200 rounded-lg text-orange-700 hover:bg-orange-50 transition-colors text-sm flex-shrink-0">
            🎁 ประมูล
          </button>
        )} />
      {scorePanel}
      </>
    )
  }

  const bgUrl = game.backgroundImage ? `url(${game.backgroundImage})` : undefined
  const barBtnCls = 'flex-shrink-0 flex items-center gap-2 px-5 h-14 text-lg font-semibold rounded-xl shadow-md whitespace-nowrap bg-white/95 backdrop-blur hover:bg-orange-50 border border-orange-200 text-orange-700 transition-colors'
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-orange-50" style={zoomFit(uiScale)}>
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-6 py-4 bg-white border-b border-orange-100 shadow-sm">
        <button onClick={onBack} className="flex items-center gap-1 px-3 py-1.5 border border-orange-200 rounded-lg text-orange-700 hover:bg-orange-50 transition-colors text-sm flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          กลับ
        </button>
        <h1 className="text-gray-900 font-bold text-xl">{game.name}</h1>
        <GameMenu uiScale={uiScale} onScaleChange={setUiScale} onOpenSettings={onOpenSettings} />
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-orange-50 to-orange-100">
        {bgUrl && (
          <>
            {/* blurred fill for the area the uncropped image doesn't cover */}
            <div className="absolute inset-0 scale-110 blur-2xl opacity-80"
              style={{ backgroundImage: bgUrl, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="absolute inset-0"
              style={{ backgroundImage: bgUrl, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
          </>
        )}
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
          <button onClick={() => setScorePanelOpen(true)}
            className="px-16 py-5 font-extrabold text-3xl rounded-2xl ring-4 ring-white hover:scale-105 whitespace-nowrap bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-[0_6px_20px_rgba(194,65,12,0.35)] transition-all">
            📝 บันทึกคะแนน
          </button>
        </div>
        {auctionItems.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 pt-16 px-5 pb-5 bg-gradient-to-t from-white/80 via-white/40 to-transparent">
            <div className="flex items-stretch justify-center gap-3">
              {auctionItems.length > 0 && (
                <button onClick={() => setShowAuction(true)} className={barBtnCls}>🎁 ประมูล</button>
              )}
            </div>
          </div>
        )}
      </div>
      {scorePanel}
    </div>
  )
}
