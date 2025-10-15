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
const suspendTitle = document.getElementById('suspendTitle');
const suspendText = document.getElementById('suspendText');
const confirmSuspendBtn = document.getElementById('confirmSuspend');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const confirmNotifyBtn = document.getElementById('confirmNotify');
const notifyMessage = document.getElementById('notifyMessage');
const cascadeDelete = document.getElementById('cascadeDelete');

const vendorProfileModal = document.getElementById('vendorProfileModal');
const vendorPreviewAvatar = document.getElementById('vendorPreviewAvatar');
const vendorPreviewTitle = document.getElementById('vendorPreviewTitle');
const vendorPreviewBusiness = document.getElementById('vendorPreviewBusiness');
const vendorPreviewPlanChip = document.getElementById('vendorPreviewPlan');
const vendorPreviewStatusChip = document.getElementById('vendorPreviewStatus');
const vendorPreviewVerificationChip = document.getElementById('vendorPreviewVerification');
const vendorPreviewId = document.getElementById('vendorPreviewId');
const vendorPreviewVerificationText = document.getElementById('vendorPreviewVerificationText');
const vendorPreviewStatusText = document.getElementById('vendorPreviewStatusText');
const vendorPreviewPlanText = document.getElementById('vendorPreviewPlanText');
const vendorPreviewPhone = document.getElementById('vendorPreviewPhone');
const vendorPreviewJoined = document.getElementById('vendorPreviewJoined');
const vendorPreviewStorefront = document.getElementById('vendorPreviewStorefront');

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
};

const vendorCache = new Map();

const pendingAction = {
  vendorId: null,
  intent: null,
  status: 'active',
  name: 'Vendor',
};

const showToast = (message, isError = false) => {
  if (!toast || !toastMessage) return;
  toastMessage.textContent = message;
  toast.style.background = isError ? '#d84315' : 'var(--emerald)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
};

const toggleLoader = (isLoading) => {
  if (authLoader) authLoader.classList.toggle('hidden', !isLoading);
  if (!isLoading) {
    mainContent?.classList.add('ready');
  }
};

