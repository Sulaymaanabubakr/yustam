import { db } from './firebase.js';
import { deleteDoc, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { buildChatId, ensureChat, sendMessage } from './chat-service.js';

const urlParams = new URLSearchParams(window.location.search);

const mainImage = document.getElementById('productImage') || document.getElementById('mainImage');
const thumbStrip = document.getElementById('thumbStrip');
const saveBtn = document.getElementById('saveListingBtn');
const buyerUidParam = (urlParams.get('buyerUid') || '').trim();
const buyerNumericParam = (urlParams.get('buyerNumericId') || urlParams.get('buyerId') || urlParams.get('buyer') || '').trim();
const buyerUid = document.body?.dataset?.buyerUid || buyerUidParam || '';
const buyerNumericId = document.body?.dataset?.buyerId || buyerNumericParam || '';
const buyerIdentifier = buyerNumericId || buyerUid || '';
const buyerName = document.body?.dataset?.buyerName || 'Buyer';
const productIdInput = document.getElementById('productId');
const productIdParam = (urlParams.get('id') || urlParams.get('listingId') || '').trim();
const productId = productIdInput?.value?.trim?.() || productIdParam;
const vendorIdParam = (urlParams.get('vendorId') || urlParams.get('vendor') || '').trim();
const vendorNameParam = (urlParams.get('vendorName') || urlParams.get('vendorDisplayName') || '').trim();
const productNameEl = document.getElementById('productName');
const productPriceEl = document.getElementById('productPrice');
const productDescEl = document.getElementById('productDesc');
const productStatusEl = document.getElementById('productStatus');
const categoryLineEl = document.getElementById('categoryLine');
const categoryLabelEl = document.getElementById('categoryLabel');
const featureListEl = document.getElementById('featureList');
const specListEl = document.getElementById('specList');
const specFallbackEl = document.getElementById('specFallback');
const productImageEl = document.getElementById('productImage');
const vendorPlanBadge = document.getElementById('vendorPlanBadge');
const vendorVerifiedBadge = document.getElementById('vendorVerifiedBadge');
const vendorBadgesContainer = document.getElementById('vendorBadges') || document.querySelector('.vendor-badges');
const vendorNameEl = document.getElementById('vendorTitle');
const vendorBusinessEl = document.getElementById('vendorBusiness');
const vendorEmailLink = document.getElementById('vendorEmailLink');
const vendorPhoneLink = document.getElementById('vendorPhoneLink');
const vendorLocationRow = document.getElementById('vendorLocationRow');
const vendorLocationEl = document.getElementById('vendorLocation');
const vendorSinceRow = document.getElementById('vendorSinceRow');
const vendorSinceEl = document.getElementById('vendorSince');
const vendorStorefrontLink = document.getElementById('vendorStorefrontLink');
const vendorWhatsappLink = document.getElementById('vendorWhatsappLink');
const vendorAvatarEl = document.getElementById('vendorAvatar');
const floatingWhatsappBtn = document.getElementById('floatingWhatsappBtn');
const chatWithVendorBtn = document.getElementById('chatWithVendorBtn');
const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80';

let currentProductName = productNameEl?.textContent?.trim?.() || '';
let currentProductPrice = 0;
let currentProductPriceLabel = productPriceEl?.textContent?.trim?.() || '';
let currentProductImage = productImageEl?.src || '';
let currentVendorName =
  vendorNameEl?.textContent?.trim?.() || document.body?.dataset?.vendorName || vendorNameParam || 'Vendor';
let currentVendorId = document.body?.dataset?.vendorId || vendorIdParam || '';
let currentVendorUid = document.body?.dataset?.vendorUid || (urlParams.get('vendorUid') || '').trim() || currentVendorId;
let currentVendorPlan = document.body?.dataset?.vendorPlan || '';
let currentVendorVerification = document.body?.dataset?.vendorVerified || '';
let currentVendorPhone = '';

if (document.body) {
  if (!document.body.dataset.vendorId && currentVendorId) {
    document.body.dataset.vendorId = currentVendorId;
  }
  if (!document.body.dataset.vendorUid && currentVendorUid) {
    document.body.dataset.vendorUid = currentVendorUid;
  }
  if (!document.body.dataset.vendorName && currentVendorName) {
    document.body.dataset.vendorName = currentVendorName;
  }
}

const savedRef = buyerIdentifier && productId ? doc(db, `saved/${buyerIdentifier}/items/${productId}`) : null;

function setSaveState(isSaved) {
  if (!saveBtn) return;
  if (isSaved) {
    saveBtn.classList.add('active');
    saveBtn.innerHTML = '<i class="ri-heart-fill" aria-hidden="true"></i> Saved';
    saveBtn.setAttribute('aria-pressed', 'true');
  } else {
    saveBtn.classList.remove('active');
    saveBtn.innerHTML = '<i class="ri-heart-line" aria-hidden="true"></i> Save';
    saveBtn.setAttribute('aria-pressed', 'false');
  }
}

const slugifyPlan = (plan) => {
  if (!plan) return 'free';
  return String(plan)
    .toLowerCase()
    .replace(/plan/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '') || 'plan';
};

const formatPlanLabel = (plan) => {
  if (!plan) return 'Free Plan';
  const trimmed = String(plan).trim();
  if (!trimmed) return 'Free Plan';
  const lower = trimmed.toLowerCase();
  return lower.endsWith('plan') ? trimmed : `${trimmed} Plan`;
};

const normaliseVerificationState = (value) => {
  if (value === true || value === 1) return 'verified';
  if (value === false || value === 0 || value === null || value === undefined) return 'unverified';
  const norm = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'verified', 'approved', 'active'].includes(norm)) return 'verified';
  if (['pending', 'submitted', 'processing', 'in_review', 'in-review', 'under review'].includes(norm)) return 'pending';
  if (['rejected', 'declined', 'failed', 'needs_changes', 'needs update', 'needs-update', '0', 'false', 'no', 'unverified'].includes(norm)) return 'unverified';
  return 'unverified';
};

