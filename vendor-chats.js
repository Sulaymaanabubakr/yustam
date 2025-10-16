import { subscribeToUserChatSummaries } from './chat-service.js';

const listEl = document.getElementById('chatList');
const loaderEl = document.getElementById('chatLoader');
const emptyEl = document.getElementById('chatEmpty');
const searchInput = document.getElementById('chatSearch');

const state = {
  role: 'vendor',
  userUid: document.body?.dataset?.vendorUid || '',
  userName: document.body?.dataset?.vendorName || 'Vendor',
  chats: [],
  filtered: [],
  unsubscribe: null,
};

function setLoading(isLoading) {
  if (!loaderEl) return;
  loaderEl.hidden = !isLoading;
}

function formatTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildChatUrl(chat) {
  const url = new URL('chat.php', window.location.origin);
  url.searchParams.set('chatId', chat.chatId);
  url.searchParams.set('buyerUid', chat.buyerUid);
  url.searchParams.set('vendorUid', chat.vendorUid);
  url.searchParams.set('productId', chat.productId);
  url.searchParams.set('productTitle', chat.productTitle || 'Marketplace Listing');
  if (chat.productImage) url.searchParams.set('productImage', chat.productImage);
  if (chat.counterpartyName) url.searchParams.set('participantName', chat.counterpartyName);
  return url.toString();
}

function createCard(chat) {
  const card = document.createElement('article');
  card.className = 'chat-card';
  card.dataset.chatId = chat.chatId;
  card.tabIndex = 0;
  card.innerHTML = `
    <div class="avatar">${escapeHtml(chat.initials)}</div>
    <div class="chat-info">
      <h2>${escapeHtml(chat.counterpartyName)}</h2>
      <p>${escapeHtml(chat.preview)}</p>
      <div class="chat-product"><i class="ri-shopping-bag-3-line" aria-hidden="true"></i>${escapeHtml(chat.productTitle)}</div>
    </div>
    <div class="chat-meta">
      <span>${escapeHtml(formatTime(chat.lastUpdated))}</span>
      ${chat.typing ? '<span class="badge">Typing…</span>' : ''}
      ${chat.unreadCount > 0 ? `<span class="badge">${escapeHtml(chat.unreadCount > 9 ? '9+' : String(chat.unreadCount))}</span>` : ''}
    </div>
  `;

  const navigate = () => {
    window.location.href = buildChatUrl(chat);
  };

  card.addEventListener('click', navigate);
  card.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate();
    }
  });

  return card;
}

function render() {
  if (!listEl) return;
  listEl.innerHTML = '';
  if (!state.filtered.length) {
    listEl.hidden = true;
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  listEl.hidden = false;
  if (emptyEl) emptyEl.hidden = true;
  const fragment = document.createDocumentFragment();
  state.filtered.forEach((chat) => fragment.appendChild(createCard(chat)));
  listEl.appendChild(fragment);
}

function normaliseSnapshot(snapshot) {
  if (!snapshot) return [];
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const lastUpdated = data.last_updated?.toDate ? data.last_updated.toDate() : data.last_updated;
    const counterpartyName = data.buyer_name || 'Marketplace Buyer';
    return {
      chatId: docSnap.id,
      buyerUid: data.buyer_uid,
      vendorUid: data.vendor_uid,
      productId: data.product_id,
      productTitle: data.product_title || 'Marketplace Listing',
      productImage: data.product_image || '',
      counterpartyName,
      initials: counterpartyName
        .split(' ')
        .map((part) => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'YU',
      preview: data.last_message || 'Reply quickly to close the sale.',
      lastUpdated,
      typing: Boolean(data.buyer_typing),
      unreadCount: Number(data.unread_for_vendor || 0),
    };
  });
}

function handleSnapshot(snapshot) {
  state.chats = normaliseSnapshot(snapshot);
  filterChats(searchInput?.value || '');
  setLoading(false);
}

function filterChats(term) {
  const value = term.trim().toLowerCase();
  if (!value) {
    state.filtered = [...state.chats];
  } else {
    state.filtered = state.chats.filter((chat) =>
      `${chat.counterpartyName} ${chat.productTitle} ${chat.preview}`.toLowerCase().includes(value),
    );
  }
  state.filtered.sort((a, b) => (b.lastUpdated?.getTime?.() || 0) - (a.lastUpdated?.getTime?.() || 0));
  render();
}

function init() {
  if (!state.userUid) {
    console.warn('[vendor-chats] Missing vendor uid');
    return;
  }

  setLoading(true);
  state.unsubscribe = subscribeToUserChatSummaries(state.role, state.userUid, handleSnapshot);
  searchInput?.addEventListener('input', (event) => {
    filterChats(event.target.value || '');
  });
}

init();
