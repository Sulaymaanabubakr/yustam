import { app, db } from './firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { uploadToCloudinary } from './cloudinary.js';
import { normalisePlanSlug, verificationPlanLabel } from './plan-utils.js';

const COLLECTIONS = {
  CHATS: 'chats',
  TYPING: 'typing',
  MESSAGES: 'messages',
};

const MAX_MESSAGES_TO_MARK = 200;
const MESSAGE_FETCH_LIMIT = 500;
const CHAT_FETCH_LIMIT = 100;

const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined' && typeof navigator !== 'undefined';

let firebaseInitialised = false;

const toastQueue = [];
let toastRendering = false;
let toastRoot = null;

const fallbackChatCache = new Map();

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const FNV_MOD = 0xffffffffffffffffn;

function ensureToastRoot() {
  if (!isBrowser) {
    return null;
  }
  if (toastRoot && document.body.contains(toastRoot)) {
    return toastRoot;
  }
  toastRoot = document.createElement('div');
  toastRoot.className = 'yustam-toast-root';
  toastRoot.setAttribute('role', 'status');
  toastRoot.setAttribute('aria-live', 'polite');
  document.body.appendChild(toastRoot);
  return toastRoot;
}

function renderNextToast() {
  if (toastRendering) return;
  if (!toastQueue.length) return;
  const root = ensureToastRoot();
  if (!root) return;
  const { message, variant } = toastQueue.shift();
  toastRendering = true;
  const toast = document.createElement('div');
  toast.className = `yustam-toast yustam-toast--${variant}`;
  toast.textContent = message;
  root.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => {
      toast.remove();
      toastRendering = false;
      renderNextToast();
    }, 220);
  }, 4200);
}

export function showToast(message, variant = 'default') {
  if (!message) return;
  if (!isBrowser) {
    console.warn('[chat]', message);
    return;
  }
  toastQueue.push({ message: String(message), variant });
  requestAnimationFrame(renderNextToast);
}

function normaliseString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function requireUid(value, field) {
  const uid = normaliseString(value);
  if (!uid) {
    throw new Error(`${field} is required`);
  }
  return uid;
}

function resolveTimestamp(value) {
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

export function buildChatId(buyerUid, vendorUid) {
  const buyer = requireUid(buyerUid, 'buyer_uid');
  const vendor = requireUid(vendorUid, 'vendor_uid');
  const input = `${buyer}|${vendor}`;
  let hash = FNV_OFFSET;
  // Mirrors PHP hash('fnv164', ...) so client/server share chat IDs.
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * FNV_PRIME) & FNV_MOD;
    hash ^= BigInt(input.charCodeAt(index));
  }
  return hash.toString(16).padStart(16, '0');
}

function chatDoc(chatId) {
  return doc(collection(db, COLLECTIONS.CHATS), chatId);
}

function typingDoc(chatId) {
  return doc(collection(db, COLLECTIONS.TYPING), chatId);
}

function messagesCollection(chatId) {
  return collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
}

export function initFirebase() {
  if (!firebaseInitialised) {
    firebaseInitialised = true;
  }
  return app;
}

function orderChatsByLastTs(chats) {
  return [...chats].sort((a, b) => {
    const aDate = resolveTimestamp(a.last_ts || a.last_sent_at) || new Date(0);
    const bDate = resolveTimestamp(b.last_ts || b.last_sent_at) || new Date(0);
    return bDate.getTime() - aDate.getTime();
  });
}

function inferMessageType(data) {
  if (data.voice_url || data.voiceUrl) return 'voice';
  if (data.image_url || data.imageUrl) return 'image';
  if (normaliseString(data.text)) return 'text';
  return 'system';
}

