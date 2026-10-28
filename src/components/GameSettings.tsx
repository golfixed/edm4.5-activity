'use client'

import { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { Game, ImagePair, ImageSet, AuctionItem } from '@/lib/types'
import { ICON_COLORS, resolveIconColor, darkenHex } from '@/lib/iconColors'
import { compressImage } from '@/lib/compressImage'

interface Props {
  game: Game
  onClose: () => void
}

export default function GameSettings({ game, onClose }: Props) {
  const { games, setGames } = useStore()

  const updateGame = (partial: Partial<Game>) => {
    setGames(games.map(g => g.id === game.id ? { ...g, ...partial } : g))
  }

  const handleBgUpload = (file: File) => {
    compressImage(file, 1280, 0.75).then(b64 => updateGame({ backgroundImage: b64 }))
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 overflow-y-auto"
        style={{
          width: 'min(420px, 100vw)',
          background: 'linear-gradient(160deg, #1a1230 0%, #0f172a 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(145deg, ${resolveIconColor(game.iconColor, game.colorIdx ?? null).from}cc, ${resolveIconColor(game.iconColor, game.colorIdx ?? null).to}dd)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
          }}>
            {game.icon ?? '🎮'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>Game Settings</p>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.name}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', padding: '6px 10px', fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Identity */}
          <Section title="ไอคอนและชื่อ">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                value={game.icon ?? '🎮'}
                onChange={e => updateGame({ icon: e.target.value })}
                maxLength={2}
                style={{
                  width: 52, height: 52, borderRadius: 12, fontSize: '1.6rem', textAlign: 'center',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white', flexShrink: 0,
                }}
              />
              <input
                value={game.name}
                onChange={e => updateGame({ name: e.target.value })}
                placeholder="ชื่อเกม"
                style={{
                  flex: 1, height: 52, borderRadius: 12, padding: '0 14px', fontSize: 15,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                }}
              />
            </div>

            {/* Color palette */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8 }}>สีไอคอน</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {ICON_COLORS.map((c, i) => {
                  const isSelected = !game.iconColor && (game.colorIdx ?? 0) === i
                  return (
                    <button
                      key={i}
                      onClick={() => updateGame({ colorIdx: i, iconColor: null })}
                      style={{
                        width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: `linear-gradient(145deg, ${c.from}, ${c.to})`,
                        boxShadow: isSelected ? `0 0 0 3px white, 0 0 0 5px ${c.from}` : `0 2px 8px ${c.from}44`,
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }}
                    />
                  )
                })}

                {/* Custom color picker swatch */}
                <CustomColorSwatch game={game} updateGame={updateGame} />
              </div>
            </div>
          </Section>

          {/* Spot-difference settings */}
          {game.type === 'spot-difference' && (
            <>
              <Section title="⏱ ตั้งเวลา">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number" min="5" max="300"
                    value={game.timerSeconds ?? 10}
                    onChange={e => updateGame({ timerSeconds: parseInt(e.target.value) || 10 })}
                    style={inputStyle}
                  />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>วินาที / ข้อ</span>
                </div>
              </Section>
              <Section title="🔊 เสียงเกม">
                <SoundUploader game={game} updateGame={updateGame} />
              </Section>
              <Section title="🖼 ชุดภาพ">
                <ImageSetsEditor game={game} updateGame={updateGame} />
              </Section>
            </>
          )}

          {/* Physical game settings */}
          {game.type === 'physical' && (
            <>
              <Section title="🖼 ภาพพื้นหลัง">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={fileButtonStyle}>
                    เลือกภาพ
                    <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) handleBgUpload(f) }} />
                  </label>
                  {game.backgroundImage && <span style={{ color: '#4ade80', fontSize: 13 }}>✓ อัปโหลดแล้ว</span>}
                </div>
              </Section>
              <Section title="🎁 อุปกรณ์ประมูล">
                <AuctionItemsEditor game={game} updateGame={updateGame} />
              </Section>
            </>
          )}

          {/* Bingo settings */}
          {game.type === 'human-bingo' && (
            <>
              <Section title="🖼 ภาพพื้นหลัง">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={fileButtonStyle}>
                    เลือกภาพ
                    <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) handleBgUpload(f) }} />
                  </label>
                  {game.backgroundImage && <span style={{ color: '#4ade80', fontSize: 13 }}>✓ อัปโหลดแล้ว</span>}
                </div>
              </Section>
              <Section title="📝 Keywords">
                <BingoKeywordsEditor game={game} updateGame={updateGame} />
              </Section>
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Shared sub-components ─────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: 80, padding: '8px 12px', borderRadius: 10, fontSize: 15, textAlign: 'center',
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white',
}

