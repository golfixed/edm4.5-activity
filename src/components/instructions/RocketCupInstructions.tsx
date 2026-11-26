'use client'

import { useState } from 'react'
import InstructionsShell, { INK, PenFilter, type InstructionsPageProps } from './InstructionsShell'

/** Points by finishing order: 1st 100, then −10 per place, never below 50. */
export const RANK_POINTS = [100, 90, 80, 70, 60, 50]
const pointsForRank = (rank: number) => RANK_POINTS[Math.min(rank, RANK_POINTS.length) - 1]

const CUP = '#fffdf7'
const CUP_BAND = '#f59e0b'
const STRAW = '#f472b6'
const CHAIR = '#c98b55'
const CHAIR_DARK = '#a86b38'

// Rope runs between the two chair backs with a little sag.
const ROPE = { x1: 132, x2: 768, y: 196, sag: 30 }
const ropeY = (x: number) => {
  const t = (x - ROPE.x1) / (ROPE.x2 - ROPE.x1)
  return ROPE.y + 4 * t * (1 - t) * ROPE.sag / 2
}

// ── Pen-drawn pieces (viewBox units) ─────────────────────────────────────────

/** Side-view chair standing on the floor (y = floor); back post at x, seat toward `dir`. */
function Chair({ x, floor, dir }: { x: number; floor: number; dir: 1 | -1 }) {
  const seat = floor - 92
  const sx = x + dir * 78
  return (
    <g stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      {/* back post + back rest */}
      <path d={`M${x} ${floor} L${x} ${ROPE.y - 8}`} fill="none" strokeWidth={5} stroke={CHAIR_DARK} />
      <path d={`M${x} ${floor} L${x} ${ROPE.y - 8}`} fill="none" />
      <rect x={Math.min(x, x + dir * 12) - 2} y={ROPE.y + 14} width={14} height={78} rx={4} fill={CHAIR} />
      {/* seat */}
      <path d={`M${x} ${seat} L${sx} ${seat} L${sx} ${seat + 10} L${x} ${seat + 10} Z`} fill={CHAIR} />
      {/* front leg + stretcher */}
      <path d={`M${sx - dir * 4} ${seat + 10} L${sx - dir * 4} ${floor}`} fill="none" strokeWidth={4} stroke={CHAIR_DARK} />
      <path d={`M${x} ${floor - 30} L${sx - dir * 4} ${floor - 30}`} fill="none" strokeWidth={1.8} />
    </g>
  )
}

/** Paper cup lying on its side, mouth facing left, hung under a straw on the rope. */
function RocketCup({ x, ghost = false }: { x: number; ghost?: boolean }) {
  const y = ropeY(x)
  return (
    <g stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" opacity={ghost ? 0.35 : 1}>
      {/* straw threaded on the rope */}
      <rect x={x - 34} y={y - 6} width={68} height={12} rx={6} fill={STRAW} />
      {[-20, -6, 8, 22].map(d => <path key={d} d={`M${x + d} ${y - 5} l6 10`} stroke="white" strokeWidth={2} />)}
      {/* tape */}
      <path d={`M${x - 8} ${y + 4} L${x - 8} ${y + 16} M${x + 12} ${y + 4} L${x + 12} ${y + 16}`} stroke="#94a3b8" strokeWidth={5} />
      {/* cup body: wide mouth on the left, base on the right */}
      <path d={`M${x - 40} ${y + 12} L${x + 34} ${y + 20} L${x + 34} ${y + 50} L${x - 40} ${y + 62} Z`} fill={CUP} />
      <path d={`M${x - 26} ${y + 14} L${x - 26} ${y + 60}`} stroke={CUP_BAND} strokeWidth={5} />
      <ellipse cx={x - 40} cy={y + 37} rx={8} ry={25} fill="#fde68a" />
    </g>
  )
}