function mapMessageSnapshot(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    chat_id: data.chat_id || data.chatId || '',
    sender_uid: data.sender_uid || data.senderUid || '',
    sender_role: data.sender_role || data.senderRole || '',
    client_tag: normaliseString(data.client_tag || data.clientTag),
    text: normaliseString(data.text),
    image_url: normaliseString(data.image_url || data.imageUrl),
    voice_url: normaliseString(data.voice_url || data.voiceUrl),
    duration: data.duration ?? data.voice_duration ?? null,
    type: (data.type || data.message_type || '').toLowerCase() || inferMessageType(data),
    ts: data.ts || data.sent_at || data.sentAt || null,
    read_by: data.read_by || data.readBy || {},
  };
}

function mapMessageRecord(record) {
  return {
    id: record.id || record.message_id || '',
    chat_id: record.chat_id || record.chatId || '',
    sender_uid: record.sender_uid || record.senderUid || '',
    sender_role: record.sender_role || record.senderRole || '',
    client_tag: normaliseString(record.client_tag || record.clientTag),
    text: normaliseString(record.text),
    image_url: normaliseString(record.image_url || record.imageUrl),
    voice_url: normaliseString(record.voice_url || record.voiceUrl),
    duration: record.duration ?? record.voice_duration ?? null,
    type: (record.type || record.message_type || '').toLowerCase() || inferMessageType(record),
    ts: record.ts || record.sent_at || record.sentAt || null,
    read_by: record.read_by || record.readBy || {},
  };
}

function extractVendorBusinessName(source) {
  const candidates = [
    source.vendor_business_name,
    source.vendorBusinessName,
    source.business_name,
    source.businessName,
    source.store_name,
    source.storeName,
    source.company_name,
    source.companyName,
    source.brand_name,
    source.brandName,
    source.trading_name,
    source.tradingName,
  ];
  for (let index = 0; index < candidates.length; index += 1) {
    const value = normaliseString(candidates[index]);
    if (value) {
      return value;
    }
  }
  return '';
}

function resolveVendorIdentity(source) {
  if (!source || typeof source !== 'object') {
    return { business: '', name: '' };
  }
  const businessName = extractVendorBusinessName(source);
  const displayName = normaliseString(source.vendor_display_name || source.vendorDisplayName);
  const storedName = normaliseString(source.vendor_name || source.vendorName);
  const fallbackName = normaliseString(source.vendor || source.name);
  const resolvedName = businessName || displayName || storedName || fallbackName;
  return {
    business: businessName,
    name: resolvedName || businessName || storedName || fallbackName,
  };
}

function mapChatSnapshot(docSnap) {
  const data = docSnap.data() || {};
  const vendorPlan = data.vendor_plan || data.vendorPlan || '';
  const vendorPlanLabel =
    data.vendor_plan_label || data.vendorPlanLabel || (vendorPlan ? verificationPlanLabel(vendorPlan) : '');
  const vendorIdentity = resolveVendorIdentity(data);
  return {
    id: docSnap.id,
    chat_id: data.chat_id || docSnap.id,
    buyer_uid: data.buyer_uid || data.buyerUid || '',
    buyer_name: data.buyer_name || data.buyerName || '',
    buyer_avatar: data.buyer_avatar || data.buyerAvatar || '',
    vendor_uid: data.vendor_uid || data.vendorUid || '',
    vendor_name: vendorIdentity.name,
    vendor_business_name: vendorIdentity.business || vendorIdentity.name,
    vendor_display_name: vendorIdentity.name,
    vendor_avatar: data.vendor_avatar || data.vendorAvatar || '',
    vendor_plan: vendorPlan,
    vendor_plan_label: vendorPlanLabel,
    vendor_plan_slug: data.vendor_plan_slug || data.vendorPlanSlug || normalisePlanSlug(vendorPlan),
    vendor_verified: data.vendor_verified || data.vendorVerified || data.vendor_verification || '',
    vendor_verification: data.vendor_verification || data.vendorVerified || '',
    listing_id: data.listing_id || data.listingId || '',
    listing_title: data.listing_title || data.listingTitle || '',
    listing_image: data.listing_image || data.listingImage || '',
    last_text: data.last_text || data.lastMessage || '',
    last_type: data.last_type || data.lastType || '',
    last_sender_uid: data.last_sender_uid || data.lastSenderUid || '',
    last_sender_role: data.last_sender_role || data.lastSenderRole || '',
    last_ts: data.last_ts || data.lastSentAt || data.updated_at || null,
    unread_for_buyer: Number(data.unread_for_buyer || 0),
    unread_for_vendor: Number(data.unread_for_vendor || 0),
  };
}

