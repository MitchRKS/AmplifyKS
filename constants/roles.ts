/**
 * Roles that count as "admin" on the client. MUST stay in sync with the
 * `isAdmin()` helper in firestore.rules (`role in ['admin', 'super_admin']`)
 * so UI gating and security rules never disagree — e.g. a super_admin who the
 * rules let write must also see the admin controls.
 */
export const ADMIN_ROLES = ['admin', 'super_admin'] as const;

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin' || role === 'super_admin';
}