const applyVendorBadges = (planOverride, verificationOverride) => {
  if (!vendorPlanBadge || !vendorVerifiedBadge) return;

  const params = new URLSearchParams(window.location.search);
  let planValue = planOverride ?? '';
  let verifiedValue = verificationOverride ?? '';

  if (!planValue) {
    const paramPlan = params.get('plan');
    planValue = paramPlan ? decodeURIComponent(paramPlan) : document.body?.dataset?.vendorPlan || '';
  }

  if (!verifiedValue) {
    const paramVerified = params.get('verified');
    verifiedValue =
      paramVerified !== null ? decodeURIComponent(paramVerified) : document.body?.dataset?.vendorVerified || '';
  }

  planValue = String(planValue || '').trim();
  currentVendorPlan = planValue;

  const planLabel = formatPlanLabel(planValue);
  const planSlug = slugifyPlan(planValue);
  vendorPlanBadge.innerHTML = `<i class="ri-vip-crown-fill" aria-hidden="true"></i>${planLabel}`;
  vendorPlanBadge.className = `vendor-badge vendor-plan vendor-plan-${planSlug}`;

  const verificationState = normaliseVerificationState(verifiedValue);
  currentVendorVerification = verificationState;
  let verificationLabel = 'Not Verified';
  let verificationIcon = 'ri-alert-line';
  let stateClass = 'unverified';

  if (verificationState === 'verified') {
    verificationLabel = 'Verified Vendor';
    verificationIcon = 'ri-shield-check-line';
    stateClass = 'verified';
  } else if (verificationState === 'pending') {
    verificationLabel = 'Pending Review';
    verificationIcon = 'ri-time-line';
    stateClass = 'pending';
  }

  vendorVerifiedBadge.innerHTML = `<i class="${verificationIcon}" aria-hidden="true"></i>${verificationLabel}`;
  vendorVerifiedBadge.className = `vendor-badge vendor-verified ${stateClass}`;

  if (document.body) {
    document.body.dataset.vendorPlan = planValue || '';
    document.body.dataset.vendorVerified = verificationState;
  }

  if (vendorBadgesContainer) {
    vendorBadgesContainer.hidden = false;
  }
};

