const authLoader = document.getElementById('authLoader');
const logoutBtn = document.getElementById('logoutBtn');
const listingTitle = document.getElementById('listingTitle');
const listingPrice = document.getElementById('listingPrice');
const listingCategory = document.getElementById('listingCategory');
const listingCondition = document.getElementById('listingCondition');
const listingDate = document.getElementById('listingDate');
const listingStatus = document.getElementById('listingStatus');
const listingDescription = document.getElementById('listingDescription');
const feedbackBlock = document.getElementById('feedbackBlock');
const feedbackChip = document.getElementById('feedbackChip');
const feedbackTimeline = document.getElementById('feedbackTimeline');
const feedbackEmpty = document.getElementById('feedbackEmpty');
const extraDetails = document.getElementById('extraDetails');
const vendorName = document.getElementById('vendorName');
const vendorBusiness = document.getElementById('vendorBusiness');
const vendorEmail = document.getElementById('vendorEmail');
const vendorPhone = document.getElementById('vendorPhone');
const vendorPlan = document.getElementById('vendorPlan');
const vendorStatus = document.getElementById('vendorStatus');
const vendorJoin = document.getElementById('vendorJoin');
const viewVendorBtn = document.getElementById('viewVendorBtn');
const approveBtn = document.getElementById('approveBtn');
const rejectBtn = document.getElementById('rejectBtn');
const deleteBtn = document.getElementById('deleteBtn');
const feedbackModal = document.getElementById('feedbackModal');
const deleteModal = document.getElementById('deleteModal');
const sendFeedbackBtn = document.getElementById('sendFeedbackBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const feedbackReason = document.getElementById('feedbackReason');
const toast = document.getElementById('toast');
const galleryPlaceholder = document.getElementById('galleryPlaceholder');
const mainImage = document.getElementById('mainImage');
const thumbnailRow = document.getElementById('thumbnailRow');

const listingId = new URLSearchParams(window.location.search).get('id');
let currentListingData = null;
let currentVendorData = null;
let currentFirestoreVendor = null;

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

const showToast = (message, isError = false) => {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
};

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value && typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  return null;
};

const formatDisplayDate = (value) => {
  const date = parseDate(value);
  if (!date) return '-';
  return date.toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(numeric);
};

const normaliseImages = (listing = {}) => {
  if (Array.isArray(listing.images) && listing.images.length) return listing.images;
  if (Array.isArray(listing.imageUrls) && listing.imageUrls.length) return listing.imageUrls;
  if (listing.coverImage) return [listing.coverImage];
  if (listing.image) return [listing.image];
  return [];
};

const excludedDetailKeys = new Set([
  'id',
  'title',
  'productTitle',
  'listingTitle',
  'productName',
  'price',
  'amount',
  'category',
  'subcategory',
  'condition',
  'status',
  'description',
  'details',
  'createdAt',
  'created_at',
  'createTime',
  'updateTime',
  'updatedAt',
  'images',
  'imageUrls',
  'image',
  'coverImage',
  'gallery',
  'feedback',
  'feedbackHistory',
  'vendorID',
  'vendorId',
  'vendor_id',
  'vendorUid',
  'vendorUID',
  'vendorFirebaseUid',
  'vendorName',
  'vendorEmail',
  'vendorPlan',
  'vendorBusinessName',
  'vendorBusiness',
  'vendorPhone',
  'vendorLocation',
  'vendorSince',
  'firestoreVendor',
]);

const formatLabel = (label) => {
  return label
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
};

const formatValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) {
    if (!value.length) return '-';
    return value
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const nestedDetailKeys = ['details', 'specifications', 'attributes', 'features', 'extras'];

const collectNestedDetails = (listing = {}) => {
  const collected = [];
  nestedDetailKeys.forEach((key) => {
    const source = listing[key];
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return;
    }
    Object.entries(source).forEach(([entryKey, entryValue]) => {
      if (entryValue === '' || entryValue === null || entryValue === undefined) return;
      collected.push([entryKey, entryValue]);
    });
  });
  return collected;
};

const resolveListingDescription = (listing = {}) => {
  const stringifyObject = (objectValue) => Object.entries(objectValue)
    .map(([key, value]) => `${formatLabel(key)}: ${formatValue(value)}`)
    .join('\n');

  const description = listing.description;
  if (typeof description === 'string' && description.trim()) return description.trim();
  if (Array.isArray(description) && description.length) {
    return description.map((item) => (typeof item === 'string' ? item.trim() : String(item))).join('\n');
  }
  if (description && typeof description === 'object') {
    return stringifyObject(description);
  }

  const details = listing.details;
  if (typeof details === 'string' && details.trim()) return details.trim();
  if (details && typeof details === 'object') {
    return stringifyObject(details);
  }

  return 'No description provided.';
};