function mapChatRecord(record) {
  const vendorPlan = record.vendor_plan || record.vendorPlan || '';
  const vendorPlanLabel =
    record.vendor_plan_label || record.vendorPlanLabel || (vendorPlan ? verificationPlanLabel(vendorPlan) : '');
  const vendorIdentity = resolveVendorIdentity(record);
  return {
    id: record.id || record.chat_id || '',
    chat_id: record.chat_id || record.chatId || '',
    buyer_uid: record.buyer_uid || record.buyerUid || '',
    buyer_name: record.buyer_name || record.buyerName || '',
    buyer_avatar: record.buyer_avatar || record.buyerAvatar || '',
    vendor_uid: record.vendor_uid || record.vendorUid || '',
    vendor_name: vendorIdentity.name,
    vendor_business_name: vendorIdentity.business || vendorIdentity.name,
    vendor_display_name: vendorIdentity.name,
    vendor_avatar: record.vendor_avatar || record.vendorAvatar || '',
    vendor_plan: vendorPlan,
    vendor_plan_label: vendorPlanLabel,
    vendor_plan_slug: record.vendor_plan_slug || record.vendorPlanSlug || normalisePlanSlug(vendorPlan),
    vendor_verified: record.vendor_verified || record.vendorVerified || record.vendor_verification || '',
    vendor_verification: record.vendor_verification || record.vendorVerified || '',
    listing_id: record.listing_id || record.listingId || '',
    listing_title: record.listing_title || record.listingTitle || '',
    listing_image: record.listing_image || record.listingImage || '',
    last_text: record.last_text || record.lastMessage || '',
    last_type: record.last_type || record.lastType || '',
    last_sender_uid: record.last_sender_uid || record.lastSenderUid || '',
    last_sender_role: record.last_sender_role || record.lastSenderRole || '',
    last_ts: record.last_ts || record.lastSentAt || record.updated_at || null,
    unread_for_buyer: Number(record.unread_for_buyer || 0),
    unread_for_vendor: Number(record.unread_for_vendor || 0),
  };
}

async function callChatApi(path, { method = 'GET', data } = {}) {
  if (!isBrowser || typeof fetch !== 'function') {
    throw new Error('Network request not available.');
  }
  const options = {
    method,
    credentials: 'include',
    headers: { Accept: 'application/json' },
  };
  if (data !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload && payload.success === false)) {
    let message = payload?.message || `Request failed with status ${response.status}`;
    if (payload?.error) {
      message = `${message} (${payload.error})`;
    }
    throw new Error(message);
  }
  return payload || {};
}

async function fetchMessagesViaApi(chatId) {
  const payload = await callChatApi(
    `./api/chat/list-messages.php?chat_id=${encodeURIComponent(chatId)}`,
    { method: 'GET' }
  );
  const messages = Array.isArray(payload.messages) ? payload.messages.map(mapMessageRecord) : [];
  if (payload.chat) {
    const chatRecord = mapChatRecord(payload.chat);
    fallbackChatCache.set(chatId, chatRecord);
  }
  return { messages };
}

async function fetchChatsViaApi(role, uid) {
  const payload = await callChatApi(
    `./api/chat/list-chats.php?role=${encodeURIComponent(role)}&uid=${encodeURIComponent(uid)}`,
    { method: 'GET' }
  );
  const chats = Array.isArray(payload.chats) ? payload.chats.map(mapChatRecord) : [];
  chats.forEach((chat) => fallbackChatCache.set(chat.chat_id, chat));
  return orderChatsByLastTs(chats);
}