applyVendorBadges();

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  );

const friendlyLabel = (key) => {
  if (!key) return 'Detail';
  const spaced = String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[\-_]+/g, ' ')
    .replace(/\s+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const normalisePhoneForWhatsapp = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+') && digits.length > 1) {
    return digits.slice(1);
  }
  if (digits.startsWith('234')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `234${digits.slice(1)}`;
  }
  return digits;
};

const setLinkState = (anchor, href, label) => {
  if (!anchor) return;
  if (!href || !label) {
    anchor.href = '#';
    anchor.textContent = label || 'Unavailable';
    anchor.setAttribute('aria-disabled', 'true');
    anchor.classList.add('is-disabled');
    anchor.style.pointerEvents = 'none';
    anchor.style.opacity = '0.6';
  } else {
    anchor.href = href;
    anchor.textContent = label;
    anchor.setAttribute('aria-disabled', 'false');
    anchor.classList.remove('is-disabled');
    anchor.style.pointerEvents = '';
    anchor.style.opacity = '';
  }
};

async function toggleSave() {
  if (!saveBtn) return;
  if (!buyerIdentifier) {
    alert('Please sign in to save listings.');
    return;
  }
  if (!savedRef) return;

  try {
    const snapshot = await getDoc(savedRef);
    if (snapshot.exists()) {
      await deleteDoc(savedRef);
      setSaveState(false);
    } else {
      const vendorPlanValue = document.body?.dataset?.vendorPlan || '';
      const vendorVerifiedValue = document.body?.dataset?.vendorVerified || '';
      await setDoc(savedRef, {
        name: currentProductName,
        price: currentProductPriceLabel,
        image: currentProductImage,
        productId,
        vendorId: currentVendorId,
        vendorName: currentVendorName,
        vendorPlan: formatPlanLabel(vendorPlanValue || currentVendorPlan),
        vendorVerified: normaliseVerificationState(vendorVerifiedValue || currentVendorVerification),
        timestamp: Date.now(),
      });
      setSaveState(true);
    }
  } catch (error) {
    console.error('[product] toggle save failed', error);
    alert('We could not update your saved list. Please try again.');
  }
}

if (saveBtn) {
  saveBtn.addEventListener('click', toggleSave);

  if (buyerIdentifier && savedRef) {
    getDoc(savedRef)
      .then((snapshot) => {
        setSaveState(snapshot.exists());
      })
      .catch((error) => {
        console.error('[product] unable to fetch saved state', error);
      });
  }
}

if (thumbStrip && mainImage) {
  thumbStrip.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target || !target.dataset.image) return;

    mainImage.style.opacity = '0';
    setTimeout(() => {
      mainImage.src = target.dataset.image;
      mainImage.style.opacity = '1';
    }, 150);

    thumbStrip.querySelectorAll('button').forEach((button) => button.classList.remove('active'));
    target.classList.add('active');
  });
}



const quickChatCard = document.getElementById('quickChatCard');
const quickChatForm = document.getElementById('quickChatForm');
const quickMessageInput = document.getElementById('quickMessageInput');
const quickMessageSubmit = document.getElementById('quickMessageSubmit');
const suggestionButtons = document.querySelectorAll('[data-quick-message]');

suggestionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.dataset.quickMessage || '';
    if (!quickMessageInput) return;
    quickMessageInput.value = value;
    quickMessageInput.focus();
  });
});

function ensureBuyerAuthenticated() {
  if (buyerIdentifier) {
    return true;
  }
  const loginUrl = new URL('login.php', window.location.origin);
  loginUrl.searchParams.set('redirect', window.location.href);
  window.location.href = loginUrl.toString();
  return false;
}

