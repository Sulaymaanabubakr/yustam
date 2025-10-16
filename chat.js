import { uploadImage } from './cloudinary.js';
import {
  buildChatId,
  ensureChatSummary,
  markChatRead,
  sendChatMessage,
  setTypingStatus,
  subscribeToChatMessages,
  subscribeToChatSummary,
} from './chat-service.js';

const appShell = document.getElementById('chatApp');
const messageArea = document.getElementById('messageArea');
const composerForm = document.getElementById('composerForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const removeImageButton = document.getElementById('removeImage');
const typingIndicator = document.getElementById('typingIndicator');
const participantNameHeading = document.getElementById('participantNameHeading');
const participantStatus = document.getElementById('participantStatus');

if (!appShell) {
  console.warn('[chat] Shell not found.');
}

const state = {
  chatId: appShell?.dataset.chatId || '',
  buyerUid: appShell?.dataset.buyerUid || '',
  buyerName: appShell?.dataset.buyerName || 'Buyer',
  vendorUid: appShell?.dataset.vendorUid || '',
  vendorName: appShell?.dataset.vendorName || 'Vendor',
  productId: appShell?.dataset.productId || '',
  productTitle: appShell?.dataset.productTitle || 'Marketplace Listing',
  productImage: appShell?.dataset.productImage || '',
  currentRole: appShell?.dataset.currentRole || 'guest',
  currentUserId: appShell?.dataset.currentUserId || '',
  counterpartyId: appShell?.dataset.counterpartyId || '',
  counterpartyName: appShell?.dataset.counterpartyName || '',
  counterpartyRole: appShell?.dataset.counterpartyRole || '',
  sending: false,
  typing: false,
  typingTimeout: null,
  pendingFile: null,
  unsubscribeMessages: null,
  unsubscribeSummary: null,
  lastReceivedTimestamp: 0,
};

if (!state.chatId) {
  state.chatId = buildChatId(state.buyerUid, state.vendorUid, state.productId);
  if (appShell) {
    appShell.dataset.chatId = state.chatId;
  }
}

function formatTimestamp(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ensureScrolledToBottom(force = false) {
  if (!messageArea) return;
  const nearBottom =
    messageArea.scrollHeight - messageArea.scrollTop - messageArea.clientHeight < 120;
  if (force || nearBottom) {
    messageArea.scrollTop = messageArea.scrollHeight;
  }
}

function toggleTypingIndicator(show) {
  if (!typingIndicator) return;
  typingIndicator.style.display = show ? 'flex' : 'none';
}

toggleTypingIndicator(false);

function createBubbleElement(message) {
  const isOwn = message.sender_uid === state.currentUserId;
  const bubble = document.createElement('article');
  bubble.className = `message-bubble ${isOwn ? 'outgoing' : 'incoming'}`;
  bubble.dataset.messageId = message.id;
  bubble.style.animationDelay = `${Math.min(message.index || 0, 6) * 45}ms`;

  if (message.image_url) {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'message-image';
    const img = document.createElement('img');
    img.src = message.image_url;
    img.alt = 'Chat attachment';
    img.loading = 'lazy';
    imageContainer.appendChild(img);
    bubble.appendChild(imageContainer);
  }

  if (message.message) {
    const text = document.createElement('p');
    text.className = 'message-text';
    text.textContent = message.message;
    bubble.appendChild(text);
  }

  const meta = document.createElement('footer');
  meta.className = 'message-meta';
  const time = document.createElement('span');
  time.className = 'message-time';
  time.textContent = formatTimestamp(message.timestamp);
  meta.appendChild(time);

  if (isOwn) {
    const status = document.createElement('span');
    status.className = 'message-status';
    if (message.read) {
      status.textContent = '✔✔';
      status.title = 'Read';
    } else {
      status.textContent = '✔';
      status.title = 'Sent';
    }
    meta.appendChild(status);
  }

  bubble.appendChild(meta);
  return bubble;
}

function upsertMessageElement(message, index) {
  if (!messageArea) return;
  const placeholder = messageArea.querySelector('.empty-state');
  if (placeholder) {
    placeholder.remove();
  }
  const existing = messageArea.querySelector(`.message-bubble[data-message-id="${message.id}"]`);
  if (existing) {
    existing.querySelector('.message-time').textContent = formatTimestamp(message.timestamp);
    if (message.read && existing.querySelector('.message-status')) {
      existing.querySelector('.message-status').textContent = '✔✔';
      existing.querySelector('.message-status').title = 'Read';
    }
    return;
  }
  const bubble = createBubbleElement({ ...message, index });
  messageArea.appendChild(bubble);
  ensureScrolledToBottom(message.sender_uid === state.currentUserId);
}

function clearComposer() {
  if (messageInput) {
    messageInput.value = '';
  }
  state.pendingFile = null;
  if (fileInput) {
    fileInput.value = '';
  }
  if (imagePreview) {
    imagePreview.hidden = true;
  }
  if (previewImage) {
    previewImage.src = '';
  }
}

function showPreview(file) {
  if (!file || !imagePreview || !previewImage) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    previewImage.src = String(event.target?.result || '');
    imagePreview.hidden = false;
  };
  reader.readAsDataURL(file);
}

function handleTypingStart() {
  if (state.typingTimeout) {
    window.clearTimeout(state.typingTimeout);
  }
  if (!state.typing) {
    state.typing = true;
    setTypingStatus(state.chatId, state.currentRole, true).catch((error) =>
      console.error('Failed to set typing status', error),
    );
  }
  state.typingTimeout = window.setTimeout(() => {
    state.typing = false;
    setTypingStatus(state.chatId, state.currentRole, false).catch((error) =>
      console.error('Failed to clear typing status', error),
    );
  }, 2500);
}

async function handleSend(event) {
  event?.preventDefault?.();
  if (state.sending) return;
  const text = messageInput?.value?.trim() || '';
  const hasImage = Boolean(state.pendingFile);
  if (!text && !hasImage) return;

  try {
    state.sending = true;
    sendButton?.setAttribute('aria-busy', 'true');
    sendButton?.classList.add('is-loading');

    let imageUrl = '';
    if (state.pendingFile) {
      imageUrl = await uploadImage(state.pendingFile, {
        folder: 'yustam/chats',
        tags: ['chat', state.chatId],
      });
    }

    await sendChatMessage({
      chatId: state.chatId,
      buyerUid: state.buyerUid,
      vendorUid: state.vendorUid,
      productId: state.productId,
      senderUid: state.currentUserId,
      receiverUid: state.counterpartyId,
      senderType: state.currentRole,
      receiverType: state.currentRole === 'buyer' ? 'vendor' : 'buyer',
      message: text,
      imageUrl,
      buyerName: state.buyerName,
      vendorName: state.vendorName,
      productTitle: state.productTitle,
      productImage: state.productImage,
    });

    clearComposer();
    state.typing = false;
    if (state.typingTimeout) {
      window.clearTimeout(state.typingTimeout);
      state.typingTimeout = null;
    }
    setTypingStatus(state.chatId, state.currentRole, false).catch(() => {});
    ensureScrolledToBottom(true);
    markChatRead(state.chatId, state.currentUserId, state.currentRole).catch(() => {});
  } catch (error) {
    console.error('[chat] send failed', error);
    alert('Unable to send message right now. Please try again.');
  } finally {
    state.sending = false;
    sendButton?.removeAttribute('aria-busy');
    sendButton?.classList.remove('is-loading');
  }
}

function handleSummaryUpdate(snapshot) {
  if (!snapshot?.exists()) return;
  const data = snapshot.data();
  if (!data) return;

  const typingKey = state.currentRole === 'buyer' ? 'vendor_typing' : 'buyer_typing';
  toggleTypingIndicator(Boolean(data[typingKey]));

  if (participantNameHeading && data.vendor_name && state.currentRole === 'buyer') {
    participantNameHeading.textContent = data.vendor_name;
  }
  if (participantNameHeading && data.buyer_name && state.currentRole === 'vendor') {
    participantNameHeading.textContent = data.buyer_name;
  }

  if (participantStatus && data.last_updated) {
    const time = data.last_updated.toDate ? data.last_updated.toDate() : data.last_updated;
    participantStatus.textContent = `Last updated ${formatTimestamp(time)}`;
  }
}

function handleMessagesSnapshot(snapshot) {
  if (!snapshot) return;
  const changes = snapshot.docChanges();
  if (!changes.length) {
    if (!messageArea?.children?.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <span>💬</span>
        <h2>Start the conversation</h2>
        <p>Say hello and ask about the listing.</p>
      `;
      messageArea.appendChild(empty);
    }
    return;
  }

  changes.forEach((change, index) => {
    if (change.type === 'added' || change.type === 'modified') {
      const raw = change.doc.data();
      const timestamp = raw.timestamp?.toDate ? raw.timestamp.toDate() : raw.timestamp;
      const message = {
        id: change.doc.id,
        message: raw.message || '',
        image_url: raw.image_url || '',
        sender_uid: raw.sender_uid,
        receiver_uid: raw.receiver_uid,
        read: Boolean(raw.read),
        timestamp,
      };
      upsertMessageElement(message, index);
      if (message.sender_uid !== state.currentUserId) {
        markChatRead(state.chatId, state.currentUserId, state.currentRole).catch(() => {});
      }
    }
  });
}

function initialiseSubscriptions() {
  if (!state.chatId) return;
  state.unsubscribeSummary = subscribeToChatSummary(state.chatId, handleSummaryUpdate);
  state.unsubscribeMessages = subscribeToChatMessages(state.chatId, handleMessagesSnapshot);
}

function teardown() {
  state.unsubscribeSummary?.();
  state.unsubscribeMessages?.();
  if (state.typingTimeout) {
    window.clearTimeout(state.typingTimeout);
  }
}

function boot() {
  if (!appShell || !state.chatId || !state.currentUserId) {
    console.warn('[chat] Missing identifiers');
    return;
  }

  ensureChatSummary({
    chatId: state.chatId,
    buyerUid: state.buyerUid,
    vendorUid: state.vendorUid,
    productId: state.productId,
    buyerName: state.buyerName,
    vendorName: state.vendorName,
    productTitle: state.productTitle,
    productImage: state.productImage,
  }).catch((error) => console.error('[chat] summary ensure failed', error));

  initialiseSubscriptions();
  markChatRead(state.chatId, state.currentUserId, state.currentRole).catch(() => {});

  composerForm?.addEventListener('submit', handleSend);
  sendButton?.addEventListener('click', handleSend);

  messageInput?.addEventListener('input', handleTypingStart);
  messageInput?.addEventListener('focus', () =>
    markChatRead(state.chatId, state.currentUserId, state.currentRole).catch(() => {}),
  );

  fileInput?.addEventListener('change', (event) => {
    const file = event.target?.files?.[0];
    if (file) {
      state.pendingFile = file;
      showPreview(file);
    } else {
      state.pendingFile = null;
      if (imagePreview) imagePreview.hidden = true;
    }
  });

  removeImageButton?.addEventListener('click', () => {
    state.pendingFile = null;
    if (fileInput) fileInput.value = '';
    if (imagePreview) imagePreview.hidden = true;
    if (previewImage) previewImage.src = '';
  });

  window.addEventListener('beforeunload', teardown);
}

boot();
