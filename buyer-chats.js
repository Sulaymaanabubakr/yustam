import {
  listSummariesForUser,
  subscribeToTyping,
  showToast,
} from './chat-service.js';

const listEl = document.getElementById('chat-list');
const loaderEl = document.getElementById('chat-loader');
const emptyEl = document.getElementById('chat-empty');
const errorEl = document.getElementById('chat-error');
const retryBtn = document.getElementById('chat-retry');
const searchInput = document.getElementById('chat-search');

const typingSubscriptions = new Map();

const state = {
  ready: false,
  items: [],
  filtered: [],
  typing: new Map(),
  unsubscribe: null,
  search: '',
};

function setLoading(isLoading) {
  if (loaderEl) loaderEl.hidden = !isLoading;
}

function setError(visible) {
  if (errorEl) errorEl.hidden = !visible;
}

function formatTime(date) {
  if (!date) return '';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 2) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function createTypingDots() {
  return `<span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initials(name) {
  return (name || '')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'YU';
}

function buildCard(chat) {
  const typing = state.typing.get(chat.chatId)?.vendor ? 'Vendor typing' : '';
  const typingHtml = typing
    ? `<span class="typing" role="status">${createTypingDots()} typing…</span>`
    : '';
  const unread = chat.unread_for_buyer > 0;
  const unreadLabel = unread ? (chat.unread_for_buyer > 9 ? '9+' : chat.unread_for_buyer) : '';
  const href = `chat.php?chat=${encodeURIComponent(chat.chatId)}`;

  const lastTime = chat.last_ts ? formatTime(chat.last_ts) : '—';

  return `
    <article class="chat-card" role="listitem" tabindex="0" data-chat-id="${escapeHtml(chat.chatId)}" data-href="${href}">
      <div class="chat-thumbnail">
        ${chat.listing_image ? `<img src="${escapeHtml(chat.listing_image)}" alt="${escapeHtml(chat.listing_title)}">` : ''}
      </div>
      <div class="chat-avatar" aria-hidden="true">${escapeHtml(initials(chat.vendor_name))}</div>
      <div class="chat-info">
        <h2>${escapeHtml(chat.vendor_name)}</h2>
        <p class="last-message">${escapeHtml(chat.last_text || 'Ask about this listing')}</p>
        <div class="listing"><i class="ri-store-3-line" aria-hidden="true"></i>${escapeHtml(chat.listing_title)}</div>
      </div>
      <div class="chat-meta">
        <span class="time">${escapeHtml(lastTime)}</span>
        ${typingHtml}
        ${unread ? `<span class="unread" aria-label="${escapeHtml(unreadLabel)} unread messages">${escapeHtml(unreadLabel)}</span>` : ''}
      </div>
    </article>
  `;
}

function render() {
  if (!listEl) return;
  listEl.innerHTML = '';

  if (!state.filtered.length) {
    listEl.hidden = true;
    if (state.ready) {
      if (emptyEl) emptyEl.hidden = false;
    }
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  listEl.hidden = false;

  const fragment = document.createDocumentFragment();
  state.filtered.forEach((chat) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildCard(chat);
    const card = wrapper.firstElementChild;
    card.addEventListener('click', () => {
      window.location.href = card.dataset.href;
    });
    card.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        window.location.href = card.dataset.href;
      }
    });
    fragment.appendChild(card);
  });
  listEl.appendChild(fragment);
}

function filterChats(term) {
  const value = term.trim().toLowerCase();
  state.search = value;
  if (!value) {
    state.filtered = [...state.items];
  } else {
    state.filtered = state.items.filter((chat) =>
      `${chat.vendor_name} ${chat.listing_title} ${chat.last_text}`.toLowerCase().includes(value),
    );
  }
  state.filtered.sort((a, b) => (b.last_ts?.getTime?.() || 0) - (a.last_ts?.getTime?.() || 0));
  render();
}

function ensureTypingSubscription(chatId) {
  if (typingSubscriptions.has(chatId)) return;
  const unsubscribe = subscribeToTyping(
    chatId,
    (snapshot) => {
      state.typing.set(chatId, snapshot || {});
      filterChats(state.search);
    },
    () => {},
  );
  typingSubscriptions.set(chatId, unsubscribe);
}

function clearTypingSubscriptions() {
  typingSubscriptions.forEach((unsubscribe) => unsubscribe?.());
  typingSubscriptions.clear();
  state.typing.clear();
}

function handleUpdate(chats, meta = { append: false }) {
  state.ready = true;
  setLoading(false);
  setError(false);

  if (meta.append) {
    const merged = new Map();
    state.items.forEach((item) => merged.set(item.chatId, item));
    chats.forEach((item) => merged.set(item.chatId, item));
    state.items = Array.from(merged.values());
  } else {
    state.items = chats;
    clearTypingSubscriptions();
  }

  state.items.forEach((chat) => ensureTypingSubscription(chat.chatId));
  filterChats(state.search);
}

function handleError(error) {
  setLoading(false);
  if (!state.ready) {
    setError(true);
  }
  console.error('[buyer-chats] load failed', error);
  showToast('Unable to load chats right now.');
}

function init() {
  if (!listEl) return;
  setLoading(true);
  const subscription = listSummariesForUser({
    pageSize: 20,
    onUpdate: handleUpdate,
    onError: handleError,
  });
  state.unsubscribe = subscription.unsubscribe;

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      setError(false);
      setLoading(true);
      state.unsubscribe?.();
      clearTypingSubscriptions();
      const nextSub = listSummariesForUser({
        pageSize: 20,
        onUpdate: handleUpdate,
        onError: handleError,
      });
      state.unsubscribe = nextSub.unsubscribe;
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      filterChats(event.target.value || '');
    });
  }

  window.addEventListener('beforeunload', () => {
    state.unsubscribe?.();
    clearTypingSubscriptions();
  });
}

init();
