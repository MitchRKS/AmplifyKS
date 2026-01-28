/**
 * Committee Email Configuration
 *
 * This file maps committee names to their recipient email addresses.
 * Add or update committee email addresses here.
 *
 * The committee names should match exactly as they appear from the LegiScan API,
 * including the chamber prefix (e.g., "Senate Judiciary" or "House Education").
 */

export const COMMITTEE_EMAILS: Record<string, string> = {
  // Senate Committees
  "Senate Committee on Agriculture and Natural Resources":
    "S.Agriculture@senate.ks.gov",
  "Senate Committee on Assessment and Taxation":
    "Assessment.Taxation@senate.ks.gov",
  "Senate Committee on Commerce": "Commerce@senate.ks.gov",
  "Senate Committee on Confirmation Oversight": "kaleb.hagg@senate.ks.gov",
  "Senate Committee on Education": "S.Education@senate.ks.gov",
  "Senate Committee on Federal and State Affairs":
    "S.Fed.State.Affairs@senate.ks.gov",
  "Senate Committee on Financial Institutions and Insurance":
    "S.Financial.Insurance@senate.ks.gov",
  "Senate Committee on Government Efficiency": " kansascoge@senate.ks.gov",
  "Senate Committee on Judiciary": "S.Judiciary@senate.ks.gov",
  "Senate Committee on Local Government, Transparency and Ethics":
    "Transparency@senate.ks.gov",
  "Senate Committee on Public Health and Welfare":
    "Public.Health.Welfare@senate.ks.gov",
  "Senate Committee on Transportation": "S.Transportation@senate.ks.gov",
  "Senate Committee on Utilities": "S.Utilities@senate.ks.gov",
  "Senate Committee on Ways and Means": "Ways.Means@senate.ks.gov",

  // House Committees
  "House Committee on Agriculture and Natural Resources":
    "H.Agriculture@house.ks.gov",
  "House Committee on Agriculture and Natural Resources Budget":
    "Ag.NatRes.Budget@house.ks.gov",
  "House Committee on Appropriations": "Appropriations@house.ks.gov",
  "House Committee on Child Welfare and Foster Care":
    "Child.Welfare@house.ks.gov",
  "House Committee on Commerce, Labor and Economic Development":
    "Commerce.Labor.Econ@house.ks.gov",
  "House Committee on Corrections and Juvenile Justice":
    "Corrections.Juv.Justice@house.ks.gov",
  "House Committee on Education": "H.Education@house.ks.gov",
  "House Committee on Elections": "H.Elections@house.ks.gov",
  "House Committee on Energy, Utilities and Telecommunications":
    "H.Utilitiesm@house.ks.gov",
  "House Committee on Federal and State Affairs":
    "H.Fed.State.Affairs@house.ks.gov",
  "House Committee on Financial Institutions and Pensions":
    "H.Financial@house.ks.gov",
  "House Committee on General Government Budget":
    "Gen.Govt.Budget@house.ks.gov",
  "House Committee on Health and Human Services":
    "Health.Human.Services@house.ks.gov",
  "House Committee on Higher Education Budget": "Higher.Ed.Budget@house.ks.gov",
  "House Committee on Insurance": "H.Insurance@house.ks.gov",
  "House Committee on Judiciary": "H.Judiciary@house.ks.gov",
  "House Committee on K-12 Education Budget": "K.12.Budget@house.ks.gov",
  "House Committee on Legislative Modernization":
    "Leg.Modernization@house.ks.gov",
  "House Committee on Local Government": "H.Local.Govt@house.ks.gov",
  "House Committee on Social Services Budget": "Social.Svc.Budget@house.ks.gov",
  "House Committee on Taxation": "mitchruckerks@gmail.com",
  "House Committee on Transportation": "H.Transportation@house.ks.gov",
  "House Committee on Transportation and Public Safety Budget":
    "Transportation.Budget@house.ks.gov",
  "House Committee on Veterans and Military Affairs":
    "Veterans.Military@house.ks.gov",
  "House Committee on Water": "Water@house.ks.gov",
  "House Committee on Welfare Reform": "Welfare.Reform@house.ks.gov",

  // Add more committees as needed
  // 'Committee Name': 'email@example.com',
};

/**
 * Get recipient email for a committee
 * Returns the email address, or undefined if committee not found
 */
export function getCommitteeEmail(committeeName: string): string | undefined {
  return COMMITTEE_EMAILS[committeeName];
}

/**
 * Check if a committee has a configured email address
 */
export function hasCommitteeEmail(committeeName: string): boolean {
  const email = COMMITTEE_EMAILS[committeeName];
  return typeof email === "string" && email.length > 0;
}

/**
 * Get all configured committee names
 */
export function getAllCommitteeNames(): string[] {
  return Object.keys(COMMITTEE_EMAILS);
}
