const mulberry32 = (seed: number): number => {
  const s = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t;

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const getFromSeed = (seed: number): number => mulberry32(seed);
