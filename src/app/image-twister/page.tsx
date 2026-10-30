'use client'

import { useState, useRef, useCallback, useEffect, DragEvent, PointerEvent } from 'react'
import { useRouter } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────────
type Mode = 'auto' | 'ai'
type Difficulty = 'easy' | 'medium' | 'hard'
type EffectType = 'hue' | 'brightness' | 'saturate' | 'flip-h' | 'flip-v' | 'invert' | 'blur'

interface Region { x: number; y: number; w: number; h: number }
interface Difference { region: Region; effect: EffectType; strength: number; label: number }

const DIFFICULTY_CONFIG: Record<Difficulty, { count: number; cellMin: number; cellMax: number; sMin: number; sMax: number }> = {
  easy:   { count: 6, cellMin: 0.14, cellMax: 0.26, sMin: 0.65, sMax: 1.0 },
  medium: { count: 4, cellMin: 0.09, cellMax: 0.17, sMin: 0.40, sMax: 0.70 },
  hard:   { count: 3, cellMin: 0.05, cellMax: 0.11, sMin: 0.20, sMax: 0.42 },
}

const ALL_EFFECTS: EffectType[] = ['hue', 'brightness', 'saturate', 'flip-h', 'flip-v', 'invert', 'blur']
const EFFECT_LABELS: Record<EffectType, string> = {
  hue: 'เปลี่ยนสี', brightness: 'สว่าง/มืด', saturate: 'ความอิ่มตัวสี',
  'flip-h': 'กลับซ้าย-ขวา', 'flip-v': 'กลับบน-ล่าง', invert: 'สีกลับ', blur: 'เบลอ',
}

const MAX_DIM = 900
// gpt-image-2 minimum is 1024×1024
const AI_SIZE = 1024

// ── Color helpers ──────────────────────────────────────────────────────────────
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v] }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [Math.round(hue2rgb(h + 1 / 3) * 255), Math.round(hue2rgb(h) * 255), Math.round(hue2rgb(h - 1 / 3) * 255)]
}

// ── Canvas pixel effects (Auto mode) ──────────────────────────────────────────
function applyEffect(ctx: CanvasRenderingContext2D, region: Region, effect: EffectType, strength: number) {
  const { x, y, w, h } = region
  const id = ctx.getImageData(x, y, w, h)
  const d = id.data

  switch (effect) {
    case 'hue': {
      const deg = strength * 140
      for (let i = 0; i < d.length; i += 4) {
        const [hh, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2])
        const [r, g, b] = hslToRgb((hh + deg / 360 + 1) % 1, s, l)
        d[i] = r; d[i + 1] = g; d[i + 2] = b
      }
      break
    }
    case 'brightness': {
      const darken = Math.random() < 0.5
      const f = darken ? Math.max(0.3, 1 - strength * 0.55) : Math.min(2.2, 1 + strength * 0.6)
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i] * f); d[i + 1] = Math.min(255, d[i + 1] * f); d[i + 2] = Math.min(255, d[i + 2] * f)
      }
      break
    }
    case 'saturate': {
      const desaturate = Math.random() < 0.5
      for (let i = 0; i < d.length; i += 4) {
        const [hh, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2])
        const newS = desaturate ? Math.max(0, s * (1 - strength)) : Math.min(1, s + strength * 0.6)
        const [r, g, b] = hslToRgb(hh, newS, l)
        d[i] = r; d[i + 1] = g; d[i + 2] = b
      }
      break
    }
    case 'flip-h': {
      const copy = new Uint8ClampedArray(d)
      for (let row = 0; row < h; row++)
        for (let col = 0; col < w; col++) {
          const src = (row * w + col) * 4, dst = (row * w + (w - 1 - col)) * 4
          d[src] = copy[dst]; d[src + 1] = copy[dst + 1]; d[src + 2] = copy[dst + 2]; d[src + 3] = copy[dst + 3]
        }
      break
    }
    case 'flip-v': {
      const copy = new Uint8ClampedArray(d)
      for (let row = 0; row < h; row++)
        for (let col = 0; col < w; col++) {
          const src = (row * w + col) * 4, dst = ((h - 1 - row) * w + col) * 4
          d[src] = copy[dst]; d[src + 1] = copy[dst + 1]; d[src + 2] = copy[dst + 2]; d[src + 3] = copy[dst + 3]
        }
      break
    }
    case 'invert': {
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.round(d[i] * (1 - strength) + (255 - d[i]) * strength)
        d[i + 1] = Math.round(d[i + 1] * (1 - strength) + (255 - d[i + 1]) * strength)
        d[i + 2] = Math.round(d[i + 2] * (1 - strength) + (255 - d[i + 2]) * strength)
      }
      break
    }
    case 'blur': {
      const radius = Math.max(1, Math.round(strength * 4))
      const temp = new Uint8ClampedArray(d)
      for (let row = 0; row < h; row++)
        for (let col = 0; col < w; col++) {
          let r = 0, g = 0, b = 0, cnt = 0
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = Math.max(0, Math.min(w - 1, col + dx))
            const idx = (row * w + nx) * 4
            r += d[idx]; g += d[idx + 1]; b += d[idx + 2]; cnt++
          }
          const idx = (row * w + col) * 4
          temp[idx] = r / cnt; temp[idx + 1] = g / cnt; temp[idx + 2] = b / cnt; temp[idx + 3] = d[idx + 3]
        }
      for (let col = 0; col < w; col++)
        for (let row = 0; row < h; row++) {
          let r = 0, g = 0, b = 0, cnt = 0
          for (let dy = -radius; dy <= radius; dy++) {
            const ny = Math.max(0, Math.min(h - 1, row + dy))
            const idx = (ny * w + col) * 4
            r += temp[idx]; g += temp[idx + 1]; b += temp[idx + 2]; cnt++
          }
          const idx = (row * w + col) * 4
          d[idx] = r / cnt; d[idx + 1] = g / cnt; d[idx + 2] = b / cnt
        }
      break
    }
  }
  ctx.putImageData(id, x, y)
}

