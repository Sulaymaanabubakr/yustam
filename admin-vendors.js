import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
    import { getAuth, onAuthStateChanged, signOut, getIdTokenResult } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
    import { getFirestore, collection, doc, getDoc, query, where, orderBy, limit, startAfter, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
    import { app as importedApp, auth as importedAuth, db as importedDb } from './firebase.js';

    // Use existing app if available, otherwise init (defensive for direct open)
    const app = importedApp || initializeApp({});
    const auth = importedAuth || getAuth(app);
    const db = importedDb || getFirestore(app);

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
    const cascadeDelete = document.getElementById('cascadeDelete');

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

    let vendorsState = {
      data: [],
    };
    let pageIndex = 1;
    let pageCursors = [];
    let hasNextPage = false;

    let activeVendorId = null;
    let suspendAction = 'suspend';

    const pageSize = 20;

    const showToast = (message, isError = false) => {
      toastMessage.textContent = message;
      toast.style.background = isError ? '#d84315' : 'var(--emerald)';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2800);
    };

    const closeModal = (modal) => modal.classList.remove('show');
    const openModal = (modal) => modal.classList.add('show');

    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = document.getElementById(e.currentTarget.dataset.close);
        closeModal(target);
      });
    });

    backBtn.addEventListener('click', () => {
      window.location.href = 'admin.html';
    });

    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'admin-login.html';
    });

    notifyBell.addEventListener('click', () => {
      notifyBadge.style.display = 'none';
      showToast('Notification centre coming soon');
    });

    const resetPagination = () => {
      pageIndex = 1;
      pageCursors = [];
      hasNextPage = false;
    };

    const getVendorQuery = (startAfterDoc = null) => {
      const constraints = [];
      if (planFilter.value) {
        constraints.push(where('plan', '==', planFilter.value));
      }
      if (statusFilter.value) {
        constraints.push(where('status', '==', statusFilter.value));
      }
      constraints.push(orderBy('createdAt', sortOrder.value === 'asc' ? 'asc' : 'desc'));
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }
      constraints.push(limit(pageSize));
      return query(collection(db, 'vendors'), ...constraints);
    };

    const buildVendorRow = (vendor) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="vendor-info">
            <img src="${vendor.profilePhotoURL || 'https://i.pravatar.cc/100?img=12'}" alt="${vendor.displayName || vendor.businessName || 'Vendor'} avatar" />
            <div>
              <strong>${vendor.displayName || vendor.businessName || 'Unnamed Vendor'}</strong>
              <div style="font-size:0.8rem; color:rgba(17,17,17,0.6);">${vendor.businessName || '—'}</div>
            </div>
          </div>
        </td>
        <td>${vendor.email || '—'}</td>
        <td>${vendor.phone || '—'}</td>
        <td><span class="chip ${vendor.plan || 'free'}">${(vendor.plan || 'free').toUpperCase()}</span></td>
        <td><span class="status-badge status-${vendor.status || 'active'}"><i class="ri-shield-check-line"></i>${(vendor.status || 'active')}</span></td>
        <td>${vendor.createdAtFormatted || '—'}</td>
        <td>
          <div class="actions">
            <a class="view-btn" href="vendor-profile.html?id=${vendor.id}" title="View profile"><i class="ri-external-link-line"></i>View</a>
            <button class="notify-btn" data-action="notify" data-id="${vendor.id}"><i class="ri-chat-3-line"></i>Notify</button>
            <button class="suspend-btn" data-action="suspend" data-status="${vendor.status}" data-id="${vendor.id}">${vendor.status === 'suspended' ? '<i class=\'ri-shield-check-line\'></i>Unsuspend' : '<i class=\'ri-shield-off-line\'></i>Suspend'}</button>
            <button class="delete-btn" data-action="delete" data-id="${vendor.id}"><i class="ri-delete-bin-6-line"></i>Delete</button>
          </div>
        </td>`;
      return tr;
    };

    const buildVendorCard = (vendor) => {
      const card = document.createElement('article');
      card.className = 'vendor-card';
      card.innerHTML = `
        <div class="vendor-card-header">
          <img src="${vendor.profilePhotoURL || 'https://i.pravatar.cc/100?img=12'}" alt="${vendor.displayName || 'Vendor'} avatar" />
          <div>
            <strong>${vendor.displayName || vendor.businessName || 'Unnamed Vendor'}</strong>
            <div style="font-size:0.82rem; color:rgba(17,17,17,0.7);">${vendor.businessName || '—'}</div>
          </div>
        </div>
        <div class="vendor-card-info">
          <div><strong>Email:</strong> ${vendor.email || '—'}</div>
          <div><strong>Phone:</strong> ${vendor.phone || '—'}</div>
          <div><strong>Plan:</strong> <span class="chip ${vendor.plan || 'free'}">${(vendor.plan || 'free').toUpperCase()}</span></div>
          <div><strong>Status:</strong> <span class="status-badge status-${vendor.status || 'active'}">${vendor.status || 'active'}</span></div>
          <div><strong>Joined:</strong> ${vendor.createdAtFormatted || '—'}</div>
        </div>
        <div class="card-actions">
          <a class="view-btn" href="vendor-profile.html?id=${vendor.id}"><i class="ri-external-link-line"></i>View</a>
          <button class="notify-btn" data-action="notify" data-id="${vendor.id}"><i class="ri-chat-3-line"></i>Notify</button>
          <button class="suspend-btn" data-action="suspend" data-status="${vendor.status}" data-id="${vendor.id}">${vendor.status === 'suspended' ? '<i class=\'ri-shield-check-line\'></i>Unsuspend' : '<i class=\'ri-shield-off-line\'></i>Suspend'}</button>
          <button class="delete-btn" data-action="delete" data-id="${vendor.id}"><i class="ri-delete-bin-6-line"></i>Delete</button>
        </div>`;
      return card;
    };

    const renderVendors = () => {
      vendorTableBody.innerHTML = '';
      vendorCardList.innerHTML = '';

      if (!vendorsState.data.length) {
        emptyState.hidden = false;
        paginationEl.hidden = pageIndex === 1 && !hasNextPage;
        prevPageBtn.disabled = pageIndex === 1;
        nextPageBtn.disabled = !hasNextPage;
        pageIndicator.textContent = `Page ${pageIndex}`;
        return;
      }

      emptyState.hidden = true;

      vendorsState.data.forEach((vendor) => {
        vendorTableBody.appendChild(buildVendorRow(vendor));
        vendorCardList.appendChild(buildVendorCard(vendor));
      });

      const shouldShowPagination = pageIndex > 1 || hasNextPage;
      paginationEl.hidden = !shouldShowPagination;
      prevPageBtn.disabled = pageIndex === 1;
      nextPageBtn.disabled = !hasNextPage;
      pageIndicator.textContent = `Page ${pageIndex}`;
    };

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return null;
      try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch (error) {
        return '—';
      }
    };

    const fetchCounts = async () => {
      try {
        const plans = ['free', 'plus', 'pro', 'premium'];
        const counts = await Promise.all(
          plans.map(async (plan) => {
            const qPlan = query(collection(db, 'vendors'), where('plan', '==', plan));
            const snapshot = await getDocs(qPlan);
            return { plan, count: snapshot.size };
          })
        );
        counts.forEach(({ plan, count }) => {
          if (plan === 'free') freeCountEl.textContent = count;
          if (plan === 'plus') plusCountEl.textContent = count;
          if (plan === 'pro') proCountEl.textContent = count;
          if (plan === 'premium') premiumCountEl.textContent = count;
        });

        const totalSnapshot = await getDocs(collection(db, 'vendors'));
        totalVendorsEl.textContent = totalSnapshot.size;
        const suspendedSnapshot = await getDocs(query(collection(db, 'vendors'), where('status', '==', 'suspended')));
        suspendedCountEl.textContent = suspendedSnapshot.size;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weekSnapshot = await getDocs(query(collection(db, 'vendors'), where('updatedAt', '>=', Timestamp.fromDate(oneWeekAgo))));
        activeWeekEl.textContent = weekSnapshot.size || 0;
      } catch (error) {
        console.error('Count fetch failed', error);
      }
    };

    const loadNotifications = async (adminId) => {
      try {
        const notifSnapshot = await getDocs(query(collection(db, 'notifications'), where('adminId', '==', adminId), where('read', '==', false)));
        if (notifSnapshot.size) {
          notifyBadge.style.display = 'inline-flex';
          notifyBadge.textContent = notifSnapshot.size;
        }
      } catch (error) {
        console.warn('Notification load failed', error);
      }
    };

    const loadVendors = async () => {
      try {
        authLoader.classList.remove('hidden');
        const cursor = pageIndex > 1 ? pageCursors[pageIndex - 2] : null;
        const snapshot = await getDocs(getVendorQuery(cursor));

        hasNextPage = snapshot.size === pageSize;

        if (!snapshot.size && pageIndex > 1 && !searchInput.value.trim()) {
          pageIndex = Math.max(1, pageIndex - 1);
          authLoader.classList.add('hidden');
          return loadVendors();
        }

        if (snapshot.size) {
          pageCursors[pageIndex - 1] = snapshot.docs[snapshot.docs.length - 1];
        } else {
          pageCursors[pageIndex - 1] = cursor || null;
        }

        pageCursors = pageCursors.slice(0, pageIndex);

        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

        const filteredBySearch = items.filter((vendor) => {
          if (!searchInput.value.trim()) return true;
          const term = searchInput.value.toLowerCase();
          return [vendor.displayName, vendor.businessName, vendor.email, vendor.phone]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(term));
        });

        vendorsState.data = filteredBySearch.map((vendor) => ({
          ...vendor,
          createdAtFormatted: formatTimestamp(vendor.createdAt),
        }));

        renderVendors();
        authLoader.classList.add('hidden');
        mainContent.classList.add('ready');
      } catch (error) {
        console.error('Vendor load failed', error);
        showToast('Unable to load vendors', true);
        authLoader.classList.add('hidden');
      }
    };

    const refreshData = () => {
      resetPagination();
      loadVendors();
      fetchCounts();
    };

    const handleAction = async (event) => {
      const actionBtn = event.target.closest('button');
      if (!actionBtn) return;
      const { action, id, status } = actionBtn.dataset;
      if (!action || !id) return;

      activeVendorId = id;

      if (action === 'suspend') {
        suspendAction = status === 'suspended' ? 'unsuspend' : 'suspend';
        document.getElementById('suspendTitle').textContent = suspendAction === 'suspend' ? 'Suspend Vendor' : 'Unsuspend Vendor';
        document.getElementById('suspendText').textContent = suspendAction === 'suspend'
          ? 'Are you sure you want to suspend this vendor? They will lose access to posting and managing listings.'
          : 'Restore this vendor to active status? They regain full access instantly.';
        openModal(suspendModal);
      }

      if (action === 'delete') {
        cascadeDelete.checked = false;
        openModal(deleteModal);
      }

      if (action === 'notify') {
        notifyMessage.value = '';
        openModal(notifyModal);
      }
    };

    vendorTableBody.addEventListener('click', handleAction);
    vendorCardList.addEventListener('click', handleAction);

    confirmSuspendBtn.addEventListener('click', async () => {
      if (!activeVendorId) return;
      try {
        authLoader.classList.remove('hidden');
        const newStatus = suspendAction === 'suspend' ? 'suspended' : 'active';
        await updateDoc(doc(db, 'vendors', activeVendorId), {
          status: newStatus,
          statusUpdatedAt: serverTimestamp(),
        });
        await addDoc(collection(db, 'notifications'), {
          vendorId: activeVendorId,
          type: 'vendor_status',
          status: newStatus,
          createdAt: serverTimestamp(),
        });
        showToast(`Vendor ${newStatus === 'suspended' ? 'suspended' : 'reinstated'} successfully`);
        closeModal(suspendModal);
        refreshData();
      } catch (error) {
        console.error('Status update failed', error);
        showToast('Could not update vendor status', true);
      } finally {
        authLoader.classList.add('hidden');
      }
    });

    confirmDeleteBtn.addEventListener('click', async () => {
      if (!activeVendorId) return;
      try {
        authLoader.classList.remove('hidden');
        await deleteDoc(doc(db, 'vendors', activeVendorId));
        if (cascadeDelete.checked) {
          const listingSnapshot = await getDocs(query(collection(db, 'listings'), where('vendorID', '==', activeVendorId)));
          const batchDeletes = listingSnapshot.docs.map((docSnap) => deleteDoc(doc(db, 'listings', docSnap.id)));
          await Promise.all(batchDeletes);
        }
        showToast('Vendor removed successfully');
        closeModal(deleteModal);
        refreshData();
      } catch (error) {
        console.error('Vendor delete failed', error);
        showToast('Unable to delete vendor', true);
      } finally {
        authLoader.classList.add('hidden');
      }
    });

    confirmNotifyBtn.addEventListener('click', async () => {
      if (!activeVendorId || !notifyMessage.value.trim()) {
        showToast('Write a message before sending', true);
        return;
      }
      try {
        confirmNotifyBtn.disabled = true;
        confirmNotifyBtn.textContent = 'Sending…';
        await addDoc(collection(db, 'notifications'), {
          vendorId: activeVendorId,
          type: 'admin_message',
          message: notifyMessage.value.trim(),
          createdAt: serverTimestamp(),
        });
        showToast('Notification sent');
        closeModal(notifyModal);
      } catch (error) {
        console.error('Notification send failed', error);
        showToast('Failed to send notification', true);
      } finally {
        confirmNotifyBtn.disabled = false;
        confirmNotifyBtn.textContent = 'Send';
      }
    });

    refreshBtn.addEventListener('click', refreshData);
    clearFilters.addEventListener('click', () => {
      searchInput.value = '';
      planFilter.value = '';
      statusFilter.value = '';
      sortOrder.value = 'desc';
      refreshData();
    });

    ['input', 'change'].forEach((eventName) => {
      searchInput.addEventListener(eventName, () => {
        resetPagination();
        loadVendors();
      });
    });

    [planFilter, statusFilter, sortOrder].forEach((select) => {
      select.addEventListener('change', () => {
        resetPagination();
        loadVendors();
      });
    });

    prevPageBtn.addEventListener('click', () => {
      if (pageIndex <= 1) return;
      pageIndex -= 1;
      loadVendors();
    });

    nextPageBtn.addEventListener('click', () => {
      if (!hasNextPage) return;
      pageIndex += 1;
      loadVendors();
    });

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = 'admin-login.html';
        return;
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        const claims = await getIdTokenResult(user);
        const isAdmin = adminDoc.exists() || claims.claims.isAdmin === true;
        if (!isAdmin) {
          await signOut(auth);
          window.location.href = 'index.html';
          return;
        }
        await fetchCounts();
        await loadNotifications(user.uid);
        await loadVendors();
        authLoader.classList.add('hidden');
        mainContent.classList.add('ready');
      } catch (error) {
        console.error('Auth guard failed', error);
        authLoader.querySelector('p').innerHTML = 'Access error. <a href="admin-login.html" style="color:var(--orange);">Return to login</a>';
      }
    });
