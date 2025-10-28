import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

let vendorData = {};
let vendorStats = {};
let vendorListings = [];
let firestoreListings = [];
let firebaseUser = null;

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));

const loader = qs('#loader');
const loaderMessages = loader ? loader.querySelectorAll('p') : [];
const header = qs('#dashboardHeader');
const dashboard = qs('#dashboard');

const escapeHTML = (value) => {
  if (typeof value !== 'string') return value ?? '';
  return value.replace(/[&<>'"]/g, (char) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return map[char] || char;
  });
};

const fillText = (id, value, fallback = '—') => {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value || fallback;
};

const formatNumber = (value) => new Intl.NumberFormat('en-NG').format(Number(value || 0));

const resolveListingImage = (item = {}) => {
  if (typeof item.image === 'string' && item.image.trim()) return item.image;
  if (Array.isArray(item.images) && item.images.length) return item.images[0];
  if (Array.isArray(item.imageUrls) && item.imageUrls.length) return item.imageUrls[0];
  if (typeof item.coverImage === 'string' && item.coverImage.trim()) return item.coverImage;
  return '';
};

const resolveListingTitle = (item = {}) => {
  const candidates = [
    item.title,
    item.productTitle,
    item.productName,
    item.listingTitle,
    item.name,
    item.type,
    item.itemType,
    item.subcategory,
  ];
  const match = candidates.find((value) => typeof value === 'string' && value.trim());
  return match ? match.trim() : 'Untitled';
};

const formatListingDate = (value) => {
  if (!value) return '';
  let date;
  if (value.toDate && typeof value.toDate === 'function') {
    date = value.toDate();
  } else if (value.seconds) {
    date = new Date(value.seconds * 1000);
  } else if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  } else if (value instanceof Date) {
    date = value;
  }
  if (!date) return '';
  return date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
};

const resolveListingLink = (item = {}) => {
  if (typeof item.link === 'string' && item.link.trim()) return item.link;
  if (item.id) return `product.html?id=${encodeURIComponent(item.id)}`;
  return '#';
};

const hydrateProfile = () => {
  const welcomeName = document.getElementById('welcomeName');
  const headerGreeting = document.getElementById('headerGreeting');
  const currentPlan = document.getElementById('currentPlan');

  const name = vendorData.name || '';
  const business = vendorData.businessName || '';
  const location = vendorData.location || '';

  if (welcomeName) {
    const firstName = name.trim().split(' ')[0] || 'Vendor';
    welcomeName.textContent = firstName;
  }

  if (headerGreeting) {
    if (business && location) {
      headerGreeting.textContent = `${business} • ${location}`;
    } else if (business) {
      headerGreeting.textContent = business;
    } else if (location) {
      headerGreeting.textContent = `Serving ${location}`;
    } else {
      headerGreeting.textContent = 'Curated commerce, crafted by you.';
    }
  }

  if (currentPlan) {
    currentPlan.textContent = vendorData.plan || 'Free';
  }
};

const hydrateStats = () => {
  fillText('totalListings', formatNumber(vendorStats.total_listings));
  fillText('activeListings', formatNumber(vendorStats.active_listings));
  fillText('totalViews', formatNumber(vendorStats.total_views));

  const badge = document.getElementById('listingsBadge');
  if (badge) {
    badge.textContent = `${vendorStats.active_listings || 0} Active`;
  }
};

const buildListingCard = (item) => {
  const card = document.createElement('article');
  card.className = 'listing-card';

  const top = document.createElement('div');
  top.className = 'listing-top';

  const thumb = document.createElement('div');
  thumb.className = 'listing-thumb';

  const imageSrc = resolveListingImage(item);
  const titleText = resolveListingTitle(item);

  if (imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = item.image_alt || titleText || 'Listing image';
    img.loading = 'lazy';
    thumb.classList.add('listing-thumb-image');
    thumb.appendChild(img);
  } else {
    thumb.setAttribute('aria-hidden', 'true');
    const fallback = (titleText || 'Y').trim().charAt(0).toUpperCase() || 'Y';
    thumb.textContent = fallback;
  }

  const info = document.createElement('div');
  info.className = 'listing-info';

  const title = document.createElement('h3');
  title.textContent = titleText || 'Untitled';

  const metaLine = document.createElement('p');
  const addedDisplay = item.added_on || formatListingDate(item.createdAt) || '';
  const addedLabel = addedDisplay
    ? (addedDisplay.trim().toLowerCase().startsWith('added') ? addedDisplay : `Added ${addedDisplay}`)
    : 'Recently added';
  metaLine.textContent = addedLabel;

  info.appendChild(title);
  info.appendChild(metaLine);

  top.appendChild(thumb);
  top.appendChild(info);

  const meta = document.createElement('div');
  meta.className = 'listing-meta';

  const price = document.createElement('span');
  const priceValue = Number.isFinite(item.price) ? item.price : Number(item.price || 0);
  price.textContent = priceValue > 0 ? `₦${formatNumber(priceValue)}` : 'Price on request';

  const status = document.createElement('span');
  const statusValue = (item.status || '').toLowerCase();
  status.className = `status-pill ${statusValue ? `status-${statusValue}` : 'status-draft'}`;
  status.textContent = item.status || 'Draft';

  const views = document.createElement('span');
  views.className = 'listing-views';
  const viewCount = typeof item.views === 'number' ? item.views : Number(item.views || 0);
  views.textContent = `${formatNumber(viewCount)} views`;

  meta.appendChild(price);
  meta.appendChild(status);
  meta.appendChild(views);

  const actions = document.createElement('div');
  actions.className = 'listing-actions';

  const viewLink = document.createElement('a');
  viewLink.href = resolveListingLink(item);
  viewLink.textContent = 'View Listing';
  viewLink.setAttribute('aria-label', `View listing ${escapeHTML(titleText || '')}`);

  actions.appendChild(viewLink);

  card.appendChild(top);
  card.appendChild(meta);
  card.appendChild(actions);

  return card;
};

