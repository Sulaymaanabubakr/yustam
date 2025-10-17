import { uploadToCloudinary } from './cloudinary.js';
import {
  clearThreadContext,
  ensureSummary,
  markThreadRead,
  sendMessage,
  setThreadContext,
  setTyping,
  showToast,
  subscribeToMessages,
  subscribeToSummary,
  subscribeToTyping,
} from './chat-service.js';

const root = document.getElementById('chat-app');
const stream = document.getElementById('chat-stream');
const body = document.getElementById('chat-body');
const banner = document.getElementById('new-messages');
const form = document.getElementById('composer-form');
const textarea = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const fileInput = document.getElementById('file-input');
const attachmentRow = document.getElementById('attachment-row');
const participantNameEl = document.getElementById('participant-name');
const participantStatusEl = document.getElementById('participant-status');
const backButton = document.getElementById('chat-back-button');
const recordButton = document.getElementById('record-button');
const recordingIndicator = document.getElementById('recording-indicator');
const recordingTimerEl = document.getElementById('recording-timer');
const recordingCancelBtn = document.getElementById('recording-cancel');
const recordingSendBtn = document.getElementById('recording-send');

if (!root) {
  throw new Error('Chat root element not found.');
}

const chatId = root.dataset.chatId || '';
const role = root.dataset.role || 'guest';
const currentUid = root.dataset.currentUid || '';
let buyerUid = root.dataset.buyerUid || '';
let buyerName = root.dataset.buyerName || 'Buyer';
let vendorUid = root.dataset.vendorUid || '';
let vendorName = root.dataset.vendorName || 'Vendor';
let listingId = root.dataset.listingId || '';
let listingTitle = root.dataset.listingTitle || 'Listing';
let listingImage = root.dataset.listingImage || '';
let counterpartyRole = root.dataset.counterpartyRole || '';
let counterpartyName = root.dataset.counterpartyName || '';
const backLink = root.dataset.backLink || '';

function parseChatIdentifierParts(id) {
  if (!id) return { vendor: '', buyer: '', listing: '' };
  const separator = id.includes('__') ? '__' : '_';
  const parts = id.split(separator);
  return {
    vendor: parts[0] || '',
    buyer: parts[1] || '',
    listing: parts[2] || '',
  };
}

const identifierParts = parseChatIdentifierParts(chatId);
if (!vendorUid && identifierParts.vendor) {
  vendorUid = identifierParts.vendor;
}
if (!buyerUid && identifierParts.buyer) {
  buyerUid = identifierParts.buyer;
}
if (!listingId && identifierParts.listing) {
  listingId = identifierParts.listing;
}

function syncDatasetFromMetadata() {
  root.dataset.buyerUid = buyerUid;
  root.dataset.buyerName = buyerName;
  root.dataset.vendorUid = vendorUid;
  root.dataset.vendorName = vendorName;
  root.dataset.listingId = listingId;
  root.dataset.listingTitle = listingTitle;
  root.dataset.listingImage = listingImage;
  root.dataset.counterpartyRole = counterpartyRole;
  root.dataset.counterpartyName = counterpartyName;
}

function updateParticipantFromMetadata() {
  const displayName = counterpartyName || (role === 'buyer' ? vendorName : buyerName);
  if (displayName && participantNameEl) {
    participantNameEl.textContent = displayName;
  }
  if (participantStatusEl) {
    participantStatusEl.textContent = listingTitle;
  }
}

