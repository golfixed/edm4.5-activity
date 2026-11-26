'use client'

import { useState } from 'react'
import InstructionsShell, { INK, PenFilter, outlineBtnCls, type InstructionsPageProps } from './InstructionsShell'

const YELLOW_PT = 1
const RED_PT = 10
const EXAMPLE = { yellow: 7, red: 2 }

const YELLOW = '#f8e43a'
const YELLOW_DARK = '#f2b92e'
const RED = '#ec4a2b'
const RED_DARK = '#c3311b'
const FAN_BLUE = '#2f3fe0'
const FAN_RED = '#f0281c'

// ── Pen-drawn pieces (viewBox units) ─────────────────────────────────────────

/** Side-view fish facing left, ~80 wide, centred on (0,0). */
function Fish({ x, y, s = 1, color, fin, flip = false }: { x: number; y: number; s?: number; color: string; fin: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} stroke={INK} strokeWidth={2.4 / s} strokeLinejoin="round" strokeLinecap="round">
      {/* tail */}
      <path d="M22 0 C30 -6 34 -14 42 -18 C40 -8 40 8 42 18 C34 14 30 6 22 0 Z" fill={fin} />
      {/* top fin */}
      <path d="M-14 -16 C-4 -28 12 -26 20 -12" fill={fin} />
      {/* body */}
      <path d="M-38 2 C-32 -16 -12 -22 6 -18 C18 -15 26 -6 26 0 C26 6 18 15 6 18 C-12 22 -32 16 -38 2 Z" fill={color} />
      {/* side fin */}
      <path d="M-6 -4 C2 -10 10 -6 8 2 C6 8 -2 8 -6 -4 Z" fill={fin} />
      {/* eye */}
      <circle cx="-24" cy="-4" r="7" fill="white" />
      <circle cx="-26" cy="-4" r="3.4" fill={INK} stroke="none" />
      {/* mouth */}
      <path d="M-38 4 C-34 6 -31 6 -29 5" fill="none" />
    </g>
  )
}

/** Hand fan: scalloped head + handle, handle end at (0,0), pointing up before rotation. */
function Fan({ x, y, rot, color, s = 1 }: { x: number; y: number; rot: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
      <path d="M-4 0 L-4 -46 L4 -46 L4 0 Z" fill={color} />
      <path d="M-22 -44 C-40 -50 -46 -70 -40 -86 C-34 -104 -16 -112 0 -110 C16 -112 34 -104 40 -86 C46 -70 40 -50 22 -44 C12 -40 -12 -40 -22 -44 Z" fill={color} />
      <path d="M-20 -48 C-8 -52 8 -52 20 -48" fill="none" opacity={0.6} />
      {[-30, -15, 0, 15, 30].map(a => (
        <path key={a} d="M0 -50 L0 -96" transform={`rotate(${a} 0 -50)`} fill="none" stroke="white" strokeOpacity={0.45} strokeWidth={1.6} />
      ))}
    </g>
  )
}

/** Woven tray (กระด้ง / plastic plate) seen from the side, centred on (cx, cy). */
function Tray({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx={cx} cy={cy} rx={130} ry={34} fill="#f6dfb4" />
      <ellipse cx={cx} cy={cy - 2} rx={112} ry={25} fill="#fbecd0" />
      {[-80, -50, -20, 10, 40, 70].map(d => (
        <path key={d} d={`M${cx + d} ${cy - 22} C${cx + d + 8} ${cy - 10} ${cx + d + 8} ${cy + 8} ${cx + d + 2} ${cy + 20}`} fill="none" strokeWidth={1.2} opacity={0.35} />
      ))}
    </g>
  )
}

