import { db } from './firebase.js';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const dashboardShell = document.getElementById('buyerDashboard');
const savedList = document.getElementById('recentSavedList');
const savedEmpty = document.getElementById('savedEmptyState');
const chatsList = document.getElementById('recentChatsList');
const chatsEmpty = document.getElementById('chatsEmptyState');
const toastEl = document.getElementById('buyerToast');

const buyerId = dashboardShell?.dataset?.buyerId || document.body?.dataset?.buyerId || '';

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

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (!Number.isFinite(date?.getTime?.())) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function createSavedPreview(docSnap, index) {
  const data = docSnap.data?.() || {};
  const productName = data.name || data.title || 'Marketplace listing';
  const price = data.price;
  const image = data.image || data.cover || 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=240&q=80';
  const card = document.createElement('article');
  card.className = 'mini-card';
  card.style.animationDelay = `${Math.min(index, 6) * 70}ms`;

  const picture = document.createElement('img');
  picture.src = image;
  picture.alt = productName;

  const meta = document.createElement('div');
  meta.className = 'meta';

  const nameEl = document.createElement('strong');
  nameEl.textContent = productName;

  const priceEl = document.createElement('span');
  priceEl.textContent = price ? formatCurrency(price) : 'Tap to view details';

  meta.appendChild(nameEl);
  meta.appendChild(priceEl);

  const viewLink = document.createElement('a');
  viewLink.href = data.productUrl || data.url || `product.html?id=${encodeURIComponent(data.productId || docSnap.id)}`;
  viewLink.textContent = 'View';
  viewLink.style.fontWeight = '600';
  viewLink.style.color = 'var(--emerald)';

  card.appendChild(picture);
  card.appendChild(meta);
  card.appendChild(viewLink);

  return card;
}

function renderSaved(snapshot) {
  if (!savedList) return;
  savedList.innerHTML = '';
  const docs = snapshot.docs || [];
  if (docs.length === 0) {
    if (savedEmpty) savedEmpty.style.display = 'block';
    return;
  }
  if (savedEmpty) savedEmpty.style.display = 'none';
  docs.forEach((docSnap, index) => {
    const card = createSavedPreview(docSnap, index);
    savedList.appendChild(card);
  });
}

function createChatPreview(docSnap, index) {
  const data = docSnap.data?.() || {};
  const displayName = data.counterpartyName || data.vendorName || data.buyerName || 'Marketplace partner';
  const lastMessage = data.lastMessage || {};
  const messageTextRaw = lastMessage.text?.trim?.() || '';
  const messageText = messageTextRaw || (lastMessage.imageUrl ? '📷 Photo' : 'Tap to start chatting');
  const productTitle = data.productTitle || data.productName || 'Marketplace listing';
  const timestamp = lastMessage.timestamp || data.lastUpdated || data.updatedAt;

  const card = document.createElement('article');
  card.className = 'mini-card';
  card.style.justifyContent = 'space-between';
  card.style.alignItems = 'flex-start';
  card.style.animationDelay = `${Math.min(index, 6) * 70}ms`;

  const avatar = document.createElement('div');
  avatar.style.width = '56px';
  avatar.style.height = '56px';
  avatar.style.borderRadius = '16px';
  avatar.style.background = 'rgba(0,77,64,0.16)';
  avatar.style.display = 'grid';
  avatar.style.placeItems = 'center';
  avatar.style.fontWeight = '700';
  avatar.style.color = 'var(--emerald)';
  const initials = (displayName || 'Y').split(' ').filter(Boolean).map((part) => part[0]?.toUpperCase()).join('').slice(0, 2) || 'YU';
  avatar.textContent = initials;

  const meta = document.createElement('div');
  meta.className = 'meta';

  const nameEl = document.createElement('strong');
  nameEl.textContent = displayName;

  const messageEl = document.createElement('span');
  messageEl.textContent = messageText;

  const productEl = document.createElement('span');
  productEl.textContent = productTitle;
  productEl.style.fontWeight = '600';
  productEl.style.color = 'rgba(0,77,64,0.75)';

  const timeEl = document.createElement('span');
  timeEl.style.fontSize = '0.78rem';
  timeEl.style.color = 'rgba(17,17,17,0.56)';
  timeEl.textContent = formatRelativeTime(timestamp);

  meta.appendChild(nameEl);
  meta.appendChild(messageEl);
  meta.appendChild(productEl);
  meta.appendChild(timeEl);

  card.appendChild(avatar);
  card.appendChild(meta);

  card.addEventListener('click', () => {
    const destination = new URL('chat.php', window.location.href);
    destination.searchParams.set('chatId', docSnap.id);
    if (data.productId) destination.searchParams.set('productId', data.productId);
    if (data.vendorId) destination.searchParams.set('vendorId', data.vendorId);
    destination.searchParams.set('participantName', displayName);
    destination.searchParams.set('productTitle', productTitle);
    window.location.href = destination.toString();
  });

  return card;
}

function renderChats(snapshot) {
  if (!chatsList) return;
  chatsList.innerHTML = '';
  const docs = snapshot.docs || [];
  if (docs.length === 0) {
    if (chatsEmpty) chatsEmpty.style.display = 'block';
    return;
  }
  if (chatsEmpty) chatsEmpty.style.display = 'none';
  docs.forEach((docSnap, index) => {
    const card = createChatPreview(docSnap, index);
    chatsList.appendChild(card);
  });
}

try {
  const savedRef = collection(db, 'saved', buyerId, 'items');
  const savedQuery = query(savedRef, orderBy('timestamp', 'desc'), limit(3));
  onSnapshot(savedQuery, renderSaved, (error) => {
    console.error('[buyer-dashboard] saved listings error', error);
    showToast('Unable to load saved listings right now.', 'error');
    if (savedEmpty) savedEmpty.style.display = 'block';
  });
} catch (error) {
  console.error('[buyer-dashboard] saved setup failed', error);
  showToast('Unable to connect to saved listings.', 'error');
}

try {
  const chatsRef = collection(db, 'chats');
  const chatsQuery = query(chatsRef, where('participants', 'array-contains', buyerId), orderBy('lastUpdated', 'desc'), limit(2));
  onSnapshot(chatsQuery, renderChats, (error) => {
    console.error('[buyer-dashboard] chats error', error);
    showToast('Unable to load chats right now.', 'error');
    if (chatsEmpty) chatsEmpty.style.display = 'block';
  });
} catch (error) {
  console.error('[buyer-dashboard] chat setup failed', error);
  showToast('Unable to connect to chats.', 'error');
}
