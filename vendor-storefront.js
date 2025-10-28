import { appendVerificationBadge, verificationPlanLabel } from './verification-badge.js';
import { db } from './firebase.js';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const vendorId = document.body?.dataset?.vendorId?.trim() || '';

const loader = document.getElementById('storefrontLoader');
const avatarEl = document.getElementById('storefrontAvatar');
const nameEl = document.getElementById('storefrontName');
const businessEl = document.getElementById('storefrontBusiness');
const planBadge = document.getElementById('storefrontPlan');
const verificationBadge = document.getElementById('storefrontVerification');
const locationEl = document.getElementById('storefrontLocation');
const primaryAction = document.getElementById('storefrontPrimaryAction');
const aboutSection = document.getElementById('storefrontAbout');
const bioEl = document.getElementById('storefrontBio');
const emailEl = document.getElementById('storefrontEmail');
const phoneEl = document.getElementById('storefrontPhone');
const websiteEl = document.getElementById('storefrontWebsite');
const listingsGrid = document.getElementById('listingsGrid');
const listingsCountEl = document.getElementById('listingsCount');
const listingsEmptyEl = document.getElementById('listingsEmpty');
let firestoreListingsAttempted = false;

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

const initialsFromName = (value) => {
  const safe = String(value || '').trim();
  if (!safe) return 'VN';
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const setLoader = (show) => {
  loader?.classList.toggle('show', Boolean(show));
};

const safeLink = (element, value, href) => {
  if (!element) return;
  if (!value || !href) {
    element.textContent = 'Unavailable';
    element.removeAttribute('href');
    element.setAttribute('aria-disabled', 'true');
    element.style.pointerEvents = 'none';
    element.style.opacity = '0.6';
    return;
  }
  element.textContent = value;
  element.href = href;
  element.removeAttribute('aria-disabled');
  element.style.pointerEvents = '';
  element.style.opacity = '';
};

const clearBadges = (host) => {
  host?.querySelectorAll('.verification-badge').forEach((badge) => badge.remove());
};

const showListingsLoading = () => {
  if (listingsCountEl) {
    listingsCountEl.textContent = 'Loading listings...';
  }
  if (listingsEmptyEl) {
    listingsEmptyEl.hidden = true;
  }
};

const toStringId = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
};

const collectVendorIdentifiers = (vendor = {}) => {
  const identifiers = new Set();
  const add = (candidate) => {
    const value = toStringId(candidate);
    if (value) {
      identifiers.add(value);
    }
  };

  add(vendorId);
  add(document.body?.dataset?.vendorUid);
  add(vendor.vendorUid);
  add(vendor.firebaseUid);
  add(vendor.uid);
  add(vendor.id);
  add(vendor.sql?.vendor_uid);
  add(vendor.sql?.firebase_uid);
  add(vendor.firestore?.id);
  add(vendor.firestore?.uid);
  add(vendor.firestore?.vendorUid);
  add(vendor.firestore?.firebaseUid);

  return Array.from(identifiers);
};

const pickListingImage = (data = {}) => {
  const images = Array.isArray(data.images) ? data.images : [];
  if (images.length) {
    const match = images.find((entry) => typeof entry === 'string' && entry.trim());
    if (match) return match;
  }

  const imageUrls = Array.isArray(data.imageUrls) ? data.imageUrls : [];
  if (imageUrls.length) {
    const match = imageUrls.find((entry) => typeof entry === 'string' && entry.trim());
    if (match) return match;
  }

  if (typeof data.image === 'string' && data.image.trim()) {
    return data.image.trim();
  }

  if (typeof data.coverImage === 'string' && data.coverImage.trim()) {
    return data.coverImage.trim();
  }

  return '';
};

const normaliseListingTitle = (data = {}) => {
  const candidates = [
    data.title,
    data.productTitle,
    data.productName,
    data.listingTitle,
    data.name,
    data.type,
    data.itemType,
  ];
  const match = candidates.find((value) => typeof value === 'string' && value.trim());
  return match ? match.trim() : 'Marketplace Listing';
};