const ensureSession = async () => {
  try {
    const response = await fetch('admin-session-status.php', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Session invalid');
    return response.json();
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

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const titleCase = (value) => {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const computeInitials = (value, fallback = 'Vendor') => {
  const source = String(value || fallback || '').trim();
  if (!source) return fallback.slice(0, 2).toUpperCase();
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback.slice(0, 2).toUpperCase();
  const initials = (parts[0][0] || '') + (parts[1]?.[0] || '');
  return initials.toUpperCase();
};

const ensurePlanLabel = (label, fallback = 'Free') => {
  const base = String(label || fallback || '').trim();
  if (base === '') return 'Free Plan';
  return /plan$/i.test(base) ? base : `${base} Plan`;
};

const storefrontUrl = (vendorId) =>
  vendorId ? `vendor-storefront.php?vendorId=${encodeURIComponent(vendorId)}` : '#';

const applyChipState = (chip, baseClass, state, label) => {
  if (!chip) return;
  const normalisedState = String(state || 'default')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'default';
  chip.className = `vendor-chip ${baseClass} ${baseClass}-${normalisedState}`;
  chip.textContent = label || '';
};

const openVendorPreview = (vendor) => {
  if (!vendor || !vendorProfileModal) {
    showToast('Unable to load vendor preview.', true);
    return;
  }

  const displayName =
    vendor.displayName || vendor.businessName || vendor.name || `Vendor #${vendor.id}`;
  const businessName = vendor.businessName || '';
  const initials = computeInitials(displayName);
  const photo = vendor.profilePhoto || '';
  const planLabel = ensurePlanLabel(vendor.planLabel || vendor.plan || 'Free');
  const statusLabel = vendor.statusLabel || titleCase(vendor.status || 'active');
  const statusState = (vendor.status || 'active').toLowerCase();
  const verificationState = (vendor.verificationState || 'unverified').toLowerCase();
  const verificationLabel = vendor.verificationLabel || titleCase(verificationState.replace('-', ' '));

  if (vendorPreviewAvatar) {
    if (photo) {
      vendorPreviewAvatar.innerHTML = `<img src="${escapeHtml(photo)}" alt="${escapeHtml(displayName)} logo">`;
    } else {
      vendorPreviewAvatar.innerHTML = `<span>${escapeHtml(initials)}</span>`;
    }
  }

  if (vendorPreviewTitle) vendorPreviewTitle.textContent = displayName;
  if (vendorPreviewBusiness) {
    vendorPreviewBusiness.textContent = businessName;
    vendorPreviewBusiness.hidden = businessName.trim() === '';
  }

  applyChipState(vendorPreviewPlanChip, 'plan', vendor.planSlug || vendor.plan || 'free', planLabel);
  applyChipState(vendorPreviewStatusChip, 'status', statusState, statusLabel);
  applyChipState(vendorPreviewVerificationChip, 'verification', verificationState, verificationLabel);

  if (vendorPreviewId) vendorPreviewId.textContent = vendor.id ?? '—';
  if (vendorPreviewVerificationText) vendorPreviewVerificationText.textContent = verificationLabel || '—';
  if (vendorPreviewStatusText) vendorPreviewStatusText.textContent = statusLabel || '—';
  if (vendorPreviewPlanText) vendorPreviewPlanText.textContent = planLabel || '—';
  if (vendorPreviewPhone) vendorPreviewPhone.textContent = vendor.phone || '—';
  if (vendorPreviewJoined) vendorPreviewJoined.textContent = vendor.createdAtFormatted || '—';

  if (vendorPreviewStorefront) {
    vendorPreviewStorefront.href = storefrontUrl(vendor.id);
    vendorPreviewStorefront.classList.toggle('is-disabled', !vendor.id);
    vendorPreviewStorefront.setAttribute('aria-disabled', vendor.id ? 'false' : 'true');
  }

  vendorProfileModal.classList.add('show');
  vendorProfileModal.setAttribute('aria-hidden', 'false');
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

const showEmptyState = (message) => {
  if (emptyState) {
    emptyState.hidden = false;
    emptyState.innerHTML = `<p>${escapeHtml(message)}</p>`;
  }
  if (paginationEl) paginationEl.hidden = true;
  if (vendorTableBody) vendorTableBody.innerHTML = '';
  if (vendorCardList) vendorCardList.innerHTML = '';
};

const buildVendorRow = (vendor) => {
  const tr = document.createElement('tr');
  const planClass = `chip ${vendor.planSlug || vendor.plan || 'free'}`;
  const statusClass = `status-badge status-${vendor.status || 'active'}`;

  tr.innerHTML = `
    <td>
      <div class="vendor-info">
        <img src="${escapeHtml(vendor.profilePhoto || 'https://i.pravatar.cc/100?img=12')}" alt="${escapeHtml(vendor.displayName || vendor.businessName || 'Vendor')} avatar">
        <div>
          <strong>${escapeHtml(vendor.displayName || vendor.businessName || 'Unnamed Vendor')}</strong>
          <div style="font-size:0.8rem; color:rgba(17,17,17,0.6);">${escapeHtml(vendor.businessName || '-')}</div>
        </div>
      </div>
    </td>
    <td>${escapeHtml(vendor.email || '-')}</td>
    <td>${escapeHtml(vendor.phone || '-')}</td>
    <td><span class="${planClass}">${escapeHtml((vendor.planLabel || vendor.plan || 'Free').toUpperCase())}</span></td>
    <td><span class="${statusClass}"><i class="ri-shield-check-line"></i>${escapeHtml(vendor.statusLabel || titleCase(vendor.status || 'active'))}</span></td>
    <td>${escapeHtml(vendor.createdAtFormatted || '-')}</td>
    <td>
      <div class="actions">
        <button class="view-btn" type="button" data-action="view" data-id="${vendor.id}" data-name="${escapeHtml(vendor.displayName || vendor.businessName || 'Vendor')}"><i class="ri-eye-line"></i>Quick View</button>
        <button class="notify-btn" data-action="notify" data-id="${vendor.id}" data-name="${escapeHtml(vendor.displayName || vendor.businessName || 'Vendor')}"><i class="ri-chat-3-line"></i>Notify</button>
        <button class="suspend-btn" data-action="suspend" data-status="${vendor.status || 'active'}" data-id="${vendor.id}" data-name="${escapeHtml(vendor.displayName || vendor.businessName || 'Vendor')}">${vendor.status === 'suspended' ? '<i class="ri-shield-check-line"></i>Unsuspend' : '<i class="ri-shield-off-line"></i>Suspend'}</button>
        <button class="delete-btn" data-action="delete" data-id="${vendor.id}" data-name="${escapeHtml(vendor.displayName || vendor.businessName || 'Vendor')}"><i class="ri-delete-bin-6-line"></i>Delete</button>
      </div>
    </td>
  `;

  return tr;
};

const buildVendorCard = (vendor) => {
  const card = document.createElement('article');
  card.className = 'vendor-card';
  const planClass = `chip ${vendor.planSlug || vendor.plan || 'free'}`;
  const statusClass = `status-badge status-${vendor.status || 'active'}`;

  card.innerHTML = `
    <div class="vendor-card-header">
      <img src="${escapeHtml(vendor.profilePhoto || 'https://i.pravatar.cc/100?img=12')}" alt="${escapeHtml(vendor.displayName || vendor.businessName || 'Vendor')} avatar">
      <div>
        <strong>${escapeHtml(vendor.displayName || vendor.businessName || 'Unnamed Vendor')}</strong>
        <div style="font-size:0.82rem; color:rgba(17,17,17,0.7);">${escapeHtml(vendor.businessName || '-')}</div>
      </div>
    </div>
    <div class="vendor-card-info">
      <div><strong>Email:</strong> ${escapeHtml(vendor.email || '-')}</div>
      <div><strong>Phone:</strong> ${escapeHtml(vendor.phone || '-')}</div>
      <div><strong>Plan:</strong> <span class="${planClass}">${escapeHtml((vendor.planLabel || vendor.plan || 'Free').toUpperCase())}</span></div>
      <div><strong>Status:</strong> <span class="${statusClass}">${escapeHtml(vendor.statusLabel || titleCase(vendor.status || 'active'))}</span></div>
      <div><strong>Joined:</strong> ${escapeHtml(vendor.createdAtFormatted || '-')}</div>
    </div>
    <div class="card-actions actions">
      <button class="view-btn" type="button" data-action="view" data-id="${vendor.id}" data-name="${escapeHtml(vendor.displayName || vendor.businessName || 'Vendor')}"><i class="ri-eye-line"></i>Quick View</button>
      <button class="notify-btn" data-action="notify" data-id="${vendor.id}" data-name="${escapeHtml(vendor.displayName || vendor.businessName || 'Vendor')}"><i class="ri-chat-3-line"></i>Notify</button>
      <button class="suspend-btn" data-action="suspend" data-status="${vendor.status || 'active'}" data-id="${vendor.id}" data-name="${escapeHtml(vendor.displayName || vendor.businessName || 'Vendor')}">${vendor.status === 'suspended' ? '<i class="ri-shield-check-line"></i>Unsuspend' : '<i class="ri-shield-off-line"></i>Suspend'}</button>
      <button class="delete-btn" data-action="delete" data-id="${vendor.id}" data-name="${escapeHtml(vendor.displayName || vendor.businessName || 'Vendor')}"><i class="ri-delete-bin-6-line"></i>Delete</button>
    </div>
  `;

  return card;
};

const renderVendors = (vendors = []) => {
  if (vendorTableBody) vendorTableBody.innerHTML = '';
  if (vendorCardList) vendorCardList.innerHTML = '';
  vendorCache.clear();

  if (!vendors.length) {
    showEmptyState('No vendors match your current filters.');
    return;
  }

  if (emptyState) emptyState.hidden = true;

  vendors.forEach((vendor) => {
    vendorCache.set(String(vendor.id), vendor);
    vendorTableBody?.appendChild(buildVendorRow(vendor));
    vendorCardList?.appendChild(buildVendorCard(vendor));
  });
};

const updatePagination = (pagination = {}) => {
  const {
    page = 1,
    totalPages = 1,
    hasNext = false,
    total = 0,
  } = pagination;

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

  if (searchInput?.value.trim()) params.set('search', searchInput.value.trim());
  if (planFilter?.value) params.set('plan', planFilter.value);
  if (statusFilter?.value) params.set('status', statusFilter.value);
  if (sortOrder?.value) params.set('sort', sortOrder.value);

  return params;
};

const fetchVendors = async () => {
  toggleLoader(true);
  try {
    const response = await fetch(`admin-vendors-data.php?${buildQueryParams().toString()}`, {
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
      showEmptyState('No vendors match your current filters.');
    }
  } catch (error) {
    console.error('Vendor load failed:', error);
    showEmptyState('Unable to load vendors at the moment.');
    showToast(error.message || 'Unable to load vendors.', true);
  } finally {
    toggleLoader(false);
  }
};

const closeModal = (modal) => {
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
};

const performVendorAction = async (payload) => {
  try {
    const response = await fetch('admin-vendors-action.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result?.success) {
      throw new Error(result?.message || 'Unable to complete that action.');
    }

    showToast(result.message || 'Action completed successfully.');
    await fetchVendors();
    pendingAction.vendorId = null;
    pendingAction.intent = null;
    pendingAction.status = 'active';
  } catch (error) {
    console.error('Vendor action failed:', error);
    showToast(error.message || 'Unable to complete that action.', true);
  }
};

const handleAction = (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const { action, id, status, name } = button.dataset;
  if (!action || !id) return;

  if (action === 'view') {
    const vendor = vendorCache.get(id);
    if (!vendor) {
      showToast('Unable to load vendor preview.', true);
      return;
    }
    openVendorPreview(vendor);
    return;
  }

  pendingAction.vendorId = id;
  pendingAction.name = name || 'Vendor';
  pendingAction.status = status || 'active';

  switch (action) {
    case 'notify':
      pendingAction.intent = 'notify';
      if (notifyMessage) notifyMessage.value = '';
      if (notifyModal) {
        notifyModal.classList.add('show');
        notifyModal.setAttribute('aria-hidden', 'false');
      }
      break;
    case 'delete':
      pendingAction.intent = 'delete';
      if (cascadeDelete) cascadeDelete.checked = false;
      if (deleteModal) {
        deleteModal.classList.add('show');
        deleteModal.setAttribute('aria-hidden', 'false');
      }
      break;
    case 'suspend': {
      const shouldSuspend = pendingAction.status !== 'suspended';
      pendingAction.intent = shouldSuspend ? 'suspend' : 'activate';

      if (suspendTitle) suspendTitle.textContent = shouldSuspend ? 'Suspend Vendor' : 'Unsuspend Vendor';
      if (suspendText) {
        suspendText.textContent = shouldSuspend
          ? `Suspend ${pendingAction.name}? They will lose access to posting and managing listings.`
          : `Are you sure you want to restore ${pendingAction.name} to active status?`;
      }

      if (suspendModal) {
        suspendModal.classList.add('show');
        suspendModal.setAttribute('aria-hidden', 'false');
      }
      break;
    }
    default:
      break;
  }
};

const bindEvents = () => {
  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const modalId = event.currentTarget.dataset.close;
      closeModal(document.getElementById(modalId));
    });
  });

  [suspendModal, deleteModal, notifyModal, vendorProfileModal].forEach((modal) => {
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  backBtn?.addEventListener('click', () => {
    window.location.href = 'admin-dashboard.php';
  });

  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('admin-logout.php', { method: 'GET', credentials: 'same-origin' });
    } catch (error) {
      console.error('Logout failed:', error);
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

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    [vendorProfileModal, suspendModal, deleteModal, notifyModal].forEach((modal) => {
      if (modal?.classList.contains('show')) {
        closeModal(modal);
      }
    });
  });

  confirmSuspendBtn?.addEventListener('click', () => {
    if (!pendingAction.vendorId || !pendingAction.intent) return;
    closeModal(suspendModal);
    performVendorAction({
      vendorId: pendingAction.vendorId,
      action: pendingAction.intent,
    });
  });

  confirmDeleteBtn?.addEventListener('click', () => {
    if (!pendingAction.vendorId) return;
    const cascade = Boolean(cascadeDelete?.checked);
    closeModal(deleteModal);
    performVendorAction({
      vendorId: pendingAction.vendorId,
      action: 'delete',
      cascade,
    });
  });

  confirmNotifyBtn?.addEventListener('click', () => {
    const message = notifyMessage?.value.trim();
    if (!pendingAction.vendorId || !message) {
      showToast('Write a message before sending.', true);
      return;
    }
    closeModal(notifyModal);
    performVendorAction({
      vendorId: pendingAction.vendorId,
      action: 'notify',
      message,
    });
  });
};

const initialise = async () => {
  const session = await ensureSession();
  if (!session) return;

  bindEvents();
  fetchVendors();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialise);
} else {
  initialise();
}
