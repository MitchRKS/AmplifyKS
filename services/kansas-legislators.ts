import type {
  CommitteeAssignment,
  KansasCommittee,
  KansasCommitteeMember,
  Official,
  OfficialDetail,
} from './openstates';

import {
  KANSAS_LEGISLATORS,
  type KSLegislatorRecord,
} from './data/kansas-legislators';

const LEGISLATOR_ID_PREFIX = 'ks-state-';
const COMMITTEE_ID_PREFIX = 'ks-committee-';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const buildLegislatorId = (
  chamber: KSLegislatorRecord['chamber'],
  district: number,
): string => `${LEGISLATOR_ID_PREFIX}${chamber.toLowerCase()}-${district}`;

export const isLocalLegislatorId = (id: string): boolean =>
  id.startsWith(LEGISLATOR_ID_PREFIX);

export const isLocalCommitteeId = (id: string): boolean =>
  id.startsWith(COMMITTEE_ID_PREFIX);

const titleForRecord = (rec: KSLegislatorRecord): string =>
  rec.chamber === 'Senate' ? 'State Senator' : 'State Representative';

const recordToOfficial = (rec: KSLegislatorRecord): Official => ({
  id: buildLegislatorId(rec.chamber, rec.district),
  name: `${rec.firstName} ${rec.lastName}`.trim(),
  givenName: rec.firstName,
  familyName: rec.lastName,
  image: '',
  email: rec.email,
  party: rec.party,
  chamber: rec.chamber,
  district: String(rec.district),
  jurisdiction: 'Kansas',
  contactDetails: [],
  links: [],
  openstatesUrl: '',
});

const recordToDetail = (rec: KSLegislatorRecord): OfficialDetail => {
  const offices = rec.officePhone
    ? [
        {
          name: 'Capitol Office',
          voice: rec.officePhone,
          classification: 'capitol',
        },
      ]
    : [];

  return {
    ...recordToOfficial(rec),
    title: titleForRecord(rec),
    offices,
    sources: [],
    legislatureLinks: [],
  };
};

const findRecord = (id: string): KSLegislatorRecord | undefined => {
  if (!isLocalLegislatorId(id)) return undefined;
  const tail = id.slice(LEGISLATOR_ID_PREFIX.length);
  const [chamber, districtRaw] = tail.split('-');
  const district = parseInt(districtRaw, 10);
  if (!Number.isFinite(district)) return undefined;
  return KANSAS_LEGISLATORS.find(
    (r) => r.chamber.toLowerCase() === chamber && r.district === district,
  );
};

export const getKansasLegislatorsLocal = (): Official[] =>
  KANSAS_LEGISLATORS.map(recordToOfficial);

export const getOfficialDetailLocal = (id: string): OfficialDetail | null => {
  const rec = findRecord(id);
  return rec ? recordToDetail(rec) : null;
};

interface CommitteeBucket {
  name: string;
  chamber: 'Senate' | 'House' | 'Joint';
  members: Map<string, KansasCommitteeMember>;
}

const bucketChamber = (
  committeeName: string,
  legislatorChamber: KSLegislatorRecord['chamber'],
): CommitteeBucket['chamber'] =>
  committeeName.toLowerCase().includes('joint') ? 'Joint' : legislatorChamber;

// Tolerant of a stale string-shaped membership during dev hot-reloads.
const normalizeMembership = (
  raw: unknown,
): { name: string; role: string } | null => {
  if (typeof raw === 'string') {
    return raw.trim() ? { name: raw.trim(), role: 'Member' } : null;
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as { name?: unknown; role?: unknown };
    if (typeof obj.name === 'string' && obj.name.trim()) {
      return {
        name: obj.name.trim(),
        role: typeof obj.role === 'string' && obj.role ? obj.role : 'Member',
      };
    }
  }
  return null;
};

const buildCommitteeIndex = (): Map<string, CommitteeBucket> => {
  const index = new Map<string, CommitteeBucket>();

  for (const rec of KANSAS_LEGISLATORS) {
    for (const raw of rec.committees) {
      const membership = normalizeMembership(raw);
      if (!membership) continue;

      const chamber = bucketChamber(membership.name, rec.chamber);
      const id = `${COMMITTEE_ID_PREFIX}${chamber.toLowerCase()}-${slugify(membership.name)}`;

      let bucket = index.get(id);
      if (!bucket) {
        bucket = { name: membership.name, chamber, members: new Map() };
        index.set(id, bucket);
      }

      const personId = buildLegislatorId(rec.chamber, rec.district);
      if (bucket.members.has(personId)) continue;

      bucket.members.set(personId, {
        personId,
        name: `${rec.firstName} ${rec.lastName}`.trim(),
        role: membership.role,
      });
    }
  }

  return index;
};

let cachedCommittees: KansasCommittee[] | null = null;

const buildLastNameLookup = (): Map<string, string> => {
  const map = new Map<string, string>();
  for (const rec of KANSAS_LEGISLATORS) {
    map.set(buildLegislatorId(rec.chamber, rec.district), rec.lastName);
  }
  return map;
};

const buildCommittees = (): KansasCommittee[] => {
  if (cachedCommittees) return cachedCommittees;

  const lastNameByPersonId = buildLastNameLookup();
  const compareByLastName = (
    a: KansasCommitteeMember,
    b: KansasCommitteeMember,
  ): number => {
    const lastA = lastNameByPersonId.get(a.personId) ?? a.name;
    const lastB = lastNameByPersonId.get(b.personId) ?? b.name;
    const diff = lastA.localeCompare(lastB);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  };

  const index = buildCommitteeIndex();
  const committees: KansasCommittee[] = [];

  for (const [id, bucket] of index.entries()) {
    const members = Array.from(bucket.members.values()).sort(compareByLastName);
    committees.push({
      id,
      name: bucket.name,
      chamber: bucket.chamber,
      classification: 'committee',
      parentId: null,
      url: '',
      members,
    });
  }

  committees.sort((a, b) => a.name.localeCompare(b.name));
  cachedCommittees = committees;
  return committees;
};

export const getKansasCommitteesLocal = (): KansasCommittee[] =>
  buildCommittees();

export const getCommitteeByIdLocal = (id: string): KansasCommittee | null =>
  buildCommittees().find((c) => c.id === id) ?? null;

export const getCommitteeAssignmentsLocal = (
  personId: string,
): CommitteeAssignment[] => {
  const assignments: CommitteeAssignment[] = [];
  for (const committee of buildCommittees()) {
    const membership = committee.members.find((m) => m.personId === personId);
    if (!membership) continue;
    assignments.push({
      id: committee.id,
      name: committee.name,
      role: membership.role,
      chamber: committee.chamber,
      url: committee.url,
    });
  }
  assignments.sort((a, b) => a.name.localeCompare(b.name));
  return assignments;
};
