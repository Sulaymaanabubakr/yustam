import { db } from './firebase.js';
import {
  collection,
  onSnapshot,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const pageShell = document.getElementById('buyerChatPage');
const listContainer = document.getElementById('chatList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('chatSearch');
const scrollArea = document.getElementById('chatScrollArea');
const loader = document.getElementById('chatLoader');

const state = {
  userId: (pageShell?.dataset.userId || '').trim(),
  chats: [],
  initialised: false
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=160&q=80';

if (emptyState) {
  emptyState.remove();
}

function escapeHtml(text = '') {
  return String(text ?? '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\'':
        return '&#39;';
      default:
        return char;
    }
  });
}

function getInitials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'YU';
}

function buildAvatarMarkup(name, imageUrl) {
  if (imageUrl) {
    return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)} avatar">`;
  }
  return `<span>${escapeHtml(getInitials(name))}</span>`;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (!Number.isFinite(date?.getTime?.())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function renderTick(lastMessage) {
  if (!lastMessage || lastMessage.senderId !== state.userId) {
    return '';
  }
  return lastMessage.seen
    ? '<i class="ri-check-double-line" style="color:#1CC58D;"></i>'
    : '<i class="ri-check-line" style="color:rgba(17,17,17,0.45);"></i>';
}

function normaliseChat(docSnap) {
  const data = docSnap.data() || {};
  const isBuyer = data.buyerId === state.userId;
  const fallbackName = isBuyer ? 'Vendor' : 'Buyer';
  const participantProfiles = data.participantProfiles || {};
  const counterpartyId = isBuyer ? data.vendorId : data.buyerId;
  const counterpartyProfile = counterpartyId ? participantProfiles[counterpartyId] : null;
  const displayName = (counterpartyProfile?.name || data.counterpartyName || (isBuyer ? data.vendorName : data.buyerName) || data.participantName || fallbackName).trim() || fallbackName;
  const productTitle = (data.productTitle || data.productName || 'Marketplace Listing').trim();
  const productImage = data.productImage || data.productThumbnail || data.productCover || FALLBACK_IMAGE;
  const avatarImage = counterpartyProfile?.avatar || data.counterpartyImage || (isBuyer ? data.vendorAvatar : data.buyerAvatar) || data.avatarUrl || '';
  const lastMessage = data.lastMessage || null;
  const lastMessageTextRaw = lastMessage?.text?.trim();
  const lastMessageText = lastMessageTextRaw && lastMessageTextRaw.length > 0
    ? lastMessageTextRaw
    : lastMessage?.imageUrl
      ? '📷 Photo'
      : 'Tap to start chatting';
  const timestamp = lastMessage?.timestamp || data.lastUpdated || data.updatedAt || data.createdAt || null;
  const unreadCounts = data.unreadCounts;
  const unreadCount = typeof unreadCounts === 'object' && unreadCounts !== null ? unreadCounts[state.userId] : undefined;
  const isUnread = Boolean(lastMessage && lastMessage.senderId && lastMessage.senderId !== state.userId && !lastMessage.seen);

  return {
    ...data,
    chatId: docSnap.id,
    displayName,
    productTitle,
    productImage,
    avatarImage,
    lastMessage,
    lastMessageText,
    timestamp,
    unreadCount,
    isUnread,
    searchText: `${displayName} ${productTitle} ${lastMessageText}`.toLowerCase()
  };
}

function createChatCard(chat, index) {
  const card = document.createElement('article');
  card.className = 'chat-card';
  card.tabIndex = 0;
  card.dataset.chatId = chat.chatId;
  card.style.animationDelay = `${Math.min(index, 8) * 70}ms`;

  const relativeTime = formatRelativeTime(chat.timestamp || chat.lastUpdated);
  const tickMarkup = renderTick(chat.lastMessage);
  const showUnreadDot = chat.isUnread || (typeof chat.unreadCount === 'number' && chat.unreadCount > 0);
  const dotLabel = typeof chat.unreadCount === 'number' && chat.unreadCount > 0
    ? (chat.unreadCount > 9 ? '9+' : String(chat.unreadCount))
    : '';

  card.classList.toggle('is-unread', Boolean(chat.isUnread));

  card.innerHTML = `
    <div class="avatar" aria-hidden="true">${buildAvatarMarkup(chat.displayName, chat.avatarImage)}</div>
    <div class="chat-info">
      <div class="chat-top">
        <strong class="chat-name">${escapeHtml(chat.displayName)}</strong>
        <span class="chat-time">${escapeHtml(relativeTime)}</span>
      </div>
      <div class="chat-bottom">
        <span class="last-message">${escapeHtml(chat.lastMessageText)}</span>
        <span class="tick" aria-hidden="true">${tickMarkup}</span>
      </div>
      <div class="chat-product">
        <i class="ri-shopping-bag-3-line" aria-hidden="true"></i>
        <span>${escapeHtml(chat.productTitle)}</span>
      </div>
    </div>
    <div class="meta">
      <img src="${escapeHtml(chat.productImage || FALLBACK_IMAGE)}" alt="${escapeHtml(chat.productTitle)} thumbnail" class="product-thumb">
    </div>
  `;

  if (showUnreadDot) {
    const dot = document.createElement('span');
    dot.className = 'unread-dot';
    if (dotLabel) {
      dot.textContent = dotLabel;
      dot.style.display = 'grid';
      dot.style.placeItems = 'center';
      dot.style.color = '#fff';
      dot.style.fontSize = '0.62rem';
      dot.style.fontWeight = '700';
    }
    card.appendChild(dot);
  }

  const destination = new URL('chat.php', window.location.origin);
  destination.searchParams.set('chatId', chat.chatId);
  if (chat.buyerId) destination.searchParams.set('buyerId', chat.buyerId);
  if (chat.vendorId) destination.searchParams.set('vendorId', chat.vendorId);
  if (chat.productId) destination.searchParams.set('productId', chat.productId);
  destination.searchParams.set('participantName', chat.displayName);
  destination.searchParams.set('productTitle', chat.productTitle);
  destination.searchParams.set('productImage', chat.productImage || FALLBACK_IMAGE);
  destination.searchParams.set('status', chat.lastMessage?.seen ? 'Seen recently' : 'Last seen recently');

  const openChat = () => {
    window.location.href = destination.toString();
  };

  card.addEventListener('click', openChat);
  card.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openChat();
    }
  });

  return card;
}

