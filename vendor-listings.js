import { setupListingEditor, formatCurrency, statusLabel } from './vendor-listing-editor.js';

const state = {
  listings: [],
  nextPage: 1,
  perPage: 12,
  hasMore: false,
  isLoading: false,
  filters: {
    status: 'all',
    sort: 'recent',
    search: '',
  },
};

const listingLookup = new Map();

const grid = document.getElementById('listingsGrid');
const emptyState = document.getElementById('emptyState');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const searchField = document.getElementById('searchListings');
const statusFilter = document.getElementById('statusFilter');
const sortOrder = document.getElementById('sortOrder');
const addListingBtn = document.getElementById('addListing');
const emptyStateCTA = document.getElementById('emptyStateCTA');
const backButton = document.getElementById('backToDashboard');
const storefrontButton = document.getElementById('viewStorefront');
const loader = document.getElementById('pageLoader');

const listingEditor = setupListingEditor({
  onSubmitSuccess: (listing) => {
    const normalized = normalizeListing(listing);
    upsertListing(normalized);
    renderListings();
  },
});

const debounce = (fn, delay = 320) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const toggleLoader = (visible) => {
  if (!loader) return;
  loader.classList.toggle('active', Boolean(visible));
};

const normalizeListing = (raw = {}) => {
  const identifier = raw.id ?? raw.listingId ?? raw.firestore_id ?? raw.public_id ?? '';
  const id = identifier !== undefined && identifier !== null ? String(identifier) : '';
  const statusRaw = String(raw.status_raw ?? raw.status ?? 'pending').toLowerCase();
  const priceValue =
    raw.price === null || raw.price === undefined || raw.price === ''
      ? null
      : Number.parseFloat(raw.price);
  const images = Array.isArray(raw.images)
    ? raw.images.filter((url) => typeof url === 'string' && url.trim() !== '')
    : [];
  const image =
    typeof raw.image === 'string' && raw.image.trim()
      ? raw.image.trim()
      : images.length
        ? images[0]
        : '';

  return {
    id,
    title: (raw.title || 'Untitled').toString(),
    description: (raw.description || '').toString(),
    price: Number.isFinite(priceValue) ? priceValue : null,
    status_raw: statusRaw,
    status_label: statusLabel(statusRaw),
    added_on: raw.added_on || raw.addedOn || '',
    updated_on: raw.updated_on || raw.updatedOn || '',
    views: Number.isFinite(Number(raw.views)) ? Number(raw.views) : 0,
    image,
    images,
    link:
      typeof raw.link === 'string' && raw.link.trim()
        ? raw.link
        : id
          ? `product.php?id=${encodeURIComponent(id)}`
          : '#',
    category: raw.category || '',
    subcategory: raw.subcategory || '',
    location: raw.location || '',
    city: raw.city || '',
    state: raw.state || '',
    country: raw.country || '',
  };
};

const upsertListing = (listing) => {
  if (!listing || !listing.id) return;
  listingLookup.set(listing.id, listing);
  const existingIndex = state.listings.findIndex((item) => item.id === listing.id);
  if (existingIndex >= 0) {
    state.listings[existingIndex] = listing;
  } else {
    state.listings.unshift(listing);
  }
};

const removeListing = (listingId) => {
  if (!listingId) return;
  listingLookup.delete(listingId);
  state.listings = state.listings.filter((item) => item.id !== listingId);
};