async function ensureChatViaApi(payload) {
  const response = await callChatApi('./api/chat/chat-open.php', {
    method: 'POST',
    data: {
      buyer_uid: payload.buyer_uid,
      buyer_name: payload.buyer_name,
      vendor_uid: payload.vendor_uid,
      vendor_business_name: payload.vendor_business_name,
      vendor_name: payload.vendor_name,
      vendor_plan: payload.vendor_plan,
      vendor_plan_label: payload.vendor_plan_label,
      vendor_plan_slug: payload.vendor_plan_slug,
      vendor_verified: payload.vendor_verified,
      listing_id: payload.listing_id,
      listing_title: payload.listing_title,
      listing_image: payload.listing_image,
    },
  });
  const data = response.data ? mapChatRecord({ chat_id: response.chat_id, ...response.data }) : payload;
  fallbackChatCache.set(payload.chat_id, data);
  return { chatId: payload.chat_id, ...data };
}

export async function ensureChat(meta) {
  const buyerUid = requireUid(meta?.buyer_uid || meta?.buyerUid, 'buyer_uid');
  const vendorUid = requireUid(meta?.vendor_uid || meta?.vendorUid, 'vendor_uid');
  const providedChatId = normaliseString(meta?.chatId || meta?.chat_id);
  const chatId = providedChatId || buildChatId(buyerUid, vendorUid);
  const vendorPlanValue = normaliseString(meta?.vendor_plan || meta?.vendorPlan || '');
  const vendorPlanLabelValue = normaliseString(meta?.vendor_plan_label || meta?.vendorPlanLabel || '');

  const payload = {
    chat_id: chatId,
    buyer_uid: buyerUid,
    buyer_name: normaliseString(meta?.buyer_name || meta?.buyerName || 'Buyer'),
    buyer_avatar: normaliseString(meta?.buyer_avatar || meta?.buyerAvatar || ''),
    vendor_uid: vendorUid,
    vendor_business_name: normaliseString(
      meta?.vendor_business_name ||
        meta?.vendorBusinessName ||
        meta?.business_name ||
        meta?.businessName ||
        meta?.vendor_name ||
        meta?.vendorName ||
        'Vendor'
    ),
    vendor_name: normaliseString(meta?.vendor_name || meta?.vendorName || 'Vendor'),
    vendor_avatar: normaliseString(meta?.vendor_avatar || meta?.vendorAvatar || ''),
    vendor_plan: vendorPlanValue,
    vendor_plan_label: vendorPlanLabelValue || verificationPlanLabel(vendorPlanValue),
    vendor_plan_slug: normalisePlanSlug(vendorPlanValue),
    vendor_verified: normaliseString(meta?.vendor_verified || meta?.vendorVerified || meta?.vendor_verification || ''),
    listing_id: normaliseString(meta?.listing_id || meta?.listingId || ''),
    listing_title: normaliseString(meta?.listing_title || meta?.listingTitle || ''),
    listing_image: normaliseString(meta?.listing_image || meta?.listingImage || ''),
  };
  if (payload.vendor_business_name) {
    payload.vendor_name = payload.vendor_business_name;
  } else {
    payload.vendor_business_name = payload.vendor_name;
  }

  try {
    const docRef = chatDoc(chatId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      await setDoc(docRef, {
        chat_id: chatId,
        buyer_uid: payload.buyer_uid,
        buyer_name: payload.buyer_name,
        buyer_avatar: payload.buyer_avatar,
        vendor_uid: payload.vendor_uid,
        vendor_name: payload.vendor_name,
        vendor_business_name: payload.vendor_business_name,
        vendor_avatar: payload.vendor_avatar,
        vendor_plan: payload.vendor_plan,
        vendor_plan_label: payload.vendor_plan_label,
        vendor_plan_slug: payload.vendor_plan_slug,
        vendor_verified: payload.vendor_verified,
        listing_id: payload.listing_id,
        listing_title: payload.listing_title,
        listing_image: payload.listing_image,
        last_text: 'Chat started',
        last_type: 'system',
        unread_for_buyer: 0,
        unread_for_vendor: 0,
        last_ts: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        buyer_uid: payload.buyer_uid,
        buyer_name: payload.buyer_name,
        buyer_avatar: payload.buyer_avatar,
        vendor_uid: payload.vendor_uid,
        vendor_name: payload.vendor_name,
        vendor_business_name: payload.vendor_business_name,
        vendor_avatar: payload.vendor_avatar,
        vendor_plan: payload.vendor_plan,
        vendor_plan_label: payload.vendor_plan_label,
        vendor_plan_slug: payload.vendor_plan_slug,
        vendor_verified: payload.vendor_verified,
        listing_id: payload.listing_id,
        listing_title: payload.listing_title,
        listing_image: payload.listing_image,
      });
    }
    const refreshed = await getDoc(docRef);
    const mapped = refreshed.exists() ? mapChatSnapshot(refreshed) : { chat_id: chatId, ...payload };
    fallbackChatCache.set(chatId, mapped);
    return { chatId, ...mapped };
  } catch (error) {
    console.warn('[chat] ensureChat via Firestore failed', error);
    return ensureChatViaApi(payload);
  }
}

