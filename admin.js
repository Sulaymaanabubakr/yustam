import { auth, db } from './firebase.js';
import { displayPlanLabel, normalisePlanSlug } from './plan-utils.js';
import { adminAPI } from './admin-api.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
    updateDoc,
    addDoc,
    serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

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
            starter: document.querySelector('[data-plan-count="starter"]'),
            pro: document.querySelector('[data-plan-count="pro"]'),
            elite: document.querySelector('[data-plan-count="elite"]'),
            power: document.querySelector('[data-plan-count="power"]')
        };

        const urlParams = new URLSearchParams(window.location.search);
        const parseVendorIdParam = (value) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        };

        const initialReviewVendorId = parseVendorIdParam(
            urlParams.get('reviewVendor') || urlParams.get('vendorId') || urlParams.get('vendor')
        );

        const reviewSelectors = {
            list: document.getElementById('reviewsList'),
            average: document.getElementById('reviewsAverage'),
            total: document.getElementById('reviewsTotal'),
            message: document.getElementById('reviewsMessage'),
            empty: document.getElementById('reviewsEmpty'),
            filter: document.getElementById('reviewStatusFilter'),
            refresh: document.getElementById('refreshReviewsBtn'),
        };

        const reviewState = {
            status: 'pending',
            loading: false,
            vendorId: initialReviewVendorId,
            items: [],
            summary: {
                averageRating: null,
                totalReviews: 0,
            },
        };

        const vendorDirectory = new Map();
        const listingCache = new Map();

        const normaliseKey = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

        const storeVendorRecord = (record = {}) => {
            if (!record || typeof record !== 'object') return;
            const register = (prefix, value, shouldNormalise = false) => {
                if (value === undefined || value === null) return;
                const raw = String(value).trim();
                if (!raw) return;
                const key = shouldNormalise ? normaliseKey(raw) : raw;
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
            const maybeAdd = (prefix, value, shouldNormalise = false) => {
                if (value === undefined || value === null) return;
                const raw = String(value).trim();
                if (!raw) return;
                candidates.push(`${prefix}:${shouldNormalise ? normaliseKey(raw) : raw}`);
            };
            maybeAdd('id', listing.vendorID ?? listing.vendorId ?? listing.vendor_id ?? '');
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
            return escapeHtml(record.businessName || record.name || record.email || '');
        };

        const PLAN_PRICING = {
            starter: 3000,
            pro: 5000,
            elite: 8000,
            power: 15000
        };

        const escapeHtml = (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const slugifyPlan = (plan) => normalisePlanSlug(plan);

        const formatPlanLabel = (plan) => {
            const label = displayPlanLabel(plan);
            return label.toLowerCase().startsWith('free') ? 'Free' : label;
        };

        const formatStatusLabel = (status) => {
            const value = String(status || '').trim();
            return value || 'Active';
        };

        const fallbackVendorAvatar = 'https://placehold.co/80x80?text=VP';
        const fallbackListingThumb = 'https://placehold.co/64x64?text=IMG';

        const stripHashFromUrl = () => {
            const baseUrl = window.location.pathname + window.location.search;
            history.replaceState(null, '', baseUrl);
        };

        const handleInternalNavLinks = () => {
            const navLinks = document.querySelectorAll('.nav-link[href*="#"]');
            navLinks.forEach((link) => {
                const href = link.getAttribute('href') || '';
                const hashIndex = href.indexOf('#');
                if (hashIndex < 0) return;
                const targetId = href.slice(hashIndex + 1);
                if (!targetId) return;
                link.addEventListener('click', (event) => {
                    const target = document.getElementById(targetId);
                    if (!target) return;
                    event.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    stripHashFromUrl();
                });
            });

            if (window.location.hash) {
                const initialId = window.location.hash.slice(1);
                const initialTarget = document.getElementById(initialId);
                if (initialTarget) {
                    requestAnimationFrame(() => {
                        initialTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        stripHashFromUrl();
                    });
                } else {
                    stripHashFromUrl();
                }
            }
        };

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

        const setReviewsMessage = (message = '', tone = 'info') => {
            const messageEl = reviewSelectors.message;
            if (!messageEl) return;
            if (!message) {
                messageEl.style.display = 'none';
                messageEl.textContent = '';
                return;
            }
            messageEl.style.display = 'block';
            messageEl.textContent = message;
            let color = 'rgba(17, 17, 17, 0.68)';
            if (tone === 'success') color = 'rgba(0, 77, 64, 0.82)';
            if (tone === 'danger') color = 'rgba(183, 28, 28, 0.88)';
            messageEl.style.color = color;
        };

        const formatReviewDate = (value) => {
            if (!value) return '—';
            try {
                const parsed = new Date(value);
                if (Number.isNaN(parsed.getTime())) {
                    return typeof value === 'string' ? value : '—';
                }
                return new Intl.DateTimeFormat('en-NG', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }).format(parsed);
            } catch (error) {
                return typeof value === 'string' ? value : '—';
            }
        };

        const createStatusChip = (status) => {
            const chip = document.createElement('span');
            const normalized = String(status || '').toLowerCase();
            const classMap = {
                published: 'status-chip status-published',
                pending: 'status-chip status-pending',
                hidden: 'status-chip status-hidden',
                flagged: 'status-chip status-flagged',
            };
            chip.className = classMap[normalized] || 'status-chip status-pending';
            const label = normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Pending';
            chip.textContent = label;
            return chip;
        };

        const determineReviewActions = (status) => {
            const normalized = String(status || '').toLowerCase();
            const actions = [];
            if (normalized !== 'published') {
                actions.push({ action: 'published', label: 'Publish', className: 'btn btn-approve' });
            }
            if (normalized !== 'pending') {
                actions.push({ action: 'pending', label: 'Mark Pending', className: 'btn btn-outline' });
            }
            if (normalized !== 'hidden') {
                actions.push({ action: 'hidden', label: 'Hide', className: 'btn btn-reject' });
            }
            if (normalized !== 'flagged') {
                actions.push({ action: 'flagged', label: 'Flag', className: 'btn btn-danger' });
            }
            actions.push({ action: 'delete', label: 'Delete', className: 'btn btn-danger' });
            return actions;
        };

        const renderReviewSummary = () => {
            if (!reviewSelectors.average || !reviewSelectors.total) return;
            const total = Number(reviewState.summary.totalReviews || 0);
            reviewSelectors.total.textContent = total.toString();
            const avg = reviewState.summary.averageRating;
            reviewSelectors.average.textContent = avg === null || Number.isNaN(avg)
                ? '—'
                : avg.toFixed(2);
        };

        const createReviewCard = (review) => {
            const card = document.createElement('article');
            card.className = 'review-card';
            card.dataset.reviewId = String(review.id ?? '');

            const header = document.createElement('div');
            header.className = 'review-header';

            const headerInfo = document.createElement('div');
            headerInfo.style.flex = '1 1 auto';

            const ratingValue = Number(review.rating ?? 0);
            const rounded = Math.max(0, Math.min(5, Math.round(ratingValue)));
            const stars = '★'.repeat(rounded).padEnd(5, '☆');

            const ratingEl = document.createElement('div');
            ratingEl.className = 'review-rating';
            ratingEl.textContent = `${stars} (${ratingValue}/5)`;

            const meta = document.createElement('div');
            meta.className = 'review-meta';

            const vendorSpan = document.createElement('span');
            const vendorId = Number(review.vendorId ?? review.vendor_id ?? 0);
            const vendorRecord = vendorDirectory.get(`id:${vendorId}`);
            const vendorLabel = vendorRecord ? vendorLabelFromRecord(vendorRecord) : `Vendor #${vendorId || '—'}`;
            vendorSpan.innerHTML = `<i class="ri-store-2-line"></i> ${vendorLabel}`;
            meta.appendChild(vendorSpan);

            if (review.listingPublicId) {
                const listingSpan = document.createElement('span');
                const link = document.createElement('a');
                link.href = `product.php?id=${encodeURIComponent(review.listingPublicId)}`;
                link.textContent = 'View listing';
                link.target = '_blank';
                link.rel = 'noopener';
                listingSpan.appendChild(link);
                meta.appendChild(listingSpan);
            } else if (review.listingId) {
                const listingSpan = document.createElement('span');
                listingSpan.innerHTML = `<i class="ri-hashtag"></i> Listing ${escapeHtml(String(review.listingId))}`;
                meta.appendChild(listingSpan);
            }

            const reviewerName = review.reviewer && (review.reviewer.name || review.reviewer.ref) ? (review.reviewer.name || review.reviewer.ref) : '';
            if (reviewerName) {
                const reviewerSpan = document.createElement('span');
                reviewerSpan.innerHTML = `<i class="ri-user-smile-line"></i> ${escapeHtml(reviewerName)}`;
                meta.appendChild(reviewerSpan);
            }

            const timestampSpan = document.createElement('span');
            timestampSpan.innerHTML = `<i class="ri-time-line"></i> ${formatReviewDate(review.createdAt || review.updatedAt)}`;
            meta.appendChild(timestampSpan);

            headerInfo.appendChild(ratingEl);
            headerInfo.appendChild(meta);
            header.appendChild(headerInfo);
            header.appendChild(createStatusChip(review.status));
            card.appendChild(header);

            if (review.comment) {
                const commentEl = document.createElement('div');
                commentEl.className = 'review-comment';
                commentEl.textContent = review.comment;
                card.appendChild(commentEl);
            }

            const actions = document.createElement('div');
            actions.className = 'review-actions';
            determineReviewActions(review.status).forEach((action) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = action.className;
                button.dataset.reviewId = String(review.id ?? '');
                button.dataset.reviewAction = action.action;
                button.textContent = action.label;
                actions.appendChild(button);
            });
            card.appendChild(actions);

            return card;
        };

        const renderReviews = () => {
            const { list, empty } = reviewSelectors;
            if (!list) return;
            list.innerHTML = '';
            if (!reviewState.vendorId) {
                if (empty) {
                    empty.hidden = true;
                    empty.style.display = 'none';
                }
                return;
            }
            if (!reviewState.items.length) {
                if (empty) {
                    empty.hidden = false;
                    empty.style.display = 'flex';
                }
                return;
            }
            if (empty) {
                empty.hidden = true;
                empty.style.display = 'none';
            }
            const fragment = document.createDocumentFragment();
            reviewState.items.forEach((review) => {
                fragment.appendChild(createReviewCard(review));
            });
            list.appendChild(fragment);
        };

        const loadReviews = async ({ status, force } = {}) => {
            const listEl = reviewSelectors.list;
            if (!listEl) return;
            if (reviewState.loading && !force) return;

            const nextStatus = typeof status === 'string' ? status : reviewState.status;
            const vendorId = reviewState.vendorId;

            if (!vendorId) {
                reviewState.status = nextStatus;
                reviewState.items = [];
                reviewState.summary.averageRating = null;
                reviewState.summary.totalReviews = 0;
                renderReviewSummary();
                renderReviews();
                setReviewsMessage('Select a vendor to view reviews.', 'info');
                listEl.removeAttribute('aria-busy');
                reviewState.loading = false;
                return;
            }

            reviewState.loading = true;
            listEl.setAttribute('aria-busy', 'true');
            setReviewsMessage('Loading reviews…');
            try {
                const params = { pageSize: 20, vendorId };
                if (nextStatus && nextStatus !== 'all') {
                    params.status = nextStatus;
                }
                const payload = await adminAPI.reviews(params);
                if (payload && typeof payload === 'object' && payload.success === false && payload.message) {
                    throw new Error(payload.message);
                }

                const container = payload && typeof payload === 'object'
                    ? (payload.data && typeof payload.data === 'object' ? payload.data : payload)
                    : {};
                if (container && typeof container === 'object' && container.success === false && container.message) {
                    throw new Error(container.message);
                }
                const reviews = Array.isArray(container.reviews)
                    ? container.reviews
                    : Array.isArray(container.items) ? container.items : [];
                const pagination = container.pagination || {};

                reviewState.status = nextStatus;
                reviewState.items = reviews;

                const paginationTotal = Number(pagination?.total ?? pagination?.count ?? null);
                const containerTotal = Number(container?.total ?? container?.count ?? null);
                const total = Number.isFinite(paginationTotal)
                    ? paginationTotal
                    : Number.isFinite(containerTotal)
                        ? containerTotal
                        : reviews.length;
                reviewState.summary.totalReviews = total;

                const averageCandidate = container?.averageRating ?? container?.avg ?? container?.summary?.averageRating ?? null;
                const averageNumber = Number(averageCandidate);

                if (Number.isFinite(averageNumber)) {
                    reviewState.summary.averageRating = averageNumber;
                } else if (reviews.length) {
                    const sum = reviews.reduce((acc, item) => acc + (Number(item.rating) || 0), 0);
                    reviewState.summary.averageRating = sum / reviews.length;
                } else {
                    reviewState.summary.averageRating = null;
                }

                renderReviewSummary();
                renderReviews();

                if (reviews.length) {
                    const label = reviews.length === 1 ? '1 review' : `${reviews.length} reviews`;
                    const suffix = total > reviews.length ? ` (of ${total})` : '';
                    setReviewsMessage(`Showing ${label}${suffix}.`, 'success');
                } else {
                    setReviewsMessage('No reviews matched this filter.', 'info');
                }
            } catch (error) {
                console.error('[admin] load reviews failed', error);
                reviewState.items = [];
                reviewState.summary.averageRating = null;
                renderReviewSummary();
                renderReviews();
                const message = error?.message || 'Unable to load reviews.';
                setReviewsMessage(message, 'danger');
            } finally {
                reviewState.loading = false;
                listEl.removeAttribute('aria-busy');
            }
        };

        const handleReviewAction = async (reviewId, action, trigger) => {
            if (!reviewId || !action) return;
            const isDelete = action === 'delete';
            if (isDelete) {
                const confirmed = window.confirm('Delete this review permanently? This action cannot be undone.');
                if (!confirmed) {
                    return;
                }
            }
            try {
                if (trigger) trigger.disabled = true;
                if (isDelete) {
                    setReviewsMessage('Removing review…');
                    await adminAPI.deleteReview(reviewId);
                    showToast('Review deleted.');
                } else {
                    setReviewsMessage('Updating review…');
                    await adminAPI.updateReviewStatus(reviewId, action);
                    const statusLabel = action.charAt(0).toUpperCase() + action.slice(1);
                    showToast(`Review marked as ${statusLabel}.`);
                }
                await loadReviews({ status: reviewState.status, force: true });
            } catch (error) {
                console.error('[admin] review action failed', error);
                setReviewsMessage(error.message || 'Unable to update review.', 'danger');
                showToast(error.message || 'Unable to update review.', 2800);
            } finally {
                if (trigger) trigger.disabled = false;
            }
        };

        const updateReviewVendorQueryParam = (vendorId) => {
            const nextParams = new URLSearchParams(window.location.search);
            if (vendorId) {
                nextParams.set('reviewVendor', String(vendorId));
                nextParams.set('vendorId', String(vendorId));
                nextParams.set('vendor', String(vendorId));
            } else {
                nextParams.delete('reviewVendor');
                nextParams.delete('vendorId');
                nextParams.delete('vendor');
            }
            const queryString = nextParams.toString();
            const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
            const hash = window.location.hash || '';
            if (typeof history.replaceState === 'function') {
                history.replaceState(null, '', `${nextUrl}${hash}`);
            }
        };

        const highlightSelectedVendorCard = (selectedId) => {
            if (!recentVendorsWrap) return;
            const cards = recentVendorsWrap.querySelectorAll('.vendor-card[role="button"]');
            const numericSelected = Number(selectedId);
            const hasSelection = Number.isFinite(numericSelected) && numericSelected > 0;
            cards.forEach((card) => {
                const cardId = Number(card.getAttribute('data-vendor-id') || 0);
                const isActive = hasSelection && cardId === numericSelected;
                card.classList.toggle('selected', Boolean(isActive));
                card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        };

        const setReviewVendor = (vendorId, options = {}) => {
            const numericId = Number(vendorId);
            const isValid = Number.isFinite(numericId) && numericId > 0;
            if (!isValid) {
                reviewState.vendorId = null;
                reviewState.items = [];
                reviewState.summary.averageRating = null;
                reviewState.summary.totalReviews = 0;
                renderReviewSummary();
                renderReviews();
                setReviewsMessage('Select a vendor to view reviews.', 'info');
                highlightSelectedVendorCard(null);
                updateReviewVendorQueryParam(null);
                return;
            }

            const vendorChanged = reviewState.vendorId !== numericId;
            reviewState.vendorId = numericId;
            highlightSelectedVendorCard(numericId);
            updateReviewVendorQueryParam(numericId);

            if (vendorChanged || options.force) {
                loadReviews({ status: reviewState.status, force: true });
            }

            if (options.autoScroll) {
                document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };

        const bindReviewEvents = () => {
            if (reviewSelectors.filter) {
                reviewSelectors.filter.value = reviewState.status;
                reviewSelectors.filter.addEventListener('change', (event) => {
                    const next = typeof event.target.value === 'string' ? event.target.value : 'pending';
                    reviewState.status = next;
                    loadReviews({ status: next, force: true });
                });
            }

            reviewSelectors.refresh?.addEventListener('click', () => {
                loadReviews({ status: reviewState.status, force: true });
            });

            reviewSelectors.list?.addEventListener('click', (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const button = target.closest('button[data-review-action]');
                if (!(button instanceof HTMLButtonElement)) return;
                const action = button.dataset.reviewAction;
                const reviewId = Number(button.dataset.reviewId || 0);
                if (!action || !reviewId) return;
                handleReviewAction(reviewId, action, button);
            });
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

        const resolveListingTitle = (data = {}) => {
            const candidates = [
                data.title,
                data.productTitle,
                data.productName,
                data.name,
                data.serviceName,
                data.listingTitle,
                data.model,
                data.type,
                data.itemType,
                data.brand,
                data.subcategory,
                data.category,
            ];
            const title = candidates.find((value) => typeof value === 'string' && value.trim().length);
            return title ? escapeHtml(title) : 'Untitled listing';
        };

        const resolveVendorLabel = (data = {}) => {
            const candidates = [
                data.vendorName,
                data.vendorBusinessName,
                data.vendorCompany,
                data.vendorEmail,
            ];
            const label = candidates.find((value) => typeof value === 'string' && value.trim().length);
            return label ? escapeHtml(label) : 'Unknown vendor';
        };

        const refreshListingVendorLabels = () => {
            listingCache.forEach((data, listingId) => {
                const card = recentListingsWrap.querySelector(`[data-id="${listingId}"]`);
                if (!card) return;
                const vendorSpan = card.querySelector('[data-role="vendor-label"]');
                if (!vendorSpan) return;
                const vendorRecord = findVendorRecord(data);
                if (!vendorRecord) return;
                const vendorLabel = vendorLabelFromRecord(vendorRecord);
                if (!vendorLabel) return;
                const nextMarkup = `<i class="ri-user-smile-line"></i> ${vendorLabel}`;
                if (vendorSpan.innerHTML !== nextMarkup) {
                    vendorSpan.innerHTML = nextMarkup;
                }
            });
        };

        const renderListings = (listings) => {
            recentListingsWrap.innerHTML = '';
            listingCache.clear();
            const pendingListings = listings.filter((listing) => ((listing.data().status || 'pending').toLowerCase() === 'pending'));
            if (!pendingListings.length) {
                noListings.style.display = 'block';
                return;
            }
            noListings.style.display = 'none';
            pendingListings.forEach((listing) => {
                const data = listing.data();
                listingCache.set(listing.id, data);
                const images = Array.isArray(data.images) && data.images.length
                    ? data.images
                    : Array.isArray(data.imageUrls) ? data.imageUrls : [];
                const thumb = images.length ? images[0] : '';
                const safeThumb = thumb ? escapeHtml(thumb) : fallbackListingThumb;
                const titleLabel = resolveListingTitle(data);
                const categoryLabel = escapeHtml(data.category || '-');
                const subcategoryLabel = escapeHtml(data.subcategory || '-');
                const vendorRecord = findVendorRecord(data);
                const vendorLabel = vendorLabelFromRecord(vendorRecord) || resolveVendorLabel(data);
                const card = document.createElement('article');
                card.className = 'listing-card';
                card.dataset.id = listing.id;
                card.innerHTML = `
                    <img class="listing-thumb" src="${safeThumb}" alt="${titleLabel} image">
                    <div class="listing-meta">
                        <div style="display:flex; justify-content:space-between; gap:0.75rem; align-items:flex-start; flex-wrap:wrap;">
                            <h3>${titleLabel}</h3>
                            <span class="status-chip status-pending">Pending</span>
                        </div>
                        <span class="meta-line"><i class="ri-stack-line"></i> ${categoryLabel} &middot; ${subcategoryLabel}</span>
                        <span class="meta-line" data-role="vendor-label"><i class="ri-user-smile-line"></i> ${vendorLabel}</span>
                        <div class="listing-actions">
                            <button class="btn btn-approve" data-action="approve" data-id="${listing.id}" data-vendor="${data.vendorID || data.vendorId || ''}">Approve</button>
                            <button class="btn btn-reject" data-action="reject" data-id="${listing.id}" data-vendor="${data.vendorID || data.vendorId || ''}">Reject</button>
                        </div>
                    </div>
                `;
                recentListingsWrap.appendChild(card);
            });
            refreshListingVendorLabels();
        };

        const removeListingCard = (listingId) => {
            const card = recentListingsWrap.querySelector(`[data-id="${listingId}"]`);
            if (card) {
                card.remove();
            }
            listingCache.delete(listingId);
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
                storeVendorRecord(vendor);
                const card = document.createElement('article');
                card.className = 'vendor-card';
                card.dataset.vendorId = vendor.id ? String(vendor.id) : '';
                card.setAttribute('role', 'button');
                card.tabIndex = 0;
                const vendorLabel = (vendor.name || vendor.businessName || vendor.email || 'Vendor').toString();
                card.setAttribute('aria-label', `Filter reviews for ${vendorLabel}`);
                card.title = `Filter reviews for ${vendorLabel}`;
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
                const numericId = Number(vendor.id || 0);
                if (reviewState.vendorId && Number(reviewState.vendorId) === numericId) {
                    card.classList.add('selected');
                    card.setAttribute('aria-pressed', 'true');
                } else {
                    card.setAttribute('aria-pressed', 'false');
                }
                const selectVendor = () => {
                    if (!numericId) return;
                    setReviewVendor(numericId, { autoScroll: true, force: true });
                };
                card.addEventListener('click', selectVendor);
                card.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectVendor();
                    }
                });
                recentVendorsWrap.appendChild(card);
            });
        };

        const applyPlanSummary = (summary = {}) => {
            const counts = {
                free: 0,
                starter: 0,
                pro: 0,
                elite: 0,
                power: 0,
                ...(summary.planCounts || {}),
            };
            Object.entries(counts).forEach(([plan, count]) => {
                if (planCountsEls[plan]) {
                    planCountsEls[plan].textContent = count.toString();
                }
            });
            const revenue = summary.revenue ?? (
                (counts.starter * (PLAN_PRICING.starter || 0)) +
                (counts.pro * (PLAN_PRICING.pro || 0)) +
                (counts.elite * (PLAN_PRICING.elite || 0)) +
                (counts.power * (PLAN_PRICING.power || 0))
            );
            revenueTotal.textContent = formatCurrency(revenue);
            const activePlans = summary.activePlans ?? (counts.starter + counts.pro + counts.elite + counts.power);
            statsElements.activePlans.textContent = activePlans.toString();
            statsElements.revenue.textContent = formatCurrency(revenue);
        };

        const normaliseVendorRecords = (vendors) => {
            if (!Array.isArray(vendors)) return [];
            return vendors.map((vendor) => {
                const planLabel = formatPlanLabel(vendor.plan);
                const joinedDisplay = (vendor.joined && vendor.joined !== '-') ? vendor.joined : '';
                const record = {
                    id: vendor.id ?? '',
                    uid: vendor.vendorUid || vendor.uid || '',
                    vendorUid: vendor.vendorUid || vendor.uid || '',
                    firebaseUid: vendor.firebaseUid || '',
                    name: vendor.name || vendor.businessName || 'Vendor',
                    businessName: vendor.businessName || '',
                    email: vendor.email || '',
                    plan: planLabel,
                    planSlug: vendor.planSlug || slugifyPlan(planLabel),
                    status: vendor.status || '',
                    profilePhoto: vendor.profilePhoto || '',
                    joined: joinedDisplay,
                };
                storeVendorRecord(record);
                return record;
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
                refreshListingVendorLabels();
                if (!reviewState.vendorId && vendors.length) {
                    setReviewVendor(vendors[0].id, { force: true });
                } else {
                    highlightSelectedVendorCard(reviewState.vendorId);
                    renderReviews();
                }
            } catch (error) {
                console.error('Vendor summary load failed:', error);
                if (!vendorSummaryErrorShown) {
                    showToast('Unable to load vendor summary.', 2600);
                    vendorSummaryErrorShown = true;
                }
            }
        };

        const performListingAction = async (listingId, action, extra = {}) => {
            const body = new URLSearchParams({ listingId, action });
            if (extra.reason) body.append('reason', extra.reason);
            const response = await fetch('admin-listing-action.php', {
                method: 'POST',
                credentials: 'same-origin',
                body,
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.message || 'Unable to process listing action.');
            }
            return payload;
        };

        const approveListing = async (listingId) => {
            try {
                await performListingAction(listingId, 'approve');
                showToast('Listing approved!');
                removeListingCard(listingId);
            } catch (error) {
                console.error('approveListing', error);
                showToast(error.message || 'Could not approve listing.', 2500);
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
                await performListingAction(selectedListingId, 'reject', { reason });
                showToast('Feedback sent to vendor.');
                removeListingCard(selectedListingId);
                closeRejectModal();
            } catch (error) {
                console.error('rejectListing', error);
                showToast(error.message || 'Could not reject listing.', 2500);
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

        handleInternalNavLinks();
        bindReviewEvents();
        highlightSelectedVendorCard(reviewState.vendorId);

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
                        console.warn('Auth admin user not available; continuing with PHP session only.');
                    }

                    loader.hidden = true;
                    dashboardContent.hidden = false;
                    attachListingActions();
                    hydrateData();
                    if (reviewState.vendorId) {
                        setReviewVendor(reviewState.vendorId, { force: true });
                    } else {
                        loadReviews({ status: reviewState.status }).catch((error) => {
                            console.error('[admin] initial review load failed', error);
                        });
                    }
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

