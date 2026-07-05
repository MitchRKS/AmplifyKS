jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { getCommitteeAssignments } from '@/services/openstates';
import { KANSAS_LEGISLATORS } from '@/services/data/kansas-legislators';
import { buildLegislatorId, isLocalLegislatorId } from '@/services/kansas-legislators';

describe('getCommitteeAssignments', () => {
  const withCommittees = KANSAS_LEGISLATORS.find((r) => r.committees.length > 0)!;

  it('resolves committees for a local ks-state-* ID directly', async () => {
    const id = buildLegislatorId(withCommittees.chamber, withCommittees.district);
    const assignments = await getCommitteeAssignments({
      id,
      chamber: withCommittees.chamber,
      district: String(withCommittees.district),
      jurisdiction: 'Kansas',
    });
    expect(assignments.length).toBeGreaterThan(0);
  });

  it('resolves committees for a Kansas legislator found via address/location lookup, whose ID is a raw OpenStates ID rather than a local one', async () => {
    // Mirrors what transformPerson() produces from OpenStates' people.geo API:
    // a real ocd-person ID, not the app's synthetic ks-state-* format.
    const openStatesId = 'ocd-person/11111111-2222-3333-4444-555555555555';
    expect(isLocalLegislatorId(openStatesId)).toBe(false);

    const assignments = await getCommitteeAssignments({
      id: openStatesId,
      chamber: withCommittees.chamber,
      district: String(withCommittees.district),
      jurisdiction: 'Kansas',
    });

    expect(assignments.length).toBeGreaterThan(0);
    const names = assignments.map((a) => a.name);
    for (const membership of withCommittees.committees) {
      expect(names).toContain(membership.name);
    }
  });

  it('returns no assignments for non-Kansas or non-state-legislature officials', async () => {
    const federal = await getCommitteeAssignments({
      id: 'ocd-person/federal-example',
      chamber: 'U.S. Senate',
      district: '1',
      jurisdiction: 'United States',
    });
    expect(federal).toEqual([]);

    const unmatchedDistrict = await getCommitteeAssignments({
      id: 'ocd-person/no-such-district',
      chamber: 'Senate',
      district: '9999',
      jurisdiction: 'Kansas',
    });
    expect(unmatchedDistrict).toEqual([]);
  });
});