// ── Canvas helpers ─────────────────────────────────────────────────────────────
function canvasToSquarePng(canvas: HTMLCanvasElement, size: number): Promise<Blob> {
  return new Promise(resolve => {
    const c = document.createElement('canvas')
    c.width = size; c.height = size
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    // Fit original maintaining aspect ratio, centered
    const scale = Math.min(size / canvas.width, size / canvas.height)
    const dw = Math.round(canvas.width * scale), dh = Math.round(canvas.height * scale)
    const dx = Math.round((size - dw) / 2), dy = Math.round((size - dh) / 2)
    ctx.drawImage(canvas, dx, dy, dw, dh)
    c.toBlob(b => resolve(b!), 'image/png')
  })
}

function maskCanvasToBlob(maskCanvas: HTMLCanvasElement, origCanvas: HTMLCanvasElement, size: number): Promise<Blob> {
  // Mask: opaque white = keep, transparent = edit region
  return new Promise(resolve => {
    const c = document.createElement('canvas')
    c.width = size; c.height = size
    const ctx = c.getContext('2d')!
    // Fill with opaque white (keep everything by default)
    ctx.fillStyle = 'rgba(255,255,255,1)'
    ctx.fillRect(0, 0, size, size)
    // Read the user's paint strokes from maskCanvas (painted = red overlay)
    const scale = Math.min(size / origCanvas.width, size / origCanvas.height)
    const dw = Math.round(origCanvas.width * scale), dh = Math.round(origCanvas.height * scale)
    const dx = Math.round((size - dw) / 2), dy = Math.round((size - dh) / 2)
    // Sample the mask paint canvas, scaled to AI_SIZE coordinates
    const srcCtx = maskCanvas.getContext('2d')!
    const srcData = srcCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
    const maskData = ctx.getImageData(0, 0, size, size)
    for (let py = dy; py < dy + dh; py++) {
      for (let px = dx; px < dx + dw; px++) {
        // Map AI_SIZE pixel back to maskCanvas pixel
        const srcX = Math.round((px - dx) / scale * (maskCanvas.width / origCanvas.width))
        const srcY = Math.round((py - dy) / scale * (maskCanvas.height / origCanvas.height))
        const srcIdx = (Math.min(srcY, maskCanvas.height - 1) * maskCanvas.width + Math.min(srcX, maskCanvas.width - 1)) * 4
        if (srcData.data[srcIdx + 3] > 10) {
          // Painted area → transparent in mask (= region to edit)
          const dstIdx = (py * size + px) * 4
          maskData.data[dstIdx] = 0; maskData.data[dstIdx + 1] = 0
          maskData.data[dstIdx + 2] = 0; maskData.data[dstIdx + 3] = 0
        }
      }
    }
    ctx.putImageData(maskData, 0, 0)
    c.toBlob(b => resolve(b!), 'image/png')
  })
}

