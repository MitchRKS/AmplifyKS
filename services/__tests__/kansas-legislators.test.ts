import {
  buildLegislatorId,
  getCommitteeAssignmentsLocal,
  getCommitteeByIdLocal,
  getKansasCommitteesLocal,
  getKansasLegislatorsLocal,
  getOfficialDetailLocal,
  isLocalCommitteeId,
  isLocalLegislatorId,
} from '@/services/kansas-legislators';
import { KANSAS_LEGISLATORS } from '@/services/data/kansas-legislators';

describe('legislator IDs', () => {
  it('builds and recognizes local legislator IDs', () => {
    expect(buildLegislatorId('Senate', 1)).toBe('ks-state-senate-1');
    expect(buildLegislatorId('House', 42)).toBe('ks-state-house-42');
    expect(isLocalLegislatorId('ks-state-senate-1')).toBe(true);
    expect(isLocalLegislatorId('ocd-person/abc123')).toBe(false);
    expect(isLocalCommitteeId('ks-committee-senate-judiciary')).toBe(true);
    expect(isLocalCommitteeId('ks-state-senate-1')).toBe(false);
  });
});

describe('getOfficialDetailLocal', () => {
  it('round-trips every record through its built ID', () => {
    for (const rec of KANSAS_LEGISLATORS) {
      const id = buildLegislatorId(rec.chamber, rec.district);
      const detail = getOfficialDetailLocal(id);
      expect(detail).not.toBeNull();
      expect(detail!.name).toBe(`${rec.firstName} ${rec.lastName}`.trim());
      expect(detail!.district).toBe(String(rec.district));
    }
  });

  it('assigns titles by chamber', () => {
    const senator = getOfficialDetailLocal(buildLegislatorId('Senate', 1));
    const rep = getOfficialDetailLocal(buildLegislatorId('House', 1));
    expect(senator!.title).toBe('State Senator');
    expect(rep!.title).toBe('State Representative');
  });

  it('returns null for unknown or foreign IDs', () => {
    expect(getOfficialDetailLocal('ks-state-senate-999')).toBeNull();
    expect(getOfficialDetailLocal('ocd-person/abc123')).toBeNull();
  });
});

describe('getKansasLegislatorsLocal', () => {
  it('returns one official per record with unique IDs', () => {
    const officials = getKansasLegislatorsLocal();
    expect(officials).toHaveLength(KANSAS_LEGISLATORS.length);
    const ids = new Set(officials.map((o) => o.id));
    expect(ids.size).toBe(officials.length);
  });
});

describe('committees', () => {
  it('buckets House and Senate committees of the same name separately', () => {
    const committees = getKansasCommitteesLocal();
    const judiciary = committees.filter((c) => c.name === 'Judiciary');
    const chambers = judiciary.map((c) => c.chamber).sort();
    expect(chambers).toEqual(['House', 'Senate']);
  });

  it('gives every committee a unique local ID and at least one member', () => {
    const committees = getKansasCommitteesLocal();
    const ids = new Set(committees.map((c) => c.id));
    expect(ids.size).toBe(committees.length);
    for (const committee of committees) {
      expect(isLocalCommitteeId(committee.id)).toBe(true);
      expect(committee.members.length).toBeGreaterThan(0);
    }
  });

  it('finds committees by ID', () => {
    const [first] = getKansasCommitteesLocal();
    expect(getCommitteeByIdLocal(first.id)?.name).toBe(first.name);
    expect(getCommitteeByIdLocal('ks-committee-house-nope')).toBeNull();
  });

  it('lists a legislator in the assignments of each of their committees', () => {
    const rec = KANSAS_LEGISLATORS.find((r) => r.committees.length > 0)!;
    const personId = buildLegislatorId(rec.chamber, rec.district);
    const assignments = getCommitteeAssignmentsLocal(personId);
    const names = assignments.map((a) => a.name);
    for (const membership of rec.committees) {
      expect(names).toContain(membership.name);
    }
  });
});