export function subscribeMessages(chatId, callback) {
  const id = requireUid(chatId, 'chatId');
  const q = query(messagesCollection(id), orderBy('ts', 'asc'), limit(MESSAGE_FETCH_LIMIT));
  let active = true;
  let fallbackTimer = null;
  let lastDelivered = null;
  let verifyingEmptySnapshot = false;
  let pendingEmptyConfirmation = false;

  const deliverMessages = (messages) => {
    if (!active || !Array.isArray(messages)) {
      return;
    }
    lastDelivered = messages;
    callback(messages);
  };

  const deliverFromApi = (messages) => {
    if (!Array.isArray(messages)) {
      return;
    }
    const allowClear = !lastDelivered || !lastDelivered.length;
    if (messages.length || allowClear) {
      deliverMessages(messages);
    }
  };

  const verifyEmptySnapshotWithApi = async () => {
    if (verifyingEmptySnapshot || !active) {
      return;
    }
    verifyingEmptySnapshot = true;
    try {
      const data = await fetchMessagesViaApi(id);
      if (!active) {
        return;
      }
      const apiMessages = Array.isArray(data.messages) ? data.messages : [];
      deliverFromApi(apiMessages);
    } catch (verifyError) {
      console.error('[chat] verify messages via api failed', verifyError);
    } finally {
      pendingEmptyConfirmation = false;
      verifyingEmptySnapshot = false;
    }
  };

  const stopFallback = () => {
    if (fallbackTimer) {
      clearInterval(fallbackTimer);
      fallbackTimer = null;
    }
  };

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (!active) return;
      stopFallback();
      const messages = snapshot.docs.map(mapMessageSnapshot);
      const fromCache = Boolean(snapshot.metadata && snapshot.metadata.fromCache);
      const hasPendingWrites = Boolean(snapshot.metadata && snapshot.metadata.hasPendingWrites);
      if (
        messages.length === 0 &&
        lastDelivered &&
        lastDelivered.length &&
        !pendingEmptyConfirmation
      ) {
        pendingEmptyConfirmation = true;
        verifyEmptySnapshotWithApi();
        return;
      }
      if (
        !messages.length &&
        lastDelivered &&
        lastDelivered.length &&
        (fromCache || !hasPendingWrites)
      ) {
        if (fromCache) {
          return;
        }
        verifyEmptySnapshotWithApi();
        return;
      }
      if (
        !messages.length &&
        lastDelivered &&
        lastDelivered.length &&
        hasPendingWrites
      ) {
        return;
      }
      deliverMessages(messages);
    },
    (error) => {
      console.error('[chat] subscribeMessages', error);
      startFallback();
    }
  );

  const seedWithApi = async () => {
    try {
      const data = await fetchMessagesViaApi(id);
      if (active && Array.isArray(data.messages)) {
        deliverFromApi(data.messages);
      }
    } catch (seedError) {
      console.warn('[chat] seed messages via api failed', seedError);
    }
  };

  const startFallback = () => {
    if (fallbackTimer) return;
    const fetchAndEmit = async () => {
      try {
        const data = await fetchMessagesViaApi(id);
        if (active && Array.isArray(data.messages)) {
          deliverFromApi(data.messages);
        }
      } catch (fallbackError) {
        console.error('[chat] messages fallback failed', fallbackError);
      }
    };
    fetchAndEmit();
    fallbackTimer = setInterval(fetchAndEmit, 8000);
  };

  seedWithApi();

  return () => {
    active = false;
    stopFallback();
    try {
      unsubscribe();
    } catch (unsubscribeError) {
      console.warn('[chat] unsubscribe messages', unsubscribeError);
    }
  };
}