async function hydrateThreadMetadata() {
  if (buyerUid && vendorUid && listingId) {
    syncDatasetFromMetadata();
    updateParticipantFromMetadata();
    return;
  }

  try {
    const params = new URLSearchParams({ scope: 'thread', chat_id: chatId });
    const response = await fetch(`./fetch-chats.php?${params.toString()}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`metadata request failed with ${response.status}`);
    }
    const payload = await response.json();
    const conversation = payload?.conversation;
    if (conversation) {
      buyerUid = conversation.buyerUid || buyerUid;
      buyerName = conversation.buyerName || buyerName;
      vendorUid = conversation.vendorUid || vendorUid;
      vendorName = conversation.vendorName || vendorName;
      listingId = conversation.productId || listingId;
      listingTitle = conversation.productTitle || listingTitle;
      listingImage = conversation.productImage || listingImage;
      counterpartyRole = conversation.counterpartyRole || counterpartyRole;
      counterpartyName = conversation.counterpartyName || counterpartyName;
      if (!counterpartyName && counterpartyRole === 'buyer') {
        counterpartyName = buyerName;
      }
      if (!counterpartyName && counterpartyRole === 'vendor') {
        counterpartyName = vendorName;
      }
    }
  } catch (error) {
    console.error('[chat] metadata hydration failed', error);
  }

  if (!listingId) {
    listingId = chatId;
  }
  if (!counterpartyRole) {
    counterpartyRole = role === 'vendor' ? 'buyer' : role === 'buyer' ? 'vendor' : counterpartyRole;
  }
  if (!counterpartyName) {
    counterpartyName = counterpartyRole === 'buyer' ? buyerName : vendorName;
  }

  syncDatasetFromMetadata();
  updateParticipantFromMetadata();
}

function applyThreadContext() {
  setThreadContext(chatId, {
    chatId,
    buyer_uid: buyerUid,
    buyer_name: buyerName,
    vendor_uid: vendorUid,
    vendor_name: vendorName,
    listing_id: listingId,
    listing_title: listingTitle,
    listing_image: listingImage,
  });
}

function ensureSummaryWithMetadata() {
  ensureSummary(chatId, {
    buyer_uid: buyerUid,
    buyer_name: buyerName,
    vendor_uid: vendorUid,
    vendor_name: vendorName,
    listing_id: listingId,
    listing_title: listingTitle,
    listing_image: listingImage,
  });
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function resetRecordingUI() {
  state.recording = false;
  state.recordingSendOnStop = false;
  if (state.recordingTimer) {
    window.clearInterval(state.recordingTimer);
    state.recordingTimer = null;
  }
  if (recordingIndicator) {
    recordingIndicator.hidden = true;
    recordingIndicator.classList.remove('is-uploading');
  }
  if (recordingTimerEl) {
    recordingTimerEl.textContent = '0:00';
  }
  if (recordButton) {
    recordButton.classList.remove('is-recording');
    recordButton.innerHTML = '<i class="ri-mic-line"></i>';
    recordButton.disabled = false;
  }
  if (recordingCancelBtn) recordingCancelBtn.disabled = false;
  if (recordingSendBtn) recordingSendBtn.disabled = false;
  if (state.recordingStream) {
    state.recordingStream.getTracks().forEach((track) => track.stop());
    state.recordingStream = null;
  }
  state.mediaRecorder = null;
  state.audioChunks = [];
  state.recordingStartTs = 0;
  state.pendingAudioUpload = null;
  updateSendButton();
}

function updateRecordingTimer() {
  if (!state.recording || !state.recordingStartTs || !recordingTimerEl) return;
  const elapsed = Date.now() - state.recordingStartTs;
  recordingTimerEl.textContent = formatDuration(elapsed);
}

function showRecordingUI() {
  if (recordButton) {
    recordButton.classList.add('is-recording');
    recordButton.innerHTML = '<i class="ri-stop-circle-line"></i>';
  }
  if (recordingIndicator) {
    recordingIndicator.hidden = false;
  }
  updateRecordingTimer();
  if (state.recordingTimer) {
    window.clearInterval(state.recordingTimer);
  }
  state.recordingTimer = window.setInterval(updateRecordingTimer, 300);
  updateSendButton();
}

async function startRecording() {
  if (state.recording) {
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Your browser does not support voice messages.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.recordingStream = stream;
    state.audioChunks = [];
    const mediaRecorder = new MediaRecorder(stream);
    state.mediaRecorder = mediaRecorder;
    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) {
        state.audioChunks.push(event.data);
      }
    });
    mediaRecorder.addEventListener('stop', () => finalizeRecording());
    mediaRecorder.start();
    state.recording = true;
    state.recordingSendOnStop = true;
    state.recordingStartTs = Date.now();
    showRecordingUI();
  } catch (error) {
    console.error('[chat] startRecording failed', error);
    showToast('Microphone access is required for voice messages.');
    resetRecordingUI();
  }
}

function stopRecording(shouldSend = true) {
  if (!state.recording) return;
  state.recordingSendOnStop = shouldSend;
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
  } else {
    finalizeRecording();
  }
}

function finalizeRecording() {
  if (!state.recording) {
    resetRecordingUI();
    return;
  }
  if (!state.recordingSendOnStop) {
    resetRecordingUI();
    return;
  }
  if (!state.audioChunks.length) {
    showToast('Recording was too short.');
    resetRecordingUI();
    return;
  }
  if (recordingIndicator) {
    recordingIndicator.classList.add('is-uploading');
  }
  if (recordingCancelBtn) recordingCancelBtn.disabled = true;
  if (recordingSendBtn) recordingSendBtn.disabled = true;
  if (recordButton) recordButton.disabled = true;

  const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
  const durationMs = Math.max(0, Date.now() - state.recordingStartTs);

  updateSendButton();
  state.pendingAudioUpload = uploadToCloudinary(blob, {
    folder: 'yustam/chats/audio',
    tags: ['chat', 'audio', chatId],
  })
    .then(async (result) => {
      await sendMessage(chatId, { audioUrl: result.url, audioDurationMs: durationMs });
      showToast('Voice message sent.');
    })
    .catch((error) => {
      console.error('[chat] voice upload failed', error);
      showToast('Unable to send voice message.');
    })
    .finally(() => {
      resetRecordingUI();
    });
}

function cancelRecording() {
  if (!state.recording) return;
  state.recordingSendOnStop = false;
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
  } else {
    resetRecordingUI();
  }
  showToast('Recording cancelled.');
  updateSendButton();
}

function stopActiveAudio(resetPosition = true) {
  if (!state.currentAudio) return;
  const { audio, playButton, progressBar, timer, durationMs } = state.currentAudio;
  try {
    audio.pause();
    if (resetPosition) {
      audio.currentTime = 0;
      if (progressBar) progressBar.style.width = '0%';
      const total = durationMs ?? (audio.duration && isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
      if (timer) {
        timer.textContent = `${formatDuration(0)} / ${formatDuration(total)}`;
      }
    }
  } catch (error) {
    console.warn('[chat] stopActiveAudio', error);
  }
  if (playButton) playButton.innerHTML = '<i class="ri-play-fill"></i>';
  state.currentAudio = null;
}

function createAudioMessageContent(message) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-audio';

  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.className = 'audio-play';
  playButton.innerHTML = '<i class="ri-play-fill"></i>';

  const waveform = document.createElement('div');
  waveform.className = 'audio-waveform';

  const progress = document.createElement('div');
  progress.className = 'audio-progress';
  const progressBar = document.createElement('div');
  progressBar.className = 'audio-progress-bar';
  progress.appendChild(progressBar);
  waveform.appendChild(progress);

  const timer = document.createElement('span');
  timer.className = 'audio-timer';
  let knownDurationMs = typeof message.audio_duration_ms === 'number' && message.audio_duration_ms > 0 ? message.audio_duration_ms : null;
  timer.textContent = `${formatDuration(0)} / ${formatDuration(knownDurationMs || 0)}`;

  const audio = new Audio(message.audio_url);
  audio.preload = 'metadata';

  audio.addEventListener('loadedmetadata', () => {
    if (!knownDurationMs && audio.duration && isFinite(audio.duration)) {
      knownDurationMs = Math.round(audio.duration * 1000);
      timer.textContent = `${formatDuration(0)} / ${formatDuration(knownDurationMs)}`;
    }
  });

  audio.addEventListener('timeupdate', () => {
    if (audio.duration && isFinite(audio.duration)) {
      const percent = (audio.currentTime / audio.duration) * 100;
      progressBar.style.width = `${Math.min(100, percent)}%`;
    }
    const total = knownDurationMs || (audio.duration && isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
    timer.textContent = `${formatDuration(Math.round(audio.currentTime * 1000))} / ${formatDuration(total)}`;
  });

  audio.addEventListener('ended', () => {
    const total = knownDurationMs || (audio.duration && isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
    progressBar.style.width = '100%';
    timer.textContent = `${formatDuration(total)} / ${formatDuration(total)}`;
    playButton.innerHTML = '<i class="ri-play-fill"></i>';
    state.currentAudio = null;
  });

  audio.addEventListener('pause', () => {
    playButton.innerHTML = '<i class="ri-play-fill"></i>';
  });

  audio.addEventListener('play', () => {
    playButton.innerHTML = '<i class="ri-pause-fill"></i>';
  });

  playButton.addEventListener('click', () => {
    if (state.currentAudio && state.currentAudio.audio !== audio) {
      stopActiveAudio();
    }
    if (audio.paused) {
      audio
        .play()
        .then(() => {
          const total = knownDurationMs || (audio.duration && isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
          timer.textContent = `${formatDuration(Math.round(audio.currentTime * 1000))} / ${formatDuration(total)}`;
          state.currentAudio = { audio, playButton, progressBar, timer, durationMs: total };
        })
        .catch((error) => {
          console.error('[chat] audio playback failed', error);
          showToast('Unable to play voice message.');
        });
    } else {
      stopActiveAudio(false);
    }
  });

  wrapper.appendChild(playButton);
  wrapper.appendChild(waveform);
  wrapper.appendChild(timer);

  return wrapper;
}

function getContextSnapshot() {
  return {
    chatId,
    role,
    currentUid,
    buyerUid,
    buyerName,
    vendorUid,
    vendorName,
    listingId,
    listingTitle,
    listingImage,
    counterpartyRole,
    counterpartyName,
  };
}

if (!chatId || !currentUid) {
  console.warn('[chat] Missing identifiers', getContextSnapshot());
}


const state = {
  messages: [],
  typing: { buyer: false, vendor: false },
  dividerMessageId: null,
  sending: false,
  typingTimeout: null,
  pending: [],
  recording: false,
  recordingStream: null,
  mediaRecorder: null,
  audioChunks: [],
  recordingStartTs: 0,
  recordingTimer: null,
  pendingAudioUpload: null,
  recordingSendOnStop: false,
  currentAudio: null,
  unsubMessages: null,
  unsubSummary: null,
  unsubTyping: null,
  initialScrollDone: false,
};

function isNearBottom() {
  if (!body) return false;
  const threshold = 80;
  return body.scrollHeight - body.scrollTop - body.clientHeight <= threshold;
}

function scrollToBottom(smooth = true) {
  if (!body) return;
  if (smooth) {
    body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
  } else {
    body.scrollTop = body.scrollHeight;
  }
}

function updateBannerVisibility() {
  if (!banner) return;
  const shouldShow = !isNearBottom() && state.dividerMessageId;
  banner.hidden = !shouldShow;
  banner.classList.toggle('is-visible', shouldShow);
}

function renderDividerBefore(messageId) {
  if (!messageId) return;
  const existing = stream.querySelector('.message-divider');
  if (existing) existing.remove();
  const target = stream.querySelector(`[data-message-id="${messageId}"]`);
  if (!target) return;
  const divider = document.createElement('div');
  divider.className = 'message-divider';
  divider.textContent = 'New messages';
  stream.insertBefore(divider, target);
}

function clearDivider() {
  const divider = stream.querySelector('.message-divider');
  if (divider) divider.remove();
  state.dividerMessageId = null;
  updateBannerVisibility();
}

function renderMessage(message) {
  const existing = stream.querySelector(`[data-message-id="${message.id}"]`);
  const isOwn = message.sender_uid === currentUid;
  const bubbleRole = message.sender_role || 'buyer';
  const wrapper = existing || document.createElement('article');
  wrapper.className = `message-row ${isOwn ? 'is-own' : ''}`;
  wrapper.dataset.messageId = message.id;

  const bubble = document.createElement('div');
  bubble.className = `message-bubble role-${bubbleRole}`;

  if (message.image_url) {
    const figure = document.createElement('div');
    figure.className = 'message-image';
    const image = document.createElement('img');
    image.src = message.image_url;
    image.alt = 'Chat attachment';
    image.loading = 'lazy';
    image.addEventListener('click', () => window.open(message.image_url, '_blank'));
    figure.appendChild(image);
    bubble.appendChild(figure);
  }

  if (message.audio_url) {
    bubble.appendChild(createAudioMessageContent(message));
  }

  if (message.text) {
    const textEl = document.createElement('p');
    textEl.className = 'message-text';
    textEl.textContent = message.text;
    bubble.appendChild(textEl);
  }

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const time = document.createElement('span');
  time.textContent = message.ts
    ? message.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  meta.appendChild(time);
  if (isOwn) {
    const status = document.createElement('span');
    status.className = 'message-status';
    status.title = message.read ? 'Seen' : 'Sent';
    status.setAttribute('aria-label', status.title);
    const statusIcon = document.createElement('i');
    statusIcon.className = message.read ? 'ri-check-double-line' : 'ri-check-line';
    statusIcon.setAttribute('aria-hidden', 'true');
    status.appendChild(statusIcon);
    if (message.read) {
      status.classList.add('is-read');
    }
    meta.appendChild(status);
  }
  bubble.appendChild(meta);


  wrapper.innerHTML = '';
  wrapper.appendChild(bubble);

  if (!existing) {
    stream.appendChild(wrapper);
  }
}

function renderMessages(messages) {
  if (!stream) return;
  stopActiveAudio();
  const previousScrollBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
  const wasAtBottom = isNearBottom();
  stream.innerHTML = '';
  messages.forEach((message) => renderMessage(message));

  if (!state.initialScrollDone || wasAtBottom) {
    const smooth = state.initialScrollDone;
    scrollToBottom(smooth);
    state.initialScrollDone = true;
    clearDivider();
  } else if (!wasAtBottom) {
    renderDividerBefore(state.dividerMessageId);
  }

  if (wasAtBottom && !isNearBottom()) {
    body.scrollTop = body.scrollHeight - body.clientHeight - previousScrollBottom;
  }

  updateBannerVisibility();
}

function handleMessages(messages) {
  const prevIds = new Set(state.messages.map((msg) => msg.id));
  const wasAtBottom = isNearBottom();
  state.messages = messages;

  const newMessages = messages.filter((msg) => !prevIds.has(msg.id));
  const incoming = newMessages.filter((msg) => msg.sender_uid !== currentUid);
  if (incoming.length && !wasAtBottom) {
    state.dividerMessageId = incoming[0]?.id || null;
  }

  renderMessages(messages);
  if (isNearBottom()) {
    markThreadRead(chatId);
  }
}

function handleSummary(summary) {
  if (!summary) return;

  if (summary.buyer_uid) {
    buyerUid = summary.buyer_uid || buyerUid;
  }
  if (summary.vendor_uid) {
    vendorUid = summary.vendor_uid || vendorUid;
  }
  if (summary.buyer_name) {
    buyerName = summary.buyer_name || buyerName;
    if (role === 'vendor') {
      counterpartyName = buyerName;
    }
  }
  if (summary.vendor_name) {
    vendorName = summary.vendor_name || vendorName;
    if (role === 'buyer') {
      counterpartyName = vendorName;
    }
  }
  if (summary.listing_id) {
    listingId = summary.listing_id || listingId;
  }
  if (summary.listing_title) {
    listingTitle = summary.listing_title || listingTitle;
  }
  if (summary.listing_image) {
    listingImage = summary.listing_image || listingImage;
  }

  if (!counterpartyRole) {
    counterpartyRole = role === 'vendor' ? 'buyer' : 'vendor';
  }

  syncDatasetFromMetadata();
  updateParticipantFromMetadata();
  applyThreadContext();

  if (summary.last_ts && participantStatusEl) {
    const lastSeen = summary.last_ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    participantStatusEl.textContent = `${listingTitle} - Updated ${lastSeen}`;
  }
}
function handleTyping(snapshot) {
  state.typing = snapshot || { buyer: false, vendor: false };
  const isOtherTyping = role === 'buyer' ? state.typing.vendor : state.typing.buyer;
  if (isOtherTyping) {
    participantStatusEl.innerHTML =
      '<span class="typing-indicator">typing&hellip;<span><i></i><i></i><i></i></span></span>';
  } else if (state.messages.length) {
    const lastTs = state.messages[state.messages.length - 1]?.ts;
    if (lastTs) {
      participantStatusEl.textContent = `${listingTitle} - Updated ${lastTs.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      participantStatusEl.textContent = listingTitle;
    }
  } else {
    participantStatusEl.textContent = listingTitle;
  }
}

function updateSendButton() {
  const hasText = Boolean(textarea.value.trim());
  const hasAttachments = state.pending.some((item) => item.status !== 'removed');
  const recordingBusy = state.recording || Boolean(state.pendingAudioUpload);
  sendButton.disabled = state.sending || recordingBusy || (!hasText && !hasAttachments);
}

function resizeTextarea() {
  textarea.style.height = 'auto';
  const nextHeight = Math.min(textarea.scrollHeight, 120);
  textarea.style.height = `${nextHeight}px`;
}

function scheduleTyping() {
  if (!chatId || !role || role === 'guest') return;
  if (state.typingTimeout) window.clearTimeout(state.typingTimeout);
  setTyping(chatId, role, true);
  state.typingTimeout = window.setTimeout(() => {
    setTyping(chatId, role, false);
    state.typingTimeout = null;
  }, 1800);
}

function clearTypingState() {
  if (state.typingTimeout) {
    window.clearTimeout(state.typingTimeout);
    state.typingTimeout = null;
  }
  setTyping(chatId, role, false);
}

function renderAttachments() {
  const active = state.pending.filter((item) => item.status !== 'removed');
  if (!active.length) {
    attachmentRow.hidden = true;
    attachmentRow.innerHTML = '';
    updateSendButton();
    return;
  }
  attachmentRow.hidden = false;
  attachmentRow.innerHTML = '';
  active.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'attachment-card';
    const img = document.createElement('img');
    img.src = item.preview;
    img.alt = 'Attachment preview';
    card.appendChild(img);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'attachment-remove';
    removeBtn.innerHTML = '<i class="ri-close-line"></i>';
    removeBtn.addEventListener('click', () => {
      item.status = 'removed';
      renderAttachments();
    });
    card.appendChild(removeBtn);

    if (item.status === 'uploading') {
      const overlay = document.createElement('div');
      overlay.className = 'attachment-progress';
      overlay.textContent = `${Math.round(item.progress * 100)}%`;
      card.appendChild(overlay);
    }

    attachmentRow.appendChild(card);
  });
  updateSendButton();
}

