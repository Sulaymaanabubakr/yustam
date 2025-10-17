import {
  initFirebase,
  ensureChat,
  subscribeMessages,
  subscribeTyping,
  sendMessage,
  setTyping,
  markRead,
  recordVoice,
  uploadVoiceToCloudinary,
  showToast,
} from './chat-service.js';
import { uploadToCloudinary } from './cloudinary.js';

const thread = window.__CHAT_THREAD__ || {};
if (!thread.chatId || !thread.role || !thread.viewer?.uid) {
  showToast('Missing chat context.');
  throw new Error('Chat bootstrap missing');
}

initFirebase();

const role = thread.role;
const viewer = thread.viewer;
const counterparty = thread.counterparty || {};
const listing = thread.listing || {};

const [vendorUid, buyerUid, listingIdFromId] = (thread.chatId || '').split('__');
const buyerIdentifier = buyerUid || (role === 'buyer' ? viewer.uid : counterparty.uid);
const vendorIdentifier = vendorUid || (role === 'vendor' ? viewer.uid : counterparty.uid);
const listingId = listing.id || listingIdFromId || '';

const messageListEl = document.getElementById('messageList');
const typingBannerEl = document.getElementById('typingBanner');
const scrollToBottomBtn = document.getElementById('scrollToBottom');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const emojiButton = document.getElementById('emojiButton');
const imageInput = document.getElementById('imageInput');
const attachButton = document.getElementById('attachButton');
const attachmentPreview = document.getElementById('attachmentPreview');
const offlineBanner = document.getElementById('offlineBanner');
const headerAvatar = document.getElementById('headerAvatar');
const chatTitleEl = document.getElementById('chatTitle');
const chatSubtitleEl = document.getElementById('chatSubtitle');
const backButton = document.getElementById('backButton');
const infoButton = document.getElementById('infoButton');
const callButton = document.getElementById('callButton');
const videoButton = document.getElementById('videoButton');

let messagesState = [];
let unsubscribeMessages = null;
let unsubscribeTyping = null;
let typingTimeout = null;
let isRecording = false;
let recorderController = null;
let recordStartTime = null;
let pointerStartX = 0;
let pendingImageFile = null;

const counterpartyLabel = counterparty.name || (role === 'buyer' ? 'Vendor' : 'Buyer');
chatTitleEl.textContent = counterpartyLabel;
chatSubtitleEl.textContent = listing.title || 'Listing';

if (listing.image) {
  headerAvatar.querySelector('img').src = listing.image;
}

function updateOfflineBanner() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    offlineBanner.classList.add('is-visible');
  } else {
    offlineBanner.classList.remove('is-visible');
  }
}

updateOfflineBanner();
window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: 'numeric' }).format(date);
}

function renderMessage(message) {
  const isOwn = message.sender_uid === viewer.uid;
  const article = document.createElement('article');
  article.className = `message ${isOwn ? 'sent' : 'received'}`;
  article.dataset.id = message.id;
  if (message.type === 'image' && message.image_url) {
    const figure = document.createElement('figure');
    figure.className = 'message-image';
    const img = document.createElement('img');
    img.src = message.image_url;
    img.alt = 'Image attachment';
    img.addEventListener('click', () => {
      window.open(message.image_url, '_blank');
    });
    figure.appendChild(img);
    article.appendChild(figure);
  }

  if (message.type === 'voice' && message.voice_url) {
    const player = document.createElement('div');
    player.className = 'voice-player';
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = '<i class="ri-play-fill"></i>';
    const audio = new Audio(message.voice_url);
    const wave = document.createElement('div');
    wave.className = 'voice-wave';
    const progress = document.createElement('span');
    wave.appendChild(progress);
    const duration = document.createElement('span');
    duration.textContent = message.duration ? `${Math.round(message.duration)}s` : '';
    player.append(button, wave, duration);
    article.appendChild(player);
    button.addEventListener('click', () => {
      if (audio.paused) {
        audio.play();
        button.innerHTML = '<i class="ri-pause-line"></i>';
      } else {
        audio.pause();
        button.innerHTML = '<i class="ri-play-fill"></i>';
      }
    });
    audio.addEventListener('ended', () => {
      button.innerHTML = '<i class="ri-play-fill"></i>';
      progress.style.width = '0%';
    });
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
      }
    });
  }

  if (message.text) {
    const text = document.createElement('p');
    text.textContent = message.text;
    article.appendChild(text);
  }

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = formatTime(toDate(message.ts));
  if (isOwn) {
    const readIndicator = document.createElement('i');
    readIndicator.className = hasCounterpartyRead(message) ? 'ri-check-double-line' : 'ri-check-line';
    meta.appendChild(readIndicator);
  }
  article.appendChild(meta);
  return article;
}

function hasCounterpartyRead(message) {
  const readBy = message.read_by || {};
  const counterUid = role === 'buyer' ? counterparty.uid || vendorIdentifier : counterparty.uid || buyerIdentifier;
  return Boolean(readBy[counterUid]);
}

