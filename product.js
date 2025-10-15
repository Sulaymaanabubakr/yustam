import { db } from './firebase.js';
import { deleteDoc, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const mainImage = document.getElementById('productImage') || document.getElementById('mainImage');
const thumbStrip = document.getElementById('thumbStrip');

const saveBtn = document.getElementById('saveListingBtn');
const buyerId = document.body?.dataset?.buyerId || '';
const productIdInput = document.getElementById('productId');
const productId = productIdInput?.value?.trim?.() || '';
const productNameEl = document.getElementById('productName');
const productPriceEl = document.getElementById('productPrice');
const productImageEl = document.getElementById('productImage');
const vendorPlanBadge = document.getElementById('vendorPlanBadge');
const vendorVerifiedBadge = document.getElementById('vendorVerifiedBadge');
const vendorBadgesContainer = document.querySelector('.vendor-badges');
const vendorNameEl = document.getElementById('vendorTitle');

const productName = productNameEl?.textContent?.trim?.() || '';
const productPrice = productPriceEl?.textContent?.trim?.() || '';
const productImageUrl = productImageEl?.src || '';
const vendorName = vendorNameEl?.textContent?.trim?.() || document.body?.dataset?.vendorName || 'Vendor';
const vendorId = document.body?.dataset?.vendorId || '';

const savedRef = buyerId && productId ? doc(db, `saved/${buyerId}/items/${productId}`) : null;

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

const applyVendorBadges = () => {
  if (!vendorPlanBadge || !vendorVerifiedBadge) return;

  const params = new URLSearchParams(window.location.search);
  let planValue = params.get('plan');
  let verifiedValue = params.get('verified');

  if (planValue) {
    planValue = decodeURIComponent(planValue);
  } else {
    planValue = document.body?.dataset?.vendorPlan || '';
  }

  if (verifiedValue !== null) {
    verifiedValue = decodeURIComponent(verifiedValue);
  } else {
    verifiedValue = document.body?.dataset?.vendorVerified || '';
  }

  planValue = planValue ? String(planValue).trim() : '';

  const planLabel = formatPlanLabel(planValue);
  const planSlug = slugifyPlan(planValue);
  vendorPlanBadge.innerHTML = `<i class="ri-vip-crown-fill" aria-hidden="true"></i>${planLabel}`;
  vendorPlanBadge.className = `vendor-badge vendor-plan vendor-plan-${planSlug}`;

  const verificationState = normaliseVerificationState(verifiedValue);
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

async function toggleSave() {
  if (!saveBtn) return;
  if (!buyerId) {
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
        name: productName,
        price: productPrice,
        image: productImageUrl,
        productId,
        vendorId,
        vendorName,
        vendorPlan: formatPlanLabel(vendorPlanValue),
        vendorVerified: normaliseVerificationState(vendorVerifiedValue),
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

  if (buyerId && savedRef) {
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

const addToCartButton = document.getElementById('addToCartBtn');
if (addToCartButton) {
  addToCartButton.addEventListener('click', () => {
    alert('Add to cart functionality coming soon!');
  });
}

const whatsappButton = document.getElementById('whatsappBtn');
if (whatsappButton) {
  whatsappButton.addEventListener('click', () => {
    window.open('https://wa.me/2348031234567', '_blank');
  });
}

const quickChatCard = document.getElementById('quickChatCard');
const quickChatForm = document.getElementById('quickChatForm');
const quickMessageInput = document.getElementById('quickMessageInput');
const suggestionButtons = document.querySelectorAll('[data-quick-message]');
const QUICK_MESSAGE_KEY = 'yustam_quick_message';

suggestionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.dataset.quickMessage || '';
    if (!quickMessageInput) return;
    quickMessageInput.value = value;
    quickMessageInput.focus();
  });
});

function buildChatUrl() {
  if (!quickChatCard) return null;
  const { chatId, vendorId, vendorName, buyerId, productId, productTitle, productImage } = quickChatCard.dataset;
  const computedChatId = chatId || `${vendorId || 'vendor'}_${buyerId || 'guest'}_${productId || 'listing'}`;

  const url = new URL('chat.php', window.location.origin);
  url.searchParams.set('chatId', computedChatId);
  url.searchParams.set('vendorId', vendorId || '');
  url.searchParams.set('buyerId', buyerId || '');
  url.searchParams.set('productId', productId || '');
  url.searchParams.set('participantName', vendorName || 'Vendor');
  url.searchParams.set('productTitle', productTitle || 'Listing');
  url.searchParams.set('productImage', productImage || '');
  url.searchParams.set('status', 'Online');
  return { url: url.toString(), chatId: computedChatId };
}

if (quickChatForm && quickMessageInput) {
  quickChatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = quickMessageInput.value.trim();
    if (!message) {
      quickMessageInput.focus();
      return;
    }

    const chatLink = buildChatUrl();
    if (!chatLink) {
      alert('We could not prepare the chat. Please try again.');
      return;
    }

    try {
      sessionStorage.setItem(QUICK_MESSAGE_KEY, JSON.stringify({
        chatId: chatLink.chatId,
        text: message
      }));
    } catch (error) {
      console.warn('Unable to store quick message payload', error);
    }

    window.location.href = chatLink.url;
  });
}