/** Simple stick player crouching, holding a fan toward the right. */
function Player({ x, y, fan }: { x: number; y: number; fan: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx="0" cy="-150" r="22" fill="#fff7ec" />
      <path d="M-7 -152 h0.1 M7 -152 h0.1" strokeWidth={4.5} />
      <path d="M-6 -141 C-2 -137 3 -137 7 -141" strokeWidth={2.2} />
      {/* body leaning forward */}
      <path d="M4 -128 C14 -100 26 -78 34 -58" />
      {/* legs (crouch) */}
      <path d="M34 -58 C14 -44 2 -24 -6 0" />
      <path d="M34 -58 C56 -48 66 -30 62 0" />
      <path d="M-14 0 h18 M56 0 h18" />
      {/* back arm */}
      <path d="M12 -112 C24 -96 40 -90 54 -92" />
      {/* fan arm */}
      <path d="M10 -116 C32 -112 54 -100 74 -82" />
      <Fan x={78} y={-78} rot={118} color={fan} s={0.85} />
    </g>
  )
}

/** Curvy wind strokes, starting at (x, y), going right. */
function Wind({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#7aa7d9" strokeWidth={3} strokeLinecap="round" fill="none">
      <path d={`M${x} ${y} C${x + 30} ${y - 10} ${x + 60} ${y + 8} ${x + 92} ${y}`} />
      <path d={`M${x + 12} ${y + 22} C${x + 44} ${y + 12} ${x + 76} ${y + 30} ${x + 112} ${y + 22}`} />
      <path d={`M${x - 4} ${y + 44} C${x + 26} ${y + 36} ${x + 52} ${y + 52} ${x + 80} ${y + 46}`} />
    </g>
  )
}

function HowToPlayDrawing() {
  return (
    <svg viewBox="0 0 900 460" className="w-full h-full" role="img" aria-label="ผู้เล่นใช้พัดโบกลมให้ปลาเข้าไปในกระด้ง">
      <defs>
        <PenFilter id="pen-fish" />
      </defs>
      <g filter="url(#pen-fish)">
        {/* floor */}
        <path d="M20 412 C200 406 420 416 600 410 C700 407 800 412 880 409" stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        {[60, 170, 300, 430, 540].map(fx => (
          <path key={fx} d={`M${fx} 426 h26`} stroke={INK} strokeWidth={1.6} opacity={0.3} strokeLinecap="round" />
        ))}

        <Player x={90} y={410} fan={FAN_BLUE} />
        <Wind x={262} y={300} />

        {/* fish sliding along the floor */}
        <Fish x={420} y={392} s={0.9} color={YELLOW} fin={YELLOW_DARK} />
        <Fish x={525} y={398} s={0.8} color={RED} fin={RED_DARK} />
        <path d="M455 360 h-40 M450 372 h-26" stroke={INK} strokeWidth={2} strokeLinecap="round" opacity={0.5} />

        {/* path the fish should take */}
        <path d="M570 352 C620 300 680 300 720 340" stroke={INK} strokeWidth={2.2} fill="none" strokeDasharray="8 8" strokeLinecap="round" markerEnd="url(#pen-fish-arrow)" />

        <Tray cx={745} cy={392} />
        <Fish x={712} y={384} s={0.62} color={YELLOW} fin={YELLOW_DARK} />
        <Fish x={784} y={388} s={0.62} color={RED} fin={RED_DARK} />
        <Fish x={752} y={374} s={0.55} color={YELLOW} fin={YELLOW_DARK} />

        {/* hand-written labels */}
        <g fill={INK} fontFamily="inherit" fontWeight={700} fontSize={26}>
          <text x={110} y={140}>โบกพัด</text>
          <text x={330} y={262}>ลมพาปลาไป</text>
          <text x={655} y={300}>เข้ากระด้ง!</text>
        </g>
        <path d="M150 150 C160 170 168 190 170 210" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" markerEnd="url(#pen-fish-arrow)" />
      </g>
    </svg>
  )
}


function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const btn = 'w-10 h-10 [@media(max-height:760px)]:w-8 [@media(max-height:760px)]:h-8 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-xl transition-colors flex-shrink-0'
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(Math.max(0, value - 1))} className={btn}>−</button>
      <span className="w-10 text-center text-gray-900 font-extrabold text-2xl tabular-nums">{value}</span>
      <button onClick={() => onChange(value + 1)} className={btn}>+</button>
    </div>
  )
}