function renderChats(chats, shouldResetScroll = false) {
  if (!listContainer) return;

  listContainer.innerHTML = '';

  if (state.initialised) {
    setLoaderVisibility(false);
  }

  listContainer.style.display = chats.length ? 'grid' : 'none';

  if (!chats.length) {
    if (shouldResetScroll && scrollArea) {
      scrollArea.scrollTo({ top: 0 });
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  chats.forEach((chat, index) => {
    fragment.appendChild(createChatCard(chat, index));
  });

  listContainer.appendChild(fragment);

  if (shouldResetScroll && scrollArea) {
    requestAnimationFrame(() => {
      scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

function filterChats(term) {
  if (!term) return [...state.chats];
  const queryText = term.toLowerCase();
  return state.chats.filter((chat) => chat.searchText.includes(queryText));
}

const setLoaderVisibility = (isVisible) => {
  if (!loader) return;
  loader.style.display = isVisible ? 'grid' : 'none';
};

setLoaderVisibility(true);

const getTimestampNumber = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') {
    const date = value.toDate();
    return Number.isFinite(date?.getTime?.()) ? date.getTime() : 0;
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0;
};

function handleSearchInput() {
  const filtered = filterChats(searchInput?.value?.trim() || '');
  renderChats(filtered, false);
}

function listenToChats() {
  if (!state.userId) {
    console.warn('[buyer-chats] Missing buyer identifier.');
    setLoaderVisibility(false);
    renderChats([], true);
    return;
  }

  const chatsRef = collection(db, 'chats');
  const chatQuery = query(chatsRef, where('buyerId', '==', state.userId));

  onSnapshot(chatQuery, (snapshot) => {
    if (!state.initialised) {
      state.initialised = true;
      setLoaderVisibility(false);
    }
    state.chats = snapshot.docs
      .map(normaliseChat)
      .sort((a, b) => getTimestampNumber(b.timestamp) - getTimestampNumber(a.timestamp));
    const term = searchInput?.value?.trim() || '';
    const filtered = filterChats(term);
    renderChats(filtered, true);
  });
}

searchInput?.addEventListener('input', handleSearchInput);

listenToChats();
