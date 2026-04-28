#!/usr/bin/env node

/**
 * One-shot migration: rewrites `KansasLegislators.swift` from the legacy
 * schema (firstCommittee/.../fifthCommittee + isChair/isViceChair/
 * isRankingMember booleans) to the new schema (`committees:
 * [CommitteeMembership]` with per-membership role).
 *
 * Every membership defaults to `.member`. The legacy committee-leadership
 * booleans are dropped because the source data did not say which committee
 * each flag applied to. Chamber-leadership fields (`isLeadership`,
 * `leadershipPosition`) are preserved.
 *
 * Usage: node scripts/migrate-swift-committees.js [path-to-swift-file]
 */

const fs = require('fs');

const DEFAULT_SWIFT_PATH =
  '/Users/mitchellrucker/Developer/XCode Projects/MainstreamCoalition/MainstreamCoalition/Resources/KansasLegislators.swift';

const swiftPath = process.argv[2] ?? DEFAULT_SWIFT_PATH;

const STRING_FIELDS = [
  'chamber',
  'firstName',
  'lastName',
  'party',
  'city',
  'email',
  'officePhone',
  'firstCommittee',
  'secondCommittee',
  'thirdCommittee',
  'fourthCommittee',
  'fifthCommittee',
  'leadershipPosition',
  'imageUrl',
];

const INT_FIELDS = ['district', 'userScore'];
const BOOL_FIELDS = ['isLeadership'];

const extractEntries = (source) => {
  const flattened = source.replace(/UUID\(\)/g, 'UUID_PLACEHOLDER');
  const entries = [];
  const re = /StateLegislator\(([\s\S]*?)\)\s*(?:,|\])/g;
  let match;
  while ((match = re.exec(flattened)) !== null) {
    entries.push(match[1]);
  }
  return entries;
};

const matchField = (block, key) => {
  const stringRe = new RegExp(
    `\\b${key}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`,
  );
  const stringMatch = block.match(stringRe);
  if (stringMatch) return stringMatch[1];

  const valueRe = new RegExp(`\\b${key}\\s*:\\s*([^,\\n]+)`);
  const valueMatch = block.match(valueRe);
  return valueMatch ? valueMatch[1].trim() : null;
};

const parseEntry = (block) => {
  const record = {};
  for (const key of STRING_FIELDS) record[key] = matchField(block, key) ?? '';
  for (const key of INT_FIELDS) {
    const raw = matchField(block, key);
    record[key] = raw == null ? 0 : parseInt(raw, 10) || 0;
  }
  for (const key of BOOL_FIELDS) {
    record[key] = matchField(block, key) === 'true';
  }
  return record;
};

const buildCommitteeNames = (rec) =>
  [
    rec.firstCommittee,
    rec.secondCommittee,
    rec.thirdCommittee,
    rec.fourthCommittee,
    rec.fifthCommittee,
  ]
    .map((c) => (c ?? '').trim())
    .filter((c) => c && c.toLowerCase() !== 'none');

const renderEntry = (rec) => {
  const committees = buildCommitteeNames(rec);

  const committeesBlock = committees.length
    ? [
        '        committees: [',
        ...committees.map(
          (name) =>
            `            CommitteeMembership(name: ${JSON.stringify(name)}, role: .member),`,
        ),
        '        ],',
      ].join('\n')
    : '        committees: [],';

  return [
    '    StateLegislator(',
    '        id: UUID(),',
    `        chamber: ${JSON.stringify(rec.chamber)},`,
    `        district: ${rec.district},`,
    `        firstName: ${JSON.stringify(rec.firstName)},`,
    `        lastName: ${JSON.stringify(rec.lastName)},`,
    `        party: ${JSON.stringify(rec.party)},`,
    `        city: ${JSON.stringify(rec.city)},`,
    `        email: ${JSON.stringify(rec.email)},`,
    `        officePhone: ${JSON.stringify(rec.officePhone)},`,
    committeesBlock,
    `        isLeadership: ${rec.isLeadership ? 'true' : 'false'},`,
    `        leadershipPosition: ${JSON.stringify(rec.leadershipPosition || 'None')},`,
    '        userScore: 0,',
    `        imageUrl: ${JSON.stringify(rec.imageUrl)}`,
    '    )',
  ].join('\n');
};

const renderFile = (records) => {
  const header = `//
//  Legislators.swift
//  MyKSLeg
//
//  Created by Mitchell Rucker on 2/22/25.
//
//  Schema migrated by scripts/migrate-swift-committees.js
//  Per-committee leadership roles (Chair, Vice Chair, Ranking Member) default
//  to .member after migration; update entries manually as authoritative roles
//  become known.
//

import Foundation

let kansasLegislators: [StateLegislator] = [
`;
  return header + records.map(renderEntry).join(',\n') + '\n]\n';
};

const main = () => {
  if (!fs.existsSync(swiftPath)) {
    console.error(`Swift source not found: ${swiftPath}`);
    process.exit(1);
  }

  const original = fs.readFileSync(swiftPath, 'utf8');

  if (original.includes('CommitteeMembership(')) {
    console.log(
      'File already contains CommitteeMembership(...) — appears already migrated. Aborting.',
    );
    process.exit(0);
  }

  const backupPath = `${swiftPath}.pre-migration-backup`;
  fs.writeFileSync(backupPath, original);
  console.log(`Backed up original to: ${backupPath}`);

  const blocks = extractEntries(original);
  const records = blocks.map(parseEntry);
  const next = renderFile(records);

  fs.writeFileSync(swiftPath, next);
  console.log(
    `Migrated ${records.length} legislators (Senate: ${records.filter((r) => r.chamber === 'Senate').length}, House: ${records.filter((r) => r.chamber === 'House').length}).`,
  );
  console.log(`Updated: ${swiftPath}`);
};

main();
