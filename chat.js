import { db } from './firebase.js';
import { uploadImage } from './cloudinary.js';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
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

const state = {
  chatId: appShell?.dataset.chatId || '',
  vendorId: appShell?.dataset.vendorId || '',
  buyerId: appShell?.dataset.buyerId || '',
  productId: appShell?.dataset.productId || '',
  productTitle: appShell?.dataset.productTitle || 'Marketplace Listing',
  productImage: appShell?.dataset.productImage || '',
  participantName: appShell?.dataset.participantName || 'YUSTAM User',
  participantStatus: appShell?.dataset.participantStatus || 'Online',
  currentUserId: appShell?.dataset.currentUserId || '',
  currentRole: appShell?.dataset.currentRole || 'guest',
  typingTimeout: null,
  unsubscribeMessages: null,
  unsubscribeTyping: null,
  attachmentFile: null
};

if (!state.chatId && state.vendorId && state.buyerId && state.productId) {
  state.chatId = `${state.vendorId}_${state.buyerId}_${state.productId}`;
  appShell?.setAttribute('data-chat-id', state.chatId);
}

const chatDocRef = state.chatId ? doc(db, 'chats', state.chatId) : null;
const messagesCollection = chatDocRef ? collection(chatDocRef, 'messages') : null;

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
  if (!snapshot.exists()) {
    await setDoc(chatDocRef, {
      chatId: state.chatId,
      vendorId: state.vendorId,
      buyerId: state.buyerId,
      productId: state.productId,
      productTitle: state.productTitle,
      productImage: state.productImage,
      buyerName: '',
      vendorName: '',
      participants: [state.vendorId, state.buyerId].filter(Boolean),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  }
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
      const chatSnapshot = await getDoc(chatDocRef);
      if (chatSnapshot.exists()) {
        const chatData = chatSnapshot.data();
        const lastMessage = chatData?.lastMessage;
        if (lastMessage && lastMessage.senderId !== state.currentUserId && !lastMessage.seen) {
          await updateDoc(chatDocRef, {
            'lastMessage.seen': true,
            'lastMessage.seenAt': serverTimestamp()
          });
        }
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

let typingUpdateTimeout;

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
    const payload = {
      text: trimmedText,
      imageUrl,
      senderId: state.currentUserId,
      timestamp,
      seen: false
    };

    await addDoc(messagesCollection, payload);

    if (chatDocRef) {
      await setDoc(chatDocRef, {
        chatId: state.chatId,
        vendorId: state.vendorId,
        buyerId: state.buyerId,
        productId: state.productId,
        productTitle: state.productTitle,
        productImage: state.productImage,
        participants: arrayUnion(state.currentUserId),
        lastMessage: payload,
        lastUpdated: timestamp
      }, { merge: true });
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
    state.unsubscribeMessages?.();
    state.unsubscribeTyping?.();
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