function handleFiles(files) {
  const entries = Array.from(files || []);
  entries.forEach((file) => {
    if (!file.type.startsWith('image/')) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const reader = new FileReader();
    const item = { id, file, preview: '', status: 'pending', progress: 0 };
    reader.onload = (event) => {
      item.preview = String(event.target?.result || '');
      renderAttachments();
    };
    reader.readAsDataURL(file);
    state.pending.push(item);
  });
  renderAttachments();
}

async function uploadAttachment(item) {
  item.status = 'uploading';
  renderAttachments();
  try {
    const result = await uploadToCloudinary(item.file, {
      folder: 'yustam/chats',
      tags: ['chat', chatId],
      onProgress: (progress) => {
        item.progress = progress;
        renderAttachments();
      },
    });
    item.status = 'uploaded';
    item.url = result.url;
    item.width = result.width;
    item.height = result.height;
    renderAttachments();
    return item;
  } catch (error) {
    item.status = 'error';
    renderAttachments();
    showToast('Failed to upload image.');
    throw error;
  }
}

async function handleSend(event) {
  event?.preventDefault();
  if (state.sending) return;
  const text = textarea.value.trim();
  const pendingAttachments = state.pending.filter((item) => item.status !== 'removed');
  if (!text && !pendingAttachments.length) return;
  state.sending = true;
  updateSendButton();

  try {
    for (const item of pendingAttachments) {
      if (item.status !== 'uploaded') {
        await uploadAttachment(item);
      }
    }

    for (const item of pendingAttachments) {
      if (item.status === 'uploaded' && item.url) {
        await sendMessage(chatId, {
          imageUrl: item.url,
          width: item.width,
          height: item.height,
        });
      }
    }

    if (text) {
      await sendMessage(chatId, { text });
    }

    textarea.value = '';
    resizeTextarea();
    state.pending = [];
    renderAttachments();
    clearTypingState();
    scrollToBottom();
    markThreadRead(chatId);
  } catch (error) {
    console.error('[chat] send failed', error);
    showToast('Unable to send message. Please retry.');
  } finally {
    state.sending = false;
    updateSendButton();
  }
}

