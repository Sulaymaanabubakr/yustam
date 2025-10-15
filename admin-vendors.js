const authLoader = document.getElementById('authLoader');
const mainContent = document.getElementById('mainContent');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

const searchInput = document.getElementById('searchInput');
const planFilter = document.getElementById('planFilter');
const statusFilter = document.getElementById('statusFilter');
const sortOrder = document.getElementById('sortOrder');
const refreshBtn = document.getElementById('refreshBtn');
const clearFilters = document.getElementById('clearFilters');

const vendorTableBody = document.getElementById('vendorTableBody');
const vendorCardList = document.getElementById('vendorCardList');
const emptyState = document.getElementById('emptyState');
const paginationEl = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageIndicator = document.getElementById('pageIndicator');

const suspendModal = document.getElementById('suspendModal');
const deleteModal = document.getElementById('deleteModal');
const notifyModal = document.getElementById('notifyModal');
const confirmSuspendBtn = document.getElementById('confirmSuspend');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const confirmNotifyBtn = document.getElementById('confirmNotify');
const notifyMessage = document.getElementById('notifyMessage');

const totalVendorsEl = document.getElementById('totalVendors');
const freeCountEl = document.getElementById('freeCount');
const plusCountEl = document.getElementById('plusCount');
const proCountEl = document.getElementById('proCount');
const premiumCountEl = document.getElementById('premiumCount');
const suspendedCountEl = document.getElementById('suspendedCount');
const activeWeekEl = document.getElementById('activeWeek');

const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');
const notifyBell = document.getElementById('notifyBell');
const notifyBadge = document.getElementById('notifyBadge');

const state = {
  page: 1,
  pageSize: 20,
  totalPages: 1,
  hasNext: false,
  total: 0,
  vendors: [],
};

const showToast = (message, isError = false) => {
  if (!toast || !toastMessage) return;
  toastMessage.textContent = message;
  toast.style.background = isError ? '#d84315' : 'var(--emerald)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
};

const toggleLoader = (isLoading) => {
  if (authLoader) authLoader.classList.toggle('hidden', !isLoading);
  if (mainContent) mainContent.classList.toggle('ready', !isLoading);
};

