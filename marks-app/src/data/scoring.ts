/**
 * A week's arithmetic, with nothing else attached so it can be tested directly.
 *
 * The rule that matters: N/A is not a zero. On the SV/AS form two perkara sit
 * blank all year and the workbook's own denominator is 85 rather than 95 — 17
 * lines times five, not 19. Counting a blank as zero would mark down every
 * supervisor in the company by two lines' worth, every week.
 */

/** A line is scored, or explicitly does not apply. */
export type Answer = number | 'na';

export type Totals = {
  total: number;
  /** Lines answered at all, N/A included — this is what completeness means. */
  filled: number;
  complete: boolean;
  /** Scored lines times the scale. Moves with how many applied. */
  max: number;
  pct: number;
};

export function totalsOf(
  scores: Record<string, Answer>,
  lineCount: number,
  scaleMax: number
): Totals {
  const answers = Object.values(scores);
  const scored = answers.filter((v): v is number => v !== 'na');
  const total = scored.reduce((n, v) => n + v, 0);
  const max = scored.length * scaleMax;

  return {
    total,
    filled: answers.length,
    complete: answers.length === lineCount,
    max,
    pct: max > 0 ? Math.round((total / max) * 100) : 0,
  };
}

/** Drops N/A, leaving what may be written to `mark_lines`. */
export function scoredOnly(scores: Record<string, Answer>): Record<string, number> {
  const out: Record<string, number> = {};
  Object.entries(scores).forEach(([k, v]) => {
    if (v !== 'na') out[k] = v;
  });
  return out;
}
