export const C = {
  canvas: '#E9E9E7',
  app: '#F4F4F2',
  card: '#FFFFFF',
  line: '#E1E1DE',
  rule: '#EDEDEA',
  ink: '#17181A',
  ink2: '#3A3B38',
  ink3: '#5C5E5B',
  ink4: '#6C6E6A',
  ink5: '#8A8B87',
  ink6: '#A0A19D',
  ink7: '#C3C3BE',
  ink8: '#C9C9C4',
  gold: '#8A6A00',
  goldBg: '#F6E7A8',
  goldFill: '#C9A227',
  pass: '#1F7A4D',
  passBg: '#E8F3EC',
  warn: '#A5691A',
  warnBg: '#FBF1DF',
  warnCard: '#FBF3E4',
  warnLine: '#EEDFBE',
  warnInk: '#6B4610',
  fail: '#B0402E',
  failBg: '#F8E7E3',
  link: '#2E63D8',
} as const;

/**
 * Ink colour for a percentage, on the same levels as the reports app:
 * 90–100 excellent (gold), 80–89 good (green), pass threshold–79 barely
 * pass (plain ink on white), below the pass threshold fail (red).
 */
export function pctColor(v: number, pass: number): string {
  if (v < pass) return C.fail;
  if (v >= 90) return C.gold;
  if (v >= 80) return C.pass;
  return C.ink;
}

/** Matching wash for a percentage. */
export function pctBg(v: number, pass: number): string {
  if (v < pass) return C.failBg;
  if (v >= 90) return C.goldBg;
  if (v >= 80) return C.passBg;
  return C.card;
}

/** Colour of a 1..max score band button when selected. */
// Same levels as pctColor, on the score as a share of max (5 of 5 = 100%).
// Barely pass stays ink here: the button is filled and its number is white.
export function bandColor(v: number, max: number): string {
  const pct = (v / max) * 100;
  if (pct >= 90) return C.goldFill;
  if (pct >= 80) return C.pass;
  if (pct >= 60) return C.ink;
  return C.fail;
}
