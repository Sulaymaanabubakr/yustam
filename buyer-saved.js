import { db } from './firebase.js';
import { collection, onSnapshot, deleteDoc, doc, orderBy, query } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const buyerId = document.body?.dataset?.buyerId || '';
const grid = document.getElementById('savedGrid');
const empty = document.getElementById('emptyState');

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

const normaliseVerificationState = (value) => {
  if (value === true || value === 1) return 'verified';
  if (value === false || value === 0 || value === null || value === undefined) return 'unverified';
  const norm = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'verified', 'approved', 'active'].includes(norm)) return 'verified';
  if (['pending', 'submitted', 'processing', 'in_review', 'in-review', 'under review'].includes(norm)) return 'pending';
  if (['rejected', 'declined', 'failed', 'needs_changes', 'needs update', 'needs-update', '0', 'false', 'no', 'unverified'].includes(norm)) return 'unverified';
  return 'unverified';
};

const createPlanBadge = (plan) => {
  const label = formatPlanLabel(plan);
  const slug = slugifyPlan(plan);
  return `<span class="vendor-badge vendor-plan vendor-plan-${slug}"><i class="ri-vip-crown-fill" aria-hidden="true"></i>${escapeHtml(label)}</span>`;
};

const createVerificationBadge = (state) => {
  const verificationState = normaliseVerificationState(state);
  if (verificationState === 'verified') {
    return '<span class="vendor-badge vendor-verified verified"><i class="ri-shield-check-line" aria-hidden="true"></i>Verified Vendor</span>';
  }
  if (verificationState === 'pending') {
    return '<span class="vendor-badge vendor-verified pending"><i class="ri-time-line" aria-hidden="true"></i>Pending Review</span>';
  }
  return '<span class="vendor-badge vendor-verified unverified"><i class="ri-alert-line" aria-hidden="true"></i>Not Verified</span>';
};

const buildBadgesMarkup = (plan, verificationState) => `<div class="vendor-badges">${createPlanBadge(plan)}${createVerificationBadge(verificationState)}</div>`;

const buildProductUrl = (id, vendorPlan, verificationState, vendorId) => {
  const params = new URLSearchParams();
  if (id) params.set('id', id);
  if (vendorId) params.set('vendorId', vendorId);
  if (vendorPlan) params.set('plan', vendorPlan);
  if (verificationState) params.set('verified', verificationState);
  const query = params.toString();
  return query ? `product.php?${query}` : 'product.php';
};

function renderEmptyState() {
  if (!empty) return;
  empty.hidden = false;
}

if (buyerId && grid) {
  const savedItemsRef = query(collection(db, `saved/${buyerId}/items`), orderBy('timestamp', 'desc'));
  onSnapshot(savedItemsRef, (snapshot) => {
    grid.innerHTML = '';
    if (snapshot.empty) {
      renderEmptyState();
      return;
    }
    if (empty) empty.hidden = true;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const productKeyRaw = data.productId || docSnap.id || '';
      const productKey = String(productKeyRaw).trim();
      const name = data.name || data.title || 'Saved listing';
      const priceLabel = data.price || 'Tap to view price';
      const imageUrl = data.image || 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=420&q=80';
      const vendorName = data.vendorName || 'Vendor';
      const vendorPlan = data.vendorPlan || '';
      const verificationState = normaliseVerificationState(data.vendorVerified);
      const viewUrl = buildProductUrl(productKey, vendorPlan, verificationState, data.vendorId || '');

      const card = document.createElement('div');
      card.className = 'saved-card';
      card.innerHTML = `
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}">
        <h3>${escapeHtml(name)}</h3>
        <p class="price">${escapeHtml(priceLabel)}</p>
        <div class="vendor-meta">
          <i class="ri-store-2-line" aria-hidden="true"></i>
          <span>${escapeHtml(vendorName)}</span>
        </div>
        ${buildBadgesMarkup(vendorPlan, verificationState)}
        <div class="actions">
          <a href="${escapeHtml(viewUrl)}" class="btn">View</a>
          <button class="remove-btn" data-id="${escapeHtml(productKey)}"><i class="ri-delete-bin-line"></i> Remove</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll('.remove-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const productKey = btn.dataset.id;
        if (!productKey) return;
        try {
          await deleteDoc(doc(db, `saved/${buyerId}/items/${productKey}`));
        } catch (error) {
          console.error('[buyer-saved] remove failed', error);
        }
      });
    });
  });
} else if (empty) {
  renderEmptyState();
}
