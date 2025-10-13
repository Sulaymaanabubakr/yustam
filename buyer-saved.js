import { db } from './firebase.js';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const savedShell = document.getElementById('buyerSaved');
const savedGrid = document.getElementById('savedGrid');
const emptyState = document.getElementById('savedEmpty');
const toastEl = document.getElementById('savedToast');

const buyerId = savedShell?.dataset?.buyerId || document.body?.dataset?.buyerId || '';

function redirectToLogin() {
  window.location.href = 'buyer-login.php';
}

if (!buyerId) {
  redirectToLogin();
}

function showToast(message, type = 'success') {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove('is-visible', 'is-error');
  if (type === 'error') {
    toastEl.classList.add('is-error');
  }
  requestAnimationFrame(() => {
    toastEl.classList.add('is-visible');
    setTimeout(() => {
      toastEl.classList.remove('is-visible');
      toastEl.classList.remove('is-error');
    }, 2600);
  });
}

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
};

function buildCard(docSnap) {
  const data = docSnap.data?.() || {};
  const productName = data.name || data.title || 'Marketplace listing';
  const productImage = data.image || data.cover || 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=420&q=80';
  const price = data.price;
  const productUrl = data.productUrl || data.url || `product.html?id=${encodeURIComponent(data.productId || docSnap.id)}`;

  const card = document.createElement('article');
  card.className = 'listing-card';
  card.dataset.docId = docSnap.id;

  const img = document.createElement('img');
  img.src = productImage;
  img.alt = productName;

  const body = document.createElement('div');
  body.className = 'listing-body';

  const title = document.createElement('h2');
  title.textContent = productName;

  const priceEl = document.createElement('span');
  priceEl.textContent = price ? formatCurrency(price) : 'Tap to see price details';

  const actions = document.createElement('div');
  actions.className = 'listing-actions';

  const viewBtn = document.createElement('button');
  viewBtn.className = 'view-button';
  viewBtn.type = 'button';
  viewBtn.textContent = 'View';
  viewBtn.addEventListener('click', () => {
    window.open(productUrl, '_blank');
  });

  const saveToggle = document.createElement('button');
  saveToggle.className = 'save-toggle is-active';
  saveToggle.type = 'button';
  saveToggle.setAttribute('aria-label', `Remove ${productName} from saved`);
  saveToggle.textContent = '❤️';
  saveToggle.addEventListener('click', async () => {
    try {
      await deleteDoc(doc(db, 'saved', buyerId, 'items', docSnap.id));
      showToast('Removed from saved items.');
    } catch (error) {
      console.error('[buyer-saved] remove failed', error);
      showToast('Could not remove this item.', 'error');
    }
  });

  actions.appendChild(viewBtn);
  actions.appendChild(saveToggle);

  body.appendChild(title);
  body.appendChild(priceEl);
  body.appendChild(actions);

  card.appendChild(img);
  card.appendChild(body);

  return card;
}

function renderSaved(snapshot) {
  if (!savedGrid) return;
  savedGrid.innerHTML = '';
  const docs = snapshot.docs || [];
  if (docs.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';
  docs.forEach((docSnap) => {
    const card = buildCard(docSnap);
    savedGrid.appendChild(card);
  });
}

try {
  const savedRef = collection(db, 'saved', buyerId, 'items');
  const savedQuery = query(savedRef, orderBy('timestamp', 'desc'));
  onSnapshot(savedQuery, renderSaved, (error) => {
    console.error('[buyer-saved] snapshot error', error);
    showToast('Unable to load saved items right now.', 'error');
    if (emptyState) emptyState.style.display = 'block';
  });
} catch (error) {
  console.error('[buyer-saved] setup failed', error);
  showToast('Unable to connect to saved listings.', 'error');
}