const prettifyPlan = (plan = '') => {
  const value = String(plan || '').trim();
  if (!value) return 'Free';
  const cleaned = value.replace(/\s*Plan$/i, '').trim();
  if (!cleaned) return 'Free';
  const normalized = cleaned.toLowerCase();
  if (['free', 'gratis'].includes(normalized)) return 'Free';
  return cleaned.replace(/^\w/, (char) => char.toUpperCase());
};

const planSlug = (plan = '') => {
  const value = String(plan || '').trim().toLowerCase();
  return value ? value.replace(/plan$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'free' : 'free';
};

const statusSlug = (status = '') => {
  const value = String(status || '').trim().toLowerCase();
  if (!value) return 'active';
  return value.replace(/[^a-z0-9]+/g, '-');
};

const renderStatus = (status = 'pending') => {
  const map = {
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
  };
  const value = (status || 'pending').toLowerCase();
  listingStatus.textContent = value.charAt(0).toUpperCase() + value.slice(1);
  listingStatus.className = `status-chip ${map[value] || 'status-pending'}`;
};

const renderGallery = (images = []) => {
  if (!images.length) {
    galleryPlaceholder.classList.remove('hidden');
    mainImage.classList.add('hidden');
    thumbnailRow.classList.add('hidden');
    thumbnailRow.innerHTML = '';
    return;
  }
  galleryPlaceholder.classList.add('hidden');
  mainImage.classList.remove('hidden');
  thumbnailRow.classList.remove('hidden');
  mainImage.src = images[0];
  mainImage.alt = 'Listing image 1';
  thumbnailRow.innerHTML = '';
  images.forEach((url, index) => {
    const thumb = document.createElement('img');
    thumb.src = url;
    thumb.alt = `Listing thumbnail ${index + 1}`;
    thumb.className = 'thumbnail' + (index === 0 ? ' active' : '');
    thumb.addEventListener('click', () => {
      mainImage.src = url;
      mainImage.alt = `Listing image ${index + 1}`;
      thumbnailRow.querySelectorAll('.thumbnail').forEach((node) => node.classList.remove('active'));
      thumb.classList.add('active');
    });
    thumbnailRow.appendChild(thumb);
  });
};

const buildExtraDetails = (listing = {}) => {
  extraDetails.innerHTML = '';
  const baseEntries = Object.entries(listing).filter(([key, value]) => {
    if (excludedDetailKeys.has(key)) return false;
    if (value === '' || value === null || value === undefined) return false;
    if (typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).length > 0;
    }
    return true;
  });

  const nestedEntries = collectNestedDetails(listing);
  const entries = [...baseEntries, ...nestedEntries];

  if (!entries.length) {
    extraDetails.classList.add('hidden');
    return;
  }

  extraDetails.classList.remove('hidden');
  entries.forEach(([key, value]) => {
    const detail = document.createElement('div');
    detail.className = 'extra-detail';
    detail.innerHTML = `
      <span class="small-label">${formatLabel(key)}</span>
      <strong>${formatValue(value)}</strong>
    `;
    extraDetails.appendChild(detail);
  });
};

const renderListing = (listing = {}) => {
  listingTitle.textContent = listing.title || listing.productTitle || listing.listingTitle || 'Untitled Listing';
  listingPrice.textContent = formatCurrency(listing.price ?? listing.amount);
  const category = listing.category || '-';
  const subcategory = listing.subcategory ? ` · ${listing.subcategory}` : '';
  listingCategory.textContent = `${category}${subcategory}`;
  listingCondition.textContent = listing.condition || listing.state || '-';
  listingDate.textContent = formatDisplayDate(listing.createdAt || listing.created_at || listing.createTime);
  listingDescription.textContent = resolveListingDescription(listing);
  renderStatus(listing.status || 'pending');

  if (listing.feedback && listing.feedback.reasonText) {
    feedbackBlock.classList.remove('hidden');
    feedbackChip.textContent = listing.feedback.reasonText;
  } else {
    feedbackBlock.classList.add('hidden');
  }

  renderGallery(normaliseImages(listing));
  buildExtraDetails(listing);
  updateActionButtons(listing.status || 'pending');
};

