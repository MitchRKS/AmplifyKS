#!/usr/bin/env node

/**
 * One-shot converter: parses the Swift `KansasLegislators.swift` file and emits
 * `services/data/kansas-legislators.ts`, a typed TS module the React Native
 * project can import directly. Re-run whenever the Swift source changes.
 *
 * Schema (post-migration):
 *   StateLegislator(
 *     ...
 *     committees: [
 *       CommitteeMembership(name: "X", role: .chair),
 *       ...
 *     ],
 *     isLeadership: ...,
 *     leadershipPosition: ...,
 *     ...
 *   )
 *
 * Usage: node scripts/parse-kansas-legislators.js [path-to-swift-file]
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_SWIFT_PATH =
  '/Users/mitchellrucker/Developer/XCode Projects/MainstreamCoalition/MainstreamCoalition/Resources/KansasLegislators.swift';

const swiftPath = process.argv[2] ?? DEFAULT_SWIFT_PATH;
const outputPath = path.resolve(
  __dirname,
  '..',
  'services',
  'data',
  'kansas-legislators.ts',
);
const imagesOutputPath = path.resolve(
  __dirname,
  '..',
  'services',
  'data',
  'kansas-legislator-images.ts',
);
const imageAssetsDir = path.resolve(__dirname, '..', 'assets', 'legislators');

// Known typos in the upstream Swift source, normalized here so regeneration
// never reintroduces them (constants/committee-meetings.ts keys and
// validate:data depend on the corrected names).
const COMMITTEE_NAME_FIXES = {
  'Veterans & Miliary': 'Veterans & Military',
  'Energy, Utilties, & Telecommunications': 'Energy, Utilities, & Telecommunications',
};

const STRING_KEYS = [
  'chamber',
  'firstName',
  'lastName',
  'party',
  'city',
  'email',
  'officePhone',
  'leadershipPosition',
  'imageUrl',
];

const INT_KEYS = ['district', 'userScore'];
const BOOL_KEYS = ['isLeadership'];

const ROLE_MAP = {
  chair: 'Chair',
  viceChair: 'Vice Chair',
  rankingMember: 'Ranking Member',
  member: 'Member',
};

const extractEntries = (source) => {
  // Drop nested `UUID()` so the outer non-greedy regex isn't fooled by inner parens.
  // `CommitteeMembership(...)` is matched explicitly below, so we don't need to
  // strip it here — but we do replace its parens with placeholders so the outer
  // `StateLegislator(...)` regex matches the whole record.
  const flattened = source
    .replace(/UUID\(\)/g, 'UUID_PLACEHOLDER')
    .replace(/CommitteeMembership\(([^)]*)\)/g, 'CMSHIP[[$1]]');

  const entries = [];
  const re = /StateLegislator\(([\s\S]*?)\)\s*(?:,|\])/g;
  let match;
  while ((match = re.exec(flattened)) !== null) {
    entries.push(match[1]);
  }
  return entries;
};

const parseField = (block, key) => {
  const stringRe = new RegExp(
    `\\b${key}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`,
  );
  const stringMatch = block.match(stringRe);
  if (stringMatch) return stringMatch[1];

  const valueRe = new RegExp(`\\b${key}\\s*:\\s*([^,\\n]+)`);
  const valueMatch = block.match(valueRe);
  return valueMatch ? valueMatch[1].trim() : null;
};

const parseCommittees = (block) => {
  const committees = [];
  const re =
    /CMSHIP\[\[\s*name\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*role\s*:\s*\.(chair|viceChair|rankingMember|member)\s*\]\]/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const role = ROLE_MAP[m[2]] ?? 'Member';
    const name = COMMITTEE_NAME_FIXES[m[1]] ?? m[1];
    committees.push({ name, role });
  }
  return committees;
};

const parseEntry = (block) => {
  const record = {};

  for (const key of STRING_KEYS) {
    record[key] = parseField(block, key) ?? '';
  }
  for (const key of INT_KEYS) {
    const raw = parseField(block, key);
    record[key] = raw == null ? 0 : parseInt(raw, 10) || 0;
  }
  for (const key of BOOL_KEYS) {
    record[key] = parseField(block, key) === 'true';
  }

  record.committees = parseCommittees(block);
  return record;
};

const normalizeParty = (party) => {
  const lower = party.toLowerCase();
  if (lower.startsWith('dem')) return 'Democratic';
  if (lower.startsWith('rep')) return 'Republican';
  return party;
};

const toRecord = (rec) => ({
  chamber: rec.chamber === 'House' ? 'House' : 'Senate',
  district: rec.district,
  firstName: rec.firstName,
  lastName: rec.lastName,
  party: normalizeParty(rec.party),
  city: rec.city,
  email: rec.email,
  officePhone: rec.officePhone,
  committees: rec.committees,
  isLeadership: rec.isLeadership,
  leadershipPosition:
    rec.leadershipPosition && rec.leadershipPosition !== 'None'
      ? rec.leadershipPosition
      : '',
  // Asset-catalog name from iOS (e.g. "SD7_Corson") — resolved to a bundled
  // image via the generated kansas-legislator-images.ts require map.
  imageUrl: rec.imageUrl,
});

const renderTs = (records) => {
  const header = `// AUTO-GENERATED FROM KansasLegislators.swift — DO NOT EDIT BY HAND.
// Run \`node scripts/parse-kansas-legislators.js\` to regenerate.

export type KSChamber = 'Senate' | 'House';

export type KSCommitteeRole =
  | 'Chair'
  | 'Vice Chair'
  | 'Ranking Member'
  | 'Member';

export interface KSCommitteeMembership {
  name: string;
  role: KSCommitteeRole;
}

export interface KSLegislatorRecord {
  chamber: KSChamber;
  district: number;
  firstName: string;
  lastName: string;
  party: string;
  city: string;
  email: string;
  officePhone: string;
  committees: KSCommitteeMembership[];
  isLeadership: boolean;
  leadershipPosition: string;
  /** iOS asset-catalog image name (e.g. "SD7_Corson"); '' when none. */
  imageUrl: string;
}

