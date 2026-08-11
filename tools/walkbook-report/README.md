# Walkbook report generator

Turns Walkbook CSV exports into a self-contained HTML report with a breakdown
of the canvassing data and auto-generated key findings.

## Usage

```sh
python3 walkbook_report.py "Detailed Report.csv" "Summary Report.csv" -o report.html
```

- Accepts any mix of **Detailed** and **Summary** report exports (auto-detected
  from the headers). Passing the detailed report gives the richest output;
  passing both adds a cross-check between the two.
- Writes a single HTML file (default `walkbook_report.html`) you can open in a
  browser, print, or email. Also prints the key findings to the terminal.
- No dependencies — Python 3.9+ standard library only.

## What the report includes

- Topline stats: doors, conversations, surveys, contact/survey rates
- Auto-generated key findings (top performers, support rate, leads, data issues)
- Disposition breakdown, canvasser leaderboard, walkbook/turf progress
- Activity by day and by hour (timestamps converted to Central time)
- Survey question tallies, plus free-text responses quoted with attribution
- Leads to follow up: yard-sign requests and volunteer emails
- Data notes: identity merges, export discrepancies

## Data quirks it handles

- The same canvasser appears under both an email login and a display name;
  rows are merged via **Advocate ID** (detailed report only — the summary
  export has no ID column, so summary-only runs can't merge identities).
- Surveys occasionally recorded on non-"Took Survey" dispositions are counted
  by the `Survey Completed` column and flagged in Data Notes.
- "Contact rate" here means a human answered (Took Survey + Refused); the
  summary export's "Contact Rate (%)" column is surveys ÷ doors, which this
  report calls **survey rate**.
