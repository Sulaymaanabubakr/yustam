import { db } from './firebase.js';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const productGrid = document.getElementById('productGrid');
const emptyState = document.getElementById('emptyState');
const resultsCount = document.getElementById('resultsCount');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const showingText = document.getElementById('showingText');

const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const locationFilter = document.getElementById('locationFilter');
const priceFilter = document.getElementById('priceFilter');
const sortFilter = document.getElementById('sortFilter');
const filterBtn = document.getElementById('filterBtn');
const resetBtn = document.getElementById('resetBtn');

const ITEMS_PER_PAGE = 8;
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80';
const emptyStateDefaultText = emptyState ? emptyState.textContent.trim() : '';
const LOADING_TEXT = 'Loading marketplace listings...';
const ERROR_TEXT = 'We could not load marketplace listings right now. Please refresh to try again.';
const NO_LISTINGS_TEXT = 'No vendor listings are available yet. Vendors are adding their products soon.';

let currentPage = 1;
let allListings = [];
let filteredListings = [];
let rawListingDocs = [];
let vendorMap = new Map();
let listingsUnsubscribe = null;
let vendorsUnsubscribe = null;
let isLoadingListings = false;
let listingError = false;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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
    .replace(/(^-+|-+$)/g, '') || 'free';
};

const formatPlanLabel = (plan) => {
  if (!plan) return '';
  const trimmed = String(plan).trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  return lower.endsWith('plan') ? trimmed : `${trimmed} Plan`;
};

const normaliseVerificationState = (value) => {
  if (value === true || value === 1) return 'verified';
  if (value === false || value === 0 || value === null || value === undefined) return 'unverified';
  const norm = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'verified', 'approved', 'active', 'complete', 'completed'].includes(norm)) return 'verified';
  if (['pending', 'submitted', 'processing', 'under review', 'under_review', 'in_review', 'in-review'].includes(norm)) return 'pending';
  if (['rejected', 'declined', 'failed', 'needs_changes', 'needs update', 'needs-update', 'suspended', 'blocked'].includes(norm)) return 'unverified';
  return 'unverified';
};

const createPlanBadge = (plan) => {
  const label = formatPlanLabel(plan);
  if (!label) return '';
  const slug = slugifyPlan(plan);
  return `<span class="vendor-badge vendor-plan vendor-plan-${escapeHtml(slug)}"><i class="ri-vip-crown-fill" aria-hidden="true"></i>${escapeHtml(label)}</span>`;
};

const createVerificationBadge = (value) => {
  const state = normaliseVerificationState(value);
  if (state === 'verified') {
    return '<span class="vendor-badge vendor-verified verified"><i class="ri-shield-check-line" aria-hidden="true"></i>Verified Vendor</span>';
  }
  if (state === 'pending') {
    return '<span class="vendor-badge vendor-verified pending"><i class="ri-time-line" aria-hidden="true"></i>Pending Review</span>';
  }
  return '<span class="vendor-badge vendor-verified unverified"><i class="ri-alert-line" aria-hidden="true"></i>Not Verified</span>';
};

const priceInRange = (price, rangeValue) => {
  const amount = Number.isFinite(Number(price)) ? Number(price) : 0;
  if (rangeValue === 'all') return true;
  if (rangeValue.endsWith('+')) {
    const min = Number(rangeValue.replace('+', ''));
    return amount >= min;
  }
  const [min, max] = rangeValue.split('-').map(Number);
  return amount >= min && amount <= max;
};

