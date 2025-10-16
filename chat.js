import { uploadImage } from './cloudinary.js';

const QUICK_MESSAGE_KEY = 'yustam_quick_message';
const POLL_INTERVAL = 5000;

const appShell = document.getElementById('chatApp');
const messageArea = document.getElementById('messageArea');
const composerForm = document.getElementById('composerForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const removeImageButton = document.getElementById('removeImage');
const participantStatus = document.getElementById('participantStatus');
const typingIndicator = document.getElementById('typingIndicator');

const state = {
  chatId: appShell?.dataset.chatId || '',
  productId: appShell?.dataset.productId || '',
  productTitle: appShell?.dataset.productTitle || 'Marketplace Listing',
  productImage: appShell?.dataset.productImage || '',
  buyerUid: appShell?.dataset.buyerUid || '',
  buyerId: appShell?.dataset.buyerId || '',
  buyerName: appShell?.dataset.buyerName || '',
  vendorUid: appShell?.dataset.vendorUid || '',
  vendorId: appShell?.dataset.vendorId || '',
  vendorName: appShell?.dataset.vendorName || '',
  currentUid: appShell?.dataset.currentUserId || '',
  currentNumericId: appShell?.dataset.currentUserNumericId || '',
  currentRole: appShell?.dataset.currentRole || 'guest',
  currentUserName: appShell?.dataset.currentUserName || '',
  counterpartyName: appShell?.dataset.counterpartyName || '',
  counterpartyRole: appShell?.dataset.counterpartyRole || '',
  pollingTimer: null,
  lastMessageId: 0,
  pendingFile: null,
  isSending: false,
  initialised: false
};

function computeChatId() {
  if (state.chatId) return state.chatId;
  if (state.vendorUid && state.buyerUid && state.productId) {
    return `${state.vendorUid}_${state.buyerUid}_${state.productId}`;
  }
  return '';
}

state.chatId = computeChatId();

function toggleTypingIndicator(show) {
  if (!typingIndicator) return;
  typingIndicator.style.display = show ? 'flex' : 'none';
}

toggleTypingIndicator(false);

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createMessageElement(message) {
  const isOwn = message.sender_uid === state.currentUid;
  const bubble = document.createElement('article');
  bubble.className = `message-bubble ${isOwn ? 'outgoing' : 'incoming'}`;
  bubble.dataset.messageId = String(message.id);

  if (message.image_url) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'message-image';
    const img = document.createElement('img');
    img.src = message.image_url;
    img.alt = 'Attachment';
    imageWrapper.appendChild(img);
    bubble.appendChild(imageWrapper);
  }

  if (message.message_text) {
    const text = document.createElement('p');
    text.className = 'message-text';
    text.textContent = message.message_text;
    bubble.appendChild(text);
  }

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const timeSpan = document.createElement('span');
  timeSpan.textContent = formatTime(message.created_at);
  meta.appendChild(timeSpan);
  bubble.appendChild(meta);

  return bubble;
}

function appendMessages(messages) {
  if (!messages.length || !messageArea) return;
  const fragment = document.createDocumentFragment();
  messages.forEach((msg) => {
    const element = createMessageElement(msg);
    fragment.appendChild(element);
    state.lastMessageId = Math.max(state.lastMessageId, Number(msg.id));
  });
  const shouldScroll =
    messageArea.scrollHeight - messageArea.scrollTop - messageArea.clientHeight < 120;
  messageArea.appendChild(fragment);
  if (shouldScroll) {
    messageArea.scrollTop = messageArea.scrollHeight;
  }
}

function clearMessages() {
  if (!messageArea) return;
  messageArea.innerHTML = '';
  state.lastMessageId = 0;
}

function updateConversationSummary(summary) {
  if (!summary) return;
  state.counterpartyName = summary.counterpartyName || state.counterpartyName;
  state.counterpartyRole = summary.counterpartyRole || state.counterpartyRole;
  if (participantStatus && summary.lastMessageAt) {
    const lastTime = formatTime(summary.lastMessageAt);
    participantStatus.textContent = lastTime ? `Last active ${lastTime}` : '';
  }
}

