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
  loadMore: null,
  search: '',
  hasMore: false,
  loadingMore: false,
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
  const typingState = state.typing.get(chat.chatId) || {};
  const isTyping = Boolean(typingState.buyer);
  const href = `chat.php?chat=${encodeURIComponent(chat.chatId)}`;
  const lastTime = chat.last_ts ? formatTime(chat.last_ts) : '';
  const unread = Number(chat.unread_for_vendor || 0);
  const unreadLabel = unread > 9 ? '9+' : unread || '';
  const lastSenderRole = chat.last_sender_role || '';
  const buyerUnread = Number(chat.unread_for_buyer || 0);

  const baseSnippet = chat.last_text || 'Reply quickly to close the sale';
  const snippetText =
    lastSenderRole === 'vendor' && !isTyping ? `You: ${baseSnippet}` : baseSnippet;

  const typingHtml = isTyping
    ? `<span class="chat-item__typing" role="status" aria-live="polite">${createTypingDots()} <span>Buyer is typing</span></span>`
    : escapeHtml(snippetText);

  const statusIcon =
    !isTyping && lastSenderRole === 'vendor'
      ? `<span class="chat-item__status" aria-label="${buyerUnread ? 'Message sent' : 'Seen'}">
            <i class="${buyerUnread ? 'ri-check-line' : 'ri-check-double-line'}" aria-hidden="true"></i>
         </span>`
      : '';

  return `
    <article class="chat-item" role="listitem" tabindex="0" data-chat-id="${escapeHtml(
      chat.chatId,
    )}" data-href="${href}">
      <div class="chat-item__avatar" aria-hidden="true">${escapeHtml(
        initials(chat.buyer_name),
      )}</div>
      <div class="chat-item__content">
        <div class="chat-item__title">${escapeHtml(chat.buyer_name)}</div>
        <p class="chat-item__subtitle">${typingHtml}</p>
        <div class="chat-item__listing"><i class="ri-shopping-bag-3-line" aria-hidden="true"></i><span>${escapeHtml(
          chat.listing_title,
        )}</span></div>
      </div>
      <div class="chat-item__meta">
        <span class="chat-item__time">${escapeHtml(lastTime)}</span>
        ${statusIcon}
        ${
          unread
            ? `<span class="chat-item__badge" aria-label="${escapeHtml(
                unreadLabel,
              )} unread messages">${escapeHtml(unreadLabel)}</span>`
            : ''
        }
      </div>
    </article>
  `;
}

function render() {
  if (!listEl) return;
  listEl.innerHTML = '';

  if (!state.filtered.length) {
    listEl.hidden = true;
    if (state.ready && emptyEl) emptyEl.hidden = false;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  listEl.hidden = false;

  const fragment = document.createDocumentFragment();
  state.filtered.forEach((chat) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildCard(chat);
    const card = wrapper.firstElementChild;
    if (!card) return;
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
      `${chat.buyer_name} ${chat.listing_title} ${chat.last_text}`.toLowerCase().includes(value),
    );
  }
  state.filtered.sort((a, b) => (b.last_ts?.getTime?.() || 0) - (a.last_ts?.getTime?.() || 0));
  render();
}

function ensureTypingSubscription(chatId) {
  if (!chatId || typingSubscriptions.has(chatId)) return;
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

  if (meta?.append) {
    const merged = new Map();
    state.items.forEach((item) => merged.set(item.chatId, item));
    chats.forEach((item) => merged.set(item.chatId, item));
    state.items = Array.from(merged.values());
  } else {
    state.items = chats;
    clearTypingSubscriptions();
  }

  state.hasMore = Boolean(meta?.hasMore);
  state.items.forEach((chat) => ensureTypingSubscription(chat.chatId));
  filterChats(state.search);
  maybePrefetchMore();
}

function handleError(error) {
  setLoading(false);
  if (!state.ready) {
    setError(true);
  }
  console.error('[vendor-chats] load failed', error);
  showToast('Unable to load chats right now.');
}

async function loadMoreIfNeeded() {
  if (!state.loadMore || state.loadingMore || !state.hasMore) return;
  state.loadingMore = true;
  try {
    await state.loadMore();
  } catch (error) {
    console.error('[vendor-chats] loadMore failed', error);
  } finally {
    state.loadingMore = false;
  }
}

function isNearPageBottom(offset = 200) {
  const scrollY = window.scrollY || window.pageYOffset || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const doc = document.documentElement;
  const scrollHeight = doc.scrollHeight || document.body.scrollHeight || 0;
  return scrollY + viewportHeight >= scrollHeight - offset;
}

function maybePrefetchMore() {
  if (!state.hasMore || state.loadingMore || !state.loadMore) return;
  const doc = document.documentElement;
  const viewportHeight = window.innerHeight || doc.clientHeight || 0;
  if (doc.scrollHeight <= viewportHeight + 160) {
    loadMoreIfNeeded();
  }
}

function handleWindowScroll() {
  if (!state.hasMore) return;
  if (isNearPageBottom()) {
    loadMoreIfNeeded();
  }
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
  state.loadMore = subscription.loadMore;

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      setError(false);
      setLoading(true);
      state.unsubscribe?.();
      clearTypingSubscriptions();
      state.items = [];
      state.filtered = [];
      state.hasMore = false;
      state.loadingMore = false;
      const nextSub = listSummariesForUser({
        pageSize: 20,
        onUpdate: handleUpdate,
        onError: handleError,
      });
      state.unsubscribe = nextSub.unsubscribe;
      state.loadMore = nextSub.loadMore;
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      filterChats(event.target.value || '');
    });
  }

  window.addEventListener('scroll', handleWindowScroll, { passive: true });

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('scroll', handleWindowScroll);
    state.unsubscribe?.();
    clearTypingSubscriptions();
  });
}

init();