const hydrateListings = () => {
  const emptyState = document.getElementById('emptyState');
  const grid = document.getElementById('listingGrid');

  if (grid) {
    grid.innerHTML = '';
  }

  const sourceListings = firestoreListings.length ? firestoreListings : vendorListings;

  if (!sourceListings.length) {
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  sourceListings.forEach((item) => {
    if (!grid) return;
    grid.appendChild(buildListingCard(item));
  });
};

const bindActions = () => {
  const logoArea = document.querySelector('.logo-area');
  if (logoArea) {
    const navigateToProfile = () => {
      window.location.href = 'vendor-profile.php';
    };
    logoArea.addEventListener('click', (event) => {
      if (event.target && event.target.closest('a')) {
        return;
      }
      navigateToProfile();
    });
    logoArea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        navigateToProfile();
      }
    });
  }

  const notificationsBtn = document.querySelector('.notif-icon');
  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', () => {
      window.location.href = 'vendor-notifications.php';
    });
  }

  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      window.location.href = 'vendor-settings.php';
    });
  }

  const chatBtn = document.getElementById('chatBtn');
  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      window.location.href = 'vendor-chats.php';
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = 'logout.php';
    });
  }

  const fab = document.getElementById('fab');
  if (fab) {
    fab.addEventListener('click', () => {
      window.location.href = 'post.html';
    });
  }

  const renewPlan = document.getElementById('renewPlan');
  if (renewPlan) {
    renewPlan.addEventListener('click', () => {
      window.location.href = 'vendor-plans.php#renew';
    });
  }

  const viewPricing = document.getElementById('viewPricing');
  if (viewPricing) {
    viewPricing.addEventListener('click', () => {
      window.location.href = 'vendor-plans.php';
    });
  }
};

const showDashboard = () => {
  if (loader) loader.style.display = 'none';
  if (header) header.style.display = 'flex';
  if (dashboard) dashboard.style.display = 'flex';
};

const showLoaderMessage = (title, subtitle) => {
  if (!loader) return;
  loader.style.display = 'flex';
  if (loaderMessages[0] && title) loaderMessages[0].textContent = title;
  if (loaderMessages[1]) loaderMessages[1].textContent = subtitle || '';
};

const fetchDashboardData = async () => {
  try {
    showLoaderMessage('Preparing your dashboard…', 'Fetching your latest stats.');
    const response = await fetch('vendor-dashboard.php?format=json', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });

    if (response.status === 401) {
      window.location.href = 'vendor-login.html';
      return;
    }

    let payload;
    try {
      payload = await response.json();
    } catch (parseError) {
      console.error('Invalid dashboard response', parseError);
      throw new Error('We could not parse the dashboard data.');
    }

    if (!response.ok || !payload.success) {
      throw new Error((payload && payload.message) || 'Unable to load your dashboard data.');
    }

    const data = payload.data || {};
    vendorData = data.profile || {};
    vendorStats = data.stats || {};
    vendorListings = Array.isArray(data.listings) ? data.listings : [];

    hydrateProfile();
    hydrateStats();
    hydrateListings();
    loadFirestoreListings();
    showDashboard();
  } catch (error) {
    console.error('Dashboard load error', error);
    showLoaderMessage('We could not load your dashboard.', error.message || 'Please refresh the page to try again.');
  }
};

const normaliseFirestoreListing = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    title: resolveListingTitle(data),
    price: typeof data.price === 'number' ? data.price : Number(data.price || 0),
    status: data.status || 'pending',
    added_on: formatListingDate(data.createdAt),
    views: typeof data.views === 'number' ? data.views : Number(data.views || 0),
    image: resolveListingImage(data),
    image_alt: data.productTitle || data.title || 'Listing image',
    link: resolveListingLink({ id: docSnap.id, link: data.productUrl || data.link }),
  };
};

const loadFirestoreListings = async () => {
  const vendorUidCandidate =
    (vendorData && (vendorData.firebaseUid || vendorData.uid)) ||
    firebaseUser?.uid ||
    sessionStorage.getItem('firebase_uid') ||
    localStorage.getItem('firebase_uid');

  if (!vendorUidCandidate) {
    return;
  }

  try {
    const listingsRef = collection(db, 'listings');
    const listingsQuery = query(
      listingsRef,
      where('vendorUid', '==', vendorUidCandidate),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const snapshot = await getDocs(listingsQuery);
    const mapped = snapshot.docs.map(normaliseFirestoreListing);
    if (mapped.length) {
      firestoreListings = mapped;
      hydrateListings();
    }
  } catch (error) {
    console.error('[vendor-dashboard] unable to load listings from Firestore', error);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  bindActions();
  fetchDashboardData();
});

onAuthStateChanged(auth, (user) => {
  firebaseUser = user;
  if (user) {
    loadFirestoreListings();
  }
});