// Unsharp mask (3×3 kernel: center=5, cross=-1) to sharpen an upscaled image.
// Runs on a 1024×1024 canvas in ~100–300 ms — called once at image load time.
function sharpenCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!
  const { width: w, height: h } = canvas
  const src = ctx.getImageData(0, 0, w, h)
  const dst = ctx.createImageData(w, h)
  const s = src.data, d = dst.data
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const v = 5 * s[i + c]
          - s[((y - 1) * w + x) * 4 + c]
          - s[((y + 1) * w + x) * 4 + c]
          - s[(y * w + x - 1) * 4 + c]
          - s[(y * w + x + 1) * 4 + c]
        d[i + c] = Math.max(0, Math.min(255, v))
      }
      d[i + 3] = s[i + 3]
    }
  }
  // Copy border pixels unchanged
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      d[x * 4 + c] = s[x * 4 + c]
      d[((h - 1) * w + x) * 4 + c] = s[((h - 1) * w + x) * 4 + c]
    }
  }
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 4; c++) {
      d[y * w * 4 + c] = s[y * w * 4 + c]
      d[(y * w + w - 1) * 4 + c] = s[(y * w + w - 1) * 4 + c]
    }
  }
  ctx.putImageData(dst, 0, 0)
}

function checkIfBlack(b64: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = 16; c.height = 16
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, 16, 16)
      const d = ctx.getImageData(0, 0, 16, 16).data
      let sum = 0
      for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2]
      const avg = sum / (d.length / 4 * 3)
      console.log('[enhance] avg brightness of returned image:', avg.toFixed(1))
      resolve(avg < 15)
    }
    img.onerror = () => resolve(true)
    img.src = `data:image/png;base64,${b64}`
  })
}

function downloadCanvas(canvas: HTMLCanvasElement | null, filename: string) {
  if (!canvas) return
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = filename
  a.click()
}