export function subscribeTyping(chatId, callback) {
  const id = requireUid(chatId, 'chatId');
  return onSnapshot(
    typingDoc(id),
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.data() : {});
    },
    (error) => {
      console.error('[chat] subscribeTyping', error);
      callback({});
    }
  );
}

export async function setTyping(chatId, role, isTyping) {
  try {
    const id = requireUid(chatId, 'chatId');
    const update = { updatedAt: serverTimestamp() };
    if (role === 'buyer') {
      update.buyer = Boolean(isTyping);
    } else if (role === 'vendor') {
      update.vendor = Boolean(isTyping);
    }
    await setDoc(typingDoc(id), update, { merge: true });
  } catch (error) {
    console.warn('[chat] setTyping failed', error);
  }
}

export async function markRead(chatId, role, viewerUid) {
  try {
    const id = requireUid(chatId, 'chatId');
    const uid = requireUid(viewerUid, 'viewer_uid');
    const q = query(messagesCollection(id), orderBy('ts', 'desc'), limit(MAX_MESSAGES_TO_MARK));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { [`read_by.${uid}`]: true });
    });
    await batch.commit();
    const chatRef = chatDoc(id);
    const field = role === 'buyer' ? 'unread_for_buyer' : 'unread_for_vendor';
    await updateDoc(chatRef, { [field]: 0 });
    await callChatApi('./api/chat/mark-read.php', {
      method: 'POST',
      data: { chat_id: id, role },
    });
  } catch (error) {
    console.warn('[chat] markRead failed', error);
  }
}

export async function sendMessage(payload) {
  const body = {
    role: payload.role,
    text: normaliseString(payload.text),
    image_url: normaliseString(payload.image_url),
    voice_url: normaliseString(payload.voice_url),
    duration: payload.duration,
    buyer_uid: payload.buyer_uid,
    buyer_name: payload.buyer_name,
    vendor_uid: payload.vendor_uid,
    vendor_business_name: payload.vendor_business_name || payload.vendor_name,
    vendor_name: payload.vendor_name,
    listing_id: payload.listing_id,
    listing_title: payload.listing_title,
    listing_image: payload.listing_image,
  };
  if (payload.client_tag) {
    const tag = normaliseString(payload.client_tag);
    if (tag) {
      body.client_tag = tag;
    }
  }
  return callChatApi('./api/chat/send-message.php', { method: 'POST', data: body });
}

