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
  const rand = mulberry32(hashStr(teamId))

  // Shuffle the full keyword pool
  const pool = [...keywords]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }

  // Take first 24 from shuffled pool (pad if pool < 24)
  const picked = pool.slice(0, 24)
  while (picked.length < 24) picked.push(`—`)

  // Insert FREE at center index 12
  return [...picked.slice(0, 12), 'FREE', ...picked.slice(12)] // 25 items
}

const BINGO_LINES = [
  [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24], // rows
  [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24], // cols
  [0,6,12,18,24],[4,8,12,16,20], // diagonals
]

// Returns indices of a newly-completed bingo line, or null
export function checkNewBingo(calledSet: Set<string>, card: string[]): number[] | null {
  for (const line of BINGO_LINES) {
    if (line.every((i) => card[i] === 'FREE' || calledSet.has(card[i]))) {
      return line
    }
  }
  return null
}
