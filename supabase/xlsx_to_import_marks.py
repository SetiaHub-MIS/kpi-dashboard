"""Turn Checklist Mingguan workbooks into a ready-to-run import_marks.sql.

    python supabase/xlsx_to_import_marks.py <workbook.xlsx | folder> [...] [--month 2026-09] [-o out.sql]

Reads every sheet of every workbook given (a folder means every .xlsx in it)
and finds each month block by its WEEK 1..WEEK 4 headings. Works on both
layouts in use: one sheet per person ("ID: BC0010" at the top, or the sheet
named "KP0093_NAME"), and the year workbooks with twelve month blocks stacked
down one sheet. Several people stacked down one sheet also work, as long as
each block has its own "ID:" cell above or beside its WEEK headings.

What it takes from each week column:
  * the SV/AS (or AM) column      -> the scores, one per perkara, in sheet order
  * the name on the NAMA row      -> scored_by, matched to a person at the outlet
  * text on the CATATAN rows      -> the mark's note
A week with no score at all is skipped — not marked yet. The MANAGER column is
not imported; what it holds is copied into the SQL as comments so nothing on
the sheet is lost silently.

The month comes from a "MONTH: SEPTEMBER 2026" label, otherwise from the dates
on the TARIKH row (the month most of them fall in). --month keeps only blocks
for that month — use it on a year workbook to import one month.

The rows are written into a copy of import_marks.sql, which does every check
(right person, right form length, scorer, confirmed weeks) before saving
anything. Nothing here touches the database: paste the output into the
Supabase SQL editor and run it.
"""

import argparse
import datetime as dt
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

try:
    import openpyxl
    from openpyxl.utils import get_column_letter
except ImportError:
    sys.exit('openpyxl is missing; install it with:  python -m pip install openpyxl')

TEMPLATE = Path(__file__).with_name('import_marks.sql')

WEEK_RE = re.compile(r'^WEEK\s*([1-4])$', re.I)
MONTH_RE = re.compile(r'MONTH\s*:?\s*([A-Z]+)\s+(\d{4})', re.I)
ID_RE = re.compile(r'^ID\s*:?\s*([A-Z0-9]*)$', re.I)
SHEET_ID_RE = re.compile(r'^([A-Z]+[0-9][A-Z0-9]*)(?=[_\s-]|$)', re.I)
LETTERED_RE = re.compile(r'^[A-Z]\s*\)')
NA = {'N/A', 'NA', '-', '—'}

MONTHS = {name: n for n, names in enumerate([
    (), ('JANUARY', 'JANUARI', 'JAN'), ('FEBRUARY', 'FEBRUARI', 'FEB'), ('MARCH', 'MAC', 'MAR'),
    ('APRIL', 'APR'), ('MAY', 'MEI'), ('JUNE', 'JUN'), ('JULY', 'JULAI', 'JUL'),
    ('AUGUST', 'OGOS', 'AUG', 'OGO'), ('SEPTEMBER', 'SEPT', 'SEP'), ('OCTOBER', 'OKTOBER', 'OCT', 'OKT'),
    ('NOVEMBER', 'NOV'), ('DECEMBER', 'DISEMBER', 'DEC', 'DIS'),
]) for name in names}


def text(v):
    """A cell as trimmed text, or '' for blank."""
    if v is None:
        return ''
    return ' '.join(str(v).split())


def as_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    m = re.match(r'^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$', text(v))
    if m:  # typed as text: day first, the way it is written here
        try:
            return dt.date(int(m[3]), int(m[2]), int(m[1]))
        except ValueError:
            return None
    return None


def sql_text(s):
    return 'NULL' if s is None else "'" + s.replace("'", "''") + "'"


def comment(s):
    return ' '.join(s.split())  # a comment must stay on its line


class Problems(list):
    def add(self, where, why):
        self.append(f'{where}: {why}')


