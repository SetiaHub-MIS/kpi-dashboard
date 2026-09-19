/**
 * A week's arithmetic, with nothing else attached so it can be tested directly.
 *
 * The rule that matters: a blank is not a zero. Not every perkara applies to
 * every person every week — on the SV/AS form two sit blank all year and the
 * workbook's own denominator is 85 rather than 95 — so a line left unanswered
 * or marked N/A is left out of the maximum, and the percentage is given marks
 * over the marks that were possible. Zero is different: it is a score, given
 * on purpose, and it counts against the person.
 */

/** A line is scored (0 up to the scale), or explicitly does not apply. */
export type Answer = number | 'na';

export type Totals = {
  total: number;
  /** Lines answered at all, N/A included. */
  filled: number;
  /** Lines given a number — what the maximum is built from. */
  scored: number;
  /** Every line on the form was answered, N/A included. */
  complete: boolean;
  /** Scored lines times the scale. Moves with how many applied. */
  max: number;
  pct: number;
  /** At least one line carries a number, so there is a percentage to submit. */
  canSubmit: boolean;
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
    scored: scored.length,
    complete: answers.length === lineCount,
    max,
    pct: max > 0 ? Math.round((total / max) * 100) : 0,
    canSubmit: max > 0,
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
