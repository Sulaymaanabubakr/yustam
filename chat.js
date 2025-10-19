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
  fetchChatSummary,
  deleteConversation,
} from './chat-service.js';
import { uploadToCloudinary } from './cloudinary.js';

const thread = window.__CHAT_THREAD__ || {};

if (!thread.chatId || !thread.role || !thread.viewer?.uid) {
  showToast('We could not load this conversation.', 'error');
  throw new Error('Chat bootstrap missing');
}

initFirebase();

const timeFormatter =
  typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
    ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: 'numeric' })
    : null;

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.seconds && value.nanoseconds) {
    return new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
  }
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch (error) {
      return null;
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimestamp(value) {
  const date = toDate(value);
  if (!date) return '';
  if (!timeFormatter) {
    return date.toLocaleTimeString('en', { hour: 'numeric', minute: 'numeric' });
  }
  return timeFormatter.format(date);
}

class ChatController {
  constructor(context) {
    this.context = context;
    this.role = context.role;
    this.viewer = context.viewer || {};
    this.counterparty = context.counterparty || {};
    this.listing = context.listing || {};
    this.buyer = context.buyer || {};
    this.vendor = context.vendor || {};
    this.canSend = Boolean(context.canSend);
    this.messages = [];
    this.pendingImageFile = null;
    this.typingActive = false;
    this.typingTimer = null;
    this.voiceState = {
      recording: false,
      controller: null,
      startedAt: 0,
    };

    this.messageList = document.getElementById('messageList');
    this.typingBanner = document.getElementById('typingBanner');
    this.offlineBanner = document.getElementById('offlineBanner');
    this.scrollButton = document.getElementById('scrollToBottom');

    this.messageInput = document.getElementById('messageInput');
    this.emojiButton = document.getElementById('emojiButton');
    this.attachButton = document.getElementById('attachButton');
    this.imageInput = document.getElementById('imageInput');
    this.sendButton = document.getElementById('sendButton');
    this.voiceButton = document.getElementById('voiceButton');
    this.attachmentPreview = document.getElementById('attachmentPreview');
    this.recordingIndicator = document.getElementById('recordingIndicator');
    this.composer = document.querySelector('.composer');

    this.headerAvatar = document.getElementById('headerAvatar');
    this.chatTitle = document.getElementById('chatTitle');
    this.chatSubtitle = document.getElementById('chatSubtitle');
    this.backButton = document.getElementById('backButton');
    this.infoButton = document.getElementById('infoButton');
    this.deleteButton = document.getElementById('deleteChatBtn');

    this.unsubscribeMessages = null;
    this.unsubscribeTyping = null;
  }

  async init() {
    this.persistViewerUid();
    this.applyComposerPermissions();
    this.updateSendAvailability();
    this.bindEvents();
    this.updateHeader();
    this.updateOfflineState();

    await this.ensureChatContext();
    this.loadPrefill();
    this.startSubscriptions();
    this.loadChatSummary();
  }

  destroy() {
    if (this.unsubscribeMessages) {
      this.unsubscribeMessages();
      this.unsubscribeMessages = null;
    }
    if (this.unsubscribeTyping) {
      this.unsubscribeTyping();
      this.unsubscribeTyping = null;
    }
    this.stopTyping();
    this.cancelVoiceRecording();
  }

  getBuyerUid() {
    return (
      this.buyer?.uid ||
      (this.role === 'buyer' ? this.viewer.uid : this.counterparty.uid) ||
      ''
    );
  }

  getVendorUid() {
    return (
      this.vendor?.uid ||
      (this.role === 'vendor' ? this.viewer.uid : this.counterparty.uid) ||
      ''
    );
  }

  getBuyerName() {
    if (this.role === 'buyer') {
      return this.viewer.name || 'Buyer';
    }
    return this.counterparty.name || 'Buyer';
  }

  getVendorName() {
    if (this.role === 'vendor') {
      return this.viewer.name || 'Vendor';
    }
    return this.counterparty.name || 'Vendor';
  }

  persistViewerUid() {
    const uid = typeof this.viewer.uid === 'string' ? this.viewer.uid.trim() : '';
    if (!uid || typeof window === 'undefined') return;
    try {
      window.sessionStorage?.setItem('yustam_uid', uid);
      window.sessionStorage?.setItem('firebase_uid', uid);
    } catch (error) {
      console.warn('Unable to persist session uid', error);
    }
    try {
      window.localStorage?.setItem('yustam_uid', uid);
      window.localStorage?.setItem('firebase_uid', uid);
    } catch (error) {
      console.warn('Unable to persist uid', error);
    }
  }

  applyComposerPermissions() {
    if (!this.composer) return;
    if (!this.canSend) {
      this.composer.classList.add('composer--disabled');
      this.messageInput?.setAttribute('disabled', 'disabled');
      this.sendButton?.setAttribute('disabled', 'disabled');
      this.attachButton?.setAttribute('disabled', 'disabled');
      this.emojiButton?.setAttribute('disabled', 'disabled');
      this.voiceButton?.setAttribute('disabled', 'disabled');
    }
  }

  bindEvents() {
    this.messageInput?.addEventListener('input', () => this.handleInput());
    this.messageInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.handleSend();
      }
    });

    this.emojiButton?.addEventListener('click', () => {
      if (!this.messageInput || !this.canSend) return;
      const emoji = '🙂';
      const start = this.messageInput.selectionStart ?? this.messageInput.value.length;
      const end = this.messageInput.selectionEnd ?? start;
      const current = this.messageInput.value;
      this.messageInput.value = `${current.slice(0, start)}${emoji}${current.slice(end)}`;
      this.messageInput.selectionStart = this.messageInput.selectionEnd = start + emoji.length;
      this.updateSendAvailability();
      this.autoResize();
      this.scheduleTyping();
    });

    this.attachButton?.addEventListener('click', () => {
      if (!this.canSend) return;
      this.imageInput?.click();
    });

    this.imageInput?.addEventListener('change', (event) => this.handleImageSelection(event));
    this.sendButton?.addEventListener('click', () => this.handleSend());

    this.voiceButton?.addEventListener('click', async () => {
      if (!this.canSend) {
        showToast('Messaging is not available for this chat.');
        return;
      }
      if (this.voiceState.recording) {
        await this.stopVoiceRecording();
      } else {
        await this.startVoiceRecording();
      }
    });

    this.scrollButton?.addEventListener('click', () => this.scrollToBottom(true));
    this.messageList?.addEventListener('scroll', () => this.handleListScroll());

    this.backButton?.addEventListener('click', () => this.navigateBack());
    this.infoButton?.addEventListener('click', () => this.openListing());
    this.deleteButton?.addEventListener('click', () => this.handleDelete());

    window.addEventListener('online', () => this.updateOfflineState());
    window.addEventListener('offline', () => this.updateOfflineState());
    window.addEventListener('beforeunload', () => this.destroy());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.voiceState.recording) {
        this.cancelVoiceRecording();
      }
    });
  }

  async ensureChatContext() {
    if (!this.context.chatId) return;
    try {
      await ensureChat({
        chatId: this.context.chatId,
        buyer_uid: this.getBuyerUid(),
        buyer_name: this.getBuyerName(),
        vendor_uid: this.getVendorUid(),
        vendor_name: this.getVendorName(),
        listing_id: this.listing.id || '',
        listing_title: this.listing.title || '',
        listing_image: this.listing.image || '',
      });
    } catch (error) {
      console.warn('[chat] ensureChat failed', error);
    }
  }

  startSubscriptions() {
    if (!this.context.chatId) return;
    this.unsubscribeMessages = subscribeMessages(this.context.chatId, (messages) =>
      this.handleMessages(Array.isArray(messages) ? messages : [])
    );
    this.unsubscribeTyping = subscribeTyping(this.context.chatId, (snapshot) =>
      this.handleTyping(snapshot || {})
    );
  }

  async loadChatSummary() {
    if (!this.context.chatId) return;
    try {
      const summary = await fetchChatSummary(this.context.chatId);
      if (!summary) return;
      if (!this.counterparty.name) {
        if (this.role === 'buyer' && summary.vendor_name) {
          this.counterparty.name = summary.vendor_name;
        } else if (this.role === 'vendor' && summary.buyer_name) {
          this.counterparty.name = summary.buyer_name;
        }
      }
      if (!this.counterparty.avatar) {
        if (this.role === 'buyer' && summary.vendor_avatar) {
          this.counterparty.avatar = summary.vendor_avatar;
        } else if (this.role === 'vendor' && summary.buyer_avatar) {
          this.counterparty.avatar = summary.buyer_avatar;
        }
      }
      if (!this.listing.title && summary.listing_title) {
        this.listing.title = summary.listing_title;
      }
      if (!this.listing.image && summary.listing_image) {
        this.listing.image = summary.listing_image;
      }
      this.updateHeader();
    } catch (error) {
      console.warn('[chat] load summary failed', error);
    }
  }

  loadPrefill() {
    if (!this.messageInput) return;
    if (this.context.quickSent && this.canSend) {
      showToast('We already sent your quick message to the vendor.', 'success');
    }
    if (typeof this.context.prefill === 'string' && this.context.prefill.trim()) {
      this.messageInput.value = this.context.prefill.trim();
      this.updateSendAvailability();
      this.autoResize();
      this.messageInput.focus();
      this.messageInput.selectionStart = this.messageInput.selectionEnd = this.messageInput.value.length;
    }
  }

  handleMessages(messages) {
    this.messages = messages;
    this.renderMessages();
    if (this.viewer.uid) {
      markRead(this.context.chatId, this.role, this.viewer.uid);
    }
  }

  handleTyping(snapshot) {
    const isTyping = this.role === 'buyer' ? Boolean(snapshot.vendor) : Boolean(snapshot.buyer);
    if (!this.typingBanner) return;
    if (isTyping) {
      this.typingBanner.classList.add('is-visible');
    } else {
      this.typingBanner.classList.remove('is-visible');
    }
  }

  handleInput() {
    this.updateSendAvailability();
    this.autoResize();
    if (this.messageInput && this.messageInput.value.trim() === '') {
      this.stopTyping();
    } else {
      this.scheduleTyping();
    }
  }

  scheduleTyping() {
    if (!this.canSend || !this.context.chatId) return;
    if (!this.typingActive) {
      setTyping(this.context.chatId, this.role, true);
      this.typingActive = true;
    }
    if (this.typingTimer) {
      window.clearTimeout(this.typingTimer);
    }
    this.typingTimer = window.setTimeout(() => this.stopTyping(), 1200);
  }

  stopTyping() {
    if (!this.typingActive || !this.context.chatId) return;
    setTyping(this.context.chatId, this.role, false);
    this.typingActive = false;
    if (this.typingTimer) {
      window.clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }

  updateSendAvailability() {
    if (!this.sendButton || !this.messageInput) return;
    if (!this.canSend) {
      this.sendButton.setAttribute('disabled', 'disabled');
      return;
    }
    const hasText = this.messageInput.value.trim().length > 0;
    const shouldEnable = hasText || Boolean(this.pendingImageFile);
    if (shouldEnable) {
      this.sendButton.removeAttribute('disabled');
    } else {
      this.sendButton.setAttribute('disabled', 'disabled');
    }
  }

  autoResize() {
    if (!this.messageInput) return;
    this.messageInput.style.height = 'auto';
    const maxHeight = 140;
    this.messageInput.style.height = `${Math.min(this.messageInput.scrollHeight, maxHeight)}px`;
  }

  async handleSend() {
    if (!this.canSend || !this.messageInput) return;
    const text = this.messageInput.value.trim();
    const hasImage = Boolean(this.pendingImageFile);
    if (!text && !hasImage) {
      return;
    }
    this.sendButton?.setAttribute('disabled', 'disabled');
    try {
      let imageUrl = '';
      if (this.pendingImageFile) {
        showToast('Uploading image...');
        const upload = await uploadToCloudinary(this.pendingImageFile, {
          folder: 'yustam/chats/images',
          tags: ['chat', 'image'],
        });
        imageUrl = upload.url;
      }
      await sendMessage({
        role: this.role,
        text,
        image_url: imageUrl,
        voice_url: '',
        duration: null,
        buyer_uid: this.getBuyerUid(),
        buyer_name: this.getBuyerName(),
        vendor_uid: this.getVendorUid(),
        vendor_name: this.getVendorName(),
        listing_id: this.listing.id || '',
        listing_title: this.listing.title || '',
        listing_image: this.listing.image || '',
      });
      this.messageInput.value = '';
      this.pendingImageFile = null;
      this.clearAttachmentPreview();
      this.autoResize();
      this.stopTyping();
      this.scrollToBottom(true);
    } catch (error) {
      console.error('Unable to send message', error);
      showToast(error?.message || 'Unable to send message.', 'error');
    } finally {
      this.updateSendAvailability();
    }
  }

  handleImageSelection(event) {
    const files = event.target?.files;
    if (!files || !files.length) return;
    const [file] = files;
    if (!file) return;
    this.pendingImageFile = file;
    if (!this.attachmentPreview) {
      this.updateSendAvailability();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.attachmentPreview.innerHTML = '';
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      image.src = reader.result;
      image.alt = file.name || 'Image attachment';
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.innerHTML = '<i class="ri-close-line"></i>';
      removeButton.addEventListener('click', () => this.clearAttachmentPreview());
      figure.append(image, removeButton);
      this.attachmentPreview.appendChild(figure);
      this.attachmentPreview.removeAttribute('hidden');
      this.updateSendAvailability();
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  clearAttachmentPreview() {
    if (this.attachmentPreview) {
      this.attachmentPreview.innerHTML = '';
      this.attachmentPreview.setAttribute('hidden', 'hidden');
    }
    this.pendingImageFile = null;
    this.updateSendAvailability();
  }

  async startVoiceRecording() {
    if (this.voiceState.recording) return;
    try {
      const controller = await recordVoice({ mimeType: 'audio/webm' });
      controller.start();
      this.voiceState = {
        recording: true,
        controller,
        startedAt: Date.now(),
      };
      if (this.voiceButton) {
        this.voiceButton.innerHTML = '<i class="ri-stop-circle-line"></i>';
        this.voiceButton.classList.add('recording');
      }
      if (this.recordingIndicator) {
        this.recordingIndicator.classList.add('is-visible');
        this.recordingIndicator.removeAttribute('hidden');
      }
      showToast('Recording... tap stop to send.');
    } catch (error) {
      console.error('Unable to start recording', error);
      showToast(error?.message || 'Recording is not supported on this device.', 'error');
      this.resetVoiceState();
    }
  }

  async stopVoiceRecording() {
    if (!this.voiceState.recording || !this.voiceState.controller) return;
    try {
      const blob = await this.voiceState.controller.stop();
      const duration = (Date.now() - this.voiceState.startedAt) / 1000;
      const url = await uploadVoiceToCloudinary(blob, {
        filename: `voice-${Date.now()}.webm`,
      });
      await sendMessage({
        role: this.role,
        text: '',
        image_url: '',
        voice_url: url,
        duration,
        buyer_uid: this.getBuyerUid(),
        buyer_name: this.getBuyerName(),
        vendor_uid: this.getVendorUid(),
        vendor_name: this.getVendorName(),
        listing_id: this.listing.id || '',
        listing_title: this.listing.title || '',
        listing_image: this.listing.image || '',
      });
      this.scrollToBottom(true);
    } catch (error) {
      console.error('Voice message failed', error);
      showToast(error?.message || 'Voice message failed.', 'error');
    } finally {
      this.resetVoiceState();
    }
  }

  cancelVoiceRecording() {
    if (!this.voiceState.recording) return;
    try {
      this.voiceState.controller?.cancel();
    } catch (error) {
      console.warn('Voice cancel error', error);
    }
    this.resetVoiceState();
    showToast('Voice recording cancelled.');
  }

  resetVoiceState() {
    this.voiceState = {
      recording: false,
      controller: null,
      startedAt: 0,
    };
    if (this.voiceButton) {
      this.voiceButton.innerHTML = '<i class="ri-mic-line"></i>';
      this.voiceButton.classList.remove('recording');
    }
    if (this.recordingIndicator) {
      this.recordingIndicator.classList.remove('is-visible');
      this.recordingIndicator.setAttribute('hidden', 'hidden');
    }
  }

  renderMessages() {
    if (!this.messageList) return;
    const shouldStick = this.shouldStickToBottom();
    this.messageList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    this.messages.forEach((message) => {
      fragment.appendChild(this.renderMessage(message));
    });
    this.messageList.appendChild(fragment);
    if (shouldStick) {
      this.scrollToBottom(true);
    } else if (this.messages.length) {
      this.scrollButton?.classList.add('is-visible');
    }
  }

  renderMessage(message) {
    const isOwn = message.sender_uid === this.viewer.uid;
    const article = document.createElement('article');
    article.className = `message ${isOwn ? 'sent' : 'received'}`;
    article.dataset.id = message.id || '';

    if (message.image_url) {
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

    if (message.voice_url) {
      const player = document.createElement('div');
      player.className = 'voice-player';
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = message.voice_url;
      if (message.duration) {
        audio.setAttribute('data-duration', String(Math.round(message.duration)));
      }
      player.appendChild(audio);
      article.appendChild(player);
    }

    if (message.text) {
      const paragraph = document.createElement('p');
      paragraph.textContent = message.text;
      article.appendChild(paragraph);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = formatTimestamp(message.ts);
    article.appendChild(meta);

    return article;
  }

  shouldStickToBottom() {
    if (!this.messageList) return true;
    const threshold = 120;
    const distanceFromBottom =
      this.messageList.scrollHeight - (this.messageList.scrollTop + this.messageList.clientHeight);
    return distanceFromBottom <= threshold;
  }

  scrollToBottom(force = false) {
    if (!this.messageList) return;
    if (force || this.shouldStickToBottom()) {
      this.messageList.scrollTop = this.messageList.scrollHeight;
      this.scrollButton?.classList.remove('is-visible');
    }
  }

  handleListScroll() {
    if (this.shouldStickToBottom()) {
      this.scrollButton?.classList.remove('is-visible');
    }
  }

  updateHeader() {
    if (this.chatTitle) {
      this.chatTitle.textContent =
        this.counterparty.name || (this.role === 'buyer' ? 'Vendor' : 'Buyer');
    }
    if (this.chatSubtitle) {
      this.chatSubtitle.textContent = this.listing.title || 'Marketplace listing';
    }
    const avatarSrc =
      this.counterparty.avatar ||
      this.listing.image ||
      'https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?auto=format&fit=crop&w=120&q=80';
    const avatarImg = this.headerAvatar?.querySelector('img');
    if (avatarImg && avatarSrc) {
      avatarImg.src = avatarSrc;
    }
  }

  updateOfflineState() {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!this.offlineBanner) return;
    if (offline) {
      this.offlineBanner.classList.add('is-visible');
    } else {
      this.offlineBanner.classList.remove('is-visible');
    }
  }

  openListing() {
    if (!this.listing.id) {
      showToast('Listing details unavailable.');
      return;
    }
    const url = `product.php?id=${encodeURIComponent(this.listing.id)}`;
    window.open(url, '_blank');
  }

  navigateBack() {
    if (this.role === 'buyer') {
      window.location.href = 'buyer-chats.php';
    } else {
      window.location.href = 'vendor-chats.php';
    }
  }

  async handleDelete() {
    if (!this.context.chatId || !window.confirm('Delete this conversation?')) {
      return;
    }
    try {
      await deleteConversation(this.context.chatId);
      showToast('Conversation removed.', 'success');
      window.setTimeout(() => this.navigateBack(), 500);
    } catch (error) {
      console.error('Unable to delete conversation', error);
      showToast(error?.message || 'Unable to delete conversation.', 'error');
    }
  }
}

const controller = new ChatController(thread);
controller.init();
