'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, defaultTeams, defaultGames, defaultRankBonuses } from '@/lib/store'
import { writeState } from '@/lib/useFirebaseSync'

function adjustHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (n >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (n & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function wallpaperBg(color: string): string {
  const base = `linear-gradient(160deg, ${adjustHex(color, 10)} 0%, ${color} 50%, ${adjustHex(color, 6)} 100%)`
  return [
    'radial-gradient(ellipse 55% 45% at 18% 14%, rgba(255,255,255,0.38) 0%, transparent 100%)',
    'radial-gradient(ellipse 40% 50% at 82% 78%, rgba(255,255,255,0.22) 0%, transparent 100%)',
    'radial-gradient(ellipse 60% 30% at 55% 95%, rgba(255,255,255,0.14) 0%, transparent 100%)',
    base,
  ].join(', ')
}

const PRESETS = [
  { label: 'Cool Grey',  hex: '#cacdd8' },
  { label: 'Slate',      hex: '#b8bdc8' },
  { label: 'Warm Sand',  hex: '#d8d2c8' },
  { label: 'Sage',       hex: '#bfccc0' },
  { label: 'Dusk Blue',  hex: '#b8c4d4' },
  { label: 'Mauve',      hex: '#cdc0cc' },
  { label: 'Stone',      hex: '#c4bfb8' },
  { label: 'Charcoal',   hex: '#a8aab4' },
  { label: 'Midnight',   hex: '#302b63' },
  { label: 'Forest',     hex: '#1a3a2a' },
]
const PRESET_HEXES = PRESETS.map(p => p.hex)

export default function AdminPage() {
  const router = useRouter()
  const [closing, setClosing] = useState(false)
  const handleBack = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (closing) return
    setClosing(true)
    try { sessionStorage.setItem('returnFromGame', '__util_admin') } catch {}
    router.push('/')
  }, [closing, router])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={handleBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          กลับ
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">⚙️ ตั้งค่าระบบ</h1>
        <div className="w-20" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <SettingsTab />
      </div>
    </div>
  )
}

