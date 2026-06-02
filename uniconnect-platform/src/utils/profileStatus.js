// Roles that are always considered verified by the system, regardless of verification_status in DB.
const SYSTEM_VERIFIED_ROLES = new Set(["super_admin", "university_admin"]);

export function isSystemVerifiedRole(role) {
  return SYSTEM_VERIFIED_ROLES.has(role);
}

export function getProfileVerificationStatus(profile) {
  if (isSystemVerifiedRole(profile?.role)) return "verified";
  return profile?.verification_status || "pending";
}

export function isProfileVerified(profile) {
  return getProfileVerificationStatus(profile) === "verified";
}

export function getSubmitVerificationStatus(profile) {
  if (isSystemVerifiedRole(profile?.role) || profile?.verification_status === "verified") return "verified";
  return "pending";
}

export function normalizeProfileVerification(profile) {
  if (!profile) return profile;
  const verification_status = getProfileVerificationStatus(profile);
  return profile.verification_status === verification_status
    ? profile
    : { ...profile, verification_status };
}
