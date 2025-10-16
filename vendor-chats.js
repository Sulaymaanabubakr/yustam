import { db } from './firebase.js';
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const pageShell = document.getElementById('vendorChatPage');
const listContainer = document.getElementById('vendorChatContainer');
const emptyState = document.getElementById('vendorEmptyState');
const searchInput = document.getElementById('vendorSearch');
const scrollArea = document.getElementById('vendorChatScroll');
const loader = document.getElementById('vendorChatLoader');

const trimString = (value) => (typeof value === 'string' ? value.trim() : (value ?? '').toString().trim());
const trimLower = (value) => trimString(value).toLowerCase();

const state = {
  vendorNumericId: trimString(pageShell?.dataset.userId || ''),
  vendorFirebaseId: trimString(pageShell?.dataset.userFirebaseId || ''),
  vendorEmail: trimLower(pageShell?.dataset.userEmail || ''),
  chats: [],
  initialised: false
};

state.senderIds = new Set([state.vendorNumericId, state.vendorFirebaseId, trimString(pageShell?.dataset.userId || ''), trimString(pageShell?.dataset.userFirebaseId || '')].filter(Boolean));

const chatStore = new Map();
const pendingNumericUpdates = new Set();

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
    .join('') || 'BY';
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

function getTimestampNumber(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') {
    const date = value.toDate();
    return Number.isFinite(date?.getTime?.()) ? date.getTime() : 0;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : 0;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0;
}

function renderTick(lastMessage) {
  if (!lastMessage || !state.senderIds.has(lastMessage.senderId)) {
    return '';
  }
  return lastMessage.seen
    ? '<i class="ri-check-double-line" style="color:#1CC58D;"></i>'
    : '<i class="ri-check-line" style="color:rgba(17,17,17,0.45);"></i>';
}

function belongsToVendor(data) {
  const vendorNumericId = trimString(data.vendorNumericId || '');
  const vendorId = trimString(data.vendorId || '');

  if (state.vendorNumericId && vendorNumericId) {
    return vendorNumericId === state.vendorNumericId;
  }

  if (state.vendorNumericId && vendorId === state.vendorNumericId) {
    return true;
  }

  if (state.vendorFirebaseId && vendorId === state.vendorFirebaseId) {
    return true;
  }

  return false;
}

function collectCandidateEmails(data) {
  if (!data || typeof data !== 'object') return [];
  const emails = new Set();
  const push = (value) => {
    const email = trimLower(value);
    if (email) emails.add(email);
  };

  push(data.email);
  push(data.contactEmail);
  push(data.businessEmail);
  push(data.ownerEmail);
  push(data.loginEmail);
  push(data.vendorEmail);
  push(data.emailAddress);
  push(data.primaryEmail);

  if (Array.isArray(data.emails)) {
    data.emails.forEach(push);
  }

  if (data.contact && typeof data.contact === 'object') {
    push(data.contact.email);
    if (Array.isArray(data.contact.emails)) {
      data.contact.emails.forEach(push);
    }
  }

  if (data.profile && typeof data.profile === 'object') {
    push(data.profile.email);
    if (Array.isArray(data.profile.emails)) {
      data.profile.emails.forEach(push);
    }
  }

  if (data.account && typeof data.account === 'object') {
    push(data.account.email);
  }

  if (data.owner && typeof data.owner === 'object') {
    push(data.owner.email);
  }

  return Array.from(emails);
}

function collectCandidateLegacyIds(data) {
  if (!data || typeof data !== 'object') return [];
  const ids = new Set();
  const push = (value) => {
    const id = trimString(value);
    if (id) ids.add(id);
  };

  push(data.legacyVendorId);
  push(data.vendorLegacyId);
  push(data.vendorIdLegacy);
  push(data.vendorNumericId);
  push(data.vendorNumber);
  push(data.vendorCode);
  push(data.numericId);
  push(data.sqlId);
  push(data.databaseId);
  push(data.externalId);
  push(data.vendorId);
  push(data.uid);
  push(data.id);

  if (Array.isArray(data.ids)) {
    data.ids.forEach(push);
  }

  if (data.legacy && typeof data.legacy === 'object') {
    push(data.legacy.id);
    push(data.legacy.vendorId);
  }

  if (data.account && typeof data.account === 'object') {
    push(data.account.id);
    push(data.account.vendorId);
  }

  return Array.from(ids);
}

