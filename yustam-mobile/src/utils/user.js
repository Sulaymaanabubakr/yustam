const GENERIC_UID_KEYS = [
  'uid',
  'firebaseUid',
  'firebaseUID',
  'firebase_id',
  'firebaseId',
  'firebaseID',
  'userId',
  'user_id',
  'id',
];

const VENDOR_UID_KEYS = [
  'vendorUid',
  'vendorUID',
  'vendor_uid',
  'vendorFirebaseUid',
  'vendorFirebaseUID',
  'vendor_firebase_uid',
  'vendorId',
  'vendorID',
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

const buildCandidateKeys = (source, options = {}) => {
  const roleHint = options.roleHint || String(source?.role || '').toLowerCase();
  const preferVendor = options.preferVendor ?? roleHint === 'vendor';
  if (preferVendor) {
    return [...VENDOR_UID_KEYS, ...GENERIC_UID_KEYS];
  }
  return [...GENERIC_UID_KEYS, ...VENDOR_UID_KEYS];
};

export const resolveUserUid = (source, fallback = '', options = {}) => {
  let resolvedFallback = fallback;
  let effectiveOptions = options;

  if (resolvedFallback && typeof resolvedFallback === 'object') {
    effectiveOptions = resolvedFallback;
    resolvedFallback = '';
  } else if (typeof resolvedFallback === 'string') {
    const normalised = resolvedFallback.toLowerCase();
    if (normalised === 'vendor' || normalised === 'buyer') {
      effectiveOptions = { ...effectiveOptions, roleHint: normalised };
      resolvedFallback = '';
    }
  }

  if (!source || typeof source !== 'object') {
    return resolvedFallback;
  }

  const candidateKeys = buildCandidateKeys(source, effectiveOptions);

  for (const key of candidateKeys) {
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
    const resolved = resolveUserUid(nestedValue, resolvedFallback, effectiveOptions);
    if (resolved) {
      return resolved;
    }
  }

  return resolvedFallback;
};

export default resolveUserUid;

