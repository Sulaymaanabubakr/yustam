import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  where,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const refreshBtn = document.getElementById('refreshBtn');
const loader = document.getElementById('loader');
const listingsContainer = document.getElementById('listingsContainer');
const tableBody = document.getElementById('tableBody');
const cardsContainer = document.getElementById('cardsContainer');
const emptyState = document.getElementById('emptyState');
const pagination = document.getElementById('pagination');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageIndicator = document.getElementById('pageIndicator');
const feedbackModal = document.getElementById('feedbackModal');
const deleteModal = document.getElementById('deleteModal');
const feedbackMessage = document.getElementById('feedbackMessage');
const cancelFeedback = document.getElementById('cancelFeedback');
const submitFeedback = document.getElementById('submitFeedback');
const cancelDelete = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');
const toast = document.getElementById('toast');
const notificationsBtn = document.getElementById('notificationsBtn');
const notificationBadge = document.getElementById('notificationBadge');

    const ensureSession = async () => {
      try {
        const response = await fetch('admin-session-status.php', {
          method: 'GET',
          credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Session invalid');
        return await response.json();
      } catch (error) {
        console.error('Admin session validation failed:', error);
        window.location.href = 'admin-login.php';
        return null;
      }
    };

    const PAGE_SIZE = 20;
    let allListings = [];
    let filteredListings = [];
    let currentPage = 1;
    let activeListingId = null;
    let activeDeleteId = null;
    let vendorsMap = new Map();
    let unsubscribeListings = null;

    const vendorDirectory = new Map();
    const listingDirectory = new Map();

    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const normaliseKey = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

    const storeVendorRecord = (record = {}) => {
      if (!record || typeof record !== 'object') return;
      const register = (prefix, value, normalise = false) => {
        if (value === undefined || value === null) return;
        const raw = String(value).trim();
        if (!raw) return;
        const key = normalise ? normaliseKey(raw) : raw;
        if (!key) return;
        vendorDirectory.set(`${prefix}:${key}`, record);
      };
      register('id', record.id);
      register('uid', record.uid || record.vendorUid, true);
      register('firebase', record.firebaseUid, true);
      register('email', record.email, true);
      register('business', record.businessName, true);
    };

    const findVendorRecord = (listing = {}) => {
      if (!listing || typeof listing !== 'object') return null;
      const candidates = [];
      const maybeAdd = (prefix, value, normalise = false) => {
        if (value === undefined || value === null) return;
        const raw = String(value).trim();
        if (!raw) return;
        candidates.push(`${prefix}:${normalise ? normaliseKey(raw) : raw}`);
      };
      maybeAdd('id', listing.vendorId ?? listing.vendorID ?? listing.vendor_id ?? '');
      maybeAdd('uid', listing.vendorUid ?? listing.vendorUID ?? listing.vendorFirebaseUid ?? '');
      maybeAdd('firebase', listing.vendorFirebaseUid ?? listing.vendorUid ?? '');
      maybeAdd('email', listing.vendorEmail ?? '');
      maybeAdd('business', listing.vendorBusinessName ?? listing.vendorBusiness ?? '');

      for (const key of candidates) {
        if (vendorDirectory.has(key)) {
          return vendorDirectory.get(key);
        }
      }
      return null;
    };

    const vendorLabelFromRecord = (record) => {
      if (!record) return '';
      return record.businessName || record.name || record.email || '';
    };

    const vendorPlanFromRecord = (record, fallback = 'Free') => {
      if (!record) return fallback;
      return record.plan || fallback;
    };

    const indexVendorRecord = (record = {}) => {
      const register = (key) => {
        if (!key) return;
        vendorsMap.set(String(key), record);
      };
      register(record.id);
      register(record.uid);
      register(record.vendorUid);
      register(record.firebaseUid);
      register(record.email);
    };

    const ingestVendorSummary = (vendors = []) => {
      vendors.forEach((vendor) => {
        const record = {
          id: vendor.id ?? '',
          uid: vendor.vendorUid || vendor.uid || '',
          vendorUid: vendor.vendorUid || vendor.uid || '',
          firebaseUid: vendor.firebaseUid || '',
          name: vendor.name || vendor.businessName || 'Vendor',
          businessName: vendor.businessName || '',
          email: vendor.email || '',
          plan: vendor.plan || '',
        };
        storeVendorRecord(record);
        indexVendorRecord(record);
      });
      if (allListings.length) {
        applyFilters();
      }
    };

    const resolveVendorMeta = (listing = {}) => {
      const primary = findVendorRecord(listing)
        || vendorsMap.get(listing.vendorId)
        || vendorsMap.get(listing.vendorID)
        || vendorsMap.get(listing.vendorUid)
        || vendorsMap.get(listing.vendorUID)
        || vendorsMap.get(listing.vendorFirebaseUid)
        || null;

      const fallbackName = listing.vendorName
        || listing.vendorBusinessName
        || listing.vendorEmail
        || '';

      const vendorName = vendorLabelFromRecord(primary) || fallbackName || 'Unknown Vendor';
      const vendorEmail = (primary && primary.email) || listing.vendorEmail || '';
      const vendorPlan = vendorPlanFromRecord(primary, listing.vendorPlan || listing.plan || 'Free');

      return {
        record: primary,
        name: vendorName,
        email: vendorEmail,
        plan: vendorPlan,
      };
    };

    async function seedVendorDirectory() {
      try {
        const response = await fetch('admin-vendors-summary.php', {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) return;
        ingestVendorSummary(payload.vendors || []);
      } catch (error) {
        console.error('Vendor directory preload failed:', error);
      }
    }

    function showToast(message, tone = 'success') {
      toast.textContent = message;
      toast.style.background = tone === 'error' ? 'rgba(216, 67, 21, 0.92)' : 'rgba(0, 77, 64, 0.92)';
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2400);
    }

    function toggleLoader(isLoading) {
      loader.classList.toggle('hidden', !isLoading);
      listingsContainer.classList.toggle('hidden', isLoading);
    }

    function formatDate(ts) {
      if (!ts) return '—';
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleString('en-NG', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    }

    function renderStatusChip(status) {
      const normalised = status ? status.toLowerCase() : 'pending';
      const classMap = {
        pending: 'status-chip status-pending',
        approved: 'status-chip status-approved',
        rejected: 'status-chip status-rejected'
      };
      const label = normalised.charAt(0).toUpperCase() + normalised.slice(1);
      return `<span class="${classMap[normalised] || classMap.pending}">${label}</span>`;
    }

    function renderActions(id, status = 'pending', vendorId = '') {
      const normalized = (status || 'pending').toLowerCase();
      const reviewed = normalized !== 'pending';
      const disabledAttr = reviewed ? 'disabled' : '';
      return `
        <div class="action-buttons" data-id="${id}" data-vendor="${vendorId}">
          <button class="btn-sm btn-approve" data-action="approve" data-id="${id}" data-vendor="${vendorId}" ${disabledAttr}><i class="ri-check-line"></i>Approve</button>
          <button class="btn-sm btn-reject" data-action="reject" data-id="${id}" data-vendor="${vendorId}" ${disabledAttr}><i class="ri-close-line"></i>Reject</button>
          <button class="btn-sm btn-delete" data-action="delete" data-id="${id}"><i class="ri-delete-bin-6-line"></i>Delete</button>
          <a class="btn-sm btn-view" href="admin-listing-detail.php?id=${id}" data-action="view"><i class="ri-external-link-line"></i>View</a>
        </div>
      `;
    }

    function applyFilters() {
      const search = searchInput.value.trim().toLowerCase();
      const category = categoryFilter.value;
      const status = statusFilter.value;

      filteredListings = allListings.filter(item => {
        const vendorMeta = resolveVendorMeta(item);
        const searchTargets = [
          item.title || '',
          vendorMeta.name || '',
          item.vendorEmail || '',
          vendorMeta.email || '',
        ].map((value) => value.toLowerCase());

        const matchesSearch = !search || searchTargets.some((value) => value && value.includes(search));
        const matchesCategory = category === 'all' || (item.category || '').toLowerCase() === category.toLowerCase();
        const matchesStatus = status === 'all' || (item.status || 'pending') === status;
        return matchesSearch && matchesCategory && matchesStatus;
      });

      currentPage = 1;
      renderListings();
    }

    function paginateListings() {
      const total = filteredListings.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      currentPage = Math.min(currentPage, totalPages);
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const pageItems = filteredListings.slice(start, end);

      pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
      prevPage.disabled = currentPage === 1;
      nextPage.disabled = currentPage === totalPages;
      pagination.classList.toggle('hidden', total <= PAGE_SIZE);
      return pageItems;
    }

    function renderTableRows(items) {
      tableBody.innerHTML = items.map(item => {
        listingDirectory.set(item.id, item);
        const vendorMeta = resolveVendorMeta(item);
        const images = Array.isArray(item.images) && item.images.length
          ? item.images
          : Array.isArray(item.imageUrls) ? item.imageUrls : [];
        const thumb = images.length ? images[0] : 'https://placehold.co/80x80?text=YUS';
        const title = item.title || item.productTitle || item.productName || item.subcategory || 'Untitled listing';
        return `
          <tr data-id="${item.id}">
            <td>
              <div style="display:flex;align-items:center;gap:14px;">
                <img src="${thumb}" alt="${escapeHtml(title)}" class="thumb" />
                <div>
                  <strong>${escapeHtml(title)}</strong>
                  <div style="font-size:13px;color:rgba(17,17,17,0.6);">${escapeHtml(item.subcategory || '')}</div>
                </div>
              </div>
            </td>
            <td>${escapeHtml(item.category || '-')}</td>
            <td>
              <div style="display:flex;flex-direction:column;gap:2px;">
                <span>${escapeHtml(vendorMeta.name)}</span>
                <small style="color:rgba(17,17,17,0.6);">${escapeHtml(vendorMeta.email)}</small>
              </div>
            </td>
            <td>${escapeHtml(vendorMeta.plan)}</td>
            <td>${renderStatusChip(item.status)}</td>
            <td>${formatDate(item.createdAt)}</td>
            <td>${renderActions(item.id, item.status, item.vendorId || '')}</td>
          </tr>
        `;
      }).join('');

      if (!items.length) {
        tableBody.innerHTML = '';
      }
    }

    function renderCards(items) {
      cardsContainer.innerHTML = items.map(item => {
        listingDirectory.set(item.id, item);
        const vendorMeta = resolveVendorMeta(item);
        const images = Array.isArray(item.images) && item.images.length
          ? item.images
          : Array.isArray(item.imageUrls) ? item.imageUrls : [];
        const thumb = images.length ? images[0] : 'https://placehold.co/80x80?text=YUS';
        const title = item.title || item.productTitle || item.productName || item.subcategory || 'Untitled listing';
        return `
          <article class="mobile-card" data-id="${item.id}">
            <div class="mobile-card-header">
              <img src="${thumb}" alt="${escapeHtml(title)}" class="thumb" style="width:64px;height:64px;" />
              <div>
                <h4>${escapeHtml(title)}</h4>
                ${renderStatusChip(item.status)}
              </div>
            </div>
            <div class="mobile-meta">
              <span><strong>Category:</strong> ${escapeHtml(item.category || '-')} &middot; ${escapeHtml(item.subcategory || '')}</span>
              <span><strong>Vendor:</strong> ${escapeHtml(vendorMeta.name)} (${escapeHtml(vendorMeta.plan)})</span>
              <span><strong>Date:</strong> ${formatDate(item.createdAt)}</span>
            </div>
            <div class="mobile-actions" data-id="${item.id}">
              <button class="btn-sm btn-approve" data-action="approve" data-vendor="${item.vendorId || ''}" ${(item.status || 'pending').toLowerCase() !== 'pending' ? 'disabled' : ''}><i class="ri-check-line"></i>Approve</button>
              <button class="btn-sm btn-reject" data-action="reject" data-vendor="${item.vendorId || ''}" ${(item.status || 'pending').toLowerCase() !== 'pending' ? 'disabled' : ''}><i class="ri-close-line"></i>Reject</button>
              <button class="btn-sm btn-delete" data-action="delete"><i class="ri-delete-bin-6-line"></i>Delete</button>
              <a class="btn-sm btn-view" href="admin-listing-detail.php?id=${item.id}" data-action="view"><i class="ri-external-link-line"></i>View</a>
            </div>
          </article>
        `;
      }).join('');
    }

    function setListingReviewedState(listingId, status) {
      const label = status.charAt(0).toUpperCase() + status.slice(1);
      const chipClass = status === 'approved' ? 'status-chip status-approved' : status === 'rejected' ? 'status-chip status-rejected' : 'status-chip status-pending';
      document.querySelectorAll(`[data-id="${listingId}"]`).forEach(container => {
        const approveBtn = container.querySelector('[data-action="approve"]');
        const rejectBtn = container.querySelector('[data-action="reject"]');
        if (approveBtn) approveBtn.disabled = true;
        if (rejectBtn) rejectBtn.disabled = true;
        const chip = container.querySelector('.status-chip');
        if (chip) {
          chip.className = chipClass;
          chip.textContent = label;
        }
      });
    }

    function updateListingLocalState(listingId, status) {
      const updateStatus = (list) => {
        const found = list.find(item => item.id === listingId);
        if (found) {
          found.status = status;
        }
      };
      updateStatus(allListings);
      updateStatus(filteredListings);
      setListingReviewedState(listingId, status);
      if (statusFilter.value === 'pending') {
        applyFilters();
      }
    }

    function renderListings() {
      listingDirectory.clear();
      const pageItems = paginateListings();
      renderTableRows(pageItems);
      renderCards(pageItems);
      const hasItems = pageItems.length > 0;
      emptyState.classList.toggle('hidden', hasItems);
      tableBody.parentElement.parentElement.classList.toggle('hidden', !hasItems);
    }

    function openFeedbackModal(listingId) {
      activeListingId = listingId;
      feedbackMessage.value = '';
      feedbackModal.classList.add('active');
      feedbackModal.setAttribute('aria-hidden', 'false');
      feedbackMessage.focus();
    }

    function closeFeedbackModal() {
      activeListingId = null;
      feedbackModal.classList.remove('active');
      feedbackModal.setAttribute('aria-hidden', 'true');
    }

    function openDeleteModal(listingId) {
      activeDeleteId = listingId;
      deleteModal.classList.add('active');
      deleteModal.setAttribute('aria-hidden', 'false');
    }

    function closeDeleteModal() {
      activeDeleteId = null;
      deleteModal.classList.remove('active');
      deleteModal.setAttribute('aria-hidden', 'true');
    }

    async function performListingAction(listingId, action, extra = {}) {
      const body = new URLSearchParams({ listingId, action });
      if (extra.reason) body.append('reason', extra.reason);
      const response = await fetch('admin-listing-action.php', {
        method: 'POST',
        credentials: 'same-origin',
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Listing action failed.');
      }
      return payload;
    }

    async function approveListing(listingId) {
      try {
        await performListingAction(listingId, 'approve');
        showToast('Listing approved successfully.');
        updateListingLocalState(listingId, 'approved');
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Failed to approve listing.', 'error');
      }
    }

    async function rejectListing(reason) {
      if (!activeListingId) return;
      try {
        await performListingAction(activeListingId, 'reject', { reason });
        showToast('Feedback sent to vendor.');
        updateListingLocalState(activeListingId, 'rejected');
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Failed to reject listing.', 'error');
      } finally {
        closeFeedbackModal();
      }
    }

    async function deleteListing() {
      if (!activeDeleteId) return;
      try {
        await performListingAction(activeDeleteId, 'delete');
        showToast('Listing deleted permanently.');
        allListings = allListings.filter(item => item.id !== activeDeleteId);
        filteredListings = filteredListings.filter(item => item.id !== activeDeleteId);
        renderListings();
      } catch (error) {
        console.error(error);
        showToast(error.message || 'Failed to delete listing.', 'error');
      } finally {
        closeDeleteModal();
      }
    }

    function handleActionClick(event) {
      const actionBtn = event.target.closest('[data-action]');
      if (!actionBtn) return;
      const wrapper = actionBtn.closest('[data-id]');
      const listingId = wrapper?.dataset.id;
      if (!listingId) return;

      const action = actionBtn.dataset.action;
      switch (action) {
        case 'approve':
          approveListing(listingId);
          break;
        case 'reject':
          openFeedbackModal(listingId);
          break;
        case 'delete':
          openDeleteModal(listingId);
          break;
        default:
          break;
      }
    }

    function attachActionListeners() {
      tableBody.addEventListener('click', handleActionClick);
      cardsContainer.addEventListener('click', handleActionClick);
    }

    async function fetchVendors() {
      const vendorsQuery = query(collection(db, 'vendors'));
      onSnapshot(vendorsQuery, snapshot => {
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data() || {};
          const record = {
            id: docSnap.id,
            uid: data.vendorUid || data.vendorUID || data.uid || '',
            vendorUid: data.vendorUid || data.vendorUID || data.uid || '',
            firebaseUid: data.firebaseUid || data.vendorFirebaseUid || data.uid || '',
            name: data.displayName || data.name || data.businessName || 'Vendor',
            businessName: data.businessName || data.storeName || '',
            email: data.email || '',
            plan: data.plan || data.currentPlan || '',
            profilePhoto: data.profilePhoto || data.avatarUrl || data.logoUrl || '',
            status: data.status || '',
          };
          storeVendorRecord(record);
          indexVendorRecord(record);
        });
        renderListings();
      });
    }

    function subscribeListings() {
      if (unsubscribeListings) {
        unsubscribeListings();
      }
      toggleLoader(true);
      const listingsQuery = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
      unsubscribeListings = onSnapshot(listingsQuery, snapshot => {
        allListings = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        toggleLoader(false);
        applyFilters();
      }, error => {
        console.error(error);
        toggleLoader(false);
        showToast('Unable to load listings.', 'error');
      });
    }

    function subscribeNotifications(adminId) {
      const notificationsRef = query(
        collection(db, 'notifications'),
        where('adminId', '==', adminId),
        where('read', '==', false)
      );

      onSnapshot(notificationsRef, snapshot => {
        const unread = snapshot.size;
        notificationBadge.classList.toggle('hidden', unread === 0);
      });
    }

    searchInput.addEventListener('input', () => applyFilters());
    categoryFilter.addEventListener('change', () => applyFilters());
    statusFilter.addEventListener('change', () => applyFilters());

    prevPage.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage -= 1;
        renderListings();
      }
    });

    nextPage.addEventListener('click', () => {
      const total = filteredListings.length;
      const totalPages = Math.ceil(total / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage += 1;
        renderListings();
      }
    });

    refreshBtn.addEventListener('click', () => {
      showToast('Refreshing listings…');
      subscribeListings();
    });

    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        await fetch('admin-logout.php', { method: 'GET', credentials: 'same-origin' });
        window.location.href = 'admin-login.php';
      } catch (error) {
        console.error(error);
        showToast('Unable to logout.', 'error');
      }
    });

    notificationsBtn.addEventListener('click', () => {
      notificationBadge.classList.add('hidden');
      showToast('Notifications panel coming soon.');
    });

    cancelFeedback.addEventListener('click', closeFeedbackModal);
    feedbackModal.addEventListener('click', (event) => {
      if (event.target === feedbackModal) {
        closeFeedbackModal();
      }
    });

    submitFeedback.addEventListener('click', () => {
      const reason = feedbackMessage.value.trim();
      if (!reason) {
        showToast('Feedback cannot be empty.', 'error');
        return;
      }
      rejectListing(reason);
    });

    cancelDelete.addEventListener('click', closeDeleteModal);
    deleteModal.addEventListener('click', (event) => {
      if (event.target === deleteModal) {
        closeDeleteModal();
      }
    });
    confirmDelete.addEventListener('click', deleteListing);

    attachActionListeners();

    onAuthStateChanged(auth, async (user) => {
      const session = await ensureSession();
      if (!session) {
        return;
      }
      try {
        if (user) {
          const adminRef = doc(db, 'admins', user.uid);
          const adminSnap = await getDoc(adminRef);
          if (!adminSnap.exists()) {
            window.location.href = 'index.html';
            return;
          }
        } else {
          console.warn('Auth admin user not available; continuing with PHP session only.');
        }
        await seedVendorDirectory();
        subscribeListings();
        fetchVendors();
        if (user) {
          subscribeNotifications(user.uid);
        }
      } catch (error) {
        console.error(error);
        window.location.href = 'index.html';
      }
    });