const renderVendor = (vendor = null, listing = {}, firestoreVendor = null) => {
  const pickValue = (...values) => {
    for (const value of values) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
      } else if (value) {
        return value;
      }
    }
    return '';
  };

  const name = pickValue(
    vendor?.name,
    vendor?.business_name,
    vendor?.businessName,
    firestoreVendor?.displayName,
    firestoreVendor?.name,
    firestoreVendor?.businessName,
    listing.vendorName,
    listing.vendorBusinessName,
    listing.vendorEmail,
    'Vendor'
  );

  const business = pickValue(
    vendor?.business_name,
    vendor?.businessName,
    firestoreVendor?.businessName,
    listing.vendorBusinessName
  );

  const email = pickValue(
    vendor?.email,
    firestoreVendor?.email,
    listing.vendorEmail
  );

  const phone = pickValue(
    vendor?.phone,
    firestoreVendor?.phone,
    listing.vendorPhone,
    '-'
  );

  const rawPlan = pickValue(
    vendor?.plan,
    vendor?.subscription_plan,
    firestoreVendor?.plan,
    firestoreVendor?.currentPlan,
    listing.vendorPlan,
    'Free'
  );
  const planLabel = prettifyPlan(rawPlan);
  const planClass = planSlug(rawPlan);

  const rawStatus = pickValue(
    vendor?.status,
    firestoreVendor?.status,
    listing.vendorStatus,
    'Active'
  );
  const statusLabel = rawStatus ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1) : 'Active';
  const statusClass = statusSlug(rawStatus || 'active');

  const joinedSource = pickValue(
    vendor?.created_at,
    vendor?.joined_at,
    vendor?.createdAt,
    firestoreVendor?.created_at,
    firestoreVendor?.createdAt,
    listing.vendorSince
  );
  const joinedDisplay = joinedSource ? formatDisplayDate(joinedSource) : '-';

  vendorName.textContent = name || '-';
  vendorBusiness.textContent = business || '-';
  vendorEmail.textContent = email || '-';
  vendorPhone.textContent = phone || '-';
  vendorPlan.textContent = planLabel;
  vendorPlan.className = `chip plan-${planClass}`;
  vendorStatus.textContent = statusLabel || 'Active';
  vendorStatus.className = `chip status-${statusClass}`;
  vendorJoin.textContent = joinedDisplay || '-';

  const vendorId = pickValue(
    vendor?.id,
    vendor?.vendorId,
    firestoreVendor?.id,
    listing.vendorID,
    listing.vendorId,
    listing.vendorUid,
    listing.vendorFirebaseUid
  );

  viewVendorBtn.disabled = !vendorId;
  viewVendorBtn.classList.toggle('disabled', !vendorId);
  viewVendorBtn.onclick = () => {
    if (!vendorId) return;
    const target = `vendor-storefront.php?vendorId=${encodeURIComponent(vendorId)}`;
    const win = window.open(target, '_blank', 'noopener');
    if (win) win.opener = null;
  };
};

const renderFeedbackHistory = (listing = {}) => {
  feedbackTimeline.innerHTML = '';
  const history = Array.isArray(listing.feedbackHistory) && listing.feedbackHistory.length
    ? listing.feedbackHistory
    : (listing.feedback && listing.feedback.reasonText ? [listing.feedback] : []);

  if (!history.length) {
    feedbackEmpty.classList.remove('hidden');
    return;
  }

  feedbackEmpty.classList.add('hidden');
  history
    .slice()
    .sort((a, b) => {
      const aDate = parseDate(a.rejectedAt || a.updatedAt || a.timestamp);
      const bDate = parseDate(b.rejectedAt || b.updatedAt || b.timestamp);
      return (bDate ? bDate.getTime() : 0) - (aDate ? aDate.getTime() : 0);
    })
    .forEach((entry) => {
      const container = document.createElement('div');
      container.className = 'timeline-item';
      const tagMarkup = entry.selectedReasons && entry.selectedReasons.length ? `<span>Tags: ${entry.selectedReasons.join(', ')}</span><br />` : '';
      container.innerHTML = `
        <strong>${entry.reasonText || entry.reason || 'No reason provided'}</strong>
        <div class="timeline-meta">
          ${tagMarkup}
          <span>${formatDisplayDate(entry.rejectedAt || entry.updatedAt || entry.timestamp)}</span>
        </div>
      `;
      feedbackTimeline.appendChild(container);
    });
};

