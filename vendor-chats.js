import { db } from './firebase.js';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const listShell = document.getElementById('vendorChatList');
const listContainer = document.getElementById('vendorChatContainer');
const emptyState = document.getElementById('vendorEmptyState');

if (!listShell || !listContainer) {
  console.warn('[vendor-chats] Chat list container not found.');
}

const userId = listShell?.dataset.userId || '';

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase() || '')
    .join('') || 'B';
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : timestamp;
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function renderTick(lastMessage) {
  if (!lastMessage || lastMessage.senderId !== userId) return '';
  return lastMessage.seen
    ? '<i class="ri-check-double-line" style="color:#23c197;"></i>'
    : '<i class="ri-check-line" style="color:rgba(17,17,17,0.45);"></i>';
}

function createChatCard(chat) {
  const card = document.createElement('article');
  card.className = 'chat-card';
  card.tabIndex = 0;
  card.dataset.chatId = chat.chatId;

  const counterpartyName = chat.buyerName || chat.counterpartyName || 'Buyer';
  const lastMessageText = chat.lastMessage?.text || (chat.lastMessage?.imageUrl ? '📷 Photo' : 'Tap to reply quickly');
  const tick = renderTick(chat.lastMessage);
  const time = formatRelativeTime(chat.lastMessage?.timestamp || chat.lastUpdated);
  const productImage = chat.productImage || 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=120&q=80';

  card.innerHTML = `
    <div class="avatar" aria-hidden="true">${getInitials(counterpartyName)}</div>
    <div class="chat-info">
      <strong>${counterpartyName}</strong>
      <span>
        <span class="last-message">${lastMessageText}</span>
        <span class="tick" aria-hidden="true">${tick}</span>
      </span>
    </div>
    <div class="meta">
      <span>${time}</span>
      <img src="${productImage}" alt="Product thumbnail">
    </div>
  `;

  const destination = new URL('chat.php', window.location.origin);
  destination.searchParams.set('chatId', chat.chatId);
  destination.searchParams.set('vendorId', chat.vendorId || userId);
  destination.searchParams.set('buyerId', chat.buyerId || '');
  destination.searchParams.set('productId', chat.productId || '');
  destination.searchParams.set('participantName', counterpartyName);
  destination.searchParams.set('productImage', productImage);
  destination.searchParams.set('productTitle', chat.productTitle || 'Listing');
  destination.searchParams.set('status', 'Online');

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

function renderChats(chats) {
  if (!listContainer) return;
  listContainer.innerHTML = '';

  if (!chats.length) {
    emptyState?.removeAttribute('hidden');
    listContainer.style.display = 'none';
    return;
  }

  emptyState?.setAttribute('hidden', 'true');
  listContainer.style.display = 'grid';

  const fragment = document.createDocumentFragment();
  chats.forEach((chat) => {
    fragment.appendChild(createChatCard(chat));
  });

  listContainer.appendChild(fragment);
}

function listenToChats() {
  if (!userId) {
    console.warn('[vendor-chats] Missing vendor identifier.');
    renderChats([]);
    return;
  }

  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('vendorId', '==', userId), orderBy('lastUpdated', 'desc'));

  onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({ chatId: docSnap.id, ...docSnap.data() }));
    renderChats(items);
  });
}

listenToChats();
