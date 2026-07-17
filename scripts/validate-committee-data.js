#!/usr/bin/env node
/**
 * Validates constants/committee-meetings.ts against the committees derived
 * from services/data/kansas-legislators.ts.
 *
 * getCommitteeMeeting() looks up entries by the exact key
 * "<Chamber> <Committee Name>", so a renamed or misspelled committee silently
 * loses its meeting info. This script fails (exit 1) on meeting keys that
 * don't match any real committee, and warns on committees with no meeting
 * entry.
 *
 * Both files are parsed as text: the data file is auto-generated with a fixed
 * shape, and the meetings file keeps one "<key>": { line per entry.
 *
 * Usage: node scripts/validate-committee-data.js  (or `npm run validate:data`)
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dataPath = path.join(root, 'services', 'data', 'kansas-legislators.ts');
const meetingsPath = path.join(root, 'constants', 'committee-meetings.ts');

// ── Committees from the generated legislator data ──
// Records list `chamber:` (4-space indent) before their committees array;
// committee entries are the only objects with a `name:` field (8-space indent).
const dataSrc = fs.readFileSync(dataPath, 'utf8');
const committeeKeys = new Set();
let currentChamber = null;

// Keys may be quoted (raw generator output, JSON.stringify) or unquoted
// (after a prettier pass) — accept both.
for (const line of dataSrc.split('\n')) {
  const chamberMatch = line.match(/^ {4}"?chamber"?: "(Senate|House)",$/);
  if (chamberMatch) {
    currentChamber = chamberMatch[1];
    continue;
  }
  const nameMatch = line.match(/^ {8}"?name"?: "(.+)",?$/);
  if (nameMatch && currentChamber) {
    const name = nameMatch[1];
    // Mirrors bucketChamber() in services/kansas-legislators.ts
    const chamber = name.toLowerCase().includes('joint') ? 'Joint' : currentChamber;
    committeeKeys.add(`${chamber} ${name}`);
  }
}

if (committeeKeys.size === 0) {
  console.error(`No committees parsed from ${dataPath} — file format may have changed.`);
  process.exit(1);
}

// ── Keys from the meetings table ──
const meetingsSrc = fs.readFileSync(meetingsPath, 'utf8');
const meetingKeys = [];
for (const line of meetingsSrc.split('\n')) {
  const m = line.match(/^ {2}"(.+)": \{$/);
  if (m) meetingKeys.push(m[1]);
}

if (meetingKeys.length === 0) {
  console.error(`No meeting entries parsed from ${meetingsPath} — file format may have changed.`);
  process.exit(1);
}

// ── Checks ──
let errors = 0;

const seen = new Set();
for (const key of meetingKeys) {
  if (seen.has(key)) {
    console.error(`ERROR: duplicate meeting entry: "${key}"`);
    errors++;
  }
  seen.add(key);
}

for (const key of meetingKeys) {
  if (!committeeKeys.has(key)) {
    console.error(`ERROR: meeting entry "${key}" does not match any committee in the legislator data`);
    errors++;
  }
}

const missing = [...committeeKeys].filter((key) => !seen.has(key)).sort();
if (missing.length > 0) {
  console.warn(`WARN: ${missing.length} committee(s) have no meeting entry:`);
  for (const key of missing) console.warn(`  - ${key}`);
}

// ── Committee email map (constants/committee-emails.ts) ──
// getCommitteeEmail() does an exact key lookup where the key is
// formatCommitteeName() output ("<Senate|House> Committee on <name>"), so a
// key that doesn't follow that shape can never match a real bill. And a value
// that isn't a well-formed @senate.ks.gov / @house.ks.gov address routes
// testimony to a dead mailbox. Neither is a substitute for verifying the exact
// address against the live Legislature listing, but these catch gross errors.
const emailsPath = path.join(root, 'constants', 'committee-emails.ts');
const emailsSrc = fs.readFileSync(emailsPath, 'utf8');
const mapMarker = 'COMMITTEE_EMAILS: Record<string, string> = {';
const mapStart = emailsSrc.indexOf(mapMarker);
let emailPairs = 0;
if (mapStart === -1) {
  console.error(`ERROR: could not find COMMITTEE_EMAILS map in ${emailsPath} — file format may have changed.`);
  errors++;
} else {
  const afterStart = emailsSrc.slice(mapStart + mapMarker.length);
  const endIdx = afterStart.indexOf('};');
  const body = (endIdx === -1 ? afterStart : afterStart.slice(0, endIdx)).replace(/\/\/[^\n]*/g, '');
  const strings = [...body.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  const keyRe = /^(Senate|House) Committee on .+$/;
  const emailRe = /^[A-Za-z0-9._%+-]+@(senate|house)\.ks\.gov$/;
  for (let i = 0; i + 1 < strings.length; i += 2) {
    const key = strings[i];
    const value = strings[i + 1];
    emailPairs++;
    if (!keyRe.test(key)) {
      console.error(`ERROR: committee-emails key "${key}" is not of the form "<Senate|House> Committee on <name>"`);
      errors++;
    }
    if (!emailRe.test(value)) {
      console.error(`ERROR: committee-emails value for "${key}" ("${value}") is not a valid @senate.ks.gov / @house.ks.gov address`);
      errors++;
    }
  }
  if (emailPairs === 0) {
    console.error(`ERROR: no committee email entries parsed from ${emailsPath} — file format may have changed.`);
    errors++;
  }
}

console.log(
  `Checked ${meetingKeys.length} meeting entries against ${committeeKeys.size} committees ` +
    `and ${emailPairs} committee email(s): ${errors} error(s), ${missing.length} without meeting info.`,
);
process.exit(errors > 0 ? 1 : 0);