function resolveChatMetadata() {
  const vendorChatUid = currentVendorUid || document.body?.dataset?.vendorUid || currentVendorId || '';
  const buyerChatUid = buyerUid || buyerNumericId || buyerIdentifier || '';
  const listingId = productId || productIdInput?.value?.trim?.() || '';
  if (!vendorChatUid || !buyerChatUid || !listingId) {
    return null;
  }
  return {
    chatId: buildChatId(vendorChatUid, buyerChatUid, listingId),
    buyerUid: buyerChatUid,
    vendorUid: vendorChatUid,
    productId: listingId,
    productTitle: currentProductName || productNameEl?.textContent?.trim?.() || 'Marketplace Listing',
    productImage: currentProductImage || productImageEl?.src || PLACEHOLDER_IMAGE,
    vendorName: currentVendorName || document.body?.dataset?.vendorName || 'Vendor',
    buyerName: buyerName || 'Buyer',
  };
}

function buildChatPageUrl(metadata) {
  const url = new URL('chat.php', window.location.origin);
  url.searchParams.set('chat', metadata.chatId);
  url.searchParams.set('buyerUid', metadata.buyerUid);
  url.searchParams.set('vendorUid', metadata.vendorUid);
  url.searchParams.set('listing', metadata.productId);
  url.searchParams.set('listing_title', metadata.productTitle);
  if (metadata.productImage) url.searchParams.set('listing_image', metadata.productImage);
  url.searchParams.set('vendorName', metadata.vendorName);
  url.searchParams.set('buyerName', metadata.buyerName);
  return url.toString();
}

async function launchChatWithMessage(message, { initialOnly = false } = {}) {
  if (!ensureBuyerAuthenticated()) return null;
  const metadata = resolveChatMetadata();
  if (!metadata) {
    alert('We could not prepare the chat. Please try again.');
    return null;
  }

  await ensureChat({
    chatId: metadata.chatId,
    buyer_uid: metadata.buyerUid,
    buyer_name: metadata.buyerName,
    vendor_uid: metadata.vendorUid,
    vendor_name: metadata.vendorName,
    listing_id: metadata.productId,
    listing_title: metadata.productTitle,
    listing_image: metadata.productImage,
  });

  if (message && message.trim() !== '') {
    await sendMessage({
      chatId: metadata.chatId,
      as: 'buyer',
      sender_uid: metadata.buyerUid,
      text: message,
      buyer_uid: metadata.buyerUid,
      vendor_uid: metadata.vendorUid,
    });
  }

  window.location.href = buildChatPageUrl(metadata);
  return metadata;
}

if (quickChatForm && quickMessageInput) {
  quickChatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = quickMessageInput.value.trim();
    if (!message) {
      quickMessageInput.focus();
      return;
    }

    if (quickMessageSubmit) {
      quickMessageSubmit.disabled = true;
      quickMessageSubmit.setAttribute('aria-busy', 'true');
    }

    try {
      await launchChatWithMessage(message);
    } catch (error) {
      console.error('Unable to start chat', error);
      alert('Unable to send message right now. Please try again.');
    } finally {
      if (quickMessageSubmit) {
        quickMessageSubmit.disabled = false;
        quickMessageSubmit.removeAttribute('aria-busy');
      }
    }
  });
}

if (chatWithVendorBtn) {
  chatWithVendorBtn.addEventListener('click', async () => {
    chatWithVendorBtn.disabled = true;
    chatWithVendorBtn.classList.add('is-loading');
    chatWithVendorBtn.setAttribute('aria-busy', 'true');
    try {
      const metadata = resolveChatMetadata();
      const intro = metadata?.productTitle
        ? `Hi, I'm interested in ${metadata.productTitle}.`
        : 'Hi, I am interested in this listing.';
      await launchChatWithMessage(intro, { initialOnly: true });
    } catch (error) {
      console.error('Unable to open chat', error);
      alert('Unable to open chat right now. Please try again.');
      chatWithVendorBtn.disabled = false;
      chatWithVendorBtn.classList.remove('is-loading');
      chatWithVendorBtn.removeAttribute('aria-busy');
    }
  });
}

const quickChatHeading = quickChatCard?.querySelector('h3');
const negotiationSuggestion = suggestionButtons?.[1] || null;

