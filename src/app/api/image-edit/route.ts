import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })

  const body = await req.formData()
  const image = body.get('image') as File | null
  const guide = body.get('guide') as File | null
  const prompt = body.get('prompt') as string | null

  if (!image || !guide || !prompt)
    return NextResponse.json({ error: 'Missing image, guide, or prompt' }, { status: 400 })

  const model = (body.get('model') as string | null) ?? 'gpt-image-2'

  const fd = new FormData()
  fd.append('model', model)
  // No API mask: OpenAI erases the masked pixels before the model sees them, so it can't
  // tell what was there and paints a new blob in the brush shape. Instead send the clean
  // image plus a guide copy with the area tinted red. The client composites the result
  // back through the brush mask, so nothing outside the selection can change.
  fd.append('image[]', image, 'image.png')
  fd.append('image[]', guide, 'guide.png')
  const guardedPrompt = [
    'You are given two images of the same picture.',
    'Image 1 is the picture to edit. Image 2 is identical but has a translucent red highlight showing roughly which part to edit.',
    `Edit instruction for the highlighted part: ${prompt}.`,
    'Apply the change to the existing object(s) under the highlight in image 1, keeping their exact shape, outline, size and position.',
    'The highlight is only a rough selection: do not draw its shape, do not add any red tint, and do not add new objects.',
    'Return image 1 with only that change; everything else must stay identical, same framing and layout.',
  ].join(' ')
  fd.append('prompt', guardedPrompt)
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
