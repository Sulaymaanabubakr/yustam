import { db } from './firebase.js';
import { uploadImage } from './cloudinary.js';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const QUICK_MESSAGE_KEY = 'yustam_quick_message';

const appShell = document.getElementById('chatApp');
const messageArea = document.getElementById('messageArea');
const typingIndicator = document.getElementById('typingIndicator');
const composerForm = document.getElementById('composerForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const removeImageButton = document.getElementById('removeImage');
const participantStatus = document.getElementById('participantStatus');

if (!appShell) {
  console.warn('[chat] Chat shell element not found.');
}

const trimValue = (value) => (typeof value === 'string' ? value.trim() : (value ?? '') + '').trim();

const state = {
  chatId: trimValue(appShell?.dataset.chatId || ''),
  vendorId: trimValue(appShell?.dataset.vendorId || ''),
  vendorFirebaseId: trimValue(appShell?.dataset.vendorFirebaseId || ''),
  vendorNumericId: trimValue(appShell?.dataset.vendorNumericId || ''),
  buyerId: trimValue(appShell?.dataset.buyerId || ''),
  buyerNumericId: trimValue(appShell?.dataset.buyerNumericId || ''),
  buyerFirebaseId: trimValue(appShell?.dataset.buyerFirebaseId || ''),
  productId: trimValue(appShell?.dataset.productId || ''),
  productTitle: appShell?.dataset.productTitle || 'Marketplace Listing',
  productImage: appShell?.dataset.productImage || '',
  participantName: appShell?.dataset.participantName || 'YUSTAM User',
  participantStatus: appShell?.dataset.participantStatus || 'Online',
  currentUserName: appShell?.dataset.currentUserName || '',
  buyerName: appShell?.dataset.buyerName || '',
  vendorName: appShell?.dataset.vendorName || '',
  counterpartyId: trimValue(appShell?.dataset.counterpartyId || ''),
  counterpartyRole: appShell?.dataset.counterpartyRole || '',
  counterpartyName: appShell?.dataset.counterpartyName || appShell?.dataset.participantName || '',
  currentUserId: trimValue(appShell?.dataset.currentUserId || ''),
  currentRole: appShell?.dataset.currentRole || 'guest',
  typingTimeout: null,
  unsubscribeMessages: null,
  unsubscribeTyping: null,
  attachmentFile: null,
  presenceUnsubscribe: null,
  presenceInterval: null
};

if (!state.counterpartyRole) {
  state.counterpartyRole = state.currentRole === 'buyer' ? 'vendor' : 'buyer';
}

if (!state.counterpartyName) {
  state.counterpartyName = 'YUSTAM User';
}

if (!state.buyerName && state.currentRole === 'buyer') {
  state.buyerName = state.currentUserName || '';
}

if (!state.vendorName && state.currentRole === 'vendor') {
  state.vendorName = state.currentUserName || '';
}

if (!state.vendorNumericId && state.currentRole === 'vendor') {
  state.vendorNumericId = state.currentUserId || '';
}

if (!state.buyerNumericId && state.currentRole === 'buyer') {
  state.buyerNumericId = state.currentUserId || '';
}

if (!state.vendorFirebaseId && state.vendorId && state.vendorId !== state.vendorNumericId) {
  state.vendorFirebaseId = state.vendorId;
}
if (!state.buyerFirebaseId && state.buyerId && state.buyerId !== state.buyerNumericId) {
  state.buyerFirebaseId = state.buyerId;
}

if (state.currentRole === 'buyer' && state.vendorName) {
  state.counterpartyName = state.vendorName;
} else if (state.currentRole === 'vendor' && state.buyerName) {
  state.counterpartyName = state.buyerName;
}

if (!state.buyerId) {
  if (state.currentRole === 'buyer' && state.currentUserId) {
    state.buyerId = state.currentUserId;
  } else if (state.counterpartyRole === 'buyer' && state.counterpartyId) {
    state.buyerId = state.counterpartyId;
  }
  if (state.buyerId) {
    appShell?.setAttribute('data-buyer-id', state.buyerId);
  }
}

if (!state.vendorId) {
  if (state.currentRole === 'vendor' && state.currentUserId) {
    state.vendorId = state.currentUserId;
  } else if (state.counterpartyRole === 'vendor' && state.counterpartyId) {
    state.vendorId = state.counterpartyId;
  } else if (state.vendorFirebaseId) {
    state.vendorId = state.vendorFirebaseId;
  }
  if (state.vendorId) {
    appShell?.setAttribute('data-vendor-id', state.vendorId);
  }
}

if (!state.chatId && state.vendorId && state.buyerId && state.productId) {
  state.chatId = `${state.vendorId}_${state.buyerId}_${state.productId}`;
  appShell?.setAttribute('data-chat-id', state.chatId);
}

const chatDocRef = state.chatId ? doc(db, 'chats', state.chatId) : null;
const messagesCollection = chatDocRef ? collection(chatDocRef, 'messages') : null;
const presenceDocRef = state.currentUserId ? doc(db, 'presence', state.currentUserId) : null;
const counterpartyPresenceDocRef = state.counterpartyId ? doc(db, 'presence', state.counterpartyId) : null;

const tickIcons = {
  delivered: '<i class="ri-check-line" aria-hidden="true"></i>',
  seen: '<i class="ri-check-double-line" aria-hidden="true" style="color:#23c197;"></i>'
};

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : timestamp;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMessage(docSnapshot) {
  const data = docSnapshot.data();
  if (!data) return null;
  const isOwn = data.senderId === state.currentUserId;
  const bubble = document.createElement('article');
  bubble.className = `message-bubble ${isOwn ? 'outgoing' : 'incoming'}`;
  bubble.dataset.messageId = docSnapshot.id;

  const parts = [];

  if (data.imageUrl) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'message-image';
    const img = document.createElement('img');
    img.src = data.imageUrl;
    img.alt = 'Shared attachment';
    imageWrapper.appendChild(img);
    parts.push(imageWrapper);
  }

  if (data.text) {
    const text = document.createElement('p');
    text.className = 'message-text';
    text.textContent = data.text;
    parts.push(text);
  }

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const timeSpan = document.createElement('span');
  timeSpan.textContent = formatTime(data.timestamp);
  meta.appendChild(timeSpan);

  if (isOwn) {
    const seenState = data.seen ? tickIcons.seen : tickIcons.delivered;
    const tickSpan = document.createElement('span');
    tickSpan.innerHTML = seenState;
    meta.appendChild(tickSpan);
  }

  parts.push(meta);

  parts.forEach((part) => bubble.appendChild(part));
  return bubble;
}

