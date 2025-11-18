import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

const ACTIVE_STATUSES = new Set(['approved', 'active', 'live', 'published', 'visible', 'listed']);
const PENDING_STATUSES = new Set([
  'pending',
  'draft',
  'processing',
  'in_review',
  'in-review',
  'submitted',
  'waiting',
]);
const SOLD_STATUSES = new Set(['sold', 'completed', 'fulfilled']);
const REJECTED_STATUSES = new Set([
  'rejected',
  'failed',
  'removed',
  'archived',
  'disabled',
  'suspended',
  'deleted',
]);

const normaliseStatus = (value) => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
};

const chunkArray = (values = [], size = 10) => {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const extractNumericId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const cleaned = String(value).replace(/[^\d]/g, '');
  if (!cleaned) {
    return null;
  }
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
};

const normaliseUid = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

export const collectVendorIdentifiers = (user = {}, profile = {}) => {
  const uidCandidates = new Set();
  const pushUid = (value) => {
    const trimmed = normaliseUid(value);
    if (trimmed) {
      uidCandidates.add(trimmed);
    }
  };

  const tryVendors = (source) => {
    if (!source || typeof source !== 'object') {
      return;
    }
    pushUid(source.vendorUid);
    pushUid(source.vendor_uid);
    pushUid(source.vendorFirebaseUid);
    pushUid(source.vendorFirebaseUID);
    pushUid(source.firebaseUid);
    pushUid(source.uid);
  };

  tryVendors(user);
  tryVendors(user?.vendor);
  tryVendors(profile);

  let vendorId = null;
  const setId = (candidate) => {
    const numeric = extractNumericId(candidate);
    if (numeric) {
      vendorId = vendorId || numeric;
    }
  };

  [
    user?.vendorId,
    user?.vendor?.vendorId,
    user?.vendor?.id,
    profile?.vendorId,
    profile?.id,
    profile?.vendorNumericId,
  ].forEach(setId);

  return {
    vendorUidCandidates: Array.from(uidCandidates),
    vendorId,
  };
};

const processSnapshot = (snapshot, seen, stats) => {
  snapshot.forEach((docSnap) => {
    if (seen.has(docSnap.id)) {
      return;
    }
    seen.add(docSnap.id);
    const data = docSnap.data() || {};
    const status = normaliseStatus(data.status || data.status_raw || data.state || data.syncStatus);
    stats.total += 1;
    if (ACTIVE_STATUSES.has(status)) {
      stats.active += 1;
      return;
    }
    if (SOLD_STATUSES.has(status)) {
      stats.sold += 1;
      return;
    }
    if (REJECTED_STATUSES.has(status)) {
      stats.rejected += 1;
      return;
    }
    if (PENDING_STATUSES.has(status)) {
      stats.pending += 1;
      return;
    }
    stats.pending += 1;
  });
};

export const fetchVendorListingStats = async ({ vendorUidCandidates = [], vendorId = null } = {}) => {
  const stats = {
    total: 0,
    active: 0,
    pending: 0,
    sold: 0,
    rejected: 0,
  };
  const seen = new Set();
  const listingsRef = collection(db, 'listings');

  const uidValues = (vendorUidCandidates || []).map(normaliseUid).filter(Boolean);
  const uidChunks = chunkArray(uidValues, 10);
  // Query by vendorUid in chunks
  for (const chunk of uidChunks) {
    try {
      const snapshot = await getDocs(query(listingsRef, where('vendorUid', 'in', chunk)));
      processSnapshot(snapshot, seen, stats);
    } catch (error) {
      console.warn('Failed to fetch listings for vendor chunk', chunk, error);
    }
  }

  const numericVendorId = extractNumericId(vendorId);
  if (numericVendorId) {
    try {
      const snapshot = await getDocs(query(listingsRef, where('vendorId', '==', numericVendorId)));
      processSnapshot(snapshot, seen, stats);
    } catch (error) {
      console.warn('Failed to fetch listings for vendorId', numericVendorId, error);
    }
  }

  return stats;
};