function FishIcon({ color, fin }: { color: string; fin: string }) {
  return (
    <svg viewBox="-44 -26 92 52" className="w-16 h-10 [@media(max-height:760px)]:w-12 [@media(max-height:760px)]:h-8 flex-shrink-0">
      <Fish x={0} y={0} color={color} fin={fin} />
    </svg>
  )
}

export default function FishFanInstructions(props: InstructionsPageProps) {
  const [yellow, setYellow] = useState(EXAMPLE.yellow)
  const [red, setRed] = useState(EXAMPLE.red)
  const yellowScore = yellow * YELLOW_PT
  const redScore = red * RED_PT

  return (
    <InstructionsShell
      {...props}
      heading="เกมพัดปลาใส่กระด้ง"
      subtitle="ใช้พัดโบกลมพาปลาเข้าไปในกระด้ง (จานพลาสติก)"
      drawing={<HowToPlayDrawing />}
      steps={['ถือพัดคนละ 1 อัน', 'โบกพัดให้ลมพาปลาไปข้างหน้า', 'พาปลาเข้าไปในกระด้ง']}
      importantRule={<>ปลาที่เข้ากระด้งแล้ว ถ้าถูกพัดกระเด็นออกมา <span className="font-bold">จะไม่นับคะแนน</span></>}
      rules={<>
        <div className="flex items-center gap-4">
          <FishIcon color={YELLOW} fin={YELLOW_DARK} />
          <span className="text-gray-700 text-xl flex-1">ปลาสีเหลือง<br /><span className="text-base text-gray-500">ตัวละ</span></span>
          <span className="text-gray-900 font-extrabold text-2xl [@media(max-height:760px)]:text-xl whitespace-nowrap">{YELLOW_PT} คะแนน</span>
        </div>
        <div className="flex items-center gap-4">
          <FishIcon color={RED} fin={RED_DARK} />
          <span className="text-gray-700 text-xl flex-1">ปลาสีแดง<br /><span className="text-base text-gray-500">ตัวละ</span></span>
          <span className="text-gray-900 font-extrabold text-2xl [@media(max-height:760px)]:text-xl whitespace-nowrap">{RED_PT} คะแนน</span>
        </div>
        <div className="flex items-center gap-4 pt-1 border-t border-orange-100">
          <svg viewBox="-60 -125 120 135" className="w-16 h-14 [@media(max-height:760px)]:h-10 flex-shrink-0">
            <Fan x={-14} y={6} rot={-12} color={FAN_BLUE} s={0.95} />
            <Fan x={14} y={6} rot={12} color={FAN_RED} s={0.95} />
          </svg>
          <span className="text-gray-700 text-xl flex-1 leading-tight">อุปกรณ์<br /><span className="text-base text-gray-500">พัดสีน้ำเงิน / สีแดง</span></span>
        </div>
      </>}
      helper={<>
        <div className="flex justify-between items-center text-gray-600 text-xl">
          <span className="whitespace-nowrap text-lg">ปลาเหลือง ×{YELLOW_PT}</span>
          <Stepper value={yellow} onChange={setYellow} />
          <span className="font-bold w-12 text-right tabular-nums">{yellowScore}</span>
        </div>
        <div className="flex justify-between items-center text-gray-600 text-xl">
          <span className="whitespace-nowrap text-lg">ปลาแดง ×{RED_PT}</span>
          <Stepper value={red} onChange={setRed} />
          <span className="font-bold w-12 text-right tabular-nums">{redScore}</span>
        </div>
        <div className="flex justify-between items-center border-t-2 border-orange-100 pt-3">
          <span className="text-gray-900 font-extrabold text-3xl">รวม</span>
          <span className="text-orange-600 font-black text-7xl [@media(max-height:760px)]:text-5xl leading-none tabular-nums">{yellowScore + redScore}</span>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={() => { setYellow(EXAMPLE.yellow); setRed(EXAMPLE.red) }} className={outlineBtnCls}>ตัวอย่าง</button>
          <button onClick={() => { setYellow(0); setRed(0) }} className={outlineBtnCls}>ล้าง</button>
        </div>
      </>}
    />
  )
}