function downloadB64(b64: string, filename: string) {
  const a = document.createElement('a')
  a.href = `data:image/png;base64,${b64}`
  a.download = filename
  a.click()
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ImageTwisterPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('ai')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [dragging, setDragging] = useState(false)

  // Auto mode state
  const [differences, setDifferences] = useState<Difference[]>([])
  const [showAnswers, setShowAnswers] = useState(false)
  const [generating, setGenerating] = useState(false)

  // AI mode state
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiModel, setAiModel] = useState('gpt-image-2')
  const [brushSize, setBrushSize] = useState(20)
  const [aiResult, setAiResult] = useState<string | null>(null) // base64 edited
  const [aiOrigResult, setAiOrigResult] = useState<string | null>(null) // base64 AI-enhanced original
  const [origDataUrl, setOrigDataUrl] = useState<string | null>(null) // original captured at load time (fallback)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [isPainting, setIsPainting] = useState(false)
  const [hasMask, setHasMask] = useState(false)
  const [downloadFilename, setDownloadFilename] = useState('image')
  const [aiUsage, setAiUsage] = useState<{
    input_tokens: number; output_tokens: number; total_tokens: number
    quality?: string; model?: string
  } | null>(null)

  const origCanvasRef = useRef<HTMLCanvasElement>(null)
  const twistCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)   // AI paint layer
  const aiResultCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    try { sessionStorage.setItem('returnFromGame', '__util_twister') } catch {}
    router.push('/')
  }

  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      // Capture original as square data URL (same layout as what we send to API)
      const tc = document.createElement('canvas')
      tc.width = AI_SIZE; tc.height = AI_SIZE
      const tctx = tc.getContext('2d')!
      tctx.fillStyle = '#ffffff'
      tctx.fillRect(0, 0, AI_SIZE, AI_SIZE)
      const scale = Math.min(AI_SIZE / img.naturalWidth, AI_SIZE / img.naturalHeight)
      const dw = Math.round(img.naturalWidth * scale), dh = Math.round(img.naturalHeight * scale)
      const dx = Math.round((AI_SIZE - dw) / 2), dy = Math.round((AI_SIZE - dh) / 2)
      tctx.drawImage(img, dx, dy, dw, dh)
      sharpenCanvas(tc)
      setOrigDataUrl(tc.toDataURL('image/png'))

      setImage(img)
      setDifferences([]); setShowAnswers(false)
      setAiResult(null); setAiError(null); setHasMask(false)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [])

  // Draw original image on canvas
  useEffect(() => {
    if (!image || !origCanvasRef.current) return
    const canvas = origCanvasRef.current
    let w = image.naturalWidth, h = image.naturalHeight
    const largest = Math.max(w, h)
    if (largest > MAX_DIM) { const s = MAX_DIM / largest; w = Math.round(w * s); h = Math.round(h * s) }
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(image, 0, 0, w, h)
    // Reset mask canvas
    if (maskCanvasRef.current) {
      maskCanvasRef.current.width = w; maskCanvasRef.current.height = h
      maskCanvasRef.current.getContext('2d')!.clearRect(0, 0, w, h)
    }
  }, [image])

  // Draw AI result onto result canvas when b64 changes
  useEffect(() => {
    if (!aiResult || !aiResultCanvasRef.current) return
    const img = new Image()
    img.onload = () => {
      const c = aiResultCanvasRef.current!
      c.width = img.width; c.height = img.height
      c.getContext('2d')!.drawImage(img, 0, 0)
    }
    img.src = `data:image/png;base64,${aiResult}`
  }, [aiResult])

  // ── Auto generate ────────────────────────────────────────────────────────────
  const generateAuto = useCallback(() => {
    if (!image || !origCanvasRef.current || !twistCanvasRef.current) return
    setGenerating(true)
    setTimeout(() => {
      const orig = origCanvasRef.current!, twist = twistCanvasRef.current!
      const { width, height } = orig
      twist.width = width; twist.height = height
      const ctx = twist.getContext('2d')!
      ctx.drawImage(orig, 0, 0)

      const cfg = DIFFICULTY_CONFIG[difficulty]
      const diffs: Difference[] = [], used: Region[] = []
      const gap = 20
      let attempts = 0
      while (diffs.length < cfg.count && attempts < 300) {
        attempts++
        const rw = Math.max(8, Math.round(width * (cfg.cellMin + Math.random() * (cfg.cellMax - cfg.cellMin))))
        const rh = Math.max(8, Math.round(height * (cfg.cellMin + Math.random() * (cfg.cellMax - cfg.cellMin))))
        const rx = Math.round(Math.random() * (width - rw)), ry = Math.round(Math.random() * (height - rh))
        const region: Region = { x: rx, y: ry, w: rw, h: rh }
        const overlaps = used.some(r => rx < r.x + r.w + gap && rx + rw > r.x - gap && ry < r.y + r.h + gap && ry + rh > r.y - gap)
        if (overlaps) continue
        used.push(region)
        const effect = ALL_EFFECTS[Math.floor(Math.random() * ALL_EFFECTS.length)]
        const strength = cfg.sMin + Math.random() * (cfg.sMax - cfg.sMin)
        diffs.push({ region, effect, strength, label: diffs.length + 1 })
        applyEffect(ctx, region, effect, strength)
      }
      setDifferences(diffs)
      setGenerating(false)
    }, 60)
  }, [image, difficulty])

  // ── AI mask painting ─────────────────────────────────────────────────────────
  const getCanvasPos = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = e.currentTarget.width / rect.width
    const scaleY = e.currentTarget.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const drawAt = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
    if (!maskCanvasRef.current) return
    const ctx = maskCanvasRef.current.getContext('2d')!
    const { x, y } = getCanvasPos(e)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(239,68,68,0.55)'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
    setHasMask(true)
  }, [brushSize])

  const paint = useCallback((e: PointerEvent<HTMLCanvasElement>) => {
    if (!isPainting) return
    drawAt(e)
  }, [isPainting, drawAt])

  const clearMask = () => {
    if (!maskCanvasRef.current || !origCanvasRef.current) return
    const c = maskCanvasRef.current
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    setHasMask(false)
  }

  // ── AI generate ──────────────────────────────────────────────────────────────
  const callEditAPI = useCallback(async (imageBlob: Blob, maskBlob: Blob, prompt: string) => {
    const fd = new FormData()
    fd.append('image', imageBlob, 'image.png')
    fd.append('mask', maskBlob, 'mask.png')
    fd.append('prompt', prompt)
    fd.append('model', aiModel)
    const res = await fetch('/api/image-edit', { method: 'POST', body: fd })
    const json = await res.json()
    if (json.error) throw new Error(json.error)
    return {
      image: json.image as string,
      usage: json.usage as { input_tokens: number; output_tokens: number; total_tokens: number } | undefined,
      quality: json.quality as string | undefined,
      model: json.model as string | undefined,
    }
  }, [aiModel])

  const generateAI = useCallback(async () => {
    if (!origCanvasRef.current || !maskCanvasRef.current || !aiPrompt.trim()) return
    setAiLoading(true); setAiError(null); setAiResult(null); setAiOrigResult(null); setAiUsage(null)
    try {
      const orig = origCanvasRef.current
      // Compute all three in parallel:
      //   imageBlob     → sent to OpenAI (1024×1024, centered on white bg)
      //   maskBlob      → user paint strokes as transparent mask
      //   sharpOrigB64  → same source + centering as imageBlob, with unsharp-mask applied
      //                   guarantees pixel-perfect positional alignment with the AI-edited result
      const [imageBlob, maskBlob, sharpOrigB64] = await Promise.all([
        canvasToSquarePng(orig, AI_SIZE),
        maskCanvasToBlob(maskCanvasRef.current, orig, AI_SIZE),
        new Promise<string>(resolve => {
          const c = document.createElement('canvas')
          c.width = AI_SIZE; c.height = AI_SIZE
          const ctx = c.getContext('2d')!
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, AI_SIZE, AI_SIZE)
          const scale = Math.min(AI_SIZE / orig.width, AI_SIZE / orig.height)
          const dw = Math.round(orig.width * scale)
          const dh = Math.round(orig.height * scale)
          const dx = Math.round((AI_SIZE - dw) / 2)
          const dy = Math.round((AI_SIZE - dh) / 2)
          ctx.drawImage(orig, dx, dy, dw, dh)
          sharpenCanvas(c)
          resolve(c.toDataURL('image/png').split(',')[1])
        }),
      ])

      // Show sharpened original immediately — no need to wait for the API call
      setAiOrigResult(sharpOrigB64)

      const result = await callEditAPI(imageBlob, maskBlob, aiPrompt.trim())
      setAiResult(result.image)
      if (result.usage) setAiUsage({ ...result.usage, quality: result.quality, model: result.model })
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setAiLoading(false)
    }
  }, [aiPrompt, aiModel, callEditAPI])

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadImage(file)
  }

  const canvasW = origCanvasRef.current?.width ?? 1
  const canvasH = origCanvasRef.current?.height ?? 1

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={handleBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          กลับ
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">🪄 Image Twister</h1>
        <div className="w-20" />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* ── Editor (always visible) ── */}
        <div className="flex flex-col gap-4 max-w-6xl mx-auto">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) loadImage(e.target.files[0]) }} />

            {/* Mode + controls bar */}
            <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3">
              {/* Mode tabs */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                <button onClick={() => setMode('auto')} className="px-4 py-1.5 text-sm font-semibold transition-colors"
                  style={{ background: mode === 'auto' ? '#111827' : 'white', color: mode === 'auto' ? 'white' : '#6b7280' }}>
                  🎲 Auto Twist
                </button>
                <button onClick={() => setMode('ai')} className="px-4 py-1.5 text-sm font-semibold transition-colors border-l border-gray-200"
                  style={{ background: mode === 'ai' ? '#111827' : 'white', color: mode === 'ai' ? 'white' : '#6b7280' }}>
                  🤖 AI Edit
                </button>
              </div>

              {mode === 'auto' && (
                <>
                  <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-500 flex-shrink-0">ความยาก</span>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((d, i) => (
                      <button key={d} onClick={() => setDifficulty(d)} className="px-3 py-1.5 text-sm font-semibold transition-colors"
                        style={{ background: difficulty === d ? '#4f46e5' : 'white', color: difficulty === d ? 'white' : '#6b7280', borderLeft: i > 0 ? '1px solid #e5e7eb' : 'none' }}>
                        {d === 'easy' ? '🟢 ง่าย' : d === 'medium' ? '🟡 กลาง' : '🔴 ยาก'}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">
                    {difficulty === 'easy' ? '6 จุด · ใหญ่' : difficulty === 'medium' ? '4 จุด · กลาง' : '3 จุด · เล็ก/ละเอียด'}
                  </span>
                </>
              )}

              {mode === 'ai' && (
                <>
                  <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-500 flex-shrink-0">ขนาดแปรง</span>
                  <input type="range" min={8} max={80} value={brushSize} onChange={e => setBrushSize(+e.target.value)}
                    className="w-24 accent-indigo-600 flex-shrink-0" />
                  <span className="text-xs text-gray-400 flex-shrink-0">{brushSize}px</span>
                  {hasMask && (
                    <button onClick={clearMask} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 border border-red-100 hover:bg-red-50 transition-colors flex-shrink-0">
                      ล้างพื้นที่
                    </button>
                  )}
                </>
              )}

              <div style={{ flex: 1 }} />

              {image && mode === 'auto' && (
                <button onClick={generateAuto} disabled={generating}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-colors flex-shrink-0"
                  style={{ background: generating ? '#a5b4fc' : '#4f46e5', cursor: generating ? 'not-allowed' : 'pointer' }}>
                  {generating ? '⏳ กำลังสร้าง…' : differences.length > 0 ? '🔄 สร้างใหม่' : '✨ สร้าง Twist'}
                </button>
              )}
            </div>

            {/* Canvas area */}
            <div className="grid grid-cols-2 gap-4">
              {/* Original / Paint canvas — or upload dropzone */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3">
                {!image ? (
                  /* Upload dropzone embedded in left panel */
                  <div
                    onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flex: 1, minHeight: 320, cursor: 'pointer',
                      border: `2px dashed ${dragging ? '#6366f1' : '#d1d5db'}`,
                      borderRadius: 16,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
                      background: dragging ? '#eef2ff' : '#fafafa', transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 44 }}>🖼️</span>
                    <div className="text-center">
                      <p className="font-bold text-gray-700">วางรูปภาพที่นี่</p>
                      <p className="text-sm text-gray-400 mt-1">หรือคลิกเพื่อเลือกไฟล์ · PNG, JPG, WebP</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        {mode === 'ai' ? 'ระบายพื้นที่ที่ต้องการแก้ไข' : 'ต้นฉบับ'}
                      </span>
                      <button onClick={() => { setImage(null); setDifferences([]); setAiResult(null); setAiOrigResult(null); setOrigDataUrl(null) }}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                        เปลี่ยนรูป
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {/* inner wrapper sizes exactly to the image so the mask canvas overlays it perfectly */}
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <canvas ref={origCanvasRef}
                          style={{ maxWidth: '100%', height: 'auto', borderRadius: 10, border: '1px solid #f3f4f6', display: 'block' }} />
                        {mode === 'ai' && (
                          <canvas ref={maskCanvasRef}
                            style={{
                              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                              borderRadius: 10, cursor: 'crosshair',
                            }}
                            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setIsPainting(true); drawAt(e) }}
                            onPointerMove={paint}
                            onPointerUp={() => setIsPainting(false)}
                            onPointerCancel={() => setIsPainting(false)}
                          />
                        )}
                      </div>
                    </div>
                    {mode === 'ai' && (
                      <p className="text-xs text-gray-400 text-center">ระบายสีแดงบริเวณที่ต้องการให้ AI แก้ไข</p>
                    )}
                  </>
                )}
              </div>

              {/* Right panel: Auto = result canvas; AI = prompt controls */}
              {mode === 'auto' ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">เวอร์ชันดัดแปลง</span>
                    {differences.length > 0 && (
                      <button onClick={() => setShowAnswers(v => !v)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors"
                        style={{ borderColor: showAnswers ? '#4f46e5' : '#e5e7eb', color: showAnswers ? '#4f46e5' : '#6b7280', background: showAnswers ? '#eef2ff' : 'white' }}>
                        {showAnswers ? '🫣 ซ่อนเฉลย' : '👁 เฉลย'}
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative', width: '100%', minHeight: 220 }}>
                    <canvas ref={twistCanvasRef}
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: 10, border: differences.length > 0 ? '1px solid #f3f4f6' : 'none', display: 'block', visibility: differences.length > 0 ? 'visible' : 'hidden' }} />
                    {differences.length === 0 && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#f9fafb', borderRadius: 10, border: '1px dashed #e5e7eb' }}>
                        <span style={{ fontSize: 36, opacity: 0.3 }}>🎲</span>
                        <p className="text-sm text-gray-400">กด "สร้าง Twist"</p>
                      </div>
                    )}
                    {showAnswers && differences.length > 0 && (
                      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                        viewBox={`0 0 ${canvasW} ${canvasH}`} preserveAspectRatio="none">
                        {differences.map(diff => (
                          <g key={diff.label}>
                            <rect x={diff.region.x} y={diff.region.y} width={diff.region.w} height={diff.region.h}
                              fill="rgba(239,68,68,0.08)" stroke="#ef4444" strokeWidth={Math.max(2, canvasW / 200)} strokeDasharray="10 5" rx="6" />
                            <circle cx={diff.region.x + 14} cy={diff.region.y + 14} r="14" fill="#ef4444" />
                            <text x={diff.region.x + 14} y={diff.region.y + 19} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="system-ui">{diff.label}</text>
                          </g>
                        ))}
                      </svg>
                    )}
                  </div>
                </div>
              ) : (
                /* AI mode: prompt controls panel */
                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-sm font-semibold text-gray-700 flex-shrink-0">Model</label>
                    {[
                      { id: 'gpt-image-2',           label: 'gpt-image-2',       badge: 'Latest' },
                      { id: 'chatgpt-image-latest',  label: 'chatgpt-image',     badge: null },
                      { id: 'gpt-image-1-mini',      label: 'gpt-image-1-mini',  badge: null },
                    ].map(({ id, label, badge }) => (
                      <button key={id} onClick={() => setAiModel(id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                        style={{ borderColor: aiModel === id ? '#4f46e5' : '#e5e7eb', background: aiModel === id ? '#eef2ff' : 'white', color: aiModel === id ? '#4f46e5' : '#374151' }}>
                        {label}
                        {badge && <span style={{ fontSize: 9, background: '#4f46e5', color: 'white', borderRadius: 4, padding: '1px 4px' }}>{badge}</span>}
                      </button>
                    ))}
                  </div>

                  <label className="text-sm font-semibold text-gray-700">คำสั่งให้ AI แก้ไข</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '🔤 เปลี่ยนตัวอักษรที่ใกล้เคียง', prompt: 'Change the selected letter to a visually similar letter that looks almost the same' },
                      { label: '🎨 เปลี่ยนสีตัวอักษร', prompt: 'Change the font color of the selected text to a different but similar color' },
                      { label: '🟡 เปลี่ยนสีพื้นหลัง', prompt: 'Change the background color in the selected area to a slightly different shade' },
                      { label: '🔵 เปลี่ยนสีโลโก้', prompt: 'Change the logo color in the selected area to a different color' },
                      { label: '❌ ลบองค์ประกอบ', prompt: 'Remove the element in the selected area and fill with matching background' },
                      { label: '🔃 หมุนองค์ประกอบ', prompt: 'Flip or mirror the element in the selected area horizontally' },
                    ].map(({ label, prompt }) => (
                      <button key={label} onClick={() => setAiPrompt(prompt)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                        style={{ borderColor: aiPrompt === prompt ? '#4f46e5' : '#e5e7eb', background: aiPrompt === prompt ? '#eef2ff' : 'white', color: aiPrompt === prompt ? '#4f46e5' : '#374151' }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <input
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !aiLoading && hasMask && aiPrompt.trim()) generateAI() }}
                      placeholder='หรือพิมพ์คำสั่งเอง เช่น "change the A letter to look like an H"'
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50"
                    />
                    <button
                      onClick={generateAI}
                      disabled={aiLoading || !hasMask || !aiPrompt.trim()}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex-shrink-0"
                      style={{ background: aiLoading || !hasMask || !aiPrompt.trim() ? '#a5b4fc' : '#4f46e5', cursor: aiLoading || !hasMask || !aiPrompt.trim() ? 'not-allowed' : 'pointer' }}
                    >
                      {aiLoading ? '⏳…' : aiResult ? '🔄' : '🤖 สร้าง'}
                    </button>
                  </div>

                  {/* Status chip — visible without scrolling */}
                  {(aiLoading || aiError || aiResult) && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 16px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                      ...(aiLoading
                        ? { background: '#eef2ff', border: '2px solid #818cf8', color: '#4338ca' }
                        : aiError
                          ? { background: '#fff1f2', border: '2px solid #fca5a5', color: '#dc2626' }
                          : { background: '#f0fdf4', border: '2px solid #86efac', color: '#16a34a' }),
                    }}>
                      {aiLoading && (
                        <>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid #c7d2fe', borderTopColor: '#4f46e5', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                          กำลังสร้าง… โปรดรอสักครู่
                        </>
                      )}
                      {!aiLoading && aiError && <>❌ ล้มเหลว — {aiError}</>}
                      {!aiLoading && !aiError && aiResult && <>✅ สร้างสำเร็จ! เลื่อนลงเพื่อดูผลลัพธ์</>}
                    </div>
                  )}
                  <p className="text-xs text-gray-400">✏️ ระบายสีบนรูปก่อน แล้วค่อยกดสร้าง</p>
                </div>
              )}
            </div>

            {/* Auto diff list + download */}
            {mode === 'auto' && differences.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-bold text-gray-800">พบ {differences.length} จุดความแตกต่าง</p>
                    <p className="text-xs text-gray-400 mt-0.5">ดาวน์โหลดทั้งสองรูปเพื่อนำไปใช้ใน Spot the Difference</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => downloadCanvas(origCanvasRef.current, 'original.png')}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
                      ⬇️ ต้นฉบับ
                    </button>
                    <button onClick={() => downloadCanvas(twistCanvasRef.current, 'twisted.png')}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors"
                      style={{ background: '#4f46e5' }}>
                      ⬇️ ดัดแปลง
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {differences.map(diff => (
                    <div key={diff.label} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg">
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{diff.label}</span>
                      <span className="text-xs text-gray-600 font-medium">{EFFECT_LABELS[diff.effect]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI download */}
            {mode === 'ai' && aiResult && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
                <p className="text-sm font-bold text-gray-800">AI แก้ไขรูปเสร็จแล้ว</p>

                {/* Side-by-side previews */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      ต้นฉบับ {aiLoading ? '(กำลังเพิ่มความคมชัด…)' : ''}
                    </span>
                    {aiOrigResult ? (
                      <img src={`data:image/png;base64,${aiOrigResult}`} alt="original"
                        style={{ width: '100%', borderRadius: 10, border: '1px solid #f3f4f6', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ position: 'relative' }}>
                        {origDataUrl && (
                          <img src={origDataUrl} alt="original loading"
                            style={{ width: '100%', borderRadius: 10, border: '1px solid #f3f4f6', objectFit: 'contain', opacity: aiLoading ? 0.5 : 1 }} />
                        )}
                        {aiLoading && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', animation: 'spin 0.8s linear infinite' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">ผลลัพธ์ AI</span>
                    <img src={`data:image/png;base64,${aiResult}`} alt="ai-edited"
                      style={{ width: '100%', borderRadius: 10, border: '1px solid #f3f4f6', objectFit: 'contain' }} />
                  </div>
                </div>

                {/* Filename input + download buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-gray-600 flex-shrink-0">ชื่อไฟล์</span>
                  <input
                    value={downloadFilename}
                    onChange={e => setDownloadFilename(e.target.value)}
                    placeholder="image"
                    className="flex-1 min-w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50"
                  />
                  <span className="text-xs text-gray-400 flex-shrink-0">.png</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        const src = aiOrigResult ? `data:image/png;base64,${aiOrigResult}` : origDataUrl
                        if (!src) return
                        const a = document.createElement('a')
                        a.href = src
                        a.download = `${downloadFilename || 'image'} (original).png`
                        a.click()
                      }}
                      disabled={!origDataUrl && !aiOrigResult}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">
                      ⬇️ ต้นฉบับ{aiLoading && !aiOrigResult ? ' …' : ''}
                    </button>
                    <button
                      onClick={() => downloadB64(aiResult!, `${downloadFilename || 'image'} (edited).png`)}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors"
                      style={{ background: '#4f46e5' }}>
                      ⬇️ ผลลัพธ์ AI
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">ไฟล์จะถูกบันทึกเป็น <span className="font-medium text-gray-500">{downloadFilename || 'image'} (original).png</span> และ <span className="font-medium text-gray-500">{downloadFilename || 'image'} (edited).png</span></p>

                {/* API usage details */}
                {aiUsage && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <span className="text-xs font-bold text-gray-500 w-full mb-1">API Usage</span>
                    {[
                      { label: 'Model', value: aiUsage.model ?? aiModel },
                      { label: 'Quality', value: aiUsage.quality ?? '—' },
                      { label: 'Input tokens', value: aiUsage.input_tokens.toLocaleString() },
                      { label: 'Output tokens', value: aiUsage.output_tokens.toLocaleString() },
                      { label: 'Total tokens', value: aiUsage.total_tokens.toLocaleString() },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 100 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                        <span style={{ fontSize: 13, color: '#334155', fontWeight: 700 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
      </div>
    </div>
  )
}