function shouldStickToBottom() {
  if (!messageListEl) return true;
  return messageListEl.scrollHeight - (messageListEl.scrollTop + messageListEl.clientHeight) < 160;
}

function scrollToBottom(force = false) {
  if (!messageListEl) return;
  if (force || shouldStickToBottom()) {
    messageListEl.scrollTop = messageListEl.scrollHeight;
    scrollToBottomBtn.classList.remove('is-visible');
  }
}

function renderMessages(messages) {
  if (!messageListEl) return;
  const stickToBottom = shouldStickToBottom();
  messageListEl.innerHTML = '';
  const fragment = document.createDocumentFragment();
  messages.forEach((message) => {
    fragment.appendChild(renderMessage(message));
  });
  messageListEl.appendChild(fragment);
  if (stickToBottom) {
    scrollToBottom(true);
  } else if (messages.length) {
    scrollToBottomBtn.classList.add('is-visible');
  }
}

scrollToBottomBtn?.addEventListener('click', () => scrollToBottom(true));
messageListEl?.addEventListener('scroll', () => {
  if (shouldStickToBottom()) {
    scrollToBottomBtn.classList.remove('is-visible');
  }
});

function handleMessages(snapshot) {
  messagesState = snapshot;
  renderMessages(messagesState);
  markRead(thread.chatId, role, viewer.uid);
}

function handleTyping(snapshot) {
  const isTyping = role === 'buyer' ? Boolean(snapshot?.vendor) : Boolean(snapshot?.buyer);
  if (isTyping) {
    typingBannerEl?.removeAttribute('hidden');
  } else {
    typingBannerEl?.setAttribute('hidden', 'hidden');
  }
}

function startTyping() {
  if (typingTimeout) {
    window.clearTimeout(typingTimeout);
  }
  setTyping(thread.chatId, role, true);
  typingTimeout = window.setTimeout(() => {
    setTyping(thread.chatId, role, false);
  }, 1500);
}

messageInput?.addEventListener('input', () => {
  autoResizeTextarea();
  toggleSendMode();
  startTyping();
});

