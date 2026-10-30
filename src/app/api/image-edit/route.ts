import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })

  const body = await req.formData()
  const image = body.get('image') as File | null
  const mask = body.get('mask') as File | null
  const prompt = body.get('prompt') as string | null

  if (!image || !mask || !prompt)
    return NextResponse.json({ error: 'Missing image, mask, or prompt' }, { status: 400 })

  const model = (body.get('model') as string | null) ?? 'gpt-image-2'

  const fd = new FormData()
  fd.append('model', model)
  fd.append('image', image, 'image.png')
  fd.append('mask', mask, 'mask.png')
  fd.append('prompt', prompt)
  fd.append('size', '1024x1024')
  fd.append('n', '1')

  try {
    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    })

    // Log raw text so we see exactly what OpenAI returns
    const text = await res.text()
    console.log('[image-edit] status:', res.status)
    console.log('[image-edit] raw body:', text)

    let json: Record<string, unknown>
    try { json = JSON.parse(text) } catch { json = { error: text } }

    if (!res.ok) {
      const errObj = json?.error as { message?: string } | string | undefined
      const msg = typeof errObj === 'object' ? errObj?.message : typeof errObj === 'string' ? errObj : text
      return NextResponse.json({ error: msg ?? text }, { status: res.status })
    }

    const data = json?.data as Array<{ b64_json?: string; url?: string }> | undefined
    const usage = json?.usage as {
      input_tokens: number
      input_tokens_details?: { image_tokens: number; text_tokens: number }
      output_tokens: number
      total_tokens: number
    } | undefined
    const quality = json?.quality as string | undefined
    const item = data?.[0]
    if (!item) return NextResponse.json({ error: 'No image returned' }, { status: 500 })

    if (item.b64_json) return NextResponse.json({ image: item.b64_json, usage, quality, model })

    if (item.url) {
      const imgRes = await fetch(item.url)
      const buf = await imgRes.arrayBuffer()
      const b64 = Buffer.from(buf).toString('base64')
      return NextResponse.json({ image: b64, usage, quality, model })
    }

    return NextResponse.json({ error: 'No image data in response' }, { status: 500 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
