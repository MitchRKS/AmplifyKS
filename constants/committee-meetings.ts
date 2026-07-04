/**
 * Committee Meeting Information
 *
 * Keys are "${chamber} ${committeeName}" where committeeName matches exactly
 * what appears in the KANSAS_LEGISLATORS data (e.g. "Agriculture & Natural Resources").
 * Use getCommitteeMeeting(name, chamber) to look up a committee.
 */

export interface CommitteeMeetingInfo {
  day: string;
  time: string;
  room: string;
}

export const COMMITTEE_MEETINGS: Record<string, CommitteeMeetingInfo> = {
  // Senate Committees
  "Senate Agriculture & Natural Resources": {
    day: "Daily",
    time: "8:30 A.M.",
    room: "144-S",
  },
  "Senate Assessment & Taxation": {
    day: "Daily",
    time: "9:30 A.M.",
    room: "548-S",
  },
  "Senate Commerce": {
    day: "Daily",
    time: "1:30 P.M.",
    room: "159-S",
  },
  // "Senate Confirmation Oversight" meets on call, but no legislator in the
  // local data lists it as a committee assignment, so the app never shows it.
  // Re-add its entry here if the committee appears in the legislator data.
  "Senate Education": {
    day: "Daily",
    time: "1:30 P.M.",
    room: "144-S",
  },
  "Senate Federal & State Affairs": {
    day: "Daily",
    time: "10:30 A.M.",
    room: "144-S",
  },
  "Senate Financial Institutions & Insurance": {
    day: "Daily",
    time: "9:30 A.M.",
    room: "546-S",
  },
  "Senate Government Efficiency": {
    day: "Daily",
    time: "9:30 A.M.",
    room: "144-S",
  },
  "Senate Judiciary": {
    day: "Daily",
    time: "10:30 A.M.",
    room: "346-S",
  },
  "Senate Local Gov., Transparency, & Ethics": {
    day: "Daily",
    time: "9:30 A.M.",
    room: "142-S",
  },
  "Senate Public Health & Welfare": {
    day: "Daily",
    time: "8:30 A.M.",
    room: "142-S",
  },
  "Senate Transportation": {
    day: "Daily",
    time: "8:30 A.M.",
    room: "546-S",
  },
  "Senate Utilities": {
    day: "Daily",
    time: "1:30 P.M.",
    room: "548-S",
  },
  "Senate Ways & Means": {
    day: "Daily",
    time: "10:30 A.M.",
    room: "548-S",
  },

  // House Committees
  "House Agriculture & Natural Resources": {
    day: "Daily",
    time: "3:30 P.M.",
    room: "112-N",
  },
  "House Agriculture & Natural Resources Budget": {
    day: "Daily",
    time: "1:30 P.M.",
    room: "118-N",
  },
  "House Appropriations": {
    day: "Daily",
    time: "9:00 A.M.",
    room: "112-N",
  },
  "House Child Welfare & Foster Care": {
    day: "Monday/Wednesday",
    time: "1:30 P.M.",
    room: "152-S",
  },
  "House Commerce, Labor, & Economic Development": {
    day: "Daily",
    time: "1:30 P.M.",
    room: "346-S",
  },
  "House Corrections & Juvenile Justice": {
    day: "Daily",
    time: "1:30 P.M.",
    room: "546-S",
  },
  "House Education": {
    day: "Daily",
    time: "1:30 P.M.",
    room: "218-N",
  },
  "House Elections": {
    day: "Tuesday/Thursday",
    time: "3:30 P.M.",
    room: "218-N",
  },
  "House Energy, Utilities, & Telecommunications": {
    day: "Tuesday/Thursday",
    time: "9:00 A.M.",
    room: "582-N",
  },
  "House Federal & State Affairs": {
    day: "Daily",
    time: "9:00 A.M.",
    room: "346-S",
  },
  "House Financial Institutions & Pensions": {
    day: "Monday/Wednesday",
    time: "9:00 A.M.",
    room: "582-N",
  },
  "House General Government Budget": {
    day: "Daily",
    time: "3:30 P.M.",
    room: "281-N",
  },
  "House Health & Human Services": {
    day: "Daily",
    time: "1:30 P.M.",
    room: "112-N",
  },
  "House Higher Education Budget": {
    day: "Daily",
    time: "1:30 P.M.",
    room: "281-N",
  },
  "House Insurance": {
    day: "Monday/Wednesday",
    time: "3:30 P.M.",
    room: "218-N",
  },
  "House Judiciary": {
    day: "Daily",
    time: "3:30 P.M.",
    room: "582-N",
  },
  "House K-12 Education Budget": {
    day: "Daily",
    time: "3:30 P.M.",
    room: "546-S",
  },
  "House Legislative Modernization": {
    day: "Monday/Wednesday",
    time: "9:00 A.M.",
    room: "218-N",
  },
  "House Local Government": {
    day: "Monday/Wednesday",
    time: "9:00 A.M.",
    room: "281-N",
  },
  "House Social Services Budget": {
    day: "Daily",
    time: "3:30 P.M.",
    room: "152-S",
  },
  "House Taxation": {
    day: "Daily",
    time: "3:30 P.M.",
    room: "346-S",
  },
  "House Transportation": {
    day: "Daily",
    time: "1:30 P.M.",
    room: "582-N",
  },
  "House Transportation & Public Safety Budget": {
    day: "Daily",
    time: "3:30 P.M.",
    room: "118-N",
  },
  "House Veterans & Military": {
    day: "Tuesday/Thursday",
    time: "9:00 A.M.",
    room: "281-N",
  },
  "House Water": {
    day: "Tuesday/Thursday",
    time: "9:00 A.M.",
    room: "218-N",
  },
  "House Welfare Reform": {
    day: "Tuesday/Thursday",
    time: "1:30 P.M.",
    room: "152-S",
  },

  // Add more committees as needed
  // "${Chamber} ${committeeName}": { day: "", time: "", room: "" },
};

/**
 * Get meeting info for a committee by its name and chamber.
 * Returns undefined if no entry exists or all fields are empty.
 */
export function getCommitteeMeeting(
  name: string,
  chamber: string,
): CommitteeMeetingInfo | undefined {
  const info = COMMITTEE_MEETINGS[`${chamber} ${name}`];
  if (!info) return undefined;
  if (!info.day && !info.time && !info.room) return undefined;
  return info;
}

/**
 * Check if a committee has any meeting info configured.
 */
export function hasCommitteeMeeting(name: string, chamber: string): boolean {
  return getCommitteeMeeting(name, chamber) !== undefined;
}