function autoResizeTextarea() {
  if (!messageInput) return;
  messageInput.style.height = 'auto';
  const maxHeight = 120;
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, maxHeight)}px`;
}

autoResizeTextarea();

function toggleSendMode() {
  if (!messageInput || !sendButton) return;
  const value = messageInput.value.trim();
  if (value || pendingImageFile) {
    sendButton.innerHTML = '<i class="ri-send-plane-2-line"></i>';
    sendButton.dataset.mode = 'text';
  } else {
    sendButton.innerHTML = '<i class="ri-mic-line"></i>';
    sendButton.dataset.mode = 'voice';
  }
}

toggleSendMode();

async function ensureThread() {
  try {
    await ensureChat({
      chatId: thread.chatId,
      buyer_uid: buyerIdentifier,
      buyer_name: role === 'buyer' ? viewer.name : counterparty.name,
      vendor_uid: vendorIdentifier,
      vendor_name: role === 'vendor' ? viewer.name : counterparty.name,
      listing_id: listingId,
      listing_title: listing.title,
      listing_image: listing.image,
    });
  } catch (error) {
    console.error('[chat] ensureChat failed', error);
  }
}

ensureThread();

async function sendCurrentMessage() {
  if (!messageInput) return;
  const text = messageInput.value.trim();
  let imageUrl = '';
  if (pendingImageFile) {
    const uploadingToast = 'Uploading image…';
    showToast(uploadingToast);
    try {
      const upload = await uploadToCloudinary(pendingImageFile, {
        folder: 'yustam/chats/images',
        tags: ['chat', 'image'],
      });
      imageUrl = upload.url;
    } catch (error) {
      console.error('Image upload failed', error);
      showToast('Image upload failed.');
      return;
    }
  }

  if (!text && !imageUrl) {
    toggleSendMode();
    return;
  }

  try {
    await sendMessage({
      chatId: thread.chatId,
      as: role,
      sender_uid: viewer.uid,
      text,
      image_url: imageUrl,
      buyer_uid: buyerIdentifier,
      vendor_uid: vendorIdentifier,
    });
    messageInput.value = '';
    pendingImageFile = null;
    attachmentPreview?.setAttribute('hidden', 'hidden');
    attachmentPreview.innerHTML = '';
    if (imageInput) {
      imageInput.value = '';
    }
    toggleSendMode();
    scrollToBottom(true);
  } catch (error) {
    console.error('Unable to send message', error);
  }
}

sendButton?.addEventListener('click', async () => {
  const mode = sendButton?.dataset.mode || 'text';
  if (mode === 'text') {
    await sendCurrentMessage();
  }
});

function handleVoicePointerDown(event) {
  if (sendButton.dataset.mode !== 'voice') return;
  event.preventDefault();
  pointerStartX = event.clientX || (event.touches?.[0]?.clientX ?? 0);
  startVoiceRecording();
}

function handleVoicePointerUp(event) {
  if (!isRecording) return;
  const currentX = event.clientX || (event.changedTouches?.[0]?.clientX ?? pointerStartX);
  if (pointerStartX - currentX > 120) {
    cancelVoiceRecording();
    showToast('Voice note cancelled.');
  } else {
    stopVoiceRecording();
  }
}

sendButton?.addEventListener('pointerdown', handleVoicePointerDown);
sendButton?.addEventListener('pointerup', handleVoicePointerUp);
sendButton?.addEventListener('pointercancel', cancelVoiceRecording);
sendButton?.addEventListener('pointerleave', (event) => {
  if (!isRecording) return;
  const currentX = event.clientX ?? pointerStartX;
  if (pointerStartX - currentX > 120) {
    cancelVoiceRecording();
    showToast('Voice note cancelled.');
  }
});
sendButton?.addEventListener('touchstart', handleVoicePointerDown);
sendButton?.addEventListener('touchend', handleVoicePointerUp);
sendButton?.addEventListener('touchcancel', cancelVoiceRecording);

async function startVoiceRecording() {
  try {
    recorderController = await recordVoice({ mimeType: 'audio/webm' });
    recorderController.start();
    isRecording = true;
    recordStartTime = Date.now();
    sendButton.innerHTML = '<i class="ri-stop-circle-line"></i>';
    showToast('Recording… slide left to cancel');
  } catch (error) {
    console.error('Unable to start recording', error);
    showToast(error.message || 'Recording not supported.');
  }
}

async function stopVoiceRecording() {
  if (!recorderController || !isRecording) return;
  try {
    const blob = await recorderController.stop();
    const duration = (Date.now() - recordStartTime) / 1000;
    isRecording = false;
    recorderController = null;
    sendButton.innerHTML = '<i class="ri-mic-line"></i>';
    const url = await uploadVoiceToCloudinary(blob, {
      filename: `voice-${Date.now()}.webm`,
    });
    await sendMessage({
      chatId: thread.chatId,
      as: role,
      sender_uid: viewer.uid,
      voice_url: url,
      duration,
      buyer_uid: buyerIdentifier,
      vendor_uid: vendorIdentifier,
    });
    scrollToBottom(true);
  } catch (error) {
    console.error('Voice message failed', error);
    showToast('Voice message failed.');
  } finally {
    isRecording = false;
    sendButton.innerHTML = '<i class="ri-mic-line"></i>';
  }
}

function cancelVoiceRecording() {
  if (!recorderController) return;
  recorderController.cancel?.();
  recorderController = null;
  isRecording = false;
  sendButton.innerHTML = '<i class="ri-mic-line"></i>';
}

emojiButton?.addEventListener('click', () => {
  if (!messageInput) return;
  const emoji = '😊';
  const start = messageInput.selectionStart || messageInput.value.length;
  const end = messageInput.selectionEnd || start;
  const value = messageInput.value;
  messageInput.value = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
  messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
  messageInput.focus();
  toggleSendMode();
});

imageInput?.addEventListener('change', (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  pendingImageFile = file;
  const reader = new FileReader();
  reader.onload = () => {
    attachmentPreview.innerHTML = '';
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = reader.result;
    const removeButton = document.createElement('button');
    removeButton.innerHTML = '<i class="ri-close-line"></i>';
    removeButton.addEventListener('click', () => {
      pendingImageFile = null;
      attachmentPreview.innerHTML = '';
      attachmentPreview.setAttribute('hidden', 'hidden');
      imageInput.value = '';
      toggleSendMode();
    });
    figure.append(img, removeButton);
    attachmentPreview.appendChild(figure);
    attachmentPreview.removeAttribute('hidden');
    toggleSendMode();
  };
  reader.readAsDataURL(file);
  imageInput.value = '';
});

attachButton?.addEventListener('click', () => {
  imageInput?.click();
});

infoButton?.addEventListener('click', () => {
  if (listingId) {
    window.open(`product.php?id=${encodeURIComponent(listingId)}`, '_blank');
  } else {
    showToast('Listing details unavailable.');
  }
});

callButton?.addEventListener('click', () => {
  showToast('Call feature coming soon.');
});

videoButton?.addEventListener('click', () => {
  showToast('Video call feature coming soon.');
});

backButton?.addEventListener('click', () => {
  if (role === 'buyer') {
    window.location.href = 'buyer-chats.php';
  } else {
    window.location.href = 'vendor-chats.php';
  }
});

function subscribe() {
  unsubscribeMessages = subscribeMessages(thread.chatId, handleMessages);
  unsubscribeTyping = subscribeTyping(thread.chatId, handleTyping);
}

subscribe();

window.addEventListener('beforeunload', () => {
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribeTyping) unsubscribeTyping();
  setTyping(thread.chatId, role, false);
});

