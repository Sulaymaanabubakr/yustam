import { appendVerificationBadge, verificationPlanLabel } from './verification-badge.js';

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

const hideEmptyState = () => {
  if (!listingsEmptyEl) return;
  listingsEmptyEl.hidden = true;
  listingsEmptyEl.setAttribute('hidden', '');
  listingsEmptyEl.style.display = 'none';
};

const showEmptyState = () => {
  if (!listingsEmptyEl) return;
  listingsEmptyEl.hidden = false;
  listingsEmptyEl.removeAttribute('hidden');
  listingsEmptyEl.style.display = '';
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

const tidyLocationPart = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/^\s*,+/, '').replace(/,\s*$/g, '').trim();
};

const buildPrimaryLocation = (vendor = {}) => {
  const rawParts = [vendor.city, vendor.state, vendor.country];

  if (Array.isArray(vendor.location)) {
    rawParts.push(...vendor.location);
  } else if (typeof vendor.location === 'string' && vendor.location.trim()) {
    rawParts.push(...vendor.location.split(','));
  }

  const seen = new Set();
  const cleaned = [];

  rawParts.forEach((part) => {
    const normalised = tidyLocationPart(part);
    if (!normalised) {
      return;
    }
    const key = normalised.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    cleaned.push(normalised);
  });

  if (cleaned.length === 0 && typeof vendor.location === 'string') {
    const fallback = tidyLocationPart(vendor.location);
    if (fallback) {
      cleaned.push(fallback);
    }
  }

  return cleaned.join(', ');
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

  const primaryLocation = buildPrimaryLocation(vendor);

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
  if (!listingsGrid) return;

  listingsGrid.innerHTML = '';

  if (!Array.isArray(listingDocs) || listingDocs.length === 0) {
    if (listingsCountEl) {
      listingsCountEl.textContent = '0 listings';
    }
    showEmptyState();
    return;
  }

  hideEmptyState();
  const plural = listingDocs.length === 1 ? 'listing' : 'listings';
  if (listingsCountEl) {
    listingsCountEl.textContent = `${listingDocs.length} ${plural}`;
  }

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
  } catch (error) {
    console.error('[storefront] load failed', error);
    showHeroError(error.message || 'Unable to load vendor storefront');
  } finally {
    setLoader(false);
  }
};

loadVendorStorefront();