async function fetchThread(initial = false) {
  if (!state.chatId) return;
  try {
    const url = new URL('fetch-chats.php', window.location.origin);
    url.searchParams.set('scope', 'thread');
    url.searchParams.set('chat_id', state.chatId);
    if (!initial && state.lastMessageId) {
      url.searchParams.set('after_id', String(state.lastMessageId));
    }

    const response = await fetch(url.toString(), { credentials: 'same-origin' });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || 'Unable to load messages.');
    }

    if (initial) {
      clearMessages();
    }

    if (Array.isArray(payload.messages) && payload.messages.length) {
      appendMessages(payload.messages);
    } else if (initial && messageArea && !messageArea.children.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <span>💬</span>
        <h2>Start the conversation</h2>
        <p>Send the first message to kick things off.</p>
      `;
      messageArea.appendChild(empty);
    }

    updateConversationSummary(payload.conversation);
    state.initialised = true;
  } catch (error) {
    console.error('[chat] fetch thread failed', error);
  }
}

async function pollThread() {
  if (state.isSending) return;
  await fetchThread(false);
}

function startPolling() {
  if (state.pollingTimer !== null) {
    clearInterval(state.pollingTimer);
  }
  state.pollingTimer = window.setInterval(pollThread, POLL_INTERVAL);
}

function stopPolling() {
  if (state.pollingTimer !== null) {
    clearInterval(state.pollingTimer);
    state.pollingTimer = null;
  }
}

function showAttachmentPreview(file) {
  if (!imagePreview || !previewImage) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    previewImage.src = String(event.target?.result || '');
    imagePreview.classList.add('active');
  };
  reader.readAsDataURL(file);
}

function clearAttachment() {
  state.pendingFile = null;
  if (imagePreview) imagePreview.classList.remove('active');
  if (previewImage) previewImage.src = '';
  if (fileInput) fileInput.value = '';
}

async function resolveAttachment() {
  if (!state.pendingFile) return '';
  try {
    const url = await uploadImage(state.pendingFile, {
      folder: 'yustam/chats',
      tags: ['yustam', 'chat']
    });
    return url;
  } catch (error) {
    console.error('[chat] attachment upload failed', error);
    return '';
  } finally {
    clearAttachment();
  }
}

async function handleSend(event) {
  event.preventDefault();
  if (!messageInput || !state.chatId || state.isSending) return;

  const rawText = messageInput.value.trim();
  if (rawText === '' && !state.pendingFile) {
    return;
  }

  state.isSending = true;
  if (sendButton) {
    sendButton.disabled = true;
  }

  try {
    const attachmentUrl = await resolveAttachment();
    const body = {
      chat_id: state.chatId,
      product_id: state.productId,
      product_title: state.productTitle,
      product_image: state.productImage,
      buyer_uid: state.buyerUid,
      buyer_numeric_id: state.buyerId || null,
      buyer_name: state.buyerName || '',
      vendor_uid: state.vendorUid,
      vendor_numeric_id: state.vendorId || null,
      vendor_name: state.vendorName || '',
      message: rawText,
      image_url: attachmentUrl
    };

    const response = await fetch('send-message.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || 'Unable to send message.');
    }

    if (Array.isArray(payload.message) && payload.message.length) {
      appendMessages(payload.message);
    } else if (payload.message) {
      appendMessages([payload.message]);
    }

    messageInput.value = '';
    state.isSending = false;
    if (sendButton) sendButton.disabled = false;
    messageArea.scrollTop = messageArea.scrollHeight;
  } catch (error) {
    console.error('[chat] send failed', error);
    state.isSending = false;
    if (sendButton) sendButton.disabled = false;
  }
}

function consumeQuickMessage() {
  if (!state.chatId) return '';
  try {
    const stored = sessionStorage.getItem(QUICK_MESSAGE_KEY);
    if (!stored) return '';
    const parsed = JSON.parse(stored);
    if (!parsed || parsed.chatId !== state.chatId || !parsed.text) {
      return '';
    }
    sessionStorage.removeItem(QUICK_MESSAGE_KEY);
    return parsed.text;
  } catch (error) {
    console.warn('[chat] unable to parse quick message', error);
    return '';
  }
}

function initialiseQuickMessage() {
  const prefill = consumeQuickMessage();
  if (prefill && messageInput) {
    messageInput.value = prefill;
  }
}

function bindEvents() {
  composerForm?.addEventListener('submit', handleSend);

  fileInput?.addEventListener('change', (event) => {
    const file = event.target?.files?.[0];
    if (file) {
      state.pendingFile = file;
      showAttachmentPreview(file);
    } else {
      clearAttachment();
    }
  });

  removeImageButton?.addEventListener('click', () => {
    clearAttachment();
  });

  window.addEventListener('focus', () => {
    fetchThread(false);
  });

  window.addEventListener('beforeunload', stopPolling);
}

async function initialiseChat() {
  if (!state.chatId) {
    console.warn('[chat] Missing conversation identifier.');
    return;
  }

  initialiseQuickMessage();
  await fetchThread(true);
  startPolling();
}

bindEvents();
initialiseChat();
