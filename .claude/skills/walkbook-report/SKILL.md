---
name: walkbook-report
description: >
  Generate a canvassing report from Walkbook CSV exports (detailed and/or
  summary door-knocking reports). Use this whenever the user mentions
  Walkbook files, canvassing/door-knocking data, knock reports, survey
  results from the field, or drops CSV files with columns like Canvasser,
  Disposition, Doors Knocked, or Survey Answers — even if they just say
  "here's this week's export" or "run the report". Also use it as the
  starting point for follow-up analysis of canvassing data (comparisons
  between weeks, per-canvasser questions), since the script's numbers are
  the ground truth to build on.
---

# Walkbook canvassing report

Turn Walkbook CSV exports into an HTML report with a data breakdown and key
findings. The heavy lifting is done by a deterministic script — run it rather
than analyzing the CSV yourself, so the numbers are identical every time and
token cost stays near zero.

## Workflow

1. **Locate the CSVs.** The user usually names them or drags them in; fresh
   exports typically land in `~/Downloads` with names like
   `26-07-10 Walkbook Detailed Report.csv`. If the user says "this week's
   export" without a path, look for the most recent matching files there.
   The detailed report is the one that matters; the summary export is
   optional (it only adds a cross-check). Either or both can be passed —
   the script auto-detects file type from headers, and multiple detailed
   files aggregate.

2. **Run the script** (Python 3.9+ stdlib only, no venv needed):

   ```sh
   python3 tools/walkbook-report/walkbook_report.py <csv files...> \
     -o tools/walkbook-report/reports/<YYYY-MM-DD>-report.html
   ```

   Date the output filename from the **data** (the script prints the date
   range; use the last activity date), not from today or the file name.
   The reports directory is gitignored — it holds voter names and
   addresses, which must never be committed or published (no Artifacts).

3. **Deliver the report.** Send the HTML file to the user (rendered), and
   restate the printed key findings in chat so they get the summary without
   opening the file.

4. **Offer follow-ups, grounded in the script's output.** Comparisons to a
   previous week (earlier reports live in `reports/`), per-canvasser or
   per-turf questions, recap emails. Use the script's numbers as ground
   truth; do ad-hoc analysis only for questions the report doesn't answer,
   and note when a number is ad-hoc rather than from the report.

## When the script fails or miscounts

Walkbook occasionally changes its export format (renamed columns, new survey
questions). If the script errors or the output looks wrong (e.g., zero rows
parsed, a question missing from Survey results), read the CSV header and the
relevant part of [walkbook_report.py](../../../tools/walkbook-report/walkbook_report.py),
fix the script **generally** (handle the pattern, not the one file), and
rerun. Fixes accumulate — that's the point of wrapping the script in a
session instead of running it blind.

Known quirks already handled (see the script's README for detail): canvasser
email/display-name duplicates merged via Advocate ID; surveys recorded on
non-"Took Survey" dispositions; "Contact Rate" in the summary export actually
being surveys ÷ doors (reported as *survey rate*).