function normaliseChat(docSnap) {
  const data = docSnap.data() || {};
  const vendorNumericId = trimString(data.vendorNumericId || '');
  const buyerNumericId = trimString(data.buyerNumericId || '');
  const buyerFirebaseId = trimString(data.buyerFirebaseId || '');
  const vendorIdField = trimString(data.vendorId || '');
  if (vendorNumericId) state.senderIds.add(vendorNumericId);
  if (vendorIdField) state.senderIds.add(vendorIdField);
  const isVendor = belongsToVendor(data);
  const fallbackName = isVendor ? 'Buyer' : 'Vendor';
  const participantProfiles = data.participantProfiles || {};
  const counterpartyId = isVendor ? data.buyerId : data.vendorId;
  const counterpartyProfile = counterpartyId ? participantProfiles[counterpartyId] : null;
  const displayName = (counterpartyProfile?.name || data.counterpartyName || (isVendor ? data.buyerName : data.vendorName) || data.participantName || fallbackName).trim() || fallbackName;
  const productTitle = (data.productTitle || data.productName || 'Marketplace Listing').trim();
  const productImage = data.productImage || data.productThumbnail || data.productCover || FALLBACK_IMAGE;
  const avatarImage = counterpartyProfile?.avatar || data.counterpartyImage || (isVendor ? data.buyerAvatar : data.vendorAvatar) || data.avatarUrl || '';
  const lastMessage = data.lastMessage || null;
  const lastMessageTextRaw = lastMessage?.text?.trim();
  const lastMessageText = lastMessageTextRaw && lastMessageTextRaw.length > 0
    ? lastMessageTextRaw
    : lastMessage?.imageUrl
      ? '[Photo]'
      : 'Tap to reply quickly';
  const timestamp = lastMessage?.timestamp || data.lastUpdated || data.updatedAt || data.createdAt || null;
  const unreadCounts = (typeof data.unreadCounts === 'object' && data.unreadCounts !== null) ? data.unreadCounts : {};
  const unreadKeys = new Set();
  let unreadTotal = 0;
  const addUnread = (id) => {
    const trimmed = trimString(id);
    if (!trimmed || unreadKeys.has(trimmed)) return;
    const value = unreadCounts[trimmed];
    if (typeof value === 'number') {
      unreadTotal += value;
      unreadKeys.add(trimmed);
    }
  };
  addUnread(state.vendorNumericId);
  addUnread(state.vendorFirebaseId);
  const unreadCount = unreadKeys.size > 0 ? unreadTotal : undefined;
  const isUnreadByCount = typeof unreadCount === 'number' ? unreadCount > 0 : false;
  const isUnread = isUnreadByCount || Boolean(lastMessage && lastMessage.senderId && !state.senderIds.has(lastMessage.senderId) && !lastMessage.seen);

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
    vendorNumericId,
    buyerNumericId,
    buyerFirebaseId,
    searchText: `${displayName} ${productTitle} ${lastMessageText}`.toLowerCase()
  };
}

function renderChats(chats, shouldResetScroll = false) {
  if (!listContainer) return;

  listContainer.innerHTML = '';

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

  card.classList.toggle('is-unread', Boolean(chat.isUnread || (chat.unreadCount ?? 0) > 0));

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
  if (chat.vendorId) destination.searchParams.set('vendorId', chat.vendorId);
  if (chat.vendorNumericId) destination.searchParams.set('vendorNumericId', chat.vendorNumericId);
  if (chat.buyerId) destination.searchParams.set('buyerId', chat.buyerId);
  if (chat.buyerNumericId) destination.searchParams.set('buyerNumericId', chat.buyerNumericId);
  if (chat.buyerFirebaseId) destination.searchParams.set('buyerFirebaseId', chat.buyerFirebaseId);
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

function rebuildChats(shouldResetScroll) {
  const chatsArray = Array.from(chatStore.values())
    .sort((a, b) => getTimestampNumber(b.timestamp) - getTimestampNumber(a.timestamp));
  state.chats = chatsArray;
  const term = searchInput?.value?.trim() || '';
  const filtered = filterChats(term);
  renderChats(filtered, shouldResetScroll);
}

async function resolveVendorFirebaseId() {
  if (state.vendorFirebaseId) {
    state.senderIds.add(state.vendorFirebaseId);
    return;
  }

  const email = state.vendorEmail;
  const legacyId = state.vendorNumericId;
  if (!email && !legacyId) {
    return;
  }

  try {
    const vendorsRef = collection(db, 'vendors');

    if (email) {
      try {
        const emailQuery = query(vendorsRef, where('email', '==', email), limit(1));
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
          const match = emailSnapshot.docs[0];
          const resolvedId = trimString(match.id);
          if (resolvedId) {
            state.vendorFirebaseId = resolvedId;
            state.senderIds.add(resolvedId);
            pageShell.dataset.userFirebaseId = resolvedId;
            return;
          }
        }
      } catch (lookupError) {
        console.warn('[vendor-chats] Email lookup for vendor UID failed', lookupError);
      }
    }

    const snapshot = await getDocs(vendorsRef);
    let resolved = false;
    snapshot.forEach((docSnap) => {
      if (resolved) return;
      const data = docSnap.data() || {};
      const emails = collectCandidateEmails(data);
      const legacyIds = collectCandidateLegacyIds(data);
      const matchedByEmail = email && emails.includes(email);
      const matchedByLegacy = legacyId && legacyIds.includes(legacyId);
      if (matchedByEmail || matchedByLegacy) {
        const resolvedId = trimString(docSnap.id);
        if (resolvedId) {
          state.vendorFirebaseId = resolvedId;
          state.senderIds.add(resolvedId);
          pageShell.dataset.userFirebaseId = resolvedId;
          resolved = true;
        }
      }
    });
  } catch (error) {
    console.error('[vendor-chats] Failed to resolve vendor Firebase identifier', error);
  }
}

