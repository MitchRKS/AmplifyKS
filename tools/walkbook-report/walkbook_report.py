#!/usr/bin/env python3
"""Walkbook canvassing report generator.

Parses Walkbook "Detailed Report" and/or "Summary Report" CSV exports and
produces a self-contained HTML report (plus a terminal summary) with a
breakdown of the data and auto-generated key findings.

Usage:
    python3 walkbook_report.py <report.csv> [more.csv ...] [-o report.html]

File types are auto-detected from their headers, so you can pass the detailed
export, the summary export, or both. When both are given, the detailed file is
treated as ground truth and the summary is cross-checked against it.

No third-party dependencies — Python 3.9+ standard library only.
"""

from __future__ import annotations

import argparse
import csv
import html
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
    LOCAL_TZ = ZoneInfo("America/Chicago")
except Exception:  # pragma: no cover - zoneinfo missing tzdata
    LOCAL_TZ = None

# Dispositions that mean a human answered the door.
CONTACT_DISPOSITIONS = {"Took Survey", "Refused"}

# A survey answer column is treated as categorical (tallied) when its answers
# are few and short; otherwise it's shown as free-text responses.
CATEGORICAL_MAX_DISTINCT = 8
CATEGORICAL_MAX_LEN = 24


# ---------------------------------------------------------------------------
# Parsing

def detect_type(headers: list[str]) -> str | None:
    hs = {h.strip().lower() for h in headers}
    if "disposition" in hs:
        return "detailed"
    if "doors knocked" in hs:
        return "summary"
    return None