const updateNegotiationSuggestion = () => {
  if (!negotiationSuggestion) return;
  if (currentProductPrice > 0) {
    const offer = Math.max(currentProductPrice - 1000, 0);
    const offerLabel = formatCurrency(offer);
    negotiationSuggestion.dataset.quickMessage = `Can I pay ${offerLabel}?`;
    negotiationSuggestion.textContent = `Can I pay ${offerLabel}?`;
  } else {
    negotiationSuggestion.dataset.quickMessage = 'Can I get a better price?';
    negotiationSuggestion.textContent = 'Can I get a better price?';
  }
};

const updateQuickChatDataset = () => {
  if (!quickChatCard) return;
  const metadata = resolveChatMetadata();
  quickChatCard.dataset.vendorUid = metadata?.vendorUid || currentVendorUid || currentVendorId || '';
  quickChatCard.dataset.vendorId = currentVendorId || '';
  quickChatCard.dataset.vendorName = metadata?.vendorName || currentVendorName || 'Vendor';
  quickChatCard.dataset.buyerUid = metadata?.buyerUid || buyerUid || '';
  quickChatCard.dataset.buyerId = buyerNumericId || '';
  quickChatCard.dataset.productId = metadata?.productId || productId || '';
  quickChatCard.dataset.productTitle = metadata?.productTitle || currentProductName || 'Listing';
  quickChatCard.dataset.productImage = metadata?.productImage || currentProductImage || '';
  if (metadata?.chatId) {
    quickChatCard.dataset.chatId = metadata.chatId;
  }
  if (quickChatHeading) {
    quickChatHeading.textContent = `Chat with ${currentVendorName || 'Vendor'}`;
  }
};

const updateGallery = (images = []) => {
  if (!mainImage) return;
  const galleryImages = Array.isArray(images)
    ? images.map((src) => String(src || '').trim()).filter(Boolean)
    : [];
  if (!galleryImages.length) {
    galleryImages.push(PLACEHOLDER_IMAGE);
  }

  const [firstImage] = galleryImages;
  mainImage.src = firstImage;
  mainImage.alt = `${currentProductName || 'Listing'} image`;
  mainImage.style.opacity = '1';
  if (productImageEl) productImageEl.src = firstImage;
  currentProductImage = firstImage;

  if (thumbStrip) {
    thumbStrip.innerHTML = '';
    galleryImages.forEach((src, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.image = src;
      button.setAttribute('aria-label', `View image ${index + 1}`);
      if (index === 0) button.classList.add('active');
      button.innerHTML = `<img src="${escapeHtml(src)}" alt="Thumbnail image ${index + 1}">`;
      thumbStrip.appendChild(button);
    });
  }

  updateQuickChatDataset();
};