export async function recordVoice(options = {}) {
  if (!isBrowser || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Voice recording is not supported on this device.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream, options);
  const chunks = [];
  const handleData = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };
  return {
    start() {
      chunks.length = 0;
      recorder.addEventListener('dataavailable', handleData);
      recorder.start();
    },
    stop() {
      return new Promise((resolve, reject) => {
        const cleanup = () => {
          recorder.removeEventListener('dataavailable', handleData);
          stream.getTracks().forEach((track) => track.stop());
        };
        const handleStop = () => {
          recorder.removeEventListener('error', handleError);
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          cleanup();
          resolve(blob);
        };
        const handleError = (event) => {
          recorder.removeEventListener('stop', handleStop);
          cleanup();
          reject(event.error || new Error('Recording failed.'));
        };
        recorder.addEventListener('stop', handleStop, { once: true });
        recorder.addEventListener('error', handleError, { once: true });
        try {
          recorder.stop();
        } catch (error) {
          cleanup();
          reject(error);
        }
      });
    },
    cancel() {
      try {
        recorder.stop();
      } catch (error) {
        // ignore
      }
      recorder.removeEventListener('dataavailable', handleData);
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

export async function uploadVoiceToCloudinary(blob, metadata = {}) {
  if (!(blob instanceof Blob)) {
    throw new Error('Invalid voice data.');
  }
  const file = new File([blob], metadata.filename || `voice-${Date.now()}.webm`, {
    type: blob.type || 'audio/webm',
  });
  const response = await uploadToCloudinary(file, {
    folder: 'yustam/chats/voice',
    tags: ['voice', 'chat'],
  });
  return response.url;
}

export async function fetchChatSummary(chatId) {
  const id = requireUid(chatId, 'chatId');
  try {
    const snapshot = await getDoc(chatDoc(id));
    if (snapshot.exists()) {
      const chat = mapChatSnapshot(snapshot);
      fallbackChatCache.set(id, chat);
      return chat;
    }
  } catch (error) {
    console.warn('[chat] fetchChatSummary firestore failed', error);
  }

  if (fallbackChatCache.has(id)) {
    return fallbackChatCache.get(id);
  }

  try {
    const payload = await callChatApi(
      `./api/chat/list-messages.php?chat_id=${encodeURIComponent(id)}`,
      { method: 'GET' }
    );
    if (payload.chat) {
      const chat = mapChatRecord(payload.chat);
      fallbackChatCache.set(id, chat);
      return chat;
    }
  } catch (error) {
    console.warn('[chat] fetchChatSummary fallback failed', error);
  }

  return null;
}

export async function deleteConversation(chatId) {
  const id = requireUid(chatId, 'chatId');
  const payload = await callChatApi('./api/chat/chat-open.php', {
    method: 'DELETE',
    data: { chat_id: id },
  });
  fallbackChatCache.delete(id);
  return payload;
}

function createChatsSubscription(queryRef, role, uid, callback) {
  let active = true;
  let seeded = false;
  let seedingInFlight = false;
  let seedTimer = null;
  let seedRetryTimer = null;
  let pollTimer = null;

  const mergeVendorIdentity = (chat) => {
    if (!chat || !chat.chat_id) {
      return chat;
    }
    const cached = fallbackChatCache.get(chat.chat_id);
    const cachedBusiness = normaliseString(
      (cached && (cached.vendor_business_name || cached.vendor_name)) || ''
    );
    const currentBusiness = normaliseString(chat.vendor_business_name || '');
    const currentName = normaliseString(chat.vendor_name || '');
    if (cachedBusiness) {
      if (!currentBusiness || currentBusiness !== cachedBusiness) {
        chat.vendor_business_name = cachedBusiness;
      }
      if (!currentName || currentName !== cachedBusiness) {
        chat.vendor_name = cachedBusiness;
      }
      chat.vendor_display_name = cachedBusiness;
    } else if (currentBusiness) {
      chat.vendor_name = currentBusiness;
      chat.vendor_display_name = currentBusiness;
    } else if (currentName) {
      chat.vendor_business_name = currentName;
      chat.vendor_display_name = currentName;
    }
    return chat;
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const pollFromApi = async () => {
    try {
      const chats = await fetchChatsViaApi(role, uid);
      if (!active) {
        return;
      }
      const normalized = Array.isArray(chats) ? chats.map(mergeVendorIdentity) : [];
      callback(normalized);
      normalized.forEach((chat) => {
        if (chat && chat.chat_id) {
          fallbackChatCache.set(chat.chat_id, chat);
        }
      });
    } catch (pollError) {
      console.error('[chat] chats poll failed', pollError);
    }
  };

  const startPolling = () => {
    if (pollTimer || !active) {
      return;
    }
    pollFromApi();
    pollTimer = setInterval(pollFromApi, 8000);
  };

  const seedWithApi = async () => {
    if (seeded || seedingInFlight) {
      return;
    }
    seedingInFlight = true;
    try {
      const chats = await fetchChatsViaApi(role, uid);
      if (active && Array.isArray(chats)) {
        const normalized = chats.map(mergeVendorIdentity);
        callback(normalized);
        normalized.forEach((chat) => {
          if (chat && chat.chat_id) {
            fallbackChatCache.set(chat.chat_id, chat);
          }
        });
      }
      seeded = true;
    } catch (seedError) {
      console.warn('[chat] seed chats via api failed', seedError);
      seeded = false;
      if (seedRetryTimer) {
        clearTimeout(seedRetryTimer);
      }
      seedRetryTimer = setTimeout(() => {
        seedRetryTimer = null;
        if (active && !seeded) {
          seedWithApi();
        }
      }, 4000);
    } finally {
      seedingInFlight = false;
      if (!active && seedRetryTimer) {
        clearTimeout(seedRetryTimer);
        seedRetryTimer = null;
      }
    }
  };

  const unsubscribe = onSnapshot(
    queryRef,
    (snapshot) => {
      if (!active) return;
      stopPolling();
      const chats = orderChatsByLastTs(snapshot.docs.map(mapChatSnapshot)).map(mergeVendorIdentity);
      callback(chats);
      chats.forEach((chat) => fallbackChatCache.set(chat.chat_id, chat));
    },
    async (error) => {
      seedingInFlight = false;
      console.error('[chat] subscribeChats', error);
      try {
        const chats = await fetchChatsViaApi(role, uid);
        if (active) {
          const normalized = Array.isArray(chats) ? chats.map(mergeVendorIdentity) : [];
          callback(normalized);
          normalized.forEach((chat) => {
            if (chat && chat.chat_id) {
              fallbackChatCache.set(chat.chat_id, chat);
            }
          });
        }
      } catch (fallbackError) {
        console.error('[chat] chats fallback failed', fallbackError);
        showToast('Unable to load chats.');
      }
      startPolling();
    }
  );

  seedTimer = setTimeout(seedWithApi, 0);

  return () => {
    active = false;
    stopPolling();
    try {
      unsubscribe();
    } catch (unsubscribeError) {
      console.warn('[chat] unsubscribe chats', unsubscribeError);
    }
    if (seedTimer) {
      clearTimeout(seedTimer);
      seedTimer = null;
    }
    if (seedRetryTimer) {
      clearTimeout(seedRetryTimer);
      seedRetryTimer = null;
    }
    seedingInFlight = false;
  };
}

export function subscribeChatsForBuyer(buyerUid, callback) {
  const uid = requireUid(buyerUid, 'buyer_uid');
  const q = query(collection(db, COLLECTIONS.CHATS), where('buyer_uid', '==', uid), limit(CHAT_FETCH_LIMIT));
  return createChatsSubscription(q, 'buyer', uid, callback);
}

export function subscribeChatsForVendor(vendorUid, callback) {
  const uid = requireUid(vendorUid, 'vendor_uid');
  const q = query(collection(db, COLLECTIONS.CHATS), where('vendor_uid', '==', uid), limit(CHAT_FETCH_LIMIT));
  return createChatsSubscription(q, 'vendor', uid, callback);
}
