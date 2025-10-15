import { auth, db } from './firebase.js';
        import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
        import { collection, doc, getDoc, setDoc, query, orderBy, limit, onSnapshot, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

        const dashboardContent = document.getElementById('dashboardContent');
        const loader = document.getElementById('loader');
        const toast = document.getElementById('toast');
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.querySelector('.menu-toggle');
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationsPanel = document.getElementById('notificationsPanel');
        const notificationBadge = document.getElementById('notificationBadge');
        const logoutBtn = document.getElementById('logoutBtn');

        const statsElements = {
            listings: document.querySelector('[data-stat="listings"]'),
            vendors: document.querySelector('[data-stat="vendors"]'),
            activePlans: document.querySelector('[data-stat="activePlans"]'),
            revenue: document.querySelector('[data-stat="revenue"]')
        };

        const planCountsEls = {
            free: document.querySelector('[data-plan-count="free"]'),
            plus: document.querySelector('[data-plan-count="plus"]'),
            pro: document.querySelector('[data-plan-count="pro"]'),
            premium: document.querySelector('[data-plan-count="premium"]')
        };

        const PLAN_PRICING = {
            plus: 3000,
            pro: 5000,
            premium: 7000
        };

        const escapeHtml = (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const slugifyPlan = (plan) => {
            if (!plan) return 'free';
            return String(plan)
                .toLowerCase()
                .replace(/plan/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-+|-+$)/g, '') || 'free';
        };

        const formatPlanLabel = (plan) => {
            if (!plan) return 'Free Plan';
            const trimmed = String(plan).trim();
            if (!trimmed) return 'Free Plan';
            const lower = trimmed.toLowerCase();
            return lower.endsWith('plan') ? trimmed : `${trimmed} Plan`;
        };

        const formatStatusLabel = (status) => {
            const value = String(status || '').trim();
            return value || 'Active';
        };

        const fallbackVendorAvatar = 'https://via.placeholder.com/80x80?text=VP';

        let selectedListingId = null;
        let selectedListingVendor = null;
        let notificationDocs = [];
        let vendorSummaryTimer = null;
        let vendorSummaryErrorShown = false;

        const recentListingsWrap = document.getElementById('recentListings');
        const noListings = document.getElementById('noListings');
        const recentVendorsWrap = document.getElementById('recentVendors');
        const noVendors = document.getElementById('noVendors');
        const feedbackModal = document.getElementById('feedbackModal');
        const feedbackReason = document.getElementById('feedbackReason');
        const cancelFeedback = document.getElementById('cancelFeedback');
        const sendFeedback = document.getElementById('sendFeedback');
        const revenueTotal = document.getElementById('revenueTotal');

        const formatCurrency = (value) => {
            return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
        };

        const showToast = (message, duration = 2000) => {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), duration);
        };

        const closeNotifications = () => {
            notificationsPanel.classList.remove('active');
            notificationBtn.setAttribute('aria-expanded', 'false');
        };

        const buildStatusClass = (status = 'pending') => {
            switch ((status || '').toLowerCase()) {
                case 'approved':
                    return 'status-chip status-approved';
                case 'rejected':
                    return 'status-chip status-rejected';
                default:
                    return 'status-chip status-pending';
            }
        };

        const toggleSidebar = () => {
            sidebar.classList.toggle('active');
        };

        const renderListings = (listings) => {
            recentListingsWrap.innerHTML = '';
            const pendingListings = listings.filter((listing) => ((listing.data().status || 'pending').toLowerCase() === 'pending'));
            if (!pendingListings.length) {
                noListings.style.display = 'block';
                return;
            }
            noListings.style.display = 'none';
            pendingListings.forEach((listing) => {
                const data = listing.data();
                const thumb = Array.isArray(data.images) && data.images.length ? data.images[0] : '';
                const card = document.createElement('article');
                card.className = 'listing-card';
                card.dataset.id = listing.id;
                card.innerHTML = `
                    <img class="listing-thumb" src="${thumb || 'https://via.placeholder.com/64x64?text=IMG'}" alt="${data.title || data.productName || 'Listing'} image">
                    <div class="listing-meta">
                        <div style="display:flex; justify-content:space-between; gap:0.75rem; align-items:flex-start; flex-wrap:wrap;">
                            <h3>${data.title || data.productName || 'Untitled listing'}</h3>
                            <span class="status-chip status-pending">Pending</span>
                        </div>
                        <span class="meta-line"><i class="ri-stack-line"></i> ${data.category || '—'} &middot; ${data.subcategory || '—'}</span>
                        <span class="meta-line"><i class="ri-user-smile-line"></i> ${data.vendorName || data.vendorEmail || 'Unknown vendor'}</span>
                        <div class="listing-actions">
                            <button class="btn btn-approve" data-action="approve" data-id="${listing.id}" data-vendor="${data.vendorID || ''}">Approve</button>
                            <button class="btn btn-reject" data-action="reject" data-id="${listing.id}" data-vendor="${data.vendorID || ''}">Reject</button>
                        </div>
                    </div>
                `;
                recentListingsWrap.appendChild(card);
            });
        };

        const removeListingCard = (listingId) => {
            const card = recentListingsWrap.querySelector(`[data-id="${listingId}"]`);
            if (card) {
                card.remove();
            }
            if (!recentListingsWrap.children.length) {
                noListings.style.display = 'block';
            }
        };

        const renderVendors = (vendors) => {
            recentVendorsWrap.innerHTML = '';
            if (!Array.isArray(vendors) || !vendors.length) {
                noVendors.style.display = 'block';
                return;
            }
            noVendors.style.display = 'none';
            vendors.forEach((vendor) => {
                const planLabel = formatPlanLabel(vendor.plan);
                const planSlug = vendor.planSlug || slugifyPlan(planLabel);
                const statusLabel = formatStatusLabel(vendor.status);
                const avatar = vendor.profilePhoto || fallbackVendorAvatar;
                const joinedMarkup = vendor.joined
                    ? `<small style="color:rgba(17,17,17,0.45); display:block; margin-top:4px;">Joined ${escapeHtml(vendor.joined)}</small>`
                    : '';
                const card = document.createElement('article');
                card.className = 'vendor-card';
                card.innerHTML = `
                    <img class="vendor-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(vendor.name || 'Vendor')} avatar">
                    <div class="vendor-meta">
                        <h3 style="font-size:1.05rem; color:var(--emerald);">${escapeHtml(vendor.name || 'Unnamed Vendor')}</h3>
                        <span class="meta-line">${escapeHtml(vendor.email || 'No email')}</span>
                        <span class="plan-chip plan-${escapeHtml(planSlug)}">${escapeHtml(planLabel)}</span>
                        <small style="color:rgba(17,17,17,0.6); font-weight:600;">${escapeHtml(statusLabel)}</small>
                        ${joinedMarkup}
                    </div>
                `;
                recentVendorsWrap.appendChild(card);
            });
        };

        const applyPlanSummary = (summary = {}) => {
            const counts = {
                free: 0,
                plus: 0,
                pro: 0,
                premium: 0,
                ...(summary.planCounts || {}),
            };
            Object.entries(counts).forEach(([plan, count]) => {
                if (planCountsEls[plan]) {
                    planCountsEls[plan].textContent = count.toString();
                }
            });
            const revenue = summary.revenue ?? ((counts.plus * PLAN_PRICING.plus) + (counts.pro * PLAN_PRICING.pro) + (counts.premium * PLAN_PRICING.premium));
            revenueTotal.textContent = formatCurrency(revenue);
            const activePlans = summary.activePlans ?? (counts.plus + counts.pro + counts.premium);
            statsElements.activePlans.textContent = activePlans.toString();
            statsElements.revenue.textContent = formatCurrency(revenue);
        };

        const normaliseVendorRecords = (vendors) => {
            if (!Array.isArray(vendors)) return [];
            return vendors.map((vendor) => {
                const planLabel = formatPlanLabel(vendor.plan);
                const joinedDisplay = (vendor.joined && vendor.joined !== '-') ? vendor.joined : '';
                return {
                    id: vendor.id ?? '',
                    name: vendor.name || vendor.businessName || 'Vendor',
                    email: vendor.email || '',
                    plan: planLabel,
                    planSlug: vendor.planSlug || slugifyPlan(planLabel),
                    status: vendor.status || '',
                    profilePhoto: vendor.profilePhoto || '',
                    joined: joinedDisplay,
                };
            });
        };

        const fetchVendorSummary = async () => {
            try {
                const response = await fetch('admin-vendors-summary.php', {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' },
                });
                const payload = await response.json();
                if (!response.ok || !payload?.success) {
                    throw new Error(payload?.message || 'Unable to load vendor summary.');
                }
                const vendors = normaliseVendorRecords(payload.vendors || []);
                renderVendors(vendors);
                applyPlanSummary(payload.summary || {});
                const total = payload.summary?.total ?? vendors.length;
                statsElements.vendors.textContent = total.toString();
                vendorSummaryErrorShown = false;
            } catch (error) {
                console.error('Vendor summary load failed:', error);
                if (!vendorSummaryErrorShown) {
                    showToast('Unable to load vendor summary.', 2600);
                    vendorSummaryErrorShown = true;
                }
            }
        };

        const approveListing = async (listingId) => {
            try {
                await updateDoc(doc(db, 'listings', listingId), {
                    status: 'approved',
                    statusUpdatedAt: serverTimestamp()
                });
                showToast('Listing approved!');
                removeListingCard(listingId);
            } catch (error) {
                console.error('approveListing', error);
                showToast('Could not approve listing.', 2500);
            }
        };

        const openRejectModal = (listingId, vendorId) => {
            selectedListingId = listingId;
            selectedListingVendor = vendorId;
            feedbackReason.value = '';
            feedbackModal.classList.add('active');
        };

        const closeRejectModal = () => {
            selectedListingId = null;
            selectedListingVendor = null;
            feedbackModal.classList.remove('active');
        };

        const rejectListing = async () => {
            if (!selectedListingId) return;
            const reason = feedbackReason.value.trim();
            if (!reason) {
                showToast('Please provide a rejection reason.', 2200);
                return;
            }
            sendFeedback.disabled = true;
            try {
                await updateDoc(doc(db, 'listings', selectedListingId), {
                    status: 'rejected',
                    feedback: { reason, updatedAt: serverTimestamp() }
                });
                if (selectedListingVendor) {
                    await addDoc(collection(db, 'notifications'), {
                        vendorID: selectedListingVendor,
                        type: 'listing-rejected',
                        message: reason,
                        listingId: selectedListingId,
                        read: false,
                        createdAt: serverTimestamp()
                    });
                }
                showToast('Feedback sent to vendor.');
                removeListingCard(selectedListingId);
                closeRejectModal();
            } catch (error) {
                console.error('rejectListing', error);
                showToast('Could not reject listing.', 2500);
            } finally {
                sendFeedback.disabled = false;
            }
        };

        const markNotificationsRead = async () => {
            const updates = notificationDocs
                .filter((item) => item.data()?.read === false)
                .map((item) => updateDoc(doc(db, 'notifications', item.id), { read: true }));
            try {
                await Promise.all(updates);
            } catch (error) {
                console.error('markNotificationsRead', error);
            }
        };

        const renderNotifications = (docs) => {
            notificationDocs = docs;
            notificationsPanel.innerHTML = '';
            if (!docs.length) {
                notificationsPanel.innerHTML = '<p style="margin:0; color:rgba(17,17,17,0.6);">No new notifications.</p>';
                notificationBadge.hidden = true;
                return;
            }
            docs.forEach((snap) => {
                const data = snap.data();
                const title = data.title || (data.type === 'listing-rejected' ? 'Listing rejected' : 'New activity');
                const message = data.message || (data.type === 'listing-approved' ? 'A listing was approved.' : 'You have a new update.');
                const item = document.createElement('div');
                item.className = 'notification-item';
                item.innerHTML = `
                    <strong>${title}</strong>
                    <span>${message}</span>
                    <small>${data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : ''}</small>
                `;
                notificationsPanel.appendChild(item);
            });
            const unreadCount = docs.filter((snap) => snap.data()?.read === false).length;
            if (unreadCount > 0) {
                notificationBadge.hidden = false;
                notificationBadge.textContent = unreadCount;
            } else {
                notificationBadge.hidden = true;
            }
        };

        const attachListingActions = () => {
            recentListingsWrap.addEventListener('click', (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const button = target.closest('button[data-action]');
                if (!button) return;
                const action = button.dataset.action;
                const id = button.dataset.id || button.closest('[data-id]')?.dataset.id;
                if (!action || !id) return;
                if (action === 'approve') {
                    approveListing(id);
                }
                if (action === 'reject') {
                    const vendorId = button.dataset.vendor || button.closest('[data-vendor]')?.dataset.vendor || null;
                    openRejectModal(id, vendorId);
                }
            });
        };

          const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const ensureAdminRecord = async (user) => {
            const uidRef = doc(db, 'admins', user.uid);
            let adminSnap = await getDoc(uidRef);

            if (adminSnap.exists()) {
                return adminSnap;
            }

            const emailId = (user.email || '').toLowerCase();
            if (emailId) {
                const legacyRef = doc(db, 'admins', emailId);
                const legacySnap = await getDoc(legacyRef);
                if (legacySnap.exists()) {
                    adminSnap = legacySnap;
                    try {
                        await setDoc(
                            uidRef,
                            {
                                ...legacySnap.data(),
                                migratedFrom: legacyRef.id,
                                migratedAt: serverTimestamp(),
                            },
                            { merge: true },
                        );
                    } catch (migrationError) {
                        console.warn('Failed to migrate admin record to UID key', migrationError);
                    }
                    return adminSnap;
                }
            }

            try {
                await setDoc(
                    uidRef,
                    {
                        email: emailId,
                        name: user.displayName || '',
                        role: 'owner',
                        createdAt: serverTimestamp(),
                        lastLoginAt: serverTimestamp(),
                    },
                    { merge: true },
                );
                return await getDoc(uidRef);
            } catch (creationError) {
                console.error('Failed to create admin record', creationError);
                throw creationError;
            }
        };

        const withRetries = async (fn, attempts = 3, delay = 700) => {
            let attempt = 0;
            while (attempt < attempts) {
                try {
                    return await fn();
                } catch (error) {
                    attempt += 1;
                    if (attempt >= attempts) throw error;
                    await sleep(delay);
                }
            }
            return null;
        };

        const ensureSession = async () => {
            try {
                const response = await fetch('admin-session-status.php', {
                    method: 'GET',
                    credentials: 'same-origin'
                });
                if (!response.ok) throw new Error('Session invalid');
                return await response.json();
            } catch (error) {
                console.error('Admin session validation failed:', error);
                window.location.href = 'admin-login.php';
                return null;
            }
        };

        const initAuth = () => {
            onAuthStateChanged(auth, async (user) => {
                const session = await ensureSession();
                if (!session) {
                    return;
                }

                try {
                    if (user) {
                        const adminSnap = await withRetries(() => ensureAdminRecord(user), 3, 900);

                        if (!adminSnap || !adminSnap.exists()) {
                            console.warn('Admin record still missing after retries, redirecting to homepage.');
                            window.location.href = 'index.html';
                            return;
                        }
                    } else {
                        console.warn('Firebase admin user not available; continuing with PHP session only.');
                    }

                    loader.hidden = true;
                    dashboardContent.hidden = false;
                    attachListingActions();
                    hydrateData();
                } catch (error) {
                    console.error('auth guard error', error);
                    window.location.href = 'index.html';
                }
            });
        };

        const hydrateData = () => {
            const listingsQuery = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(8));
            onSnapshot(listingsQuery, (snapshot) => {
                renderListings(snapshot.docs);
            });

            onSnapshot(collection(db, 'listings'), (snapshot) => {
                statsElements.listings.textContent = snapshot.size.toString();
            });

            fetchVendorSummary();
            if (vendorSummaryTimer) {
                clearInterval(vendorSummaryTimer);
            }
            vendorSummaryTimer = setInterval(fetchVendorSummary, 60000);

            const notificationsQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(6));
            onSnapshot(notificationsQuery, (snapshot) => {
                renderNotifications(snapshot.docs);
            });
        };

        menuToggle?.addEventListener('click', toggleSidebar);
        sidebar?.addEventListener('click', (event) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.closest('.nav-link')) {
                sidebar.classList.remove('active');
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                sidebar.classList.remove('active');
            }
        });

        logoutBtn?.addEventListener('click', async () => {
            try {
                await signOut(auth);
            } catch (error) {
                console.error('logout error', error);
            } finally {
                try {
                    await fetch('admin-logout.php', { method: 'GET', credentials: 'same-origin' });
                } catch (logoutError) {
                    console.error('Admin session logout failed:', logoutError);
                }
                window.location.href = 'admin-login.php';
            }
        });

        notificationBtn?.addEventListener('click', () => {
            const isActive = notificationsPanel.classList.toggle('active');
            notificationBtn.setAttribute('aria-expanded', String(isActive));
            if (isActive) markNotificationsRead();
        });

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (!notificationsPanel.contains(target) && !notificationBtn.contains(target)) {
                closeNotifications();
            }
        });

        cancelFeedback.addEventListener('click', closeRejectModal);
        feedbackModal.addEventListener('click', (event) => {
            if (event.target === feedbackModal) closeRejectModal();
        });
        sendFeedback.addEventListener('click', rejectListing);

        initAuth();