def load_files(paths: list[Path]):
    detailed, summary = [], []
    for path in paths:
        with open(path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            kind = detect_type(reader.fieldnames or [])
            if kind is None:
                sys.exit(f"error: {path.name} doesn't look like a Walkbook "
                         "detailed or summary report (unrecognized headers)")
            rows = [{(k or "").strip(): (v or "").strip() for k, v in r.items()}
                    for r in reader]
            (detailed if kind == "detailed" else summary).extend(rows)
            print(f"  parsed {path.name}: {len(rows)} rows ({kind} report)")
    return detailed, summary


def parse_survey_answers(raw: str) -> list[tuple[str, str]]:
    """Split 'Q: A | Q: A' pairs. Questions may themselves end with ':'."""
    pairs = []
    for part in raw.split(" | "):
        if ": " in part:
            q, a = part.split(": ", 1)
            pairs.append((q.strip().rstrip(":"), a.strip()))
    return pairs


def local_dt(iso: str) -> datetime | None:
    try:
        dt = datetime.fromisoformat(iso)
    except ValueError:
        return None
    if LOCAL_TZ and dt.tzinfo:
        dt = dt.astimezone(LOCAL_TZ)
    return dt


# ---------------------------------------------------------------------------
# Identity resolution — the same person shows up as both an email login and a
# display name (e.g. "ashton.j@gmail.com" and "Ashton Johnson"). The detailed
# report carries an Advocate ID that ties them together.

def canonical_names(detailed: list[dict]) -> dict[str, str]:
    """advocate_id -> best display name (prefer a non-email label)."""
    by_id: dict[str, set[str]] = defaultdict(set)
    for r in detailed:
        if r.get("Advocate ID"):
            by_id[r["Advocate ID"]].add(r.get("Canvasser", ""))
    names = {}
    for aid, labels in by_id.items():
        display = [l for l in labels if "@" not in l]
        names[aid] = sorted(display)[0] if display else sorted(labels)[0]
    return names


def alias_map(detailed: list[dict]) -> dict[str, str]:
    """any canvasser label -> canonical display name."""
    names = canonical_names(detailed)
    aliases = {}
    for r in detailed:
        aid = r.get("Advocate ID")
        if aid in names:
            aliases[r.get("Canvasser", "")] = names[aid]
    return aliases


# ---------------------------------------------------------------------------
# Analysis

def pct(n: int, d: int) -> float:
    return round(100.0 * n / d, 1) if d else 0.0


def shorten_walkbook(name: str, prefixes: dict) -> str:
    """Walkbook names share a long prefix; label turfs by their distinct tail."""
    return prefixes.get(name, name)


def common_prefix_labels(names: list[str]) -> dict[str, str]:
    if len(names) < 2:
        return {n: n for n in names}
    import os
    prefix = os.path.commonprefix(names)
    cut = len(prefix)
    if cut < 8:  # not meaningfully shared
        return {n: n for n in names}
    return {n: ("…" + n[cut - 2:] if n[cut:] else n) for n in names}


def analyze(detailed: list[dict], summary: list[dict]) -> dict:
    a: dict = {"source": "detailed" if detailed else "summary"}
    aliases = alias_map(detailed) if detailed else {}
    a["aliases_merged"] = sorted(
        {(label, canon) for label, canon in aliases.items() if label != canon})

    if detailed:
        canv = defaultdict(lambda: {"doors": 0, "contacts": 0, "surveys": 0,
                                    "days": set(), "last": None})
        walkbooks = defaultdict(lambda: {"doors": 0, "contacts": 0, "surveys": 0})
        dispositions = Counter()
        by_day = defaultdict(lambda: {"doors": 0, "surveys": 0})
        by_hour = Counter()
        questions: dict[str, Counter] = defaultdict(Counter)
        freetext: dict[str, list] = defaultdict(list)
        yard_leads, volunteers, cities = [], [], Counter()

        for r in detailed:
            who = aliases.get(r.get("Canvasser", ""), r.get("Canvasser", ""))
            disp = r.get("Disposition", "")
            surveyed = r.get("Survey Completed", "").lower() == "yes"
            contact = disp in CONTACT_DISPOSITIONS
            dt = local_dt(r.get("Date/Time", ""))

            dispositions[disp] += 1
            cities[r.get("City", "") or "—"] += 1

            c = canv[who]
            c["doors"] += 1
            c["contacts"] += contact
            c["surveys"] += surveyed
            if dt:
                c["days"].add(dt.date())
                c["last"] = max(c["last"], dt) if c["last"] else dt
                by_day[dt.date()]["doors"] += 1
                by_day[dt.date()]["surveys"] += surveyed
                by_hour[dt.hour] += 1

            w = walkbooks[r.get("Walkbook", "—")]
            w["doors"] += 1
            w["contacts"] += contact
            w["surveys"] += surveyed

            for q, ans in parse_survey_answers(r.get("Survey Answers", "")):
                questions[q][ans] += 1
                if "@" in ans and "volunteer" in q.lower():
                    volunteers.append({"email": ans, "voter": r.get("Contact", ""),
                                       "canvasser": who})
                if q.lower().startswith("yard sign") and ans.lower() == "yes":
                    yard_leads.append({
                        "voter": r.get("Contact", ""),
                        "address": ", ".join(x for x in
                                             (r.get("Address", ""), r.get("City", ""))
                                             if x),
                        "canvasser": who,
                    })

        # Split survey questions into categorical tallies vs free text.
        categorical, freeform = {}, {}
        for q, counts in questions.items():
            short = (len(counts) <= CATEGORICAL_MAX_DISTINCT and
                     max(len(ans) for ans in counts) <= CATEGORICAL_MAX_LEN)
            if short:
                categorical[q] = counts
            else:
                freeform[q] = counts
        for r in detailed:  # keep free-text in row order with attribution
            for q, ans in parse_survey_answers(r.get("Survey Answers", "")):
                if q in freeform:
                    freetext[q].append(
                        {"answer": ans, "voter": r.get("Contact", ""),
                         "canvasser": aliases.get(r.get("Canvasser", ""),
                                                  r.get("Canvasser", ""))})

        total = len(detailed)
        contacts = sum(dispositions[d] for d in CONTACT_DISPOSITIONS if d in dispositions)
        surveys = sum(1 for r in detailed
                      if r.get("Survey Completed", "").lower() == "yes")
        dts = [d for d in (local_dt(r.get("Date/Time", "")) for r in detailed) if d]

        a.update({
            "campaigns": sorted({r.get("Campaign", "") for r in detailed} - {""}),
            "total_doors": total,
            "contacts": contacts,
            "surveys": surveys,
            "contact_rate": pct(contacts, total),
            "survey_rate": pct(surveys, total),
            "dispositions": dispositions,
            "canvassers": {k: v for k, v in sorted(
                canv.items(), key=lambda kv: -kv[1]["doors"])},
            "walkbooks": {k: v for k, v in sorted(
                walkbooks.items(), key=lambda kv: -kv[1]["doors"])},
            "by_day": dict(sorted(by_day.items())),
            "by_hour": dict(sorted(by_hour.items())),
            "categorical_questions": categorical,
            "freetext": dict(freetext),
            "yard_leads": yard_leads,
            "volunteers": volunteers,
            "cities": cities,
            "date_range": (min(dts).date(), max(dts).date()) if dts else None,
            "surveys_offdisposition": sum(
                1 for r in detailed
                if r.get("Survey Completed", "").lower() == "yes"
                and r.get("Disposition") != "Took Survey"),
        })

    if summary:
        srows = []
        for r in summary:
            who = aliases.get(r.get("Canvasser", ""), r.get("Canvasser", ""))
            srows.append({
                "canvasser": who, "walkbook": r.get("Walkbook", ""),
                "team": r.get("Team", ""),
                "doors": int(float(r.get("Doors Knocked") or 0)),
                "surveys": int(float(r.get("Completed Surveys") or 0)),
                "rate": float(r.get("Contact Rate (%)") or 0),
                "last": r.get("Last Activity", ""),
            })
        merged = defaultdict(lambda: {"doors": 0, "surveys": 0})
        for r in srows:
            merged[r["canvasser"]]["doors"] += r["doors"]
            merged[r["canvasser"]]["surveys"] += r["surveys"]
        a["summary_rows"] = srows
        a["summary_by_canvasser"] = dict(merged)
        if not detailed:
            total = sum(r["doors"] for r in srows)
            surveys = sum(r["surveys"] for r in srows)
            a.update({
                "campaigns": sorted({r.get("Campaign", "") for r in summary} - {""}),
                "total_doors": total, "surveys": surveys,
                "survey_rate": pct(surveys, total),
                "canvassers": {k: {"doors": v["doors"], "surveys": v["surveys"],
                                   "contacts": None, "days": set(), "last": None}
                               for k, v in sorted(merged.items(),
                                                  key=lambda kv: -kv[1]["doors"])},
            })

    # Cross-check summary vs detailed when both are present.
    if detailed and summary:
        diffs = []
        det = {k: v["doors"] for k, v in a["canvassers"].items()}
        for who, s in a["summary_by_canvasser"].items():
            d = det.get(who)
            if d is not None and abs(d - s["doors"]) > max(5, 0.1 * s["doors"]):
                diffs.append({"canvasser": who, "detailed": d,
                              "summary": s["doors"]})
        a["summary_diffs"] = diffs

    return a


def key_findings(a: dict) -> list[str]:
    f = []
    total = a.get("total_doors", 0)
    if not total:
        return ["No knock records found in the provided files."]

    if a["source"] == "detailed":
        f.append(f"<b>{total:,} doors knocked</b> produced "
                 f"<b>{a['contacts']:,} conversations</b> "
                 f"({a['contact_rate']}% contact rate) and "
                 f"<b>{a['surveys']:,} completed surveys</b> "
                 f"({a['survey_rate']}% of doors).")
        nh = a["dispositions"].get("Not Home", 0)
        if nh:
            f.append(f"{pct(nh, total)}% of attempts were <b>Not Home</b> — "
                     "these doors can be recycled into a follow-up pass.")

    canv = a.get("canvassers", {})
    if canv:
        top = next(iter(canv.items()))
        f.append(f"<b>{html.escape(top[0])}</b> led on volume with "
                 f"{top[1]['doors']:,} doors"
                 + (f" and {top[1]['surveys']} surveys." if top[1]["surveys"] is not None else "."))
        rated = [(k, pct(v["surveys"], v["doors"])) for k, v in canv.items()
                 if v["doors"] >= 30]
        if rated:
            best = max(rated, key=lambda kv: kv[1])
            worst = min(rated, key=lambda kv: kv[1])
            f.append(f"Best survey rate (≥30 doors): <b>{html.escape(best[0])}</b> "
                     f"at {best[1]}%; lowest: {html.escape(worst[0])} at "
                     f"{worst[1]}% — worth checking turf quality or timing "
                     "before reading it as effort.")

    for q, counts in a.get("categorical_questions", {}).items():
        yes, tot = counts.get("Yes", 0), sum(counts.values())
        if "marshall" in q.lower() and tot:
            f.append(f"Of {tot} voters asked, <b>{pct(yes, tot)}% said they're "
                     f"voting for Senator Marshall</b> — consistent with a "
                     "supporter-universe walk list.")
        elif "planning to vote" in q.lower() and tot:
            f.append(f"{pct(yes, tot)}% of surveyed voters say they plan to "
                     "vote in the general election.")

    if a.get("yard_leads"):
        f.append(f"<b>{len(a['yard_leads'])} yard-sign requests</b> collected — "
                 "addresses are listed in the Leads section for delivery.")
    if a.get("volunteers"):
        f.append(f"{len(a['volunteers'])} voter(s) gave an email to get "
                 "involved as volunteers.")

    hours = a.get("by_hour", {})
    if hours:
        best_h = max(hours, key=hours.get)
        f.append(f"Knocking peaked in the <b>{best_h % 12 or 12}"
                 f"{'am' if best_h < 12 else 'pm'} hour</b> (local time); "
                 "contact-rate-by-hour is in the activity section.")

    if a.get("aliases_merged"):
        f.append(f"{len(a['aliases_merged'])} canvasser email/display-name "
                 "duplicates were merged via Advocate ID, so per-person totals "
                 "here won't match the raw summary export line-by-line.")
    if a.get("surveys_offdisposition"):
        f.append(f"{a['surveys_offdisposition']} completed survey(s) were "
                 "recorded on doors whose disposition is not “Took Survey” — "
                 "minor data-hygiene issue in the source app.")
    if a.get("summary_diffs"):
        names = ", ".join(html.escape(d["canvasser"]) for d in a["summary_diffs"])
        f.append("Summary and detailed exports disagree on door totals for: "
                 f"{names} (details in Data Notes).")
    return f


# ---------------------------------------------------------------------------
# HTML output

CSS = """
:root {
  color-scheme: light;
  --surface: #fcfcfb; --page: #f9f9f7;
  --ink: #0b0b0b; --ink-2: #52514e; --muted: #898781;
  --grid: #e1e0d9; --baseline: #c3c2b7;
  --border: rgba(11,11,11,0.10);
  --series: #2a78d6; --track: #cde2fb;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --surface: #1a1a19; --page: #0d0d0d;
    --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
    --grid: #2c2c2a; --baseline: #383835;
    --border: rgba(255,255,255,0.10);
    --series: #3987e5; --track: #184f95;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink);
  font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
.wrap { max-width: 880px; margin: 0 auto; padding: 32px 20px 64px; }
h1 { font-size: 26px; margin: 0 0 4px; }
h2 { font-size: 18px; margin: 40px 0 12px; }
.sub { color: var(--ink-2); margin: 0 0 24px; }
.card { background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 16px 18px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px,1fr));
  gap: 10px; }
.tile .label { font-size: 12px; color: var(--ink-2); }
.tile .value { font-size: 26px; font-weight: 600; }
ul.findings { padding-left: 20px; } ul.findings li { margin: 8px 0; }
.bar-row { display: grid; grid-template-columns: 170px 1fr 60px;
  align-items: center; gap: 10px; margin: 6px 0; }
.bar-row .name { font-size: 13px; color: var(--ink-2); text-align: right;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { background: none; border-left: 1px solid var(--baseline);
  height: 18px; }
.bar-fill { background: var(--series); height: 100%; max-height: 18px;
  border-radius: 0 4px 4px 0; min-width: 2px; }
.bar-row .val { font-size: 13px; font-variant-numeric: tabular-nums; }
.cols { display: flex; align-items: flex-end; gap: 2px; height: 120px;
  border-bottom: 1px solid var(--baseline); }
.col { flex: 1; max-width: 24px; background: var(--series);
  border-radius: 4px 4px 0 0; }
.cols-labels { display: flex; gap: 2px; }
.cols-labels span { flex: 1; max-width: 24px; font-size: 10px;
  color: var(--muted); text-align: center; }
table { border-collapse: collapse; width: 100%; font-size: 14px; }
th { text-align: left; font-size: 12px; color: var(--ink-2);
  border-bottom: 1px solid var(--baseline); padding: 6px 8px; }
td { padding: 6px 8px; border-bottom: 1px solid var(--grid);
  font-variant-numeric: tabular-nums; }
td.t { font-variant-numeric: normal; }
.note { color: var(--ink-2); font-size: 13px; }
.quote { border-left: 3px solid var(--grid); margin: 10px 0; padding: 2px 12px;
  color: var(--ink-2); font-size: 14px; }
.quote .who { font-size: 12px; color: var(--muted); }
@media print { body { background: #fff; } .card { border: none; padding: 0; } }
"""


def esc(v) -> str:
    return html.escape(str(v))


def hbar_chart(items: list[tuple[str, int]], total_hint: int | None = None) -> str:
    if not items:
        return "<p class='note'>No data.</p>"
    mx = total_hint or max(v for _, v in items) or 1
    rows = []
    for name, v in items:
        w = 100.0 * v / mx
        rows.append(
            f"<div class='bar-row' title='{esc(name)}: {v:,}'>"
            f"<span class='name'>{esc(name)}</span>"
            f"<div class='bar-track'><div class='bar-fill' style='width:{w:.1f}%'>"
            f"</div></div><span class='val'>{v:,}</span></div>")
    return "".join(rows)


def column_chart(items: list[tuple[str, int]]) -> str:
    if not items:
        return "<p class='note'>No data.</p>"
    mx = max(v for _, v in items) or 1
    cols = "".join(
        f"<div class='col' style='height:{max(2, 100.0 * v / mx):.1f}%' "
        f"title='{esc(k)}: {v:,}'></div>" for k, v in items)
    labels = "".join(f"<span>{esc(k)}</span>" for k, _ in items)
    return (f"<div class='cols'>{cols}</div>"
            f"<div class='cols-labels'>{labels}</div>")


def render_html(a: dict, generated: str) -> str:
    parts = []
    campaigns = ", ".join(a.get("campaigns", [])) or "Walkbook export"
    dr = a.get("date_range")
    drs = (f"{dr[0].strftime('%b %-d')} – {dr[1].strftime('%b %-d, %Y')}"
           if dr else "")
    parts.append(f"<div class='wrap'><h1>Canvassing Report — {esc(campaigns)}</h1>"
                 f"<p class='sub'>{esc(drs)}{' · ' if drs else ''}"
                 f"generated {esc(generated)}</p>")

    # Stat tiles
    tiles = [("Doors knocked", f"{a.get('total_doors', 0):,}")]
    if a["source"] == "detailed":
        tiles += [("Conversations", f"{a['contacts']:,}"),
                  ("Contact rate", f"{a['contact_rate']}%")]
    tiles += [("Surveys", f"{a.get('surveys', 0):,}"),
              ("Survey rate", f"{a.get('survey_rate', 0)}%"),
              ("Canvassers", f"{len(a.get('canvassers', {})):,}")]
    if a.get("yard_leads"):
        tiles.append(("Yard-sign leads", f"{len(a['yard_leads'])}"))
    parts.append("<div class='tiles'>" + "".join(
        f"<div class='card tile'><div class='label'>{esc(l)}</div>"
        f"<div class='value'>{esc(v)}</div></div>" for l, v in tiles) + "</div>")

    # Key findings
    parts.append("<h2>Key findings</h2><div class='card'><ul class='findings'>"
                 + "".join(f"<li>{f}</li>" for f in key_findings(a))
                 + "</ul></div>")

    # Dispositions
    if a.get("dispositions"):
        items = a["dispositions"].most_common()
        parts.append("<h2>What happened at the door</h2><div class='card'>"
                     + hbar_chart(items) + "</div>")

    # Canvasser leaderboard
    canv = a.get("canvassers", {})
    if canv:
        rows = []
        for name, c in canv.items():
            sr = pct(c["surveys"], c["doors"])
            last = c["last"].strftime("%b %-d %-I:%M%p") if c.get("last") else "—"
            days = len(c["days"]) or "—"
            contacts = f"{c['contacts']:,}" if c.get("contacts") is not None else "—"
            rows.append(f"<tr><td class='t'>{esc(name)}</td>"
                        f"<td>{c['doors']:,}</td><td>{contacts}</td>"
                        f"<td>{c['surveys']:,}</td><td>{sr}%</td>"
                        f"<td>{days}</td><td class='t'>{esc(last)}</td></tr>")
        parts.append(
            "<h2>Canvasser leaderboard</h2><div class='card'>"
            "<table><tr><th>Canvasser</th><th>Doors</th><th>Conversations</th>"
            "<th>Surveys</th><th>Survey rate</th><th>Days out</th>"
            "<th>Last activity</th></tr>" + "".join(rows) + "</table>"
            "<p class='note'>Email logins and display names for the same "
            "person are merged via Advocate ID.</p></div>")

    # Walkbook progress
    wbs = a.get("walkbooks", {})
    if wbs:
        labels = common_prefix_labels(list(wbs))
        rows = []
        for name, w in wbs.items():
            rows.append(f"<tr><td class='t' title='{esc(name)}'>"
                        f"{esc(labels[name])}</td><td>{w['doors']:,}</td>"
                        f"<td>{w['contacts']:,}</td><td>{w['surveys']:,}</td>"
                        f"<td>{pct(w['surveys'], w['doors'])}%</td></tr>")
        parts.append("<h2>Turf / walkbook progress</h2><div class='card'>"
                     "<table><tr><th>Walkbook</th><th>Doors</th>"
                     "<th>Conversations</th><th>Surveys</th><th>Survey rate</th>"
                     "</tr>" + "".join(rows) + "</table></div>")

    # Activity over time
    if a.get("by_day"):
        day_items = [(d.strftime("%b %-d"), v["doors"])
                     for d, v in a["by_day"].items()]
        parts.append("<h2>Doors by day</h2><div class='card'>"
                     + column_chart(day_items) + "</div>")
    if a.get("by_hour"):
        hr_items = [(f"{h % 12 or 12}{'a' if h < 12 else 'p'}", n)
                    for h, n in a["by_hour"].items()]
        parts.append("<h2>Doors by hour (local)</h2><div class='card'>"
                     + column_chart(hr_items) + "</div>")

    # Survey results
    cq = a.get("categorical_questions", {})
    if cq:
        blocks = []
        for q, counts in cq.items():
            items = counts.most_common()
            tot = sum(counts.values())
            blocks.append(f"<div class='card' style='margin:10px 0'>"
                          f"<p style='margin:0 0 8px'><b>{esc(q)}</b> "
                          f"<span class='note'>({tot} responses)</span></p>"
                          + hbar_chart(items, tot) + "</div>")
        parts.append("<h2>Survey results</h2>" + "".join(blocks))

    # Leads
    if a.get("yard_leads") or a.get("volunteers"):
        parts.append("<h2>Leads to follow up</h2>")
        if a.get("yard_leads"):
            rows = "".join(
                f"<tr><td class='t'>{esc(l['voter'])}</td>"
                f"<td class='t'>{esc(l['address'])}</td>"
                f"<td class='t'>{esc(l['canvasser'])}</td></tr>"
                for l in a["yard_leads"])
            parts.append("<div class='card'><p style='margin:0 0 8px'>"
                         "<b>Yard-sign requests</b></p><table><tr><th>Voter</th>"
                         "<th>Address</th><th>Canvasser</th></tr>"
                         + rows + "</table></div>")
        if a.get("volunteers"):
            rows = "".join(
                f"<tr><td class='t'>{esc(v['voter'])}</td>"
                f"<td class='t'>{esc(v['email'])}</td>"
                f"<td class='t'>{esc(v['canvasser'])}</td></tr>"
                for v in a["volunteers"])
            parts.append("<div class='card' style='margin-top:10px'>"
                         "<p style='margin:0 0 8px'><b>Volunteer interest</b></p>"
                         "<table><tr><th>Voter</th><th>Email</th>"
                         "<th>Canvasser</th></tr>" + rows + "</table></div>")

    # Free-text issues
    for q, entries in a.get("freetext", {}).items():
        quotes = "".join(
            f"<div class='quote'>{esc(e['answer'])}"
            f"<div class='who'>— {esc(e['voter'])}, via {esc(e['canvasser'])}"
            f"</div></div>" for e in entries)
        parts.append(f"<h2>{esc(q)}</h2><div class='card'>"
                     f"<p class='note'>{len(entries)} responses</p>{quotes}</div>")

    # Data notes
    notes = []
    for label, canon in a.get("aliases_merged", []):
        notes.append(f"Merged <b>{esc(label)}</b> into <b>{esc(canon)}</b> "
                     "(same Advocate ID).")
    for d in a.get("summary_diffs", []):
        notes.append(f"<b>{esc(d['canvasser'])}</b>: detailed report shows "
                     f"{d['detailed']:,} doors, summary shows "
                     f"{d['summary']:,} — the two exports likely cover "
                     "different time windows.")
    if a.get("surveys_offdisposition"):
        notes.append(f"{a['surveys_offdisposition']} survey(s) attached to "
                     "non-“Took Survey” dispositions.")
    if notes:
        parts.append("<h2>Data notes</h2><div class='card'><ul class='findings'>"
                     + "".join(f"<li>{n}</li>" for n in notes) + "</ul></div>")

    parts.append("</div>")
    return ("<!doctype html><html><head><meta charset='utf-8'>"
            "<meta name='viewport' content='width=device-width, initial-scale=1'>"
            f"<title>Canvassing Report — {esc(campaigns)}</title>"
            f"<style>{CSS}</style></head><body>" + "".join(parts)
            + "</body></html>")


# ---------------------------------------------------------------------------
# Terminal summary

def print_summary(a: dict) -> None:
    import re
    strip = lambda s: re.sub(r"<[^>]+>", "", s).replace("“", '"').replace("”", '"')
    print(f"\n  Doors: {a.get('total_doors', 0):,}   "
          f"Surveys: {a.get('surveys', 0):,} ({a.get('survey_rate', 0)}%)"
          + (f"   Conversations: {a['contacts']:,} ({a['contact_rate']}%)"
             if a["source"] == "detailed" else ""))
    print("\n  Key findings:")
    for f in key_findings(a):
        print(f"   • {strip(f)}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("csv", nargs="+", type=Path, help="Walkbook CSV export(s)")
    p.add_argument("-o", "--output", type=Path, default=Path("walkbook_report.html"),
                   help="output HTML file (default: walkbook_report.html)")
    args = p.parse_args()

    detailed, summary = load_files(args.csv)
    analysis = analyze(detailed, summary)
    stamp = datetime.now().strftime("%b %-d, %Y %-I:%M %p")
    args.output.write_text(render_html(analysis, stamp), encoding="utf-8")
    print_summary(analysis)
    print(f"\n  Report written to {args.output}\n")


if __name__ == "__main__":
    main()
