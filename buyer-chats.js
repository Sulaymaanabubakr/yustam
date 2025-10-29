import {
  initFirebase,
  subscribeChatsForBuyer,
  subscribeTyping,
  showToast,
} from './chat-service.js';

const bootstrap = window.__CHAT_BOOTSTRAP__ || {};
if (bootstrap.role !== 'buyer' || !bootstrap.buyer?.uid) {
  showToast('Buyer session required.');
  throw new Error('Buyer session missing');
}

initFirebase();

const buyer = bootstrap.buyer;
const persistUid = (uid) => {
  const value = typeof uid === 'string' ? uid.trim() : '';
  if (!value || typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem('yustam_uid', value);
    window.sessionStorage?.setItem('firebase_uid', value);
  } catch (error) {
    console.warn('Unable to persist buyer session uid', error);
  }
  try {
    window.localStorage?.setItem('yustam_uid', value);
    window.localStorage?.setItem('firebase_uid', value);
  } catch (error) {
    console.warn('Unable to persist buyer uid', error);
  }
};

persistUid(buyer.uid);
const chatListEl = document.getElementById('chatList');
const emptyStateEl = document.getElementById('emptyState');
const loadingOverlay = document.getElementById('loadingOverlay');
const newChatBtn = document.getElementById('newChatBtn');

let overlayHidden = false;
document.body?.classList.add('is-loading');

function hideLoadingOverlay() {
  if (overlayHidden) return;
  overlayHidden = true;
  loadingOverlay?.setAttribute('hidden', 'hidden');
  document.body?.classList.remove('is-loading');
}

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
  const type = (chat.last_type || 'text').toLowerCase();
  const text = (chat.last_text || '').trim();
  if (type === 'image') {
    return { icon: 'ri-image-line', label: 'Photo attachment' };
  }
  if (type === 'voice') {
    return { icon: 'ri-mic-line', label: 'Voice note' };
  }
  if (text) {
    const label = text.length > 96 ? `${text.slice(0, 93)}...` : text;
    return { label };
  }
  return { label: 'New conversation' };
}

function renderChats(chats) {
  latestChats = chats;
  if (!chatListEl) return;

  chatListEl.innerHTML = '';
  if (!Array.isArray(chats) || chats.length === 0) {
    emptyStateEl?.removeAttribute('hidden');
    hideLoadingOverlay();
    return;
  }
  emptyStateEl?.setAttribute('hidden', 'hidden');
  hideLoadingOverlay();

  const fragment = document.createDocumentFragment();
  chats.forEach((chat) => {
    const chatId = chat.chat_id || chat.id;
    if (!chatId) return;
    ensureTypingSubscription(chatId);
    const typing = typingState.get(chatId) || {};
    const isVendorTyping = Boolean(typing.vendor);

    const card = document.createElement('article');
    card.className = 'chat-card';
    card.role = 'listitem';
    card.dataset.chatId = chatId;

    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    const avatarImg = document.createElement('img');
    const listingAlt =
      chat.listing_title && chat.listing_title.trim()
        ? `${chat.listing_title.trim()} image`
        : `${chat.vendor_name || 'Vendor'} avatar`;
    avatarImg.alt = listingAlt;
    avatarImg.src =
      chat.listing_image ||
      chat.vendor_avatar ||
      'https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?auto=format&fit=crop&w=120&q=80';
    avatar.appendChild(avatarImg);

    const content = document.createElement('div');
    content.className = 'chat-content';

    const headerRow = document.createElement('div');
    headerRow.className = 'chat-header';

    const title = document.createElement('strong');
    title.textContent = chat.vendor_name || 'Vendor';
    headerRow.appendChild(title);
    const vendorVerificationState = String(chat.vendor_verified || chat.vendor_verification || '').toLowerCase();
    title.dataset.vendorVerified = vendorVerificationState;

    const lastDate = toDate(chat.last_ts);
    const timeText = lastDate ? relativeTimeFrom(lastDate) : '';
    if (timeText) {
      const timeLabel = document.createElement('span');
      timeLabel.className = 'chat-time';
      timeLabel.textContent = timeText;
      headerRow.appendChild(timeLabel);
    }

    const unread = chat.unread_for_buyer || 0;
    if (unread > 0) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = unread > 9 ? '9+' : String(unread);
      headerRow.appendChild(badge);
    }

    const subtitle = document.createElement('div');
    subtitle.className = 'chat-listing';
    subtitle.textContent = chat.listing_title || 'Listing';

    const preview = document.createElement('div');
    preview.className = 'chat-preview';
    if (isVendorTyping) {
      preview.textContent = 'Typing...';
      preview.classList.add('typing-indicator');
    } else {
      const previewData = messagePreview(chat);
      if (previewData.icon) {
        const iconEl = document.createElement('i');
        iconEl.className = previewData.icon;
        iconEl.setAttribute('aria-hidden', 'true');
        const labelSpan = document.createElement('span');
        labelSpan.textContent = previewData.label;
        preview.replaceChildren(iconEl, labelSpan);
      } else {
        preview.textContent = previewData.label;
      }
    }

    content.append(headerRow, subtitle, preview);

    card.append(avatar, content);
    card.addEventListener('click', () => openChat(chat));
    fragment.appendChild(card);
  });

  chatListEl.appendChild(fragment);
}


function openChat(chat) {
  const chatId = chat.chat_id || chat.id;
  if (!chatId) return;
  const params = new URLSearchParams({ chat: chatId });
  if (chat.listing_id) { params.set('listing', chat.listing_id); }
  if (chat.listing_title) { params.set('listing_title', chat.listing_title); }
  if (chat.listing_image) { params.set('listing_image', chat.listing_image); }
  const buyerUid = chat.buyer_uid || chat.buyerUid || buyer.uid;
  const vendorUid = chat.vendor_uid || chat.vendorUid || chat.vendor_id || chat.vendorId || '';
  if (buyerUid) params.set('buyer', buyerUid);
  if (vendorUid) params.set('vendor', vendorUid);
  if (chat.vendor_plan) params.set('plan', chat.vendor_plan);
  if (chat.vendor_verified || chat.vendor_verification) {
    params.set('verified', chat.vendor_verified || chat.vendor_verification);
  }
  params.set('role', 'buyer');
  window.location.href = `chat-thread.php?${params.toString()}`;
}

function subscribeToChats() {
  if (unsubscribeChats) {
    unsubscribeChats();
  }
  unsubscribeChats = subscribeChatsForBuyer(buyer.uid, (chats) => {
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
    window.location.href = 'shop.html';
  });
}

subscribeToChats();

window.addEventListener('beforeunload', () => {
  if (unsubscribeChats) unsubscribeChats();
  typingSubscriptions.forEach((unsubscribe) => unsubscribe());
});