const extractFeatures = (listing = {}) => {
  const featureFields = ['keyFeatures', 'highlights', 'highlightFeatures', 'smartFeatures', 'features', 'featureList'];
  const features = [];
  featureFields.forEach((field) => {
    const value = listing[field];
    if (!value) return;
    if (Array.isArray(value)) {
      value
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .forEach((item) => features.push(item));
    } else if (typeof value === 'string') {
      value
        .split(/[\n;•,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => features.push(item));
    }
  });
  return Array.from(new Set(features));
};

const updateFeatureList = (features = []) => {
  if (!featureListEl) return;
  featureListEl.innerHTML = '';
  if (!features.length) {
    featureListEl.hidden = true;
    return;
  }
  features.forEach((feature) => {
    const li = document.createElement('li');
    li.innerHTML = `<i class="ri-checkbox-circle-line" aria-hidden="true"></i> ${escapeHtml(feature)}`;
    featureListEl.appendChild(li);
  });
  featureListEl.hidden = false;
};

const renderSpecifications = (listing = {}) => {
  if (!specListEl || !specFallbackEl) return;
  specListEl.innerHTML = '';
  const excludedKeys = new Set([
    'title',
    'listingtitle',
    'producttitle',
    'productname',
    'name',
    'price',
    'amount',
    'currency',
    'description',
    'highlights',
    'highlightfeatures',
    'smartfeatures',
    'features',
    'featurelist',
    'category',
    'subcategory',
    'status',
    'vendorid',
    'vendor_id',
    'vendor',
    'imageurls',
    'images',
    'gallery',
    'createdat',
    'updatedat',
    'approvedat',
    'rejectedat',
    'feedback',
    'plan',
    'planslug',
    'planlabel',
    'verification',
    'verificationstatus',
    'verification_state',
    'verificationstage',
    'vendorname',
    'vendorplan',
    'vendorverified',
    'locationfiltervalue',
  ]);

  let specCount = 0;
  Object.entries(listing).forEach(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return;
    const normalisedKey = key.toLowerCase();
    if (excludedKeys.has(normalisedKey)) return;
    if (normalisedKey.includes('image') || normalisedKey.includes('photo') || normalisedKey.includes('url')) return;

    let displayValue = rawValue;
    if (rawValue && typeof rawValue.toDate === 'function') {
      displayValue = rawValue.toDate();
    } else if (rawValue instanceof Date) {
      displayValue = rawValue;
    } else if (Array.isArray(rawValue)) {
      displayValue = rawValue.map((item) => String(item || '').trim()).filter(Boolean).join(', ');
    } else if (typeof rawValue === 'object') {
      return;
    }

    if (displayValue instanceof Date) {
      displayValue = displayValue.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
    } else if (typeof displayValue === 'boolean') {
      displayValue = displayValue ? 'Yes' : 'No';
    } else {
      displayValue = String(displayValue).trim();
    }

    if (!displayValue) return;

    const row = document.createElement('div');
    row.className = 'spec-row';
    row.innerHTML = `<span>${escapeHtml(friendlyLabel(key))}</span><strong>${escapeHtml(displayValue)}</strong>`;
    specListEl.appendChild(row);
    specCount += 1;
  });

  specListEl.hidden = specCount === 0;
  specFallbackEl.hidden = specCount > 0;
};

const updateCategoryLine = (category, subcategory) => {
  if (!categoryLineEl || !categoryLabelEl) return;
  const parts = [];
  if (category) parts.push(category);
  if (subcategory && subcategory !== category) parts.push(subcategory);
  if (!parts.length) {
    categoryLineEl.hidden = true;
    return;
  }
  categoryLabelEl.textContent = parts.join(' · ');
  categoryLineEl.hidden = false;
};

const updateStatusBadge = (status) => {
  if (!productStatusEl) return;
  const normalized = String(status || 'available').toLowerCase();
  let label = 'Available';
  if (normalized === 'pending') label = 'Pending Approval';
  else if (normalized === 'sold' || normalized === 'soldout') label = 'Sold Out';
  else if (['suspended', 'disabled', 'unavailable'].includes(normalized)) label = 'Temporarily Unavailable';
  else if (!['approved', 'available', 'active'].includes(normalized)) {
    label = friendlyLabel(normalized);
  }
  productStatusEl.textContent = label;
  productStatusEl.className = 'status-chip';
  productStatusEl.classList.add(`status-${normalized}`);
};

const updateWhatsappLinks = () => {
  const formatted = normalisePhoneForWhatsapp(currentVendorPhone);
  const messageLines = [
    `Hello ${currentVendorName || 'Vendor'},`,
    '',
    `I want to purchase "${currentProductName || 'your listing'}" from Yustam Marketplace.`,
    `Product ID: ${productId || 'N/A'}`,
  ];
  if (currentProductPriceLabel) {
    messageLines.push(`Displayed price: ${currentProductPriceLabel}`);
  }
  messageLines.push(`Product link: ${window.location.href}`);
  messageLines.push(
    '',
    'This is an automated message from Yustam Marketplace confirming my interest in this product.',
  );
  const encodedMessage = encodeURIComponent(messageLines.join('\n'));

  if (formatted) {
    const whatsappUrl = `https://wa.me/${formatted}?text=${encodedMessage}`;
    setLinkState(vendorWhatsappLink, whatsappUrl, 'WhatsApp Vendor');
    if (floatingWhatsappBtn) {
      floatingWhatsappBtn.classList.remove('is-disabled');
      floatingWhatsappBtn.removeAttribute('aria-disabled');
      floatingWhatsappBtn.onclick = () => window.open(whatsappUrl, '_blank');
    }
  } else {
    setLinkState(vendorWhatsappLink, null, 'WhatsApp Vendor');
    if (floatingWhatsappBtn) {
      floatingWhatsappBtn.classList.add('is-disabled');
      floatingWhatsappBtn.setAttribute('aria-disabled', 'true');
      floatingWhatsappBtn.onclick = () => {
        alert('Vendor WhatsApp contact is not available yet.');
      };
    }
  }
};