function appendMessage(element) {
  if (!messageArea) return;
  const shouldScroll = messageArea.scrollHeight - messageArea.scrollTop - messageArea.clientHeight < 120;
  messageArea.appendChild(element);
  if (shouldScroll) {
    requestAnimationFrame(() => {
      messageArea.scrollTop = messageArea.scrollHeight;
    });
  }
}

function resetComposer() {
  composerForm?.reset();
  messageInput.value = '';
  clearAttachment();
}

function showAttachmentPreview(file) {
  if (!file || !imagePreview || !previewImage) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    previewImage.src = event.target?.result || '';
    imagePreview.classList.add('active');
  };
  reader.readAsDataURL(file);
}

function clearAttachment() {
  if (imagePreview) {
    imagePreview.classList.remove('active');
  }
  if (previewImage) {
    previewImage.src = '';
  }
  if (fileInput) {
    fileInput.value = '';
  }
  state.attachmentFile = null;
}

function consumeQuickMessage() {
  if (!state.chatId) return '';
  try {
    const stored = sessionStorage.getItem(QUICK_MESSAGE_KEY);
    if (!stored) return '';
    const payload = JSON.parse(stored);
    if (!payload || payload.chatId !== state.chatId || !payload.text) {
      return '';
    }
    sessionStorage.removeItem(QUICK_MESSAGE_KEY);
    return payload.text;
  } catch (error) {
    console.warn('[chat] Unable to read quick message payload', error);
    return '';
  }
}