const fileButtonStyle: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white',
}

/* ── Custom color swatch ───────────────────────────────────────────── */
function CustomColorSwatch({ game, updateGame }: { game: Game; updateGame: (p: Partial<Game>) => void }) {
  const colorInputRef = useRef<HTMLInputElement>(null)
  const isCustom = !!game.iconColor

  const currentHex = isCustom ? game.iconColor!.from : '#a855f7'

  const handleChange = (hex: string) => {
    updateGame({ iconColor: { from: hex, to: darkenHex(hex) }, colorIdx: null })
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => colorInputRef.current?.click()}
        title="Custom color"
        style={{
          width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: isCustom
            ? `linear-gradient(145deg, ${game.iconColor!.from}, ${game.iconColor!.to})`
            : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
          boxShadow: isCustom ? `0 0 0 3px white, 0 0 0 5px ${game.iconColor!.from}` : '0 2px 8px rgba(0,0,0,0.3)',
          transform: isCustom ? 'scale(1.15)' : 'scale(1)',
          transition: 'all 0.15s',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {!isCustom && (
          <span style={{ fontSize: 16, filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }}>✦</span>
        )}
      </button>
      <input
        ref={colorInputRef}
        type="color"
        value={currentHex}
        onChange={e => handleChange(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1, top: 0, left: 0 }}
      />
    </div>
  )
}

/* ── Sound uploader ────────────────────────────────────────────────── */
function SoundUploader({ game, updateGame }: { game: Game; updateGame: (p: Partial<Game>) => void }) {
  const soundFields: { key: 'soundStart' | 'soundTick' | 'soundTimeUp'; label: string }[] = [
    { key: 'soundStart', label: '▶ เริ่มเกม' },
    { key: 'soundTick', label: '🎵 Countdown' },
    { key: 'soundTimeUp', label: '⏰ หมดเวลา' },
  ]
  const readAudio = (file: File, key: keyof Pick<Game, 'soundStart' | 'soundTick' | 'soundTimeUp'>) => {
    const reader = new FileReader()
    reader.onload = e => updateGame({ [key]: e.target?.result as string })
    reader.readAsDataURL(file)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {soundFields.map(({ key, label }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: game[key] ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.05)', border: `1px solid ${game[key] ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)'}` }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1 }}>{label}</span>
          {game[key] && <span style={{ color: '#4ade80', fontSize: 11 }}>✓</span>}
          {game[key] && <button onClick={() => new Audio(game[key] as string).play()} style={{ ...fileButtonStyle, padding: '4px 10px', fontSize: 11 }}>▶</button>}
          <label style={{ ...fileButtonStyle, padding: '4px 10px', fontSize: 11 }}>
            {game[key] ? 'เปลี่ยน' : 'เลือก'}
            <input type="file" accept="audio/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) readAudio(f, key) }} />
          </label>
          {game[key] && <button onClick={() => updateGame({ [key]: null })} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>✕</button>}
        </div>
      ))}
    </div>
  )
}

/* ── Bingo keywords ────────────────────────────────────────────────── */
function BingoKeywordsEditor({ game, updateGame }: { game: Game; updateGame: (p: Partial<Game>) => void }) {
  const keywords = game.bingoKeywords ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>1 บรรทัด / คำ</span>
        <span style={{ fontSize: 12, color: keywords.length >= 24 ? '#4ade80' : '#fb923c' }}>{keywords.length} / 24</span>
      </div>
      <textarea
        value={keywords.join('\n')}
        onChange={e => updateGame({ bingoKeywords: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
        rows={12}
        placeholder="เคยไปญี่ปุ่น&#10;ใช้ Mechanical Keyboard&#10;มีแมว&#10;..."
        style={{
          width: '100%', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'white', resize: 'vertical', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

/* ── Image sets editor ─────────────────────────────────────────────── */
function ImageSetsEditor({ game, updateGame }: { game: Game; updateGame: (p: Partial<Game>) => void }) {
  const sets = game.imageSets ?? []
  const [expandedSetIds, setExpandedSetIds] = useState<Set<string>>(() => new Set(sets.map(s => s.id)))
  const [newSetName, setNewSetName] = useState('')

  const saveSets = (next: ImageSet[]) => updateGame({ imageSets: next })
  const addSet = () => {
    const name = newSetName.trim() || `ชุดที่ ${sets.length + 1}`
    saveSets([...sets, { id: String(Date.now()), name, pairs: [] }])
    setNewSetName('')
  }
  const deleteSet = (id: string) => {
    saveSets(sets.filter(s => s.id !== id))
    setExpandedSetIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sets.map((set, si) => (
        <div key={set.id} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{si + 1}.</span>
            <input
              value={set.name}
              onChange={e => saveSets(sets.map(s => s.id === set.id ? { ...s, name: e.target.value } : s))}
              style={{ flex: 1, background: 'none', border: 'none', color: 'white', fontSize: 14, fontWeight: 600 }}
            />
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{set.pairs.length} โจทย์</span>
            <button
              onClick={() => setExpandedSetIds(prev => { const n = new Set(prev); n.has(set.id) ? n.delete(set.id) : n.add(set.id); return n })}
              style={{ ...fileButtonStyle, padding: '3px 8px', fontSize: 11 }}
            >
              {expandedSetIds.has(set.id) ? '▲' : '▼'}
            </button>
            <button onClick={() => deleteSet(set.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
          {expandedSetIds.has(set.id) && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px' }}>
              <PairsEditor
                pairs={set.pairs}
                onChange={pairs => saveSets(sets.map(s => s.id === set.id ? { ...s, pairs } : s))}
              />
            </div>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={newSetName}
          onChange={e => setNewSetName(e.target.value)}
          placeholder={`ชื่อชุด ${sets.length + 1}`}
          onKeyDown={e => e.key === 'Enter' && addSet()}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
        />
        <button onClick={addSet} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}>+ เพิ่ม</button>
      </div>
    </div>
  )
}

function PairsEditor({ pairs, onChange }: { pairs: ImagePair[]; onChange: (p: ImagePair[]) => void }) {
  const [pendingA, setPendingA] = useState<string | null>(null)
  const [pendingB, setPendingB] = useState<string | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')
  const [pendingCorrect, setPendingCorrect] = useState<'A' | 'B'>('A')

  const readFile = (file: File, setter: (v: string) => void) => {
    compressImage(file, 900, 0.72).then(setter)
  }

  const addPair = () => {
    if (!pendingA || !pendingB) return
    onChange([...pairs, { id: String(Date.now()), imageA: pendingA, imageB: pendingB, label: pendingLabel || `ข้อที่ ${pairs.length + 1}`, correctImage: pendingCorrect }])
    setPendingA(null); setPendingB(null); setPendingLabel(''); setPendingCorrect('A')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {pairs.map((pair, i) => (
        <div key={pair.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, width: 16 }}>{i + 1}.</span>
          <div style={{ position: 'relative' }}>
            <img src={pair.imageA} alt="A" style={{ width: 40, height: 28, objectFit: 'cover', borderRadius: 4 }} />
            {pair.correctImage === 'A' && <span style={{ position: 'absolute', top: -4, right: -4, background: '#22c55e', color: 'white', borderRadius: '50%', width: 12, height: 12, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>vs</span>
          <div style={{ position: 'relative' }}>
            <img src={pair.imageB} alt="B" style={{ width: 40, height: 28, objectFit: 'cover', borderRadius: 4 }} />
            {pair.correctImage === 'B' && <span style={{ position: 'absolute', top: -4, right: -4, background: '#22c55e', color: 'white', borderRadius: '50%', width: 12, height: 12, fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>}
          </div>
          <span style={{ flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pair.label}</span>
          {(['A', 'B'] as const).map(side => (
            <button key={side} onClick={() => onChange(pairs.map(p => p.id === pair.id ? { ...p, correctImage: side } : p))}
              style={{ padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: pair.correctImage === side ? '#22c55e' : 'rgba(255,255,255,0.1)', color: pair.correctImage === side ? 'white' : 'rgba(255,255,255,0.5)' }}>
              {side}
            </button>
          ))}
          <button onClick={() => onChange(pairs.filter(p => p.id !== pair.id))} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>✕</button>
        </div>
      ))}

      {/* Add pair form */}
      <div style={{ border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>+ เพิ่มโจทย์</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[{ label: 'ภาพ A', state: pendingA, setter: setPendingA }, { label: 'ภาพ B', state: pendingB, setter: setPendingB }].map(({ label, state, setter }) => (
            <div key={label}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 4 }}>{label}</p>
              <label style={fileButtonStyle}>เลือก<input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f, setter) }} /></label>
              {state && <img src={state} style={{ marginTop: 4, height: 36, objectFit: 'contain', borderRadius: 4, display: 'block' }} />}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input value={pendingLabel} onChange={e => setPendingLabel(e.target.value)} placeholder="ชื่อข้อ"
            style={{ flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>เฉลย:</span>
          {(['A', 'B'] as const).map(side => (
            <button key={side} onClick={() => setPendingCorrect(side)}
              style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: pendingCorrect === side ? '#22c55e' : 'rgba(255,255,255,0.1)', color: pendingCorrect === side ? 'white' : 'rgba(255,255,255,0.5)' }}>
              {side}
            </button>
          ))}
          <button onClick={addPair} disabled={!pendingA || !pendingB}
            style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: 'none', background: pendingA && pendingB ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', color: pendingA && pendingB ? 'white' : 'rgba(255,255,255,0.25)' }}>
            เพิ่ม
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Auction items editor ───────────────────────────────────────────── */
function AuctionItemsEditor({ game, updateGame }: { game: Game; updateGame: (p: Partial<Game>) => void }) {
  const items: AuctionItem[] = game.auctionItems ?? []
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)

  const updateItem = (itemId: string, patch: Partial<AuctionItem>) =>
    updateGame({ auctionItems: items.map(it => it.id === itemId ? { ...it, ...patch } : it) })

  const handleVideoUpload = (itemId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = e => updateItem(itemId, { videoBase64: e.target?.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, idx) => (
        <div key={item.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, width: 20 }}>{idx + 1}.</span>
            <input
              value={item.name}
              onChange={e => updateItem(item.id, { name: e.target.value })}
              placeholder="ชื่ออุปกรณ์"
              style={{ flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
            />
            <button onClick={() => updateGame({ auctionItems: items.filter(it => it.id !== item.id) })} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 28 }}>
            <label style={{ ...fileButtonStyle, fontSize: 11, padding: '4px 10px' }}>
              {item.videoBase64 ? 'เปลี่ยนวิดีโอ' : 'อัปโหลดวิดีโอ'}
              <input type="file" accept="video/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(item.id, f) }} />
            </label>
            {item.videoBase64 && (
              <>
                <span style={{ color: '#4ade80', fontSize: 11 }}>✓</span>
                <button onClick={() => setPreviewSrc(item.videoBase64!)} style={{ ...fileButtonStyle, fontSize: 11, padding: '4px 10px' }}>▶ Preview</button>
              </>
            )}
          </div>
        </div>
      ))}
      <button
        onClick={() => updateGame({ auctionItems: [...items, { id: Date.now().toString(), name: `อุปกรณ์ ${items.length + 1}` }] })}
        style={{ padding: '9px', borderRadius: 10, fontSize: 13, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}
      >
        + เพิ่มอุปกรณ์
      </button>

      {previewSrc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }} onClick={() => setPreviewSrc(null)}>
          <div style={{ background: '#111', borderRadius: 16, overflow: 'hidden', maxWidth: 360, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#1a1a1a' }}>
              <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>Preview วิดีโอ</span>
              <button onClick={() => setPreviewSrc(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <video src={previewSrc} controls autoPlay style={{ width: '100%', maxHeight: 240, background: 'black' }} />
          </div>
        </div>
      )}
    </div>
  )
}