function handleScroll() {
  if (isNearBottom()) {
    clearDivider();
    markThreadRead(chatId);
  }
  updateBannerVisibility();
}

function initSubscriptions() {
  state.unsubMessages = subscribeToMessages(chatId, handleMessages, (error) => {
    console.error('[chat] message subscription failed', error);
  });
  state.unsubSummary = subscribeToSummary(chatId, handleSummary, (error) => {
    console.error('[chat] summary subscription failed', error);
  });
  state.unsubTyping = subscribeToTyping(chatId, handleTyping, (error) => {
    console.error('[chat] typing subscription failed', error);
  });
}

function destroy() {
  if (state.recording) {
    state.recordingSendOnStop = false;
    cancelRecording();
  }
  stopActiveAudio();
  state.unsubMessages?.();
  state.unsubSummary?.();
  state.unsubTyping?.();
  clearTypingState();
  clearThreadContext(chatId);
}

function init() {
  if (!chatId) {
    showToast('Conversation not found.');
    return;
  }
  if (backButton && backLink) {
    backButton.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.replace(backLink);
    });
  }
  initSubscriptions();
  markThreadRead(chatId);
  resizeTextarea();
  updateSendButton();

  body.addEventListener('scroll', handleScroll, { passive: true });
  banner?.addEventListener('click', () => {
    clearDivider();
    scrollToBottom();
  });

  form.addEventListener('submit', handleSend);
  textarea.addEventListener('input', () => {
    resizeTextarea();
    updateSendButton();
    scheduleTyping();
  });
  textarea.addEventListener('focus', () => markThreadRead(chatId));
  textarea.addEventListener('blur', clearTypingState);

  fileInput.addEventListener('change', (event) => {
    handleFiles(event.target.files);
    fileInput.value = '';
    updateSendButton();
  });

  if (recordButton) {
    recordButton.addEventListener('click', () => {
      if (state.recording) {
        stopRecording(true);
      } else {
        startRecording();
      }
    });
  }

  recordingCancelBtn?.addEventListener('click', () => cancelRecording());
  recordingSendBtn?.addEventListener('click', () => stopRecording(true));

  window.addEventListener('beforeunload', destroy);
}

async function bootstrap() {
  try {
    await hydrateThreadMetadata();
    applyThreadContext();
    ensureSummaryWithMetadata();
    init();
  } catch (error) {
    console.error('[chat] bootstrap failed', error);
    showToast('Unable to load this conversation. Please refresh.');
  }
}

bootstrap();