function SettingsTab() {
  const store = useStore()
  const { rankBonuses, setRankBonuses, wallpaperColor, setWallpaperColor } = store
  const bonuses = rankBonuses ?? [10, 8, 7, 6, 5]
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [importError, setImportError] = useState<string | null>(null)
  const [syncModal, setSyncModal] = useState<'idle' | 'confirm' | 'loading' | 'ok' | 'err'>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [pendingColor, setPendingColor] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const handlePushToFirebase = async () => {
    setSyncModal('loading')
    setSyncError(null)
    try {
      await writeState({
        teams: store.teams,
        games: store.games,
        scores: store.scores,
        rankBonuses: store.rankBonuses,
        appTitle: store.appTitle,
        appTitleSize: store.appTitleSize,
        dockGameIds: store.dockGameIds,
        gameOrder: store.gameOrder,
        wallpaperColor: store.wallpaperColor,
      })
      setSyncModal('ok')
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : String(err))
      setSyncModal('err')
    }
  }

  const updateBonus = (idx: number, val: number) => {
    const next = [...bonuses]; next[idx] = val; setRankBonuses(next)
  }
  const addRow = () => { if (bonuses.length >= 12) return; setRankBonuses([...bonuses, bonuses[bonuses.length - 1] ?? 0]) }
  const removeRow = (idx: number) => { if (bonuses.length <= 1) return; setRankBonuses(bonuses.filter((_, i) => i !== idx)) }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ teams: store.teams, games: store.games, scores: store.scores, rankBonuses: store.rankBonuses }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `edm-activity-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.teams || !data.games) throw new Error('ไฟล์ไม่มี teams หรือ games')
        store._hydrate({ teams: data.teams, games: data.games, scores: data.scores ?? [], rankBonuses: data.rankBonuses ?? [10, 8, 7, 6, 4] })
        setImportStatus('ok'); setTimeout(() => setImportStatus('idle'), 3000)
      } catch (err) {
        setImportStatus('err'); setImportError(err instanceof Error ? err.message : String(err))
        setTimeout(() => setImportStatus('idle'), 3000)
      }
    }
    reader.readAsText(file); e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">

      {/* Starter data */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">ข้อมูลตั้งต้น</h2>
        <p className="text-gray-400 text-sm mb-4">ล้างข้อมูลทั้งหมดและโหลดข้อมูลตัวอย่างเพื่อเริ่มต้นใหม่</p>
        <button
          onClick={() => {
            if (!confirm('โหลดข้อมูลตั้งต้น? ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่')) return
            store.setTeams(defaultTeams); store.setGames(defaultGames); store.setScores([])
            store.setRankBonuses(defaultRankBonuses); store.setAppTitle('Active Fun Games (EDM 4.5)')
            store.setDockGameIds([]); store.setGameOrder([]); store.setWallpaperColor('#cacdd8')
          }}
          className="px-4 py-2 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium hover:border-red-300 hover:text-red-500 transition-all"
        >
          โหลดข้อมูลตั้งต้น
        </button>
      </div>

      {/* Wallpaper color */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">สีพื้นหลังหน้าหลัก</h2>
        <p className="text-gray-400 text-sm mb-4">เลือกสีพื้นหลัง หรือกำหนดเองด้วย color picker</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map(({ label, hex }) => (
            <button
              key={hex} title={label} onClick={() => setWallpaperColor(hex)}
              style={{ background: hex }}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${wallpaperColor === hex ? 'border-gray-700 scale-110 shadow' : 'border-transparent hover:scale-105'}`}
            />
          ))}
          <label
            className="relative w-8 h-8 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center cursor-pointer overflow-hidden transition-all"
            title="Custom colour"
            style={{ background: pendingColor ?? (!PRESET_HEXES.includes(wallpaperColor) ? wallpaperColor : 'transparent') }}
          >
            <span className="text-sm select-none" style={{ opacity: (pendingColor || !PRESET_HEXES.includes(wallpaperColor)) ? 0 : 1 }}>🎨</span>
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={pendingColor ?? wallpaperColor}
              onChange={(e) => setPendingColor(e.target.value)}
              onInput={(e) => setPendingColor((e.target as HTMLInputElement).value)}
            />
          </label>
          {pendingColor && (
            <button onClick={() => { setWallpaperColor(pendingColor); setPendingColor(null) }}
              className="h-8 px-3 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:opacity-90 transition-all">
              ตั้งค่า
            </button>
          )}
        </div>
        <div className="rounded-xl h-10 w-full" style={{ background: wallpaperBg(pendingColor ?? wallpaperColor) }} />
      </div>

      {/* Import / Export */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">นำเข้า / ส่งออกข้อมูล</h2>
        <p className="text-gray-400 text-sm mb-4">ข้อมูลทั้งหมดเก็บใน localStorage — Export เพื่อสำรองหรือย้ายไปเครื่องอื่น</p>
        <div className="flex flex-col gap-2">
          <button onClick={handleExport} className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-gray-900 hover:bg-gray-700 transition-colors">
            ⬇️ Export JSON
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors ${importStatus === 'ok' ? 'bg-emerald-500 text-white' : importStatus === 'err' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {importStatus === 'ok' ? '✓ นำเข้าสำเร็จ' : importStatus === 'err' ? '✗ ไฟล์ไม่ถูกต้อง' : '⬆️ Import JSON'}
          </button>
          <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
          <button onClick={() => setSyncModal('confirm')} className="w-full py-2.5 rounded-lg text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100">
            ☁️ Push to Firebase
          </button>
        </div>
      </div>

      {/* Rank bonuses */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">ตั้งค่าคะแนน Rank</h2>
        <p className="text-gray-400 text-sm mb-4">คะแนนต่อ rank ในแต่ละเกม — แถวสุดท้ายใช้กับอันดับที่เหลือทั้งหมด</p>
        <div className="space-y-2 mb-4">
          {bonuses.map((val, idx) => {
            const isLast = idx === bonuses.length - 1
            const label = isLast && bonuses.length > 1 ? `อันดับ ${idx + 1}+` : `อันดับที่ ${idx + 1}`
            return (
              <div key={idx} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-gray-500">{label}</span>
                <input
                  type="number" min="0" value={val}
                  onChange={(e) => updateBonus(idx, parseInt(e.target.value) || 0)}
                  className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-center font-bold text-amber-600 focus:outline-none focus:border-amber-400 text-sm"
                />
                <span className="text-gray-400 text-sm w-10">pt</span>
                {bonuses.length > 1 && (
                  <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 text-xs font-bold">ลบ</button>
                )}
              </div>
            )
          })}
        </div>
        <button
          onClick={addRow} disabled={bonuses.length >= 12}
          className="w-full py-2 border-2 border-dashed border-gray-200 text-gray-400 rounded-lg hover:border-gray-400 hover:text-gray-600 text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {bonuses.length >= 12 ? `ครบ ${bonuses.length} อันดับแล้ว` : '+ เพิ่มอันดับ'}
        </button>
      </div>

      {/* Import error modal */}
      {importError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-red-600 mb-2">นำเข้าไม่สำเร็จ</h3>
            <pre className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-all">{importError}</pre>
            <button onClick={() => setImportError(null)} className="mt-4 w-full py-2 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors">ปิด</button>
          </div>
        </div>
      )}

      {/* Push to Firebase modal */}
      {syncModal !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            {syncModal === 'confirm' && (
              <>
                <div className="text-4xl mb-3">☁️</div>
                <h3 className="text-base font-bold text-gray-800 mb-2">Push to Firebase</h3>
                <p className="text-sm text-gray-400 mb-6">เขียนข้อมูลปัจจุบันทั้งหมดทับ Firebase ทันที — ข้อมูลเดิมใน Firebase จะถูกแทนที่</p>
                <div className="flex gap-3">
                  <button onClick={() => setSyncModal('idle')} className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">ยกเลิก</button>
                  <button onClick={handlePushToFirebase} className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors">ยืนยัน Push</button>
                </div>
              </>
            )}
            {syncModal === 'loading' && (
              <>
                <div className="flex justify-center mb-4">
                  <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-600">กำลัง Push ข้อมูลไปยัง Firebase…</p>
              </>
            )}
            {syncModal === 'ok' && (
              <>
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-base font-bold text-emerald-600 mb-2">Push สำเร็จ!</h3>
                <p className="text-sm text-gray-400 mb-6">ข้อมูลถูกเขียนไปยัง Firebase เรียบร้อยแล้ว</p>
                <button onClick={() => setSyncModal('idle')} className="w-full py-2.5 rounded-xl font-semibold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">ปิด</button>
              </>
            )}
            {syncModal === 'err' && (
              <>
                <div className="text-5xl mb-3">❌</div>
                <h3 className="text-base font-bold text-red-600 mb-2">Push ไม่สำเร็จ</h3>
                {syncError && <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 mb-4 overflow-auto max-h-32 text-left whitespace-pre-wrap break-all">{syncError}</pre>}
                <div className="flex gap-3">
                  <button onClick={() => setSyncModal('idle')} className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">ปิด</button>
                  <button onClick={handlePushToFirebase} className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors">ลองใหม่</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