const requestListingDeletion = async (listing) => {
  if (!listing || !listing.id) {
    return;
  }

  const confirmed = window.confirm('Are you sure you want to delete this listing?');
  if (!confirmed) {
    return;
  }

  state.isLoading = true;
  toggleLoader(true);

  try {
    const response = await fetch('vendor-listing-delete.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ listingId: listing.id }),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }

    if (!response.ok || !payload.success) {
      const message = payload.message || 'Unable to delete this listing right now.';
      throw new Error(message);
    }

    removeListing(listing.id);
    renderListings();

    const message = payload.message || 'Listing deleted successfully.';
    window.alert(message);
  } catch (error) {
    console.error('[vendor-listings] delete failed', error);
    window.alert(error.message || 'Unable to delete this listing right now.');
  } finally {
    state.isLoading = false;
    toggleLoader(false);
  }
};

const renderListings = () => {
  if (!grid) return;

  grid.innerHTML = '';

  if (!state.listings.length) {
    if (emptyState) emptyState.hidden = false;
    if (loadMoreBtn) loadMoreBtn.hidden = true;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  state.listings.forEach((listing) => {
    grid.appendChild(buildListingCard(listing));
  });

  if (loadMoreBtn) {
    loadMoreBtn.hidden = !state.hasMore;
    loadMoreBtn.disabled = false;
    loadMoreBtn.innerHTML = '<i class="ri-refresh-line"></i> Load more';
  }
};

const buildListingCard = (listing) => {
  const card = document.createElement('article');
  card.className = 'listing-card';

  const thumb = document.createElement('div');
  thumb.className = 'listing-thumb';
  if (listing.image) {
    const img = document.createElement('img');
    img.src = listing.image;
    img.alt = listing.title ? `${listing.title} thumbnail` : 'Listing thumbnail';
    img.loading = 'lazy';
    thumb.appendChild(img);
  } else {
    thumb.textContent = listing.title.trim().charAt(0).toUpperCase() || 'Y';
  }

  const info = document.createElement('div');
  info.className = 'listing-info';

  const title = document.createElement('h3');
  title.textContent = listing.title || 'Untitled';

  const description = document.createElement('p');
  description.textContent = listing.added_on ? `Added ${listing.added_on}` : 'Recently added';
  description.style.margin = '0';
  description.style.color = '#6B7280';
  description.style.fontSize = '0.85rem';

  info.appendChild(title);
  info.appendChild(description);

  const meta = document.createElement('div');
  meta.className = 'listing-meta';

  const priceBadge = document.createElement('span');
  priceBadge.className = 'price-badge';
  if (listing.price && listing.price > 0) {
    priceBadge.textContent = formatCurrency(listing.price);
  } else {
    priceBadge.textContent = 'Price on request';
  }

  const statusPill = document.createElement('span');
  const statusValue = listing.status_raw || 'pending';
  statusPill.className = `status-pill status-${statusValue}`;
  statusPill.textContent = listing.status_label || statusLabel(statusValue);

  const viewsBadge = document.createElement('span');
  viewsBadge.className = 'price-badge';
  viewsBadge.style.background = 'rgba(17, 24, 39, 0.08)';
  viewsBadge.style.color = '#1F2937';
  viewsBadge.textContent = `${Number(listing.views || 0).toLocaleString('en-NG')} views`;

  meta.appendChild(priceBadge);
  meta.appendChild(statusPill);
  meta.appendChild(viewsBadge);

  const actions = document.createElement('div');
  actions.className = 'listing-actions';

  const viewLink = document.createElement('a');
  viewLink.href = listing.link || '#';
  viewLink.target = '_blank';
  viewLink.rel = 'noopener';
  viewLink.innerHTML = '<i class="ri-external-link-line"></i> View';
  viewLink.setAttribute('aria-label', `View listing ${listing.title || ''}`);

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.innerHTML = '<i class="ri-edit-2-line"></i> Edit';
  editButton.addEventListener('click', () => {
    listingEditor.open(listing);
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-btn';
  deleteButton.innerHTML = '<i class="ri-delete-bin-6-line"></i> Delete';
  deleteButton.addEventListener('click', () => {
    requestListingDeletion(listing);
  });

  actions.appendChild(viewLink);
  actions.appendChild(editButton);
  actions.appendChild(deleteButton);

  card.appendChild(thumb);
  card.appendChild(info);
  card.appendChild(meta);
  card.appendChild(actions);

  return card;
};

const fetchListings = async ({ reset = false } = {}) => {
  if (state.isLoading) return;

  state.isLoading = true;

  if (reset) {
    state.nextPage = 1;
    state.listings = [];
    listingLookup.clear();
    renderListings();
    toggleLoader(true);
  } else if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Loading';
  }

  const params = new URLSearchParams();
  params.set('page', String(state.nextPage));
  params.set('perPage', String(state.perPage));
  params.set('sort', state.filters.sort);
  if (state.filters.status) {
    params.set('status', state.filters.status);
  }
  if (state.filters.search) {
    params.set('search', state.filters.search);
  }

  try {
    const response = await fetch(`vendor-listings-data.php?${params.toString()}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Unable to fetch listings right now.');
    }

    const payload = await response.json();
    if (!payload.success) {
      throw new Error(payload.message || 'Unable to fetch listings right now.');
    }

    const data = payload.data || {};
    const received = Array.isArray(data.listings) ? data.listings.map(normalizeListing) : [];

    if (reset) {
      state.listings = received;
    } else {
      state.listings = state.listings.concat(received);
    }

    received.forEach((listing) => {
      listingLookup.set(listing.id, listing);
    });

    const pagination = data.pagination || {};
    state.hasMore = Boolean(pagination.hasMore);
    if (state.hasMore) {
      state.nextPage = Number.isInteger(pagination.page) ? pagination.page + 1 : state.nextPage + 1;
    }

    renderListings();
  } catch (error) {
    console.error('[vendor-listings] fetch failed', error);
    if (!state.listings.length && emptyState) {
      emptyState.hidden = false;
      emptyState.querySelector('div').textContent =
        error.message || 'We could not load your listings. Please try again.';
    } else {
      window.alert(error.message || 'We could not refresh your listings.');
    }
    if (loadMoreBtn) {
      loadMoreBtn.hidden = true;
    }
  } finally {
    state.isLoading = false;
    toggleLoader(false);
    if (loadMoreBtn && state.hasMore) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.innerHTML = '<i class="ri-refresh-line"></i> Load more';
    }
  }
};

const handleSearchInput = debounce((event) => {
  const value = event.target.value.trim();
  state.filters.search = value;
  fetchListings({ reset: true });
}, 360);

const handleStatusChange = (event) => {
  state.filters.status = event.target.value || 'all';
  fetchListings({ reset: true });
};

const handleSortChange = (event) => {
  state.filters.sort = event.target.value || 'recent';
  fetchListings({ reset: true });
};

const handleLoadMore = () => {
  if (state.hasMore) {
    fetchListings();
  }
};

const handleAddListing = () => {
  window.location.href = 'post.html';
};

const handleBack = () => {
  window.location.href = 'vendor-dashboard.php';
};

const handleStorefront = () => {
  window.location.href = 'vendor-storefront.php';
};

const bindEvents = () => {
  if (searchField) {
    searchField.addEventListener('input', handleSearchInput);
  }
  if (statusFilter) {
    statusFilter.addEventListener('change', handleStatusChange);
  }
  if (sortOrder) {
    sortOrder.addEventListener('change', handleSortChange);
  }
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', handleLoadMore);
  }
  if (addListingBtn) {
    addListingBtn.addEventListener('click', handleAddListing);
  }
  if (emptyStateCTA) {
    emptyStateCTA.addEventListener('click', handleAddListing);
  }
  if (backButton) {
    backButton.addEventListener('click', handleBack);
  }
  if (storefrontButton) {
    storefrontButton.addEventListener('click', handleStorefront);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  fetchListings({ reset: true });
});