async function ensureChatDocument() {
  if (!chatDocRef) return;
  const snapshot = await getDoc(chatDocRef);
  const participantsToAdd = [state.vendorId, state.buyerId, state.vendorNumericId, state.buyerNumericId, state.vendorFirebaseId, state.buyerFirebaseId].filter(Boolean);

  const basePayload = {
    chatId: state.chatId,
    vendorId: state.vendorId,
    vendorName: state.vendorName || '',
    buyerId: state.buyerId,
    buyerName: state.buyerName || '',
    productId: state.productId,
    productTitle: state.productTitle,
    productImage: state.productImage
  };

  if (state.vendorNumericId) {
    basePayload.vendorNumericId = state.vendorNumericId;
  }
  if (state.buyerNumericId) {
    basePayload.buyerNumericId = state.buyerNumericId;
  }
  if (state.vendorFirebaseId) {
    basePayload.vendorFirebaseId = state.vendorFirebaseId;
  }
  if (state.buyerFirebaseId) {
    basePayload.buyerFirebaseId = state.buyerFirebaseId;
  }

  if (!snapshot.exists()) {
    basePayload.lastUpdated = serverTimestamp();
  }

  if (participantsToAdd.length) {
    basePayload.participants = arrayUnion(...participantsToAdd);
  }

  if (state.currentUserId && state.currentUserName) {
    basePayload[`participantProfiles.${state.currentUserId}`] = {
      name: state.currentUserName,
      role: state.currentRole
    };
  }

  if (state.counterpartyId && state.counterpartyName) {
    basePayload[`participantProfiles.${state.counterpartyId}`] = {
      name: state.counterpartyName,
      role: state.counterpartyRole || ''
    };
  }

  await setDoc(chatDocRef, basePayload, { merge: true });
}

async function markMessagesAsSeen() {
  if (!messagesCollection || !state.currentUserId) return;
  try {
    const unseenQuery = query(messagesCollection, where('seen', '==', false));
    const snapshot = await getDocs(unseenQuery);
    const updates = snapshot.docs
      .filter((docSnap) => docSnap.data()?.senderId && docSnap.data().senderId !== state.currentUserId)
      .map((docSnap) => updateDoc(docSnap.ref, { seen: true, seenAt: serverTimestamp() }));
    await Promise.all(updates);

    if (chatDocRef) {
      const unreadUpdates = {};
      const zeroedKeys = new Set();
      const addZero = (id) => {
        const trimmed = trimValue(id);
        if (!trimmed || zeroedKeys.has(trimmed)) return;
        unreadUpdates[`unreadCounts.${trimmed}`] = 0;
        zeroedKeys.add(trimmed);
      };

      addZero(state.currentUserId);

      if (state.currentRole === 'vendor') {
        addZero(state.vendorId);
        addZero(state.vendorFirebaseId);
        addZero(state.vendorNumericId);
      } else if (state.currentRole === 'buyer') {
        addZero(state.buyerId);
        addZero(state.buyerNumericId);
        addZero(state.buyerFirebaseId);
      }

      if (Object.keys(unreadUpdates).length > 0) {
        unreadUpdates.lastSeenAt = serverTimestamp();
        await setDoc(chatDocRef, unreadUpdates, { merge: true });
      }
    }
  } catch (error) {
    console.error('[chat] Failed to mark messages as seen', error);
  }
}

function setTypingIndicator(active) {
  if (!typingIndicator) return;
  typingIndicator.classList.toggle('active', active);
}

function formatPresenceLabel(timestamp) {
  if (!timestamp) return 'Offline';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (!Number.isFinite(date?.getTime?.())) return 'Offline';

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

async function setPresence(isOnline) {
  if (!presenceDocRef || !state.currentUserId) return;
  try {
    await setDoc(presenceDocRef, {
      userId: state.currentUserId,
      role: state.currentRole,
      name: state.currentUserName || '',
      isOnline,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('[chat] Failed to update presence', error);
  }
}

function applyCounterpartyPresence(data) {
  if (!participantStatus) return;
  if (!data) {
    participantStatus.textContent = 'Offline';
    return;
  }

  if (data.isOnline) {
    participantStatus.textContent = 'Online';
  } else if (data.lastSeen) {
    participantStatus.textContent = `Last seen ${formatPresenceLabel(data.lastSeen)}`;
  } else {
    participantStatus.textContent = 'Offline';
  }
}

function listenToCounterpartyPresence() {
  if (!counterpartyPresenceDocRef) return;
  if (state.presenceUnsubscribe) {
    state.presenceUnsubscribe();
  }

  state.presenceUnsubscribe = onSnapshot(counterpartyPresenceDocRef, (snapshot) => {
    applyCounterpartyPresence(snapshot.data());
  }, (error) => {
    console.error('[chat] Presence subscription error', error);
  });
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    setPresence(true);
  } else {
    setPresence(false);
  }
}

function startPresenceTracking() {
  if (!presenceDocRef || !state.currentUserId) return;

  setPresence(true);
  if (state.presenceInterval) {
    clearInterval(state.presenceInterval);
  }
  state.presenceInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      setPresence(true);
    }
  }, 45000);

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', () => {
    setPresence(false);
    if (state.presenceInterval) {
      clearInterval(state.presenceInterval);
      state.presenceInterval = null;
    }
  });
}

