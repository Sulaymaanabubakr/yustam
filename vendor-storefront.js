import { db } from './firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const vendorId = document.body?.dataset?.vendorId?.trim() || '';

const loader = document.getElementById('storefrontLoader');
const hero = document.getElementById('storefrontHero');
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

const slugifyPlan = (plan) => {
  if (!plan) return 'free';
  return String(plan)
    .toLowerCase()
    .replace(/plan/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'free';
};

const formatPlanLabel = (plan) => {
  if (!plan) return 'Free Plan';
  const label = String(plan).trim();
  return /plan$/i.test(label) ? label : `${label} Plan`;
};

const normaliseVerification = (value) => {
  if (value === true || value === 1 || value === '1') return 'verified';
  if (value === false || value === 0 || value === '0' || value === null) return 'unverified';
  const candidate = String(value).trim().toLowerCase();
  if (['verified', 'approved', 'active', 'complete', 'completed', 'yes', 'true'].includes(candidate)) {
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

const initialsFromName = (value) => {
  const safe = String(value || '').trim();
  if (!safe) return 'VN';
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const setLoader = (show) => {
  if (!loader) return;
  loader.classList.toggle('show', Boolean(show));
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

const applyVendorProfile = (vendor) => {
  if (!vendor) return;

  const displayName =
    vendor.displayName ||
    vendor.businessName ||
    vendor.name ||
    `Vendor ${vendorId.slice(0, 6)}`;
  const businessName = vendor.businessName || '';
  const planLabel = formatPlanLabel(vendor.plan || vendor.planLabel || 'Free');
  const planSlug = slugifyPlan(vendor.plan || vendor.planLabel);
  const verificationState = normaliseVerification(
    vendor.verificationStatus ||
      vendor.verification_state ||
      vendor.verificationStage ||
      vendor.verification,
  );
  const verificationText = verificationLabel(verificationState);
  const locationParts = [
    vendor.city,
    vendor.state,
    vendor.region,
    vendor.location,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
  const primaryLocation = locationParts.length ? locationParts[0] : '';
  const bio =
    vendor.bio ||
    vendor.about ||
    vendor.description ||
    'This vendor is gearing up to share their story and build trust with buyers.';
  const email = (vendor.email || vendor.contactEmail || '').trim();
  const phone = (vendor.phone || vendor.contactPhone || '').trim();
  const website = (vendor.website || vendor.site || '').trim();
  const profilePhoto = (vendor.profilePhoto || vendor.logo || '').trim();

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
    planBadge.className = `badge plan plan-${planSlug}`;
  }

  if (verificationBadge) {
    verificationBadge.textContent = verificationText;
    verificationBadge.className = `badge verification-${verificationState}`;
  }

  if (locationEl) {
    locationEl.textContent = primaryLocation ? `Based in ${primaryLocation}` : '';
    locationEl.hidden = !primaryLocation;
  }

  const contactAvailable = Boolean(email || phone || website);
  if (aboutSection) aboutSection.hidden = !contactAvailable && !bio;
  if (bioEl) bioEl.textContent = bio;

  safeLink(emailEl, email || 'Unavailable', email ? `mailto:${email}` : null);
  safeLink(phoneEl, phone || 'Unavailable', phone ? `tel:${phone.replace(/\s+/g, '')}` : null);
  safeLink(
    websiteEl,
    website || 'Unavailable',
    website ? (website.startsWith('http') ? website : `https://${website}`) : null,
  );

  if (primaryAction) {
    if (email) {
      primaryAction.href = `mailto:${email}`;
      primaryAction.innerHTML = '<i class="ri-mail-send-line" aria-hidden="true"></i>Email Vendor';
    } else if (phone) {
      primaryAction.href = `tel:${phone.replace(/\s+/g, '')}`;
      primaryAction.innerHTML = '<i class="ri-phone-line" aria-hidden="true"></i>Call Vendor';
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
    createdAt,
    image,
    location,
  } = listing;

  const card = document.createElement('article');
  card.className = 'listing-card';
  card.setAttribute('role', 'listitem');

  const productLink = `product.php?id=${encodeURIComponent(id)}&vendorId=${encodeURIComponent(vendorId)}`;

  card.innerHTML = `
    <a href="${productLink}">
      <img src="${image}" alt="${title}">
    </a>
    <div class="listing-body">
      <div class="listing-title">${title}</div>
      <div class="listing-price">${formatCurrency(price)}</div>
      <div class="listing-meta">
        <span>${category || 'Marketplace'}</span>
        <span>${location || 'Nigeria'}</span>
      </div>
      <a class="listing-cta" href="${productLink}">
        <i class="ri-arrow-right-line"></i>
        View details
      </a>
    </div>
  `;

  if (createdAt instanceof Date) {
    card.dataset.createdAt = createdAt.toISOString();
  }

  return card;
};

const renderListings = (listingDocs = []) => {
  if (!listingsGrid || !listingsCountEl || !listingsEmptyEl) return;

  listingsGrid.innerHTML = '';

  if (!listingDocs.length) {
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

const mapListingSnapshot = (docSnap) => {
  const data = docSnap.data() || {};
  const createdAt =
    (data.createdAt && typeof data.createdAt.toDate === 'function' && data.createdAt.toDate()) ||
    (docSnap.createTime && typeof docSnap.createTime.toDate === 'function' && docSnap.createTime.toDate()) ||
    null;

  const imageSources = Array.isArray(data.images) ? data.images : data.imageUrls;
  const image =
    (Array.isArray(imageSources) && imageSources.find((src) => typeof src === 'string' && src.trim())) ||
    (typeof data.image === 'string' && data.image.trim()) ||
    'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80';

  const location =
    data.city ||
    data.state ||
    data.location ||
    data.vendorLocation ||
    'Nigeria';

  return {
    id: docSnap.id,
    title: data.title || data.productName || 'Marketplace Listing',
    price: data.price ?? data.amount ?? 0,
    category: data.category || 'Marketplace',
    createdAt,
    image,
    location,
  };
};

const showHeroError = (message) => {
  if (nameEl) nameEl.textContent = message;
  if (businessEl) businessEl.hidden = true;
  if (planBadge) planBadge.textContent = 'Unavailable';
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
    const vendorSnap = await getDoc(doc(db, 'vendors', vendorId));
    if (!vendorSnap.exists()) {
      showHeroError('Vendor not found');
      return;
    }

    applyVendorProfile(vendorSnap.data());

    const listingsQuery = query(
      collection(db, 'listings'),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc'),
    );

    const listingSnaps = await getDocs(listingsQuery).catch(async (error) => {
      console.warn('[storefront] listing query failed, retrying without orderBy', error);
      const fallbackQuery = query(collection(db, 'listings'), where('vendorId', '==', vendorId));
      return getDocs(fallbackQuery);
    });

    const listings = listingSnaps.docs.map(mapListingSnapshot);
    listings.sort((a, b) => {
      const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return timeB - timeA;
    });

    renderListings(listings);
  } catch (error) {
    console.error('[storefront] load failed', error);
    showHeroError('Unable to load vendor storefront');
  } finally {
    setLoader(false);
  }
};

loadVendorStorefront();