def find_people_and_blocks(ws):
    """Yield (person_id, id_cell, header_row, {week_no: column}, month_label) per block."""
    person, id_cell = None, None
    m = SHEET_ID_RE.match(ws.title.strip())
    if m and not re.fullmatch(r'(SHEET|HELAIAN)\d*', m[1], re.I):  # Excel's own "Sheet1" is not a person
        person, id_cell = m[1].upper(), f"sheet name '{ws.title}'"
    for row in ws.iter_rows():
        weeks, month_label = {}, None
        for i, c in enumerate(row):
            t = text(c.value)
            if not t:
                continue
            idm = ID_RE.match(t)
            if idm:
                found = idm[1] or next((text(x.value) for x in row[i + 1:] if text(x.value)), '')
                if found:
                    person, id_cell = found.upper(), f'{ws.title}!{c.coordinate}'
                continue
            wm = WEEK_RE.match(t)
            if wm:
                weeks[int(wm[1])] = c.column
                continue
            mm = MONTH_RE.search(t)
            if mm and mm[1].upper() in MONTHS:
                month_label = (int(mm[2]), MONTHS[mm[1].upper()])
        if weeks:
            yield person, id_cell, row[0].row, weeks, month_label


def parse_block(ws, header_row, end_row, weeks):
    """The rows of one month block: dates, names, perkara lines, notes."""
    where = lambda col, r: f'{ws.title}!{get_column_letter(col)}{r}'
    cell = lambda r, col: ws.cell(row=r, column=col).value

    # The label column is where PERKARA is written; B on every sheet seen so far.
    label_col = next((col for r in range(header_row, min(end_row, header_row + 6) + 1)
                      for col in range(1, min(weeks.values()))
                      if text(cell(r, col)).upper() == 'PERKARA'), 2)

    dates, scorer, manager = {}, {}, {}
    first_line = None
    rows = []  # (row, label, numbered)
    for r in range(header_row + 1, end_row + 1):
        label = text(cell(r, label_col))
        row_head = [text(cell(r, col)).upper() for col in range(1, min(weeks.values()))]
        if label.upper().startswith('JUMLAH'):
            break
        if 'NAMA' in row_head:
            for w, col in weeks.items():
                scorer[w] = text(cell(r, col)) or None
                manager[w] = text(cell(r, col + 1)) or None
            continue
        if first_line is None:
            for w, col in weeks.items():
                d = as_date(cell(r, col))
                if d:
                    dates[w] = d
            if cell(r, 1) == 1 or text(cell(r, 1)) == '1':
                first_line = r
            else:
                continue
        if label:
            numbered = isinstance(cell(r, 1), (int, float)) or text(cell(r, 1)).isdigit()
            rows.append((r, label, numbered))

    if first_line is None:
        return None

    # A numbered perkara with lettered items under it is a heading, not a line.
    lines, headings, notes_rows, category = [], [], [], None
    content = [x for x in rows if not x[1].upper().startswith('CATATAN')]
    for r, label, numbered in rows:
        if label.upper().startswith('CATATAN'):
            notes_rows.append((r, category))
            continue
        if numbered:
            category = re.sub(r'^\d+\s*', '', label)
            nxt = next((x for x in content if x[0] > r), None)
            if nxt and LETTERED_RE.match(nxt[1]):
                headings.append((r, label))
                continue
        lines.append((r, label))

    return dict(dates=dates, scorer=scorer, manager=manager, lines=lines, headings=headings, notes_rows=notes_rows,
                where=where, cell=cell)


def week_scores(block, col, problems):
    scores = []
    for r, label in block['lines']:
        v = block['cell'](r, col)
        t = text(v).upper()
        if t == '' or t in NA:
            scores.append(None)
        elif isinstance(v, (int, float)) and float(v).is_integer():
            scores.append(int(v))
        elif re.fullmatch(r'\d+', t):
            scores.append(int(t))
        else:
            problems.add(block['where'](col, r), f'{label}: {text(v)!r} is not a score')
            scores.append(None)
    return scores


