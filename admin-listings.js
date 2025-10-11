import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
    import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
    import {
      getFirestore,
      collection,
      doc,
      getDoc,
      onSnapshot,
      query,
      orderBy,
      updateDoc,
      deleteDoc,
      addDoc,
      serverTimestamp,
      where
    } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
    import firebaseConfig from './firebase.js';

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

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

    const PAGE_SIZE = 20;
    let allListings = [];
    let filteredListings = [];
    let currentPage = 1;
    let activeListingId = null;
    let activeDeleteId = null;
    let vendorsMap = new Map();
    let unsubscribeListings = null;

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

    function renderActions(id) {
      return `
        <div class="action-buttons" data-id="${id}">
          <button class="btn-sm btn-approve" data-action="approve"><i class="ri-check-line"></i>Approve</button>
          <button class="btn-sm btn-reject" data-action="reject"><i class="ri-close-line"></i>Reject</button>
          <button class="btn-sm btn-delete" data-action="delete"><i class="ri-delete-bin-6-line"></i>Delete</button>
          <a class="btn-sm btn-view" href="admin-listing-detail.html?id=${id}" data-action="view"><i class="ri-external-link-line"></i>View</a>
        </div>
      `;
    }

    function applyFilters() {
      const search = searchInput.value.trim().toLowerCase();
      const category = categoryFilter.value;
      const status = statusFilter.value;

      filteredListings = allListings.filter(item => {
        const matchesSearch = !search || (item.title?.toLowerCase().includes(search) || item.vendorName?.toLowerCase().includes(search));
        const matchesCategory = category === 'all' || item.category === category;
        const matchesStatus = status === 'all' || item.status === status;
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
        const vendor = vendorsMap.get(item.vendorId) || {};
        const thumb = item.images?.[0] || 'https://via.placeholder.com/80x80.png?text=YUSTAM';
        return `
          <tr data-id="${item.id}">
            <td>
              <div style="display:flex;align-items:center;gap:14px;">
                <img src="${thumb}" alt="${item.title || 'Listing image'}" class="thumb" />
                <div>
                  <strong>${item.title || 'Untitled listing'}</strong>
                  <div style="font-size:13px;color:rgba(17,17,17,0.6);">${item.subcategory || ''}</div>
                </div>
              </div>
            </td>
            <td>${item.category || '—'}</td>
            <td>
              <div style="display:flex;flex-direction:column;gap:2px;">
                <span>${item.vendorName || vendor.displayName || 'Unknown Vendor'}</span>
                <small style="color:rgba(17,17,17,0.6);">${vendor.email || ''}</small>
              </div>
            </td>
            <td>${vendor.plan || item.plan || 'Free'}</td>
            <td>${renderStatusChip(item.status)}</td>
            <td>${formatDate(item.createdAt)}</td>
            <td>${renderActions(item.id)}</td>
          </tr>
        `;
      }).join('');

      if (!items.length) {
        tableBody.innerHTML = '';
      }
    }

    function renderCards(items) {
      cardsContainer.innerHTML = items.map(item => {
        const vendor = vendorsMap.get(item.vendorId) || {};
        const thumb = item.images?.[0] || 'https://via.placeholder.com/80x80.png?text=YUSTAM';
        return `
          <article class="mobile-card" data-id="${item.id}">
            <div class="mobile-card-header">
              <img src="${thumb}" alt="${item.title || 'Listing image'}" class="thumb" style="width:64px;height:64px;" />
              <div>
                <h4>${item.title || 'Untitled listing'}</h4>
                ${renderStatusChip(item.status)}
              </div>
            </div>
            <div class="mobile-meta">
              <span><strong>Category:</strong> ${item.category || '—'} &middot; ${item.subcategory || ''}</span>
              <span><strong>Vendor:</strong> ${item.vendorName || vendor.displayName || 'Unknown'} (${vendor.plan || item.plan || 'Free'})</span>
              <span><strong>Date:</strong> ${formatDate(item.createdAt)}</span>
            </div>
            <div class="mobile-actions" data-id="${item.id}">
              <button class="btn-sm btn-approve" data-action="approve"><i class="ri-check-line"></i>Approve</button>
              <button class="btn-sm btn-reject" data-action="reject"><i class="ri-close-line"></i>Reject</button>
              <button class="btn-sm btn-delete" data-action="delete"><i class="ri-delete-bin-6-line"></i>Delete</button>
              <a class="btn-sm btn-view" href="admin-listing-detail.html?id=${item.id}" data-action="view"><i class="ri-external-link-line"></i>View</a>
            </div>
          </article>
        `;
      }).join('');
    }

    function renderListings() {
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

    async function approveListing(listingId) {
      try {
        const listingRef = doc(db, 'listings', listingId);
        await updateDoc(listingRef, { status: 'approved', reviewedAt: serverTimestamp() });
        showToast('Listing approved successfully.');
      } catch (error) {
        console.error(error);
        showToast('Failed to approve listing.', 'error');
      }
    }

    async function rejectListing(reason) {
      if (!activeListingId) return;
      try {
        const listingRef = doc(db, 'listings', activeListingId);
        const listingSnapshot = await getDoc(listingRef);
        const listingData = listingSnapshot.data();

        await updateDoc(listingRef, {
          status: 'rejected',
          feedback: {
            reason,
            updatedAt: serverTimestamp(),
          },
          reviewedAt: serverTimestamp()
        });

        if (listingData?.vendorId) {
          await addDoc(collection(db, 'notifications'), {
            vendorId: listingData.vendorId,
            type: 'listing_rejected',
            listingId: activeListingId,
            message: reason,
            createdAt: serverTimestamp(),
            read: false
          });
        }

        showToast('Feedback sent to vendor.');
      } catch (error) {
        console.error(error);
        showToast('Failed to reject listing.', 'error');
      } finally {
        closeFeedbackModal();
      }
    }

    async function deleteListing() {
      if (!activeDeleteId) return;
      try {
        await deleteDoc(doc(db, 'listings', activeDeleteId));
        showToast('Listing deleted permanently.');
      } catch (error) {
        console.error(error);
        showToast('Failed to delete listing.', 'error');
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
          vendorsMap.set(docSnap.id, docSnap.data());
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
        window.location.href = 'admin-login.html';
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
      if (!user) {
        window.location.href = 'admin-login.html';
        return;
      }
      try {
        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
          window.location.href = 'index.html';
          return;
        }
        subscribeListings();
        fetchVendors();
        subscribeNotifications(user.uid);
      } catch (error) {
        console.error(error);
        window.location.href = 'index.html';
      }
    });
