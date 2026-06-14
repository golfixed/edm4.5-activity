// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

// Returns 5x5 array (25 cells), center (index 12) is always 'FREE'
export function generateBingoCard(keywords: string[], teamId: string): string[] {
  // Need 24 keywords for a 5x5 with FREE center
  const kw = keywords.slice(0, 24)
  // Pad if fewer than 24
  while (kw.length < 24) kw.push(`...${kw.length + 1}`)

  const rand = mulberry32(hashStr(teamId))
  // Fisher-Yates shuffle
  const shuffled = [...kw]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  // Insert FREE at center (index 12)
  const card = [...shuffled.slice(0, 12), 'FREE', ...shuffled.slice(12)]
  return card // 25 items
}