def week_note(block, col, warn=None, with_category=True):
    """The CATATAN text in one column. A bare number there is a score typed one
    row too low — the workbook's own SUM counts it, but it belongs to no
    perkara, so it is reported rather than saved as a note."""
    parts = []
    for r, category in block['notes_rows']:
        v = block['cell'](r, col)
        t = text(v)
        if not t:
            continue
        if isinstance(v, (int, float)) or re.fullmatch(r'\d+', t):
            if warn:
                warn(f"{block['where'](col, r)}: {t} typed on a CATATAN row - not counted as a score "
                     f"(the workbook's JUMLAH does count it)")
            continue
        parts.append(f'{category}: {t}' if category and with_category else t)
    return '; '.join(parts) or None


def read_workbook(path, only_month, problems, warnings, marks, layouts):
    wb = openpyxl.load_workbook(path, data_only=True)
    for ws in wb.worksheets:
        blocks = list(find_people_and_blocks(ws))
        for i, (person, id_cell, header_row, weeks, month_label) in enumerate(blocks):
            end_row = blocks[i + 1][2] - 1 if i + 1 < len(blocks) else ws.max_row
            block = parse_block(ws, header_row, end_row, weeks)
            if block is None:
                continue
            here = f'{path.name} / {ws.title} row {header_row}'

            if month_label:
                period = month_label
            else:
                counted = Counter((d.year, d.month) for d in block['dates'].values())
                period = counted.most_common(1)[0][0] if counted else None
            if only_month and period != only_month:
                continue

            seq = tuple(re.sub(r'[^A-Z]', '', l.upper()) for _, l in block['lines'])
            first = layouts.setdefault(len(seq), (seq, here, [l for _, l in block['lines']]))
            if first[0] != seq:
                warnings.append(f'{here}: perkara labels differ from {first[1]}; check the rows are in the same order')

            for w, col in sorted(weeks.items()):
                scores = week_scores(block, col, problems)
                manager_scores = [r for r, _ in block['lines']
                                  if text(block['cell'](r, col + 1)) and text(block['cell'](r, col + 1)).upper() not in NA]
                for r, label in block['headings']:
                    if text(block['cell'](r, col)):
                        warnings.append(f"{block['where'](col, r)}: score on the heading {label!r}, which has "
                                        f"A) B) items under it - not counted (the workbook's JUMLAH does count it)")
                if all(s is None for s in scores):
                    if manager_scores:
                        warnings.append(f'{here} week {w}: MANAGER column has scores but SV/AS is blank, not imported')
                    continue
                if person is None:
                    problems.add(here, 'no payroll number; put "ID: KP0000" above the WEEK headings or name the sheet KP0000_NAME')
                    break
                if period is None:
                    problems.add(here, f'week {w}: cannot tell the month; fill in the TARIKH dates or add "MONTH: SEPTEMBER 2026"')
                    continue
                extra = []
                mgr_name = block['manager'].get(w)
                mgr_note = week_note(block, col + 1, with_category=False)
                if mgr_name or mgr_note or manager_scores:
                    extra.append('MANAGER ' + ', '.join(filter(None, [
                        mgr_name,
                        f'scored {len(manager_scores)} perkara' if manager_scores else None,
                        f'"{mgr_note}"' if mgr_note else None,
                    ])))
                marks.append(dict(
                    person=person, year=period[0], month=period[1], week=w,
                    scored_by=block['scorer'].get(w), note=week_note(block, col, warnings.append),
                    scores=scores, source=f'{path.name} / {ws.title}', id_cell=id_cell, extra=extra,
                ))