const ensureSession = async () => {
  try {
    const response = await fetch('admin-session-status.php', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Session invalid');
    return await response.json();
  } catch (error) {
    console.error('Admin session validation failed:', error);
    window.location.href = 'admin-login.php';
    return null;
  }
};

const resetPagination = () => {
  state.page = 1;
  state.totalPages = 1;
  state.hasNext = false;
};

const capitalise = (value) => {
  if (!value) return '';
  const str = String(value);
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const renderCounts = (counts = {}) => {
  const planCounts = counts.plan || {};
  if (totalVendorsEl) totalVendorsEl.textContent = counts.total ?? 0;
  if (freeCountEl) freeCountEl.textContent = planCounts.free ?? 0;
  if (plusCountEl) plusCountEl.textContent = planCounts.plus ?? 0;
  if (proCountEl) proCountEl.textContent = planCounts.pro ?? 0;
  if (premiumCountEl) premiumCountEl.textContent = planCounts.premium ?? 0;
  if (suspendedCountEl) suspendedCountEl.textContent = counts.suspended ?? 0;
  if (activeWeekEl) activeWeekEl.textContent = counts.activeWeek ?? 0;
};

const renderEmptyState = (message) => {
  if (emptyState) {
    emptyState.hidden = false;
    emptyState.textContent = message;
  }
  if (paginationEl) paginationEl.hidden = true;
  vendorTableBody.innerHTML = '';
  vendorCardList.innerHTML = '';
};

const buildVendorRow = (vendor) => {
  const tr = document.createElement('tr');
  const planClass = `chip ${vendor.planSlug || (vendor.plan || 'free')}`;
  const statusClass = `status-badge status-${vendor.status || 'active'}`;
  tr.innerHTML = `
    <td>
      <div class="vendor-info">
        <img src="${vendor.profilePhoto || 'https://i.pravatar.cc/100?img=12'}" alt="${vendor.displayName || vendor.businessName || 'Vendor'} avatar" />
        <div>
          <strong>${vendor.displayName || vendor.businessName || 'Unnamed Vendor'}</strong>
          <div style="font-size:0.8rem; color:rgba(17,17,17,0.6);">${vendor.businessName || '-'}</div>
        </div>
      </div>
    </td>
    <td>${vendor.email || '-'}</td>
    <td>${vendor.phone || '-'}</td>
    <td><span class="${planClass}">${(vendor.planLabel || vendor.plan || 'Free').toUpperCase()}</span></td>
    <td><span class="${statusClass}"><i class="ri-shield-check-line"></i>${vendor.statusLabel || capitalise(vendor.status || 'active')}</span></td>
    <td>${vendor.createdAtFormatted || '-'}</td>
    <td>
      <div class="actions">
        <a class="view-btn" href="vendor-profile.php?id=${encodeURIComponent(vendor.id)}" title="View profile"><i class="ri-external-link-line"></i>View</a>
        <button class="notify-btn" data-action="notify" data-id="${vendor.id}"><i class="ri-chat-3-line"></i>Notify</button>
        <button class="suspend-btn" data-action="suspend" data-status="${vendor.status}" data-id="${vendor.id}">${vendor.status === 'suspended' ? '<i class="ri-shield-check-line"></i>Unsuspend' : '<i class="ri-shield-off-line"></i>Suspend'}</button>
        <button class="delete-btn" data-action="delete" data-id="${vendor.id}"><i class="ri-delete-bin-6-line"></i>Delete</button>
      </div>
    </td>
  `;
  return tr;
};

const buildVendorCard = (vendor) => {
  const card = document.createElement('article');
  card.className = 'vendor-card';
  const planClass = `chip ${vendor.planSlug || (vendor.plan || 'free')}`;
  const statusClass = `status-badge status-${vendor.status || 'active'}`;
  card.innerHTML = `
    <div class="vendor-card-header">
      <img src="${vendor.profilePhoto || 'https://i.pravatar.cc/100?img=12'}" alt="${vendor.displayName || vendor.businessName || 'Vendor'} avatar" />
      <div>
        <strong>${vendor.displayName || vendor.businessName || 'Unnamed Vendor'}</strong>
        <div style="font-size:0.82rem; color:rgba(17,17,17,0.7);">${vendor.businessName || '-'}</div>
      </div>
    </div>
    <div class="vendor-card-info">
      <div><strong>Email:</strong> ${vendor.email || '-'}</div>
      <div><strong>Phone:</strong> ${vendor.phone || '-'}</div>
      <div><strong>Plan:</strong> <span class="${planClass}">${(vendor.planLabel || vendor.plan || 'Free').toUpperCase()}</span></div>
      <div><strong>Status:</strong> <span class="${statusClass}">${vendor.statusLabel || capitalise(vendor.status || 'active')}</span></div>
      <div><strong>Joined:</strong> ${vendor.createdAtFormatted || '-'}</div>
    </div>
    <div class="card-actions">
      <a class="view-btn" href="vendor-profile.php?id=${encodeURIComponent(vendor.id)}"><i class="ri-external-link-line"></i>View</a>
      <button class="notify-btn" data-action="notify" data-id="${vendor.id}"><i class="ri-chat-3-line"></i>Notify</button>
      <button class="suspend-btn" data-action="suspend" data-status="${vendor.status}" data-id="${vendor.id}">${vendor.status === 'suspended' ? '<i class="ri-shield-check-line"></i>Unsuspend' : '<i class="ri-shield-off-line"></i>Suspend'}</button>
      <button class="delete-btn" data-action="delete" data-id="${vendor.id}"><i class="ri-delete-bin-6-line"></i>Delete</button>
    </div>
  `;
  return card;
};

const renderVendors = (vendors = []) => {
  vendorTableBody.innerHTML = '';
  vendorCardList.innerHTML = '';

  if (!vendors.length) {
    renderEmptyState('No vendors match your current filters.');
    return;
  }

  if (emptyState) emptyState.hidden = true;

  vendors.forEach((vendor) => {
    vendorTableBody.appendChild(buildVendorRow(vendor));
    vendorCardList.appendChild(buildVendorCard(vendor));
  });
};

const updatePagination = (pagination = {}) => {
  const { page = 1, totalPages = 1, hasNext = false, total = 0 } = pagination;
  state.page = page;
  state.totalPages = Math.max(totalPages, 1);
  state.hasNext = hasNext;
  state.total = total;

  if (paginationEl) paginationEl.hidden = state.totalPages <= 1 && !state.hasNext && state.page <= 1;
  if (prevPageBtn) prevPageBtn.disabled = state.page <= 1;
  if (nextPageBtn) nextPageBtn.disabled = !state.hasNext;
  if (pageIndicator) pageIndicator.textContent = `Page ${state.page} of ${state.totalPages}`;
};

const buildQueryParams = () => {
  const params = new URLSearchParams();
  params.set('page', state.page);
  params.set('pageSize', state.pageSize);
  if (searchInput && searchInput.value.trim()) params.set('search', searchInput.value.trim());
  if (planFilter && planFilter.value) params.set('plan', planFilter.value);
  if (statusFilter && statusFilter.value) params.set('status', statusFilter.value);
  if (sortOrder && sortOrder.value) params.set('sort', sortOrder.value);
  return params;
};

const fetchVendors = async () => {
  toggleLoader(true);
  try {
    const params = buildQueryParams();
    const response = await fetch(`admin-vendors-data.php?${params.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || 'Unable to load vendors.');
    }

    const data = payload.data || {};
    const vendors = Array.isArray(data.vendors) ? data.vendors : [];
    renderVendors(vendors);
    renderCounts(data.counts || {});
    updatePagination(data.pagination || {});

    if (!vendors.length) {
      renderEmptyState('No vendors match your current filters.');
    }
  } catch (error) {
    console.error('Vendor load failed', error);
    renderEmptyState('Unable to load vendors at the moment.');
    showToast(error.message || 'Unable to load vendors.', true);
  } finally {
    toggleLoader(false);
  }
};

const handleAction = (event) => {
  const actionBtn = event.target.closest('button');
  if (!actionBtn) return;
  const action = actionBtn.dataset.action;
  if (!action) return;
  showToast('Vendor management actions will be available soon.', true);
};

const bindEvents = () => {
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const id = event.currentTarget.dataset.close;
      const modal = document.getElementById(id);
      if (modal) modal.classList.remove('show');
    });
  });

  backBtn?.addEventListener('click', () => {
    window.location.href = 'admin-dashboard.php';
  });

  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('admin-logout.php', { method: 'GET', credentials: 'same-origin' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      window.location.href = 'admin-login.php';
    }
  });

  notifyBell?.addEventListener('click', () => {
    if (notifyBadge) notifyBadge.style.display = 'none';
    showToast('Notification centre coming soon');
  });

  refreshBtn?.addEventListener('click', () => {
    showToast('Refreshing vendors…');
    fetchVendors();
  });

  clearFilters?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (planFilter) planFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (sortOrder) sortOrder.value = 'desc';
    resetPagination();
    fetchVendors();
  });

  searchInput?.addEventListener('input', () => {
    resetPagination();
    fetchVendors();
  });

  [planFilter, statusFilter, sortOrder].forEach((select) => {
    select?.addEventListener('change', () => {
      resetPagination();
      fetchVendors();
    });
  });

  prevPageBtn?.addEventListener('click', () => {
    if (state.page <= 1) return;
    state.page -= 1;
    fetchVendors();
  });

  nextPageBtn?.addEventListener('click', () => {
    if (!state.hasNext) return;
    state.page += 1;
    fetchVendors();
  });

  vendorTableBody?.addEventListener('click', handleAction);
  vendorCardList?.addEventListener('click', handleAction);

  confirmSuspendBtn?.addEventListener('click', () => {
    if (suspendModal) suspendModal.classList.remove('show');
    showToast('Suspension workflow will be available soon.', true);
  });

  confirmDeleteBtn?.addEventListener('click', () => {
    if (deleteModal) deleteModal.classList.remove('show');
    showToast('Deletion workflow will be available soon.', true);
  });

  confirmNotifyBtn?.addEventListener('click', () => {
    if (!notifyMessage || !notifyMessage.value.trim()) {
      showToast('Write a message before sending.', true);
      return;
    }
    if (notifyModal) notifyModal.classList.remove('show');
    showToast('Notification workflow will be available soon.', true);
  });

  [suspendModal, deleteModal, notifyModal].forEach((modal) => {
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.classList.remove('show');
      }
    });
  });
};

const initialise = async () => {
  const session = await ensureSession();
  if (!session) return;
  bindEvents();
  fetchVendors();
};

document.addEventListener('DOMContentLoaded', initialise);