async function ensureNumericField(docSnap) {
  if (!state.vendorNumericId) return;
  if (pendingNumericUpdates.has(docSnap.id)) return;
  const data = docSnap.data() || {};
  const existingNumeric = trimString(data.vendorNumericId || '');
  const participants = Array.isArray(data.participants) ? data.participants.map(trimString) : [];

  const updatePayload = {};
  let needsUpdate = false;

  if (!existingNumeric) {
    updatePayload.vendorNumericId = state.vendorNumericId;
    needsUpdate = true;
  }

  if (!participants.includes(state.vendorNumericId)) {
    updatePayload.participants = arrayUnion(state.vendorNumericId);
    needsUpdate = true;
  }

  if (!needsUpdate) {
    return;
  }

  pendingNumericUpdates.add(docSnap.id);
  try {
    await updateDoc(doc(db, 'chats', docSnap.id), updatePayload);
  } catch (error) {
    console.warn('[vendor-chats] Failed to stamp vendorNumericId for chat', docSnap.id, error);
  } finally {
    pendingNumericUpdates.delete(docSnap.id);
  }
}

function processSnapshot(sourceLabel, snapshot) {
  if (!state.initialised) {
    state.initialised = true;
    setLoaderVisibility(false);
  }

  snapshot.docChanges().forEach((change) => {
    if (change.type === 'removed') {
      chatStore.delete(change.doc.id);
      return;
    }

    const chat = normaliseChat(change.doc);
    chatStore.set(change.doc.id, chat);

    if (state.vendorNumericId) {
      ensureNumericField(change.doc);
    }
  });

  rebuildChats(sourceLabel === 'numeric');
}

function handleSearchInput() {
  const filtered = filterChats(searchInput?.value?.trim() || '');
  renderChats(filtered, false);
}

function listenToChats() {
  if (!state.vendorNumericId && !state.vendorFirebaseId) {
    console.warn('[vendor-chats] Missing identifiers for vendor conversations.');
    setLoaderVisibility(false);
    renderChats([], true);
    return;
  }

  const chatsRef = collection(db, 'chats');
  let listenerCount = 0;

  if (state.vendorNumericId) {
    const numericQuery = query(chatsRef, where('vendorNumericId', '==', state.vendorNumericId));
    onSnapshot(numericQuery, (snapshot) => processSnapshot('numeric', snapshot));
    listenerCount += 1;
  }

  if (state.vendorFirebaseId) {
    const firebaseQuery = query(chatsRef, where('vendorId', '==', state.vendorFirebaseId));
    onSnapshot(firebaseQuery, (snapshot) => processSnapshot('firebase', snapshot));
    listenerCount += 1;
  }

  if (listenerCount === 0) {
    setLoaderVisibility(false);
    renderChats([], true);
  }
}

searchInput?.addEventListener('input', handleSearchInput);

async function initialiseVendorChats() {
  await resolveVendorFirebaseId();
  listenToChats();
}

initialiseVendorChats();