def render(marks, layouts, sources):
    out = []
    out.append('INSERT INTO import_marks (user_id, period_year, period_month, week_no, scored_by, note, scores) VALUES')
    rows, last_source = [], None
    for m in marks:
        if m['source'] != last_source:
            rows.append(f"  -- {comment(m['source'])}")
            last_source = m['source']
        for e in m['extra']:
            rows.append(f"  -- {m['person']} week {m['week']}: {comment(e)}")
        scores = ', '.join('NULL' if s is None else str(s) for s in m['scores'])
        rows.append(f"  ({sql_text(m['person'])}, {m['year']}, {m['month']}, {m['week']}, "
                    f"{sql_text(m['scored_by'])}, {sql_text(m['note'])}, ARRAY[{scores}])")
    # Commas go on the value rows only, never on the comment lines between them.
    value_idx = [i for i, r in enumerate(rows) if not r.lstrip().startswith('--')]
    for i in value_idx[:-1]:
        rows[i] += ','
    out.extend(rows)
    out.append(';')

    head = [
        f'-- GENERATED {dt.datetime.now():%Y-%m-%d %H:%M} by xlsx_to_import_marks.py from:',
        *[f'--   {s}' for s in sources],
        f'-- {len(marks)} week-marks for {len({m["person"] for m in marks})} people.',
        '-- Perkara order as read from the sheet (score list position -> row label):',
    ]
    for n, (_, where, labels) in sorted(layouts.items()):
        head.append(f'--   {n}-line layout, first seen at {comment(where)}:')
        head.extend(f'--     {i:2d} {comment(l)}' for i, l in enumerate(labels, 1))
    return head, '\n'.join(out)


def main():
    for stream in (sys.stdout, sys.stderr):  # a sheet name may not fit the console's code page
        stream.reconfigure(errors='replace')
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('inputs', nargs='+', type=Path, help='.xlsx files or folders of them')
    ap.add_argument('--month', help='only this month, e.g. 2026-09')
    ap.add_argument('-o', '--out', type=Path, help='where to write the SQL (default: import_marks_ready.sql beside the first input)')
    args = ap.parse_args()

    only_month = None
    if args.month:
        m = re.fullmatch(r'(\d{4})-(\d{1,2})', args.month)
        if not m:
            sys.exit('--month must look like 2026-09')
        only_month = (int(m[1]), int(m[2]))

    files = []
    for p in args.inputs:
        if p.is_dir():
            files += sorted(x for x in p.glob('*.xlsx') if not x.name.startswith('~$'))
        elif p.exists():
            files.append(p)
        else:
            sys.exit(f'not found: {p}')
    if not files:
        sys.exit('no .xlsx files found')

    problems, warnings, marks, layouts = Problems(), [], [], {}
    for f in files:
        read_workbook(f, only_month, problems, warnings, marks, layouts)

    for w in warnings:
        print('note:', w)
    if problems:
        print(f'\nNothing written. Fix these {len(problems)} cells and run again:', file=sys.stderr)
        for p in problems:
            print('  ' + p, file=sys.stderr)
        sys.exit(1)
    if not marks:
        sys.exit('no scored weeks found' + (f' for {args.month}' if args.month else ''))

    template = TEMPLATE.read_text(encoding='utf-8')
    block = re.compile(r'^INSERT INTO import_marks \(.*?^;[ \t]*$', re.M | re.S)
    if not block.search(template):
        sys.exit(f'could not find the INSERT INTO import_marks ... ; block in {TEMPLATE}')
    head, values = render(marks, layouts, [str(f) for f in files])
    sql = '\n'.join(head) + '\n\n' + block.sub(lambda _: values, template, count=1)

    out = args.out or files[0].with_name('import_marks_ready.sql')
    out.write_text(sql, encoding='utf-8')

    per_month = Counter((m['year'], m['month']) for m in marks)
    print(f'\n{len(marks)} week-marks for {len({m["person"] for m in marks})} people:')
    for (y, mo), n in sorted(per_month.items()):
        print(f'  {y}-{mo:02d}: {n}')
    print(f'\nWritten to {out}\nPaste it into the Supabase SQL editor and run it.')


if __name__ == '__main__':
    main()