const applyVendorData = (vendor, vendorIdValue) => {
  if (vendorIdValue) {
    currentVendorId = vendorIdValue;
    document.body.dataset.vendorId = vendorIdValue;
    if (!currentVendorUid) {
      currentVendorUid = vendorIdValue;
    }
  }

  if (vendor) {
    if (vendor.vendorUid || vendor.uid) {
      currentVendorUid = vendor.vendorUid || vendor.uid;
    }
    if (currentVendorUid) {
      document.body.dataset.vendorUid = currentVendorUid;
    }
    currentVendorName = vendor.displayName || vendor.businessName || vendor.name || currentVendorName;
    document.body.dataset.vendorName = currentVendorName;
    if (vendorBusinessEl) {
      const businessName = vendor.businessName || '';
      vendorBusinessEl.textContent = businessName;
      vendorBusinessEl.hidden = !businessName;
    }

    const photo = vendor.profilePhoto || vendor.avatarUrl || vendor.logo || '';
    if (vendorAvatarEl) {
      vendorAvatarEl.src = photo || PLACEHOLDER_IMAGE;
    }

    const verificationValue =
      vendor.verificationStatus || vendor.verification_state || vendor.verificationStage || vendor.status;
    applyVendorBadges(vendor.plan || vendor.planLabel, verificationValue);

    const email = vendor.email || vendor.contactEmail || '';
    setLinkState(vendorEmailLink, email ? `mailto:${email}` : null, email || 'Unavailable');

    const phone = vendor.phone || vendor.contactPhone || '';
    currentVendorPhone = phone;
    setLinkState(vendorPhoneLink, phone ? `tel:${phone.replace(/\s+/g, '')}` : null, phone || 'Unavailable');

    const locationParts = [vendor.location, vendor.city, vendor.state, vendor.region, vendor.address]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean);
    if (vendorLocationRow && vendorLocationEl) {
      if (locationParts.length) {
        vendorLocationEl.textContent = locationParts[0];
        vendorLocationRow.hidden = false;
      } else {
        vendorLocationRow.hidden = true;
      }
    }

    let joinedDate = null;
    const possibleDates = [vendor.createdAt, vendor.created_at, vendor.joined_at, vendor.registrationDate];
    possibleDates.some((value) => {
      if (!value) return false;
      if (value instanceof Date) {
        joinedDate = value;
        return true;
      }
      if (value && typeof value.toDate === 'function') {
        joinedDate = value.toDate();
        return true;
      }
      if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          joinedDate = parsed;
          return true;
        }
      }
      return false;
    });

    if (vendorSinceRow && vendorSinceEl) {
      if (joinedDate) {
        vendorSinceEl.textContent = joinedDate.toLocaleDateString('en-NG', { year: 'numeric', month: 'long' });
        vendorSinceRow.hidden = false;
      } else {
        vendorSinceRow.hidden = true;
      }
    }

    if (vendorStorefrontLink && currentVendorId) {
      vendorStorefrontLink.href = `vendor-storefront.php?vendorId=${encodeURIComponent(currentVendorId)}`;
    }
  } else {
    applyVendorBadges(currentVendorPlan, currentVendorVerification);
    setLinkState(vendorEmailLink, null, 'Unavailable');
    setLinkState(vendorPhoneLink, null, 'Unavailable');
    if (vendorBusinessEl) vendorBusinessEl.hidden = true;
    if (vendorLocationRow) vendorLocationRow.hidden = true;
    if (vendorSinceRow) vendorSinceRow.hidden = true;
    if (vendorAvatarEl) vendorAvatarEl.src = PLACEHOLDER_IMAGE;
    document.body.dataset.vendorName = currentVendorName;
  }

  if (vendorNameEl) vendorNameEl.textContent = currentVendorName;
  updateQuickChatDataset();
  updateWhatsappLinks();
};