const parsePrice = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const toIsoDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date?.getTime?.()) ? null : date.toISOString();
  }
  if (value.seconds) {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return null;
};

const normaliseFirestoreListing = (doc) => {
  const data = (typeof doc.data === 'function' ? doc.data() : doc) || {};
  return {
    id: doc.id || data.id || '',
    title: normaliseListingTitle(data),
    price: parsePrice(data.price ?? data.amount),
    category: typeof data.category === 'string' ? data.category : '',
    subcategory: typeof data.subcategory === 'string' ? data.subcategory : '',
    status: typeof data.status === 'string' ? data.status : '',
    image: pickListingImage(data),
    location:
      typeof data.location === 'string' && data.location.trim()
        ? data.location.trim()
        : [data.vendorLocation, data.city, data.state]
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean)
            .join(', '),
    createdAt: toIsoDate(data.createdAt ?? data.created_at ?? doc.createTime ?? null),
  };
};

const fetchFirestoreListings = async (vendor) => {
  if (firestoreListingsAttempted) return null;
  firestoreListingsAttempted = true;

  const identifiers = collectVendorIdentifiers(vendor);
  if (!identifiers.length) {
    return null;
  }

  showListingsLoading();

  const candidateFields = ['vendorUid', 'vendorUID', 'vendorFirebaseUid', 'vendorId', 'vendor_id', 'vendorID'];
  const listingsRef = collection(db, 'listings');
  const seen = new Set();
  const aggregated = [];

  const runQuery = async (field, candidate) => {
    const baseQuery = [where(field, '==', candidate), limit(36)];
    try {
      const ordered = query(listingsRef, ...baseQuery, orderBy('createdAt', 'desc'));
      return await getDocs(ordered);
    } catch (error) {
      if (error?.code === 'failed-precondition') {
        const fallback = query(listingsRef, ...baseQuery);
        return await getDocs(fallback);
      }
      throw error;
    }
  };

  for (const candidate of identifiers) {
    for (const field of candidateFields) {
      try {
        const snapshot = await runQuery(field, candidate);
        snapshot.forEach((doc) => {
          if (seen.has(doc.id)) return;
          const listing = normaliseFirestoreListing(doc);
          seen.add(listing.id || doc.id);
          aggregated.push(listing);
        });
      } catch (error) {
        console.warn('[storefront] Firestore query failed', { field, candidate, error });
      }
    }
  }

  if (aggregated.length) {
    aggregated.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  return aggregated;
};

const slugify = (value, fallback = 'free') => {
  if (!value) return fallback;
  return (
    String(value)
      .toLowerCase()
      .replace(/plan$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || fallback
  );
};

const formatPlanLabel = (plan) => {
  if (!plan) return 'Free Plan';
  const label = String(plan).trim();
  return /plan$/i.test(label) ? label : `${label} Plan`;
};

const normaliseVerification = (value) => {
  const candidate = String(value ?? '').trim().toLowerCase();
  if (['verified', 'approved', 'active', 'complete', 'completed', 'yes', 'true', '1'].includes(candidate)) {
    return 'verified';
  }
  if (['pending', 'submitted', 'processing', 'under review', 'under_review', 'in_review', 'in-review'].includes(candidate)) {
    return 'pending';
  }
  if (['rejected', 'declined', 'failed', 'needs_changes', 'needs update', 'needs-update'].includes(candidate)) {
    return 'rejected';
  }
  return 'unverified';
};

const verificationLabel = (state) => {
  switch (state) {
    case 'verified':
      return 'Verified Vendor';
    case 'pending':
      return 'Pending Review';
    case 'rejected':
      return 'Needs Changes';
    default:
      return 'Not Verified';
  }
};

const applyVendorProfile = (vendor) => {
  if (!vendor) return;

  const displayName =
    vendor.displayName ||
    vendor.businessName ||
    vendor.name ||
    `Vendor ${vendorId.slice(0, 6)}`;
  const businessName = vendor.businessName || '';
  const planLabel = vendor.planLabel || formatPlanLabel(vendor.plan);
  const planSlug = vendor.planSlug || slugify(planLabel);
  const verificationState = normaliseVerification(vendor.verificationState || vendor.verificationLabel);
  const verificationText = vendor.verificationLabel || verificationLabel(verificationState);
  const isVerified = verificationState === 'verified';

  document.body.dataset.vendorPlan = vendor.plan || planLabel;
  document.body.dataset.vendorPlanLabel = planLabel;
  document.body.dataset.vendorPlanSlug = planSlug;
  document.body.dataset.vendorVerified = verificationState;
  if (vendor.vendorUid) {
    document.body.dataset.vendorUid = vendor.vendorUid;
  }
  if (vendor.firebaseUid) {
    document.body.dataset.vendorFirebaseUid = vendor.firebaseUid;
  }

  const locationParts = [
    vendor.city,
    vendor.state,
    vendor.country,
    vendor.location,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
  const primaryLocation = locationParts.length ? locationParts.join(', ') : '';

  const bio =
    vendor.about ||
    vendor.bio ||
    vendor.description ||
    'This vendor is gearing up to share their story and build trust with buyers.';
  const email = (vendor.email || vendor.contactEmail || '').trim();
  const phone = (vendor.phone || vendor.contactPhone || '').trim();
  const website = (vendor.website || vendor.siteUrl || '').trim();
  const profilePhoto = (vendor.avatar || vendor.profilePhoto || vendor.logo || '').trim();

  if (avatarEl) {
    if (profilePhoto) {
      avatarEl.innerHTML = `<img src="${profilePhoto}" alt="${displayName} logo">`;
    } else {
      avatarEl.innerHTML = `<span>${initialsFromName(displayName)}</span>`;
    }
  }

  if (nameEl) nameEl.textContent = displayName;
  if (businessEl) {
    businessEl.textContent = businessName;
    businessEl.hidden = businessName === '';
  }

  if (planBadge) {
    planBadge.textContent = planLabel;
    planBadge.className = `badge plan plan-${planSlug || 'free'}`;
  }

  if (verificationBadge) {
    verificationBadge.textContent = verificationText;
    verificationBadge.className = `badge verification-${verificationState}`;
  }

  if (nameEl) {
    clearBadges(nameEl);
    if (isVerified) {
      appendVerificationBadge(nameEl, planLabel, {
        verified: true,
        roleLabel: verificationPlanLabel(planLabel),
      });
    }
  }

  if (businessEl && businessName) {
    clearBadges(businessEl);
    if (isVerified) {
      appendVerificationBadge(businessEl, planLabel, {
        verified: true,
        roleLabel: verificationPlanLabel(planLabel),
      });
    }
  }

  if (locationEl) {
    locationEl.textContent = primaryLocation ? `Based in ${primaryLocation}` : '';
    locationEl.hidden = !primaryLocation;
  }

  if (aboutSection) {
    const contactsAvailable = Boolean(email || phone || website);
    aboutSection.hidden = !contactsAvailable && !bio;
  }
  if (bioEl) {
    bioEl.textContent = bio;
  }

  safeLink(emailEl, email || 'Unavailable', email ? `mailto:${email}` : null);
  safeLink(phoneEl, phone || 'Unavailable', phone ? `tel:${phone.replace(/\s+/g, '')}` : null);
  safeLink(
    websiteEl,
    website || 'Unavailable',
    website ? (website.startsWith('http') ? website : `https://${website}`) : null,
  );

  if (primaryAction) {
    primaryAction.removeAttribute('target');
    primaryAction.removeAttribute('rel');
    if (email) {
      primaryAction.href = `mailto:${email}`;
      primaryAction.innerHTML = '<i class="ri-mail-send-line" aria-hidden="true"></i>Email Vendor';
    } else if (phone) {
      primaryAction.href = `tel:${phone.replace(/\s+/g, '')}`;
      primaryAction.innerHTML = '<i class="ri-phone-line" aria-hidden="true"></i>Call Vendor';
    } else if (website) {
      primaryAction.href = website.startsWith('http') ? website : `https://${website}`;
      primaryAction.target = '_blank';
      primaryAction.rel = 'noopener';
      primaryAction.innerHTML = '<i class="ri-external-link-line" aria-hidden="true"></i>Visit Website';
    } else {
      primaryAction.href = 'shop.html';
      primaryAction.innerHTML = '<i class="ri-store-2-line" aria-hidden="true"></i>Browse Marketplace';
    }
  }
};

const buildListingCard = (listing) => {
  const {
    id,
    title,
    price,
    category,
    subcategory,
    createdAt,
    image,
    location,
  } = listing;

  const createdDate = createdAt ? new Date(createdAt) : null;
  const createdLabel = createdDate
    ? createdDate.toLocaleDateString('en-NG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';
  const productLink = `product.php?id=${encodeURIComponent(id)}`;
  const priceLabel = price !== null && price !== undefined ? formatCurrency(price) : 'Price on request';

  const card = document.createElement('article');
  card.className = 'listing-card';
  card.setAttribute('role', 'listitem');
  card.innerHTML = `
    <div class="listing-cover">
      <img src="${image || 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80'}" alt="${title} image"/>
    </div>
    <div class="listing-body">
      <div>
        <span class="listing-category">${category || 'Marketplace'}${subcategory ? ` - ${subcategory}` : ''}</span>
        <h3>${title}</h3>
      </div>
      <div>
        <span class="listing-price">${priceLabel}</span>
        <small class="listing-location">${location || 'Nationwide'}</small>
        ${createdLabel ? `<small class="listing-date">Posted ${createdLabel}</small>` : ''}
      </div>
      <a class="listing-cta" href="${productLink}">
        <i class="ri-arrow-right-line"></i>
        View details
      </a>
    </div>
  `;

  return card;
};

const renderListings = (listingDocs = []) => {
  if (!listingsGrid || !listingsCountEl || !listingsEmptyEl) return;

  listingsGrid.innerHTML = '';

  if (!Array.isArray(listingDocs) || listingDocs.length === 0) {
    listingsEmptyEl.hidden = false;
    listingsCountEl.textContent = '0 listings';
    return;
  }

  listingsEmptyEl.hidden = true;
  const plural = listingDocs.length === 1 ? 'listing' : 'listings';
  listingsCountEl.textContent = `${listingDocs.length} ${plural}`;

  listingDocs.forEach((listing) => {
    listingsGrid.appendChild(buildListingCard(listing));
  });
};

const showHeroError = (message) => {
  if (nameEl) nameEl.textContent = message;
  if (businessEl) businessEl.hidden = true;
  if (planBadge) {
    planBadge.textContent = 'Unavailable';
    planBadge.className = 'badge plan plan-free';
  }
  if (verificationBadge) {
    verificationBadge.textContent = 'Unknown';
    verificationBadge.className = 'badge verification-unverified';
  }
  if (primaryAction) {
    primaryAction.href = 'shop.html';
    primaryAction.innerHTML = '<i class="ri-store-2-line" aria-hidden="true"></i>Browse Marketplace';
  }
  if (aboutSection) aboutSection.hidden = true;
  renderListings([]);
};

const loadVendorStorefront = async () => {
  if (!vendorId) {
    showHeroError('Vendor not specified');
    return;
  }

  setLoader(true);
  try {
    const response = await fetch(`vendor-storefront-data.php?id=${encodeURIComponent(vendorId)}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || 'Unable to load vendor storefront.');
    }

    applyVendorProfile(payload.vendor || {});
    const initialListings = Array.isArray(payload.listings) ? payload.listings : [];
    renderListings(initialListings);

    if (!initialListings.length) {
      try {
        const firestoreListings = await fetchFirestoreListings(payload.vendor || {});
        if (Array.isArray(firestoreListings) && firestoreListings.length) {
          renderListings(firestoreListings);
        } else if (!initialListings.length) {
          renderListings([]);
        }
      } catch (firestoreError) {
        console.error('[storefront] Firestore fallback failed', firestoreError);
        if (!initialListings.length) {
          renderListings([]);
        }
      }
    }
  } catch (error) {
    console.error('[storefront] load failed', error);
    showHeroError(error.message || 'Unable to load vendor storefront');
  } finally {
    setLoader(false);
  }
};

loadVendorStorefront();
