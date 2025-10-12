let vendorData = {};
let vendorStats = {};
let vendorListings = [];

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
  thumb.setAttribute('aria-hidden', 'true');
  thumb.textContent = (item.title || 'Y')[0].toUpperCase();

  const info = document.createElement('div');
  info.className = 'listing-info';

  const title = document.createElement('h3');
  title.textContent = item.title || 'Untitled';

  const metaLine = document.createElement('p');
  metaLine.textContent = item.added_on ? `Added ${item.added_on}` : 'Recently added';

  info.appendChild(title);
  info.appendChild(metaLine);

  top.appendChild(thumb);
  top.appendChild(info);

  const meta = document.createElement('div');
  meta.className = 'listing-meta';

  const price = document.createElement('span');
  price.textContent = `₦${formatNumber(item.price)}`;

  const status = document.createElement('span');
  const statusValue = (item.status || '').toLowerCase();
  status.className = `status-pill ${statusValue ? `status-${statusValue}` : 'status-draft'}`;
  status.textContent = item.status || 'Draft';

  meta.appendChild(price);
  meta.appendChild(status);

  const actions = document.createElement('div');
  actions.className = 'listing-actions';

  const viewLink = document.createElement('a');
  viewLink.href = item.link || '#';
  viewLink.textContent = 'View Listing';
  viewLink.setAttribute('aria-label', `View listing ${escapeHTML(item.title || '')}`);

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

  if (!vendorListings.length) {
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  vendorListings.forEach((item) => {
    if (!grid) return;
    grid.appendChild(buildListingCard(item));
  });
};

const bindActions = () => {
  const logoArea = document.querySelector('.logo-area');
  if (logoArea) {
    logoArea.addEventListener('click', () => {
      window.location.href = '/index.html';
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

  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      window.location.href = 'vendor-profile.php';
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
  if (dashboard) dashboard.style.display = 'block';
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
    showDashboard();
  } catch (error) {
    console.error('Dashboard load error', error);
    showLoaderMessage('We could not load your dashboard.', error.message || 'Please refresh the page to try again.');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  bindActions();
  fetchDashboardData();
});