export const KANSAS_LEGISLATORS: KSLegislatorRecord[] = `;

  return header + JSON.stringify(records, null, 2) + ';\n';
};

// Metro can't require() dynamic paths, so emit a static map of every
// imageUrl that has a bundled asset under assets/legislators/.
const renderImagesTs = (records) => {
  const names = [
    ...new Set(records.map((r) => r.imageUrl).filter(Boolean)),
  ].sort();
  const present = [];
  const missing = [];
  for (const name of names) {
    if (fs.existsSync(path.join(imageAssetsDir, `${name}.jpeg`))) {
      present.push(name);
    } else {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    console.warn(
      `No bundled asset for ${missing.length} imageUrl(s): ${missing.join(', ')} — those legislators fall back to initials.`,
    );
  }

  const entries = present
    .map((n) => `  '${n}': require('../../assets/legislators/${n}.jpeg'),`)
    .join('\n');

  return `// AUTO-GENERATED FROM KansasLegislators.swift — DO NOT EDIT BY HAND.
// Run \`node scripts/parse-kansas-legislators.js\` to regenerate.
//
// Static require map: KSLegislatorRecord.imageUrl -> bundled headshot asset.
// Sourced from the iOS app's Assets.xcassets (copied to assets/legislators/).

export const KANSAS_LEGISLATOR_IMAGES: Record<string, number> = {
${entries}
};
`;
};

const main = () => {
  if (!fs.existsSync(swiftPath)) {
    console.error(`Swift source not found: ${swiftPath}`);
    process.exit(1);
  }

  const source = fs.readFileSync(swiftPath, 'utf8');
  const blocks = extractEntries(source);
  const records = blocks.map(parseEntry).map(toRecord);

  const senateCount = records.filter((r) => r.chamber === 'Senate').length;
  const houseCount = records.filter((r) => r.chamber === 'House').length;
  const totalMemberships = records.reduce(
    (sum, r) => sum + r.committees.length,
    0,
  );
  const leadershipMemberships = records.reduce(
    (sum, r) =>
      sum + r.committees.filter((c) => c.role !== 'Member').length,
    0,
  );
  console.log(
    `Parsed ${records.length} legislators (Senate: ${senateCount}, House: ${houseCount}).`,
  );
  console.log(
    `Total committee memberships: ${totalMemberships} (with leadership role: ${leadershipMemberships}).`,
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderTs(records));
  console.log(`Wrote ${outputPath}`);
  fs.writeFileSync(imagesOutputPath, renderImagesTs(records));
  console.log(`Wrote ${imagesOutputPath}`);
};

main();