/** Stick player bent over, cheeks puffed, blowing toward the right. */
function Blower({ x, floor }: { x: number; floor: number }) {
  const hx = x + 40, hy = ropeY(x) + 36
  return (
    <g stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx={hx} cy={hy} r={22} fill="#fff7ec" />
      <circle cx={hx + 14} cy={hy + 6} r={8} fill="#fecaca" strokeWidth={2} />
      <path d={`M${hx + 4} ${hy - 6} h0.1`} strokeWidth={4.5} />
      <circle cx={hx + 23} cy={hy + 4} r={3.5} strokeWidth={2.2} />
      {/* body bending forward from the hips */}
      <path d={`M${hx - 16} ${hy + 14} C${x - 8} ${hy + 60} ${x - 14} ${floor - 120} ${x - 10} ${floor - 92}`} />
      {/* legs */}
      <path d={`M${x - 10} ${floor - 92} L${x - 30} ${floor}`} />
      <path d={`M${x - 10} ${floor - 92} L${x + 14} ${floor}`} />
      <path d={`M${x - 42} ${floor} h18 M${x + 8} ${floor} h18`} />
      {/* hands on knees */}
      <path d={`M${hx - 12} ${hy + 30} C${x + 4} ${floor - 110} ${x + 8} ${floor - 80} ${x + 2} ${floor - 58}`} />
    </g>
  )
}

