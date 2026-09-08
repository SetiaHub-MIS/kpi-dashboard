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

/** Ink colour for a percentage, banded around the pass threshold. */
export function pctColor(v: number, pass: number): string {
  if (v >= pass + 8) return C.pass;
  if (v >= pass) return C.ink;
  if (v >= pass - 15) return C.warn;
  return C.fail;
}

/** Matching wash for a percentage. */
export function pctBg(v: number, pass: number): string {
  if (v >= pass + 8) return C.passBg;
  if (v >= pass) return C.rule;
  if (v >= pass - 15) return C.warnBg;
  return C.failBg;
}

/** Colour of a 1..max score band button when selected. */
export function bandColor(v: number, max: number): string {
  if (v >= max) return C.pass;
  if (v >= max - 1) return C.ink;
  if (v >= Math.ceil(max * 0.6)) return C.warn;
  return C.fail;
}