const updateActionButtons = (status = 'pending') => {
  const isPending = (status || '').toLowerCase() === 'pending';
  [approveBtn, rejectBtn].forEach((btn) => {
    btn.disabled = !isPending;
    btn.classList.toggle('disabled', !isPending);
  });
};

const toggleProcessing = (processing) => {
  [approveBtn, rejectBtn, deleteBtn, sendFeedbackBtn, confirmDeleteBtn].forEach((btn) => {
    btn.disabled = processing;
    btn.style.opacity = processing ? 0.6 : 1;
  });
};

const openModal = (modalEl) => modalEl.classList.add('active');
const closeModal = (modalEl) => modalEl.classList.remove('active');

const performListingAction = async (action, extra = {}) => {
  const body = new URLSearchParams({ listingId, action });
  if (extra.reason) {
    body.append('reason', extra.reason);
  }
  const response = await fetch('admin-listing-action.php', {
    method: 'POST',
    credentials: 'same-origin',
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Unable to process listing action.');
  }
  return payload;
};

const loadListingDetails = async () => {
  if (!listingId) {
    showToast('Listing ID missing from URL.', true);
    authLoader.classList.add('hidden');
    return;
  }

  try {
    const response = await fetch(`admin-listing-data.php?id=${encodeURIComponent(listingId)}`, {
      method: 'GET',
      credentials: 'same-origin',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || 'Unable to load listing details.');
    }

    currentListingData = payload.listing || {};
    currentVendorData = payload.vendor || null;
    currentFirestoreVendor = payload.firestoreVendor || null;

    renderListing(currentListingData);
    renderVendor(currentVendorData, currentListingData, currentFirestoreVendor);
    renderFeedbackHistory(currentListingData);
  } catch (error) {
    showToast(error.message || 'Unable to load listing.', true);
  } finally {
    authLoader.classList.add('hidden');
  }
};

const initEventListeners = () => {
  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('admin-logout.php', { method: 'GET', credentials: 'same-origin' });
    } finally {
      window.location.href = 'admin-login.php';
    }
  });

  approveBtn.addEventListener('click', async () => {
    toggleProcessing(true);
    try {
      await performListingAction('approve');
      showToast('Listing approved successfully.');
      await loadListingDetails();
    } catch (error) {
      showToast(error.message || 'Unable to approve listing.', true);
    } finally {
      toggleProcessing(false);
    }
  });

  rejectBtn.addEventListener('click', () => {
    feedbackReason.value = '';
    feedbackModal.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = false;
    });
    openModal(feedbackModal);
  });

  deleteBtn.addEventListener('click', () => openModal(deleteModal));

  document.querySelectorAll('[data-close="feedback"]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(feedbackModal));
  });
  document.querySelectorAll('[data-close="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(deleteModal));
  });

  feedbackModal.addEventListener('click', (event) => {
    if (event.target === feedbackModal) closeModal(feedbackModal);
  });
  deleteModal.addEventListener('click', (event) => {
    if (event.target === deleteModal) closeModal(deleteModal);
  });

  sendFeedbackBtn.addEventListener('click', async () => {
    const reasonText = feedbackReason.value.trim();
    if (!reasonText) {
      showToast('Please provide a feedback reason.', true);
      return;
    }
    const selectedReasons = Array.from(feedbackModal.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
    const reasonPayload = selectedReasons.length ? `${reasonText} (Tags: ${selectedReasons.join(', ')})` : reasonText;
    toggleProcessing(true);
    try {
      await performListingAction('reject', { reason: reasonPayload });
      closeModal(feedbackModal);
      showToast('Feedback sent to vendor.');
      await loadListingDetails();
    } catch (error) {
      showToast(error.message || 'Unable to reject listing.', true);
    } finally {
      toggleProcessing(false);
    }
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    toggleProcessing(true);
    try {
      await performListingAction('delete');
      showToast('Listing deleted.');
      setTimeout(() => {
        window.location.href = 'admin-listings.php';
      }, 800);
    } catch (error) {
      showToast(error.message || 'Unable to delete listing.', true);
    } finally {
      toggleProcessing(false);
    }
  });
};

const init = async () => {
  if (!listingId) {
    showToast('Listing ID missing from URL.', true);
    authLoader.classList.add('hidden');
    return;
  }

  const session = await ensureSession();
  if (!session) {
    return;
  }

  initEventListeners();
  await loadListingDetails();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