const loadVendorProfile = async (vendorIdValue) => {
  currentVendorId = vendorIdValue || currentVendorId;
  if (currentVendorId) {
    document.body.dataset.vendorId = currentVendorId;
    if (!currentVendorUid) {
      currentVendorUid = currentVendorId;
      document.body.dataset.vendorUid = currentVendorUid;
    }
  }

  if (!vendorIdValue) {
    applyVendorData(null, currentVendorId);
    return;
  }

  try {
    const vendorSnap = await getDoc(doc(db, 'vendors', vendorIdValue));
    if (vendorSnap.exists()) {
      applyVendorData(vendorSnap.data(), vendorIdValue);
    } else {
      applyVendorData(null, vendorIdValue);
    }
  } catch (error) {
    console.error('[product] vendor load failed', error);
    applyVendorData(null, vendorIdValue);
  }
};

const applyListingData = (listing = {}) => {
  currentProductName = listing.title || listing.productName || currentProductName || 'Marketplace Listing';
  if (productNameEl) productNameEl.textContent = currentProductName;
  document.title = `${currentProductName} | YUSTAM Marketplace`;

  const priceValue = Number(listing.price ?? listing.amount ?? 0);
  currentProductPrice = Number.isFinite(priceValue) ? priceValue : 0;
  currentProductPriceLabel = currentProductPrice > 0 ? formatCurrency(currentProductPrice) : '';
  productPriceEl.textContent = currentProductPrice > 0 ? currentProductPriceLabel : 'Contact vendor';
  updateNegotiationSuggestion();

  if (productDescEl) {
    productDescEl.textContent =
      listing.description || listing.details || 'The vendor has not provided additional details yet.';
  }

  updateFeatureList(extractFeatures(listing));
  renderSpecifications(listing);
  updateCategoryLine(listing.category, listing.subcategory);
  updateStatusBadge(listing.status || 'available');

  const galleryImages = [];
  if (Array.isArray(listing.imageUrls)) galleryImages.push(...listing.imageUrls);
  if (Array.isArray(listing.images)) galleryImages.push(...listing.images);
  updateGallery(galleryImages);

  const listingVendorId = listing.vendorID || listing.vendorId || listing.vendor || currentVendorId;
  if (listingVendorId) {
    currentVendorId = listingVendorId;
    document.body.dataset.vendorId = listingVendorId;
    if (!currentVendorUid) {
      currentVendorUid = listing.vendorUid || listing.vendorUID || listingVendorId;
    }
    if (currentVendorUid) {
      document.body.dataset.vendorUid = currentVendorUid;
    }
  }

  if (listing.vendorPlan) currentVendorPlan = listing.vendorPlan;
  if (listing.vendorVerified) currentVendorVerification = listing.vendorVerified;

  updateQuickChatDataset();
};

const loadListing = async () => {
  if (!productId) {
    updateStatusBadge('unavailable');
    productPriceEl.textContent = 'Unavailable';
    updateWhatsappLinks();
    return;
  }

  try {
    const listingSnap = await getDoc(doc(db, 'listings', productId));
    if (!listingSnap.exists()) {
      updateStatusBadge('unavailable');
      productPriceEl.textContent = 'Unavailable';
      if (featureListEl) featureListEl.hidden = true;
      if (specListEl) {
        specListEl.innerHTML = '';
        specListEl.hidden = true;
      }
      if (specFallbackEl) specFallbackEl.hidden = false;
      updateWhatsappLinks();
      return;
    }

    const listingData = listingSnap.data();
    applyListingData(listingData);
    await loadVendorProfile(listingData.vendorID || listingData.vendorId || listingData.vendor || currentVendorId);
  } catch (error) {
    console.error('[product] listing load failed', error);
    updateStatusBadge('unavailable');
    productPriceEl.textContent = 'Unavailable';
  } finally {
    updateWhatsappLinks();
  }
};

updateQuickChatDataset();
updateNegotiationSuggestion();
loadListing();
