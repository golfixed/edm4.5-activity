import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

// Returns the original image as-is at 1024×1024.
// The OpenAI image edits API is an inpainting API — a fully transparent mask causes
// it to generate a completely new image (unrelated content), so we do not call OpenAI here.
// The client sets aiOrigResult from origDataUrl directly; this route is kept as a fallback stub.
export async function POST(req: NextRequest) {
  const body = await req.formData()
  const image = body.get('image') as File | null
  if (!image) return NextResponse.json({ error: 'Missing image' }, { status: 400 })
  const buf = await image.arrayBuffer()
  const b64 = Buffer.from(buf).toString('base64')
  return NextResponse.json({ image: b64 })
}