function HowToPlayDrawing() {
  const floor = 412
  const cupX = 330
  return (
    <svg viewBox="0 0 900 460" className="w-full h-full" role="img" aria-label="ผู้เล่นเป่าแก้วกระดาษที่ติดหลอดบนเชือกให้พุ่งไปยังเก้าอี้อีกฝั่ง">
      <defs><PenFilter id="pen-rocket" /></defs>
      <g filter="url(#pen-rocket)">
        {/* floor */}
        <path d="M20 412 C200 406 420 416 600 410 C700 407 800 412 880 409" stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        {[60, 230, 420, 600, 820].map(fx => (
          <path key={fx} d={`M${fx} 426 h26`} stroke={INK} strokeWidth={1.6} opacity={0.3} strokeLinecap="round" />
        ))}

        <Chair x={ROPE.x1} floor={floor} dir={-1} />
        <Chair x={ROPE.x2} floor={floor} dir={1} />

        {/* rope tied to both chair backs */}
        <path d={`M${ROPE.x1} ${ROPE.y} Q${(ROPE.x1 + ROPE.x2) / 2} ${ROPE.y + ROPE.sag} ${ROPE.x2} ${ROPE.y}`} stroke={INK} strokeWidth={2} fill="none" />
        <path d={`M${ROPE.x1 - 6} ${ROPE.y - 6} l12 12 M${ROPE.x1 + 6} ${ROPE.y - 6} l-12 12 M${ROPE.x2 - 6} ${ROPE.y - 6} l12 12 M${ROPE.x2 + 6} ${ROPE.y - 6} l-12 12`} stroke={INK} strokeWidth={2} />

        {/* finish flag on the far chair */}
        <path d={`M${ROPE.x2} ${ROPE.y - 8} L${ROPE.x2} ${ROPE.y - 70}`} stroke={INK} strokeWidth={2.4} />
        <path d={`M${ROPE.x2} ${ROPE.y - 70} L${ROPE.x2 + 42} ${ROPE.y - 58} L${ROPE.x2} ${ROPE.y - 46} Z`} fill="#ef4444" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />

        <Blower x={cupX - 150} floor={floor} />
        {/* puff of air into the cup mouth */}
        <g stroke="#7aa7d9" strokeWidth={3} strokeLinecap="round" fill="none">
          <path d={`M${cupX - 82} ${ropeY(cupX) + 34} h22`} />
          <path d={`M${cupX - 84} ${ropeY(cupX) + 46} h20`} />
          <path d={`M${cupX - 80} ${ropeY(cupX) + 22} h16`} />
        </g>

        <RocketCup x={cupX} />
        <RocketCup x={680} ghost />

        {/* path along the rope */}
        <path d={`M${cupX + 60} ${ropeY(cupX + 60) - 30} Q520 ${ROPE.y - 30} 640 ${ropeY(640) - 30}`} stroke={INK} strokeWidth={2.2} fill="none" strokeDasharray="8 8" strokeLinecap="round" markerEnd="url(#pen-rocket-arrow)" />
        <g stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.5}>
          <path d={`M${cupX + 48} ${ropeY(cupX) + 28} h26 M${cupX + 48} ${ropeY(cupX) + 42} h18`} />
        </g>

        {/* hand-written labels */}
        <g fill={INK} fontFamily="inherit" fontWeight={700} fontSize={26}>
          <text x={236} y={330}>เป่า!</text>
          <text x={410} y={150}>แก้วพุ่งไปตามเชือก</text>
          <text x={745} y={292} textAnchor="end">ถึงเก้าอี้</text>
          <text x={745} y={324} textAnchor="end">= เข้าเส้นชัย</text>
        </g>
      </g>
    </svg>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const medal = (rank: number) =>
  rank === 1 ? 'bg-amber-400 border-amber-500 text-white'
    : rank === 2 ? 'bg-gray-300 border-gray-400 text-gray-800'
      : rank === 3 ? 'bg-orange-300 border-orange-400 text-orange-900'
        : 'bg-orange-50 border-orange-200 text-orange-800'

export default function RocketCupInstructions(props: InstructionsPageProps) {
  const [rank, setRank] = useState(1)

  return (
    <InstructionsShell
      {...props}
      heading="เกมเป่าแก้วจรวด"
      subtitle="เป่าแก้วกระดาษที่ติดหลอดบนเชือก ให้พุ่งไปถึงเก้าอี้อีกฝั่ง"
      drawing={<HowToPlayDrawing />}
      steps={['เริ่มที่เก้าอี้ฝั่งหนึ่ง', 'เป่าปากแก้วให้พุ่งไปตามเชือก', 'ถึงเก้าอี้อีกฝั่ง = เข้าเส้นชัย']}
      rules={<>
        <p className="text-gray-600 text-lg leading-snug">ให้คะแนนตามลำดับที่แก้วถึงเก้าอี้อีกฝั่งภายในเวลา</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 [@media(max-height:760px)]:gap-y-1.5">
          {RANK_POINTS.map((pts, i) => (
            <div key={pts} className="flex items-center gap-3">
              <span className={`w-11 h-11 [@media(max-height:760px)]:w-9 [@media(max-height:760px)]:h-9 rounded-full border-2 font-extrabold text-lg flex items-center justify-center flex-shrink-0 ${medal(i + 1)}`}>
                {i + 1}{i === RANK_POINTS.length - 1 ? '+' : ''}
              </span>
              <span className="text-gray-900 font-extrabold text-3xl [@media(max-height:760px)]:text-2xl tabular-nums">{pts}</span>
              <span className="text-gray-500 text-base">คะแนน</span>
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-base">อันดับ 6 เป็นต้นไปได้ 50 คะแนน</p>
      </>}
      helper={<>
        <span className="text-gray-600 text-lg">แก้วถึงเก้าอี้เป็นอันดับที่</span>
        <div className="grid grid-cols-6 gap-2">
          {RANK_POINTS.map((_, i) => (
            <button key={i} onClick={() => setRank(i + 1)}
              className={`h-12 [@media(max-height:760px)]:h-10 rounded-xl border-2 font-extrabold text-xl transition-colors ${rank === i + 1 ? 'bg-orange-500 border-orange-600 text-white' : 'bg-white border-orange-200 text-orange-700 hover:bg-orange-50'}`}>
              {i + 1}{i === RANK_POINTS.length - 1 ? '+' : ''}
            </button>
          ))}
        </div>
        <div className="flex justify-between items-center border-t-2 border-orange-100 pt-3">
          <span className="text-gray-900 font-extrabold text-3xl">ได้</span>
          <span className="text-orange-600 font-black text-7xl [@media(max-height:760px)]:text-5xl leading-none tabular-nums">{pointsForRank(rank)}</span>
        </div>
      </>}
    />
  )
}