function notifyRecipient(recipientId, recipientRole, preview) {
  if (!recipientId || !recipientRole || recipientRole !== 'vendor') {
    return;
  }

  try {
    fetch('chat-notify.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientType: recipientRole,
        recipientId,
        chatId: state.chatId,
        productId: state.productId,
        senderName: state.currentUserName || '',
        message: preview || ''
      })
    }).catch(() => {});
  } catch {
    // Silent fail - notification logging should not block chat UX
  }
}

async function updateTypingStatus(isTyping) {
  if (!chatDocRef || !state.currentUserId) return;
  try {
    await setDoc(chatDocRef, {
      typing: {
        userId: isTyping ? state.currentUserId : '',
        updatedAt: serverTimestamp()
      }
    }, { merge: true });
  } catch (error) {
    console.error('[chat] Failed to update typing status', error);
  }
}

let typingUpdateTimeout;

function debounceTyping() {
  clearTimeout(state.typingTimeout);
  state.typingTimeout = setTimeout(() => {
    updateTypingStatus(false);
  }, 2200);
}

async function sendMessage(event) {
  event?.preventDefault();
  if (!messagesCollection || !state.currentUserId) return;

  const trimmedText = messageInput.value.trim();
  if (!trimmedText && !state.attachmentFile) {
    return;
  }

  if (sendButton) {
    sendButton.disabled = true;
  }
  let imageUrl = '';

  try {
    if (state.attachmentFile) {
      imageUrl = await uploadImage(state.attachmentFile, {
        folder: 'yustam/chat',
        tags: ['chat', state.chatId]
      });
    }

    const timestamp = serverTimestamp();
    const recipientId = state.currentUserId === state.buyerId ? state.vendorId : state.buyerId;
    const recipientRole = state.currentUserId === state.buyerId ? 'vendor' : 'buyer';
    const payload = {
      text: trimmedText,
      imageUrl,
      senderId: state.currentUserId,
      senderName: state.currentUserName || '',
      senderRole: state.currentRole,
      timestamp,
      seen: false
    };

    await addDoc(messagesCollection, payload);

    if (chatDocRef) {
      const chatUpdate = {
        chatId: state.chatId,
        vendorId: state.vendorId,
        vendorName: state.vendorName || '',
        buyerId: state.buyerId,
        buyerName: state.buyerName || '',
        productId: state.productId,
        productTitle: state.productTitle,
        productImage: state.productImage,
        lastMessage: payload,
        lastUpdated: timestamp
      };

      if (state.vendorNumericId) {
        chatUpdate.vendorNumericId = state.vendorNumericId;
      }
      if (state.buyerNumericId) {
        chatUpdate.buyerNumericId = state.buyerNumericId;
      }
      if (state.vendorFirebaseId) {
        chatUpdate.vendorFirebaseId = state.vendorFirebaseId;
      }
      if (state.buyerFirebaseId) {
        chatUpdate.buyerFirebaseId = state.buyerFirebaseId;
      }

      const participantsToAdd = [state.currentUserId, recipientId, state.vendorNumericId, state.buyerNumericId, state.vendorFirebaseId, state.buyerFirebaseId].filter(Boolean);
      if (participantsToAdd.length) {
        chatUpdate.participants = arrayUnion(...participantsToAdd);
      }

      if (state.currentUserId && state.currentUserName) {
        chatUpdate[`participantProfiles.${state.currentUserId}`] = {
          name: state.currentUserName,
          role: state.currentRole
        };
        const zeroKeys = new Set();
        const addZero = (id) => {
          const trimmed = trimValue(id);
          if (!trimmed || zeroKeys.has(trimmed)) return;
          chatUpdate[`unreadCounts.${trimmed}`] = 0;
          zeroKeys.add(trimmed);
        };
        addZero(state.currentUserId);
        if (state.currentRole === 'vendor') {
          addZero(state.vendorId);
          addZero(state.vendorFirebaseId);
          addZero(state.vendorNumericId);
        } else if (state.currentRole === 'buyer') {
          addZero(state.buyerId);
          addZero(state.buyerNumericId);
          addZero(state.buyerFirebaseId);
        }
      }

      if (recipientId) {
        chatUpdate[`participantProfiles.${recipientId}`] = {
          name: state.counterpartyName || '',
          role: state.counterpartyRole || recipientRole
        };

        const incrementedKeys = new Set();
        const addUnreadIncrement = (id) => {
          const trimmed = trimValue(id);
          if (!trimmed || incrementedKeys.has(trimmed)) return;
          chatUpdate[`unreadCounts.${trimmed}`] = increment(1);
          incrementedKeys.add(trimmed);
        };

        addUnreadIncrement(recipientId);

        if (recipientRole === 'vendor') {
          addUnreadIncrement(state.vendorId);
          addUnreadIncrement(state.vendorFirebaseId);
          addUnreadIncrement(state.vendorNumericId);
        } else if (recipientRole === 'buyer') {
          addUnreadIncrement(state.buyerId);
          addUnreadIncrement(state.buyerNumericId);
          addUnreadIncrement(state.buyerFirebaseId);
        }
      }

      await setDoc(chatDocRef, chatUpdate, { merge: true });
      const previewText = trimmedText || (imageUrl ? 'Photo attachment' : '');
      notifyRecipient(recipientId, recipientRole, previewText);
    }

    resetComposer();
    await updateTypingStatus(false);
  } catch (error) {
    console.error('[chat] Failed to send message', error);
  } finally {
    if (sendButton) {
      sendButton.disabled = false;
    }
  }
}

