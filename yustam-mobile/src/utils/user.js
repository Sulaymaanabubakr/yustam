const UID_CANDIDATE_KEYS = [
  'uid',
  'firebaseUid',
  'firebaseUID',
  'firebase_id',
  'firebaseId',
  'firebaseID',
  'vendorUid',
  'vendorUID',
  'vendor_uid',
  'vendorFirebaseUid',
  'vendorFirebaseUID',
  'vendor_firebase_uid',
  'vendorId',
  'vendorID',
  'id',
];

const normalizeCandidate = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return '';
};

export const resolveUserUid = (source, fallback = '') => {
  if (!source || typeof source !== 'object') {
    return fallback;
  }

  for (const key of UID_CANDIDATE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const candidate = normalizeCandidate(source[key]);
      if (candidate) {
        return candidate;
      }
    }
  }

  const nestedKeys = ['profile', 'vendorProfile', 'vendor', 'metadata', 'meta', 'auth', 'data'];
  for (const nestedKey of nestedKeys) {
    const nestedValue = source[nestedKey];
    const resolved = resolveUserUid(nestedValue);
    if (resolved) {
      return resolved;
    }
  }

  return fallback;
};

export default resolveUserUid;

