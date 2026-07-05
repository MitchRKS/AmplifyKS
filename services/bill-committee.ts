// Shared committee-name resolution for LegiScan bill data, used by both the
// bills list and the bill detail screen so they never disagree about what a
// bill's committee is (or whether it has one).

import { formatCommitteeName } from './legiscan';

export const COMMITTEE_UNAVAILABLE = 'No committee assigned yet';

export function extractCommitteeFromAction(action?: string): string | null {
  if (!action?.trim()) {
    return null;
  }

  const patterns = [
    /(?:Referred|Rereferred)\s+to\s+Committee\s+on\s+([^;,.]+)/i,
    /Withdrawn\s+from\s+Committee\s+on\s+([^;,.]+)/i,
    /by\s+Committee\s+on\s+([^;,.]+)/i,
    /Committee\s+on\s+([^;,.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = action.match(pattern);
    const committeeName = match?.[1]?.trim();
    if (committeeName) {
      return committeeName;
    }
  }

  return null;
}

export function resolveCommitteeName(
  committee?: { chamber?: string; name?: string } | null,
  fallbackAction?: string,
  fallbackChamber?: string,
): string {
  const committeeName = committee?.name?.trim();
  if (!committeeName) {
    const parsedFromAction = extractCommitteeFromAction(fallbackAction);
    if (!parsedFromAction) {
      return COMMITTEE_UNAVAILABLE;
    }
    return formatCommitteeName(fallbackChamber || 'Unknown', parsedFromAction);
  }
  if (committee?.chamber?.trim()) {
    return formatCommitteeName(committee.chamber, committeeName);
  }
  return committeeName;
}

export function findCommitteeActionFromHistory(
  history: { action?: string }[] | undefined,
): string | undefined {
  return history?.find((entry) => extractCommitteeFromAction(entry.action))?.action;
}
