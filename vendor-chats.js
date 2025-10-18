import {
  initFirebase,
  subscribeChatsForVendor,
  subscribeTyping,
  showToast,
} from './chat-service.js';

const bootstrap = window.__CHAT_BOOTSTRAP__ || {};
if (bootstrap.role !== 'vendor' || !bootstrap.vendor?.uid) {
  showToast('Vendor session required.');
  throw new Error('Vendor session missing');
}

initFirebase();

const vendor = bootstrap.vendor;
const persistUid = (uid) => {
  const value = typeof uid === 'string' ? uid.trim() : '';
  if (!value || typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem('yustam_uid', value);
  } catch (error) {
    console.warn('Unable to persist vendor session uid', error);
  }
  try {
    window.localStorage?.setItem('yustam_uid', value);
  } catch (error) {
    console.warn('Unable to persist vendor uid', error);
  }
};

persistUid(vendor.uid);
const chatListEl = document.getElementById('chatList');
const emptyStateEl = document.getElementById('emptyState');
const newChatBtn = document.getElementById('newChatBtn');

const typingSubscriptions = new Map();
const typingState = new Map();
let unsubscribeChats = null;

const relativeFormatter = typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function'
  ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  : null;
const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

function relativeTimeFrom(date) {
  if (!date) return '';
  if (!relativeFormatter) {
    return date.toLocaleTimeString('en', { hour: 'numeric', minute: 'numeric' });
  }
  const now = Date.now();
  const diff = date.getTime() - now;
  if (Math.abs(diff) < minute) return 'just now';
  if (Math.abs(diff) < hour) {
    return relativeFormatter.format(Math.round(diff / minute), 'minute');
  }
  if (Math.abs(diff) < day) {
    return relativeFormatter.format(Math.round(diff / hour), 'hour');
  }
  return relativeFormatter.format(Math.round(diff / day), 'day');
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cleanupTyping(chatId) {
  if (typingSubscriptions.has(chatId)) {
    typingSubscriptions.get(chatId)();
    typingSubscriptions.delete(chatId);
  }
  typingState.delete(chatId);
}

function ensureTypingSubscription(chatId) {
  if (typingSubscriptions.has(chatId)) return;
  const unsubscribe = subscribeTyping(chatId, (snapshot) => {
    typingState.set(chatId, snapshot || {});
    scheduleRender();
  });
  typingSubscriptions.set(chatId, unsubscribe);
}

let pendingFrame = null;
let latestChats = [];

function scheduleRender() {
  if (pendingFrame) return;
  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = null;
    renderChats(latestChats);
  });
}

function messagePreview(chat) {
  const type = chat.last_type || 'text';
  const text = (chat.last_text || '').trim();
  if (type === 'image') return '🖼️ Photo';
  if (type === 'voice') return '🎤 Voice note';
  if (text) return text.length > 96 ? `${text.slice(0, 93)}…` : text;
  return 'New conversation';
}

function renderChats(chats) {
  latestChats = chats;
  if (!chatListEl) return;

  chatListEl.innerHTML = '';
  if (!Array.isArray(chats) || chats.length === 0) {
    emptyStateEl?.removeAttribute('hidden');
    return;
  }
  emptyStateEl?.setAttribute('hidden', 'hidden');

  const fragment = document.createDocumentFragment();
  chats.forEach((chat) => {
    const chatId = chat.chat_id || chat.id;
    if (!chatId) return;
    ensureTypingSubscription(chatId);
    const typing = typingState.get(chatId) || {};
    const isBuyerTyping = Boolean(typing.buyer);

    const card = document.createElement('article');
    card.className = 'chat-card';
    card.role = 'listitem';
    card.dataset.chatId = chatId;

    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    const avatarImg = document.createElement('img');
    avatarImg.alt = `${chat.buyer_name || 'Buyer'} avatar`;
    avatarImg.src = chat.buyer_avatar || 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?auto=format&fit=crop&w=120&q=80';
    avatar.appendChild(avatarImg);

    const content = document.createElement('div');
    content.className = 'chat-content';

    const title = document.createElement('strong');
    title.textContent = chat.buyer_name || 'Buyer';

    const subtitle = document.createElement('small');
    subtitle.textContent = chat.listing_title || 'Listing';

    const preview = document.createElement('small');
    preview.textContent = isBuyerTyping ? 'Typing…' : messagePreview(chat);
    if (isBuyerTyping) {
      preview.classList.add('typing-indicator');
    }

    content.append(title, subtitle, preview);

    const meta = document.createElement('div');
    meta.className = 'chat-meta';

    const timeLabel = document.createElement('small');
    const lastDate = toDate(chat.last_ts);
    timeLabel.textContent = lastDate ? relativeTimeFrom(lastDate) : '';
    meta.appendChild(timeLabel);

    const unread = chat.unread_for_vendor || 0;
    if (unread > 0) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = unread > 9 ? '9+' : String(unread);
      meta.appendChild(badge);
    }

    card.append(avatar, content, meta);
    card.addEventListener('click', () => openChat(chat));
    fragment.appendChild(card);
  });

  chatListEl.appendChild(fragment);
}

function openChat(chat) {
  window.location.href = 'vendor-chats.php';
}

function subscribeToChats() {
  if (unsubscribeChats) {
    unsubscribeChats();
  }
  unsubscribeChats = subscribeChatsForVendor(vendor.uid, (chats) => {
    latestChats = chats;
    scheduleRender();
    const chatIds = new Set((chats || []).map((c) => c.chat_id || c.id));
    Array.from(typingSubscriptions.keys()).forEach((id) => {
      if (!chatIds.has(id)) {
        cleanupTyping(id);
      }
    });
  });
}

if (newChatBtn) {
  newChatBtn.addEventListener('click', () => {
    window.location.href = 'vendor-dashboard.php';
  });
}

subscribeToChats();

window.addEventListener('beforeunload', () => {
  if (unsubscribeChats) unsubscribeChats();
  typingSubscriptions.forEach((unsubscribe) => unsubscribe());
});