const setEmptyState = (state) => {
  if (!emptyState) return;
  emptyState.style.display = 'block';
  switch (state) {
    case 'loading':
      emptyState.textContent = LOADING_TEXT;
      if (showingText) showingText.textContent = 'Loading listings...';
      if (resultsCount) resultsCount.textContent = '';
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      break;
    case 'error':
      emptyState.textContent = ERROR_TEXT;
      if (showingText) showingText.textContent = 'Showing 0 items';
      if (resultsCount) resultsCount.textContent = '0 listings found';
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      break;
    case 'empty':
      emptyState.textContent = NO_LISTINGS_TEXT;
      if (showingText) showingText.textContent = 'Showing 0 items';
      if (resultsCount) resultsCount.textContent = '0 listings found';
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      break;
    case 'filtered':
      emptyState.textContent = 'No listings match your filters right now.';
      if (showingText) showingText.textContent = 'Showing 0 items';
      {
        const totalLabel = allListings.length === 1 ? 'listing' : 'listings';
        if (resultsCount) resultsCount.textContent = `${allListings.length} ${totalLabel} available`;
      }
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      break;
    default:
      emptyState.textContent = emptyStateDefaultText;
      break;
  }
};

const pickListingImage = (data) => {
  if (Array.isArray(data.imageUrls) && data.imageUrls.length) return data.imageUrls[0];
  if (Array.isArray(data.images) && data.images.length) return data.images[0];
  if (typeof data.image === 'string' && data.image.trim()) return data.image.trim();
  return PLACEHOLDER_IMAGE;
};

const deriveLocation = (data) => {
  const state = (data.state || data.location || '').trim();
  const city = (data.city || '').trim();
  if (state && city && state.toLowerCase() !== city.toLowerCase()) {
    return { label: `${city}, ${state}`, filterValue: state };
  }
  if (state) {
    return { label: state, filterValue: state };
  }
  if (city) {
    return { label: city, filterValue: city };
  }
  return { label: 'Nigeria', filterValue: 'Nigeria' };
};

const getVendorInfo = (vendorId, listingData = {}) => {
  const vendor = vendorMap.get(vendorId) || {};
  const name =
    vendor.displayName ||
    vendor.businessName ||
    vendor.name ||
    listingData.vendorName ||
    'Marketplace Vendor';
  const plan = vendor.plan || listingData.vendorPlan || '';
  const verification =
    vendor.verificationStatus ||
    vendor.verification_state ||
    vendor.verificationStage ||
    vendor.verification ||
    listingData.vendorVerified ||
    vendor.status ||
    '';
  return { name, plan, verification };
};

const transformListing = (docSnap) => {
  const data = docSnap.data() || {};
  const status = (data.status || '').toLowerCase();
  if (status && status !== 'approved') {
    return null;
  }

  const vendorId = data.vendorID || data.vendorId || data.vendor || '';
  const vendorInfo = getVendorInfo(vendorId, data);
  const createdAt =
    (data.createdAt && typeof data.createdAt.toDate === 'function' && data.createdAt.toDate()) ||
    (docSnap.createTime && typeof docSnap.createTime.toDate === 'function' && docSnap.createTime.toDate()) ||
    null;
  const priceValue = Number(data.price ?? data.amount ?? data.listingPrice ?? 0);
  const price = Number.isFinite(priceValue) ? priceValue : 0;
  const { label: locationLabel, filterValue: locationFilterValue } = deriveLocation(data);

  return {
    id: docSnap.id,
    title: data.title || data.productName || 'Marketplace Listing',
    price,
    category: data.category || 'Others',
    locationLabel,
    locationFilterValue,
    vendor: vendorInfo.name,
    vendorPlan: vendorInfo.plan,
    vendorVerified: vendorInfo.verification,
    vendorId,
    image: pickListingImage(data),
    createdAt,
    dateAdded: createdAt ? createdAt.toISOString() : '',
  };
};

const rebuildListings = () => {
  if (!rawListingDocs.length) {
    allListings = [];
    filteredListings = [];
    renderProducts();
    return;
  }

  const transformed = rawListingDocs
    .map(transformListing)
    .filter(Boolean);

  allListings = transformed;
  applyFilters();
};

