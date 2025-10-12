let vendorData = {};
let vendorStats = {};
let vendorListings = [];

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));

const loader = qs('#loader');
const loaderMessages = loader ? loader.querySelectorAll('p') : [];
const header = qs('#dashboardHeader');
const dashboard = qs('#dashboard');

const fillText = (id, value, fallback = '—') => {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value || fallback;
};

const formatNumber = (value) => {
  return new Intl.NumberFormat('en-NG').format(Number(value || 0));
};

const hydrateProfile = () => {
  fillText('vendorName', vendorData.name, '—');
  fillText('businessName', vendorData.businessName, '—');
  fillText('vendorPhone', vendorData.phone, '—');
  fillText('vendorLocation', vendorData.location, '—');
  fillText('vendorJoined', vendorData.joined, '—');

  const planBadge = document.getElementById('planBadge');
  const currentPlan = document.getElementById('currentPlan');
  if (planBadge) {
    planBadge.innerHTML = `<i class="ri-vip-crown-line"></i> ${vendorData.plan || 'Free'} Plan`;
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

const hydrateListings = () => {
  const emptyState = document.getElementById('emptyState');
  const tableBody = document.getElementById('listingTableBody');

  if (tableBody) {
    tableBody.innerHTML = '';
  }

  if (!vendorListings.length) {
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  vendorListings.forEach((item) => {
    if (!tableBody) return;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.title || 'Untitled'}</td>
      <td>₦${formatNumber(item.price)}</td>
      <td>${item.status || '—'}</td>
      <td>${item.added_on || '—'}</td>
      <td><a class="btn btn-outline" href="${item.link || '#'}">View</a></td>
    `;
    tableBody.appendChild(row);
  });
};

const bindActions = () => {
  // ✅ Logout (backend handles the PHP logic)
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = 'logout.php';
    });
  }

  // ✅ Floating “Add Listing” Button → post.html
  const fab = document.getElementById('fab');
  if (fab) {
    fab.addEventListener('click', () => {
      window.location.href = 'post.html';
    });
  }

  // ✅ Profile & Plan buttons
  const editProfile = document.getElementById('editProfile');
  const upgradePlan = document.getElementById('openPlanModal');
  const renewPlan = document.getElementById('renewPlan');
  const viewPricing = document.getElementById('viewPricing');

  if (editProfile) {
    editProfile.addEventListener('click', () => {
      window.location.href = 'vendor-profile.php';
    });
  }

  if (upgradePlan) {
    upgradePlan.addEventListener('click', () => {
      window.location.href = 'vendor-plans.php';
    });
  }

  if (renewPlan) {
    renewPlan.addEventListener('click', () => {
      window.location.href = 'vendor-plans.php#renew';
    });
  }

  if (viewPricing) {
    viewPricing.addEventListener('click', () => {
      window.location.href = 'vendor-plans.php#pricing';
    });
  }

  // ✅ Close modal (if any are open)
  qsa('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const backdrop = btn.closest('.modal-backdrop');
      if (backdrop) {
        backdrop.setAttribute('aria-hidden', 'true');
        backdrop.classList.remove('is-visible');
      }
    });
  });
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
      headers: { 'Accept': 'application/json' },
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