function listenToMessages() {
  if (!messagesCollection) return;
  const q = query(messagesCollection, orderBy('timestamp', 'asc'));
  state.unsubscribeMessages = onSnapshot(q, (snapshot) => {
    if (!messageArea) return;
    if (snapshot.docChanges().length === 0 && messageArea.childElementCount === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Start the conversation by sending the first message.';
      messageArea.appendChild(empty);
      return;
    }

    if (!snapshot.empty) {
      const placeholder = messageArea.querySelector('.empty-state');
      if (placeholder) {
        placeholder.remove();
      }
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const element = renderMessage(change.doc);
        if (element) {
          appendMessage(element);
        }
      } else if (change.type === 'modified') {
        const existing = messageArea.querySelector(`[data-message-id="${change.doc.id}"]`);
        if (existing) {
          const replacement = renderMessage(change.doc);
          if (replacement) {
            messageArea.replaceChild(replacement, existing);
          }
        }
      }
    });

    messageArea.scrollTop = messageArea.scrollHeight;
    markMessagesAsSeen();
  });
}

function listenToTyping() {
  if (!chatDocRef || !typingIndicator) return;
  state.unsubscribeTyping = onSnapshot(chatDocRef, (snapshot) => {
    const data = snapshot.data();
    if (!data?.typing) {
      setTypingIndicator(false);
      return;
    }
    const { userId, updatedAt } = data.typing;
    if (!userId || userId === state.currentUserId) {
      setTypingIndicator(false);
      return;
    }

    const now = Date.now();
    const lastUpdate = updatedAt?.toDate ? updatedAt.toDate().getTime() : now;
    const shouldShow = now - lastUpdate < 3000;
    setTypingIndicator(shouldShow);
    if (shouldShow) {
      clearTimeout(typingUpdateTimeout);
      typingUpdateTimeout = setTimeout(() => setTypingIndicator(false), 2200);
    }
  });
}

function attachEventListeners() {
  composerForm?.addEventListener('submit', sendMessage);

  messageInput?.addEventListener('input', () => {
    if (!messageInput.value.trim()) {
      updateTypingStatus(false);
      return;
    }
    updateTypingStatus(true);
    debounceTyping();
  });

  messageInput?.addEventListener('blur', () => {
    updateTypingStatus(false);
  });

  fileInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) {
      state.attachmentFile = file;
      showAttachmentPreview(file);
    } else {
      clearAttachment();
    }
  });

  removeImageButton?.addEventListener('click', () => {
    clearAttachment();
  });

  window.addEventListener('beforeunload', () => {
    updateTypingStatus(false);
    setPresence(false);
    state.unsubscribeMessages?.();
    state.unsubscribeTyping?.();
    state.presenceUnsubscribe?.();
    if (state.presenceInterval) {
      clearInterval(state.presenceInterval);
      state.presenceInterval = null;
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      markMessagesAsSeen();
    }
  });
}

async function initialiseChat() {
  if (!state.chatId || !chatDocRef) {
    console.warn('[chat] Missing chat identifier.');
    return;
  }

  await ensureChatDocument();
  startPresenceTracking();
  listenToCounterpartyPresence();
  const prefilledText = consumeQuickMessage();
  if (prefilledText && messageInput) {
    messageInput.value = prefilledText;
    await sendMessage();
  }
  listenToMessages();
  listenToTyping();
  markMessagesAsSeen();
}

attachEventListeners();
initialiseChat();