const renderProducts = () => {
  if (!productGrid) return;

  productGrid.innerHTML = '';

  const end = currentPage * ITEMS_PER_PAGE;
  const itemsToRender = filteredListings.slice(0, end);

  if (!itemsToRender.length) {
    if (isLoadingListings) {
      setEmptyState('loading');
    } else if (listingError) {
      setEmptyState('error');
    } else if (!allListings.length) {
      setEmptyState('empty');
    } else {
      setEmptyState('filtered');
    }
    return;
  }

  if (emptyState) {
    emptyState.style.display = 'none';
    emptyState.textContent = emptyStateDefaultText;
  }

  itemsToRender.forEach((item, index) => {
    const verificationState = normaliseVerificationState(item.vendorVerified);
    const planBadge = createPlanBadge(item.vendorPlan);
    const verificationBadge = createVerificationBadge(verificationState);
    const planParam = encodeURIComponent(item.vendorPlan || '');
    const verifiedParam = encodeURIComponent(verificationState);
    const vendorIdParam = item.vendorId ? `&vendorId=${encodeURIComponent(item.vendorId)}` : '';

    const card = document.createElement('article');
    card.className = 'product-card';
    card.style.animationDelay = `${index * 0.06}s`;
    card.dataset.category = item.category || '';
    card.dataset.price = item.price;
    card.dataset.location = item.locationFilterValue || '';
    card.dataset.plan = item.vendorPlan || '';
    card.dataset.verified = verificationState;

    card.innerHTML = `
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" />
      <div class="product-body">
        <div class="product-title">${escapeHtml(item.title)}</div>
        <div class="product-price">${formatCurrency(item.price)}</div>
        <div class="product-meta">
          <span>${escapeHtml(item.category || 'Marketplace')}</span>
          <span><i class="ri-map-pin-line"></i> ${escapeHtml(item.locationLabel || 'Nigeria')}</span>
        </div>
        ${planBadge || verificationBadge ? `<div class="vendor-badges">${planBadge}${verificationBadge}</div>` : ''}
        <div class="product-meta" style="justify-content:flex-start; gap:8px;">
          <i class="ri-user-3-line" style="color: var(--emerald);"></i>
          <span>${escapeHtml(item.vendor)}</span>
        </div>
        <div class="product-actions">
          <a class="btn btn-outline" href="product.php?id=${encodeURIComponent(item.id)}${vendorIdParam}&plan=${planParam}&verified=${verifiedParam}" aria-label="View details of ${escapeHtml(item.title)}">View Details</a>
          <button class="btn" type="button">Add to Cart</button>
        </div>
      </div>
    `;

    productGrid.appendChild(card);
  });

  const showingEnd = Math.min(end, filteredListings.length);
  if (showingText) showingText.textContent = `Showing ${showingEnd} of ${filteredListings.length} items`;
  const totalLabel = filteredListings.length === 1 ? 'listing' : 'listings';
  if (resultsCount) resultsCount.textContent = `${filteredListings.length} ${totalLabel} found`;
  if (loadMoreBtn) {
    loadMoreBtn.style.display = showingEnd >= filteredListings.length ? 'none' : 'inline-flex';
  }
};

const applyFilters = () => {
  if (!allListings.length) {
    filteredListings = [];
    renderProducts();
    return;
  }

  const queryTerm = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;
  const selectedLocation = locationFilter.value;
  const selectedPrice = priceFilter.value;

  filteredListings = allListings.filter((listing) => {
    const matchesSearch =
      !queryTerm ||
      [listing.title, listing.vendor, listing.category]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(queryTerm));

    const matchesCategory =
      selectedCategory === 'all' ||
      (listing.category && listing.category.toLowerCase() === selectedCategory.toLowerCase());

    const matchesLocation =
      selectedLocation === 'all' ||
      (listing.locationFilterValue && listing.locationFilterValue.toLowerCase() === selectedLocation.toLowerCase());

    const matchesPrice = priceInRange(listing.price, selectedPrice);

    return matchesSearch && matchesCategory && matchesLocation && matchesPrice;
  });

  const sortValue = sortFilter.value;
  filteredListings.sort((a, b) => {
    if (sortValue === 'priceLowHigh') return (a.price ?? 0) - (b.price ?? 0);
    if (sortValue === 'priceHighLow') return (b.price ?? 0) - (a.price ?? 0);
    const dateA = a.createdAt ? a.createdAt.getTime() : 0;
    const dateB = b.createdAt ? b.createdAt.getTime() : 0;
    return dateB - dateA;
  });

  currentPage = 1;
  renderProducts();
};

const resetFilters = () => {
  if (searchInput) searchInput.value = '';
  if (categoryFilter) categoryFilter.value = 'all';
  if (locationFilter) locationFilter.value = 'all';
  if (priceFilter) priceFilter.value = 'all';
  if (sortFilter) sortFilter.value = 'newest';
  currentPage = 1;
  filteredListings = [...allListings];
  applyFilters();
};

const initialiseFiltersFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  let shouldFilter = false;

  const categoryParam = params.get('category');
  if (categoryParam && categoryFilter) {
    const match = Array.from(categoryFilter.options).find(
      (option) => option.value.toLowerCase() === categoryParam.toLowerCase(),
    );
    if (match) {
      categoryFilter.value = match.value;
      shouldFilter = true;
    }
  }

  const searchParam = params.get('search');
  if (searchParam && searchInput) {
    searchInput.value = searchParam;
    shouldFilter = true;
  }

  const locationParam = params.get('location');
  if (locationParam && locationFilter) {
    const match = Array.from(locationFilter.options).find(
      (option) => option.value.toLowerCase() === locationParam.toLowerCase(),
    );
    if (match) {
      locationFilter.value = match.value;
      shouldFilter = true;
    }
  }

  const priceParam = params.get('price');
  if (priceParam && priceFilter) {
    const match = Array.from(priceFilter.options).find(
      (option) => option.value.toLowerCase() === priceParam.toLowerCase(),
    );
    if (match) {
      priceFilter.value = match.value;
      shouldFilter = true;
    }
  }

  if (shouldFilter) {
    applyFilters();
  } else {
    renderProducts();
  }
};

const startRealtimeListeners = () => {
  isLoadingListings = true;
  listingError = false;
  setEmptyState('loading');

  const listingsQuery = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));

  listingsUnsubscribe = onSnapshot(
    listingsQuery,
    (snapshot) => {
      rawListingDocs = snapshot.docs;
      isLoadingListings = false;
      listingError = false;
      rebuildListings();
    },
    (error) => {
      console.error('[shop] listings snapshot failed', error);
      isLoadingListings = false;
      listingError = true;
      rawListingDocs = [];
      allListings = [];
      filteredListings = [];
      renderProducts();
    },
  );

  vendorsUnsubscribe = onSnapshot(
    collection(db, 'vendors'),
    (snapshot) => {
      vendorMap = new Map(snapshot.docs.map((docSnap) => [docSnap.id, docSnap.data()]));
      if (!isLoadingListings) {
        rebuildListings();
      }
    },
    (error) => {
      console.error('[shop] vendors snapshot failed', error);
    },
  );
};

const cleanupListeners = () => {
  if (typeof listingsUnsubscribe === 'function') {
    listingsUnsubscribe();
    listingsUnsubscribe = null;
  }
  if (typeof vendorsUnsubscribe === 'function') {
    vendorsUnsubscribe();
    vendorsUnsubscribe = null;
  }
};

const bindEvents = () => {
  filterBtn?.addEventListener('click', applyFilters);
  resetBtn?.addEventListener('click', resetFilters);
  loadMoreBtn?.addEventListener('click', () => {
    currentPage += 1;
    renderProducts();
  });

  sortFilter?.addEventListener('change', applyFilters);

  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      applyFilters();
    }
  });
};

const initialise = () => {
  bindEvents();
  isLoadingListings = true;
  setEmptyState('loading');
  initialiseFiltersFromUrl();
  startRealtimeListeners();
};

document.addEventListener('DOMContentLoaded', initialise);
window.addEventListener('beforeunload', cleanupListeners);
window.addEventListener('pagehide', cleanupListeners);
