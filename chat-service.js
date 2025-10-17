import { app, db } from './firebase.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
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

const CHATS_COLLECTION = 'chats';
const TYPING_COLLECTION = 'typing';
const MESSAGE_SUBCOLLECTION = 'messages';
const MAX_MESSAGES_TO_MARK = 200;
const OFFLINE_STORAGE_KEY = 'yustam-offline-messages';
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

let firebaseInitialised = false;
let toastQueue = [];
let toastActive = false;
const offlineQueue = [];

function ensureToastRoot() {
  if (!isBrowser) return null;
  let root = document.querySelector('.yustam-toast-root');
  if (!root) {
    root = document.createElement('div');
    root.className = 'yustam-toast-root';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
  }
  return root;
}

function dequeueToast() {
  if (!toastQueue.length) {
    toastActive = false;
    return;
  }
  toastActive = true;
  const message = toastQueue.shift();
  const root = ensureToastRoot();
  if (!root) {
    toastActive = false;
    console.warn('[chat] Toast skipped:', message);
    return;
  }
  const toast = document.createElement('div');
  toast.className = 'yustam-toast';
  toast.textContent = message;
  root.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => {
      toast.remove();
      dequeueToast();
    }, 220);
  }, 4600);
}

function showToast(message) {
  if (!message) return;
  if (!isBrowser) {
    console.warn('[chat]', message);
    return;
  }
  toastQueue.push(String(message));
  if (!toastActive) {
    dequeueToast();
  }
}

function normaliseString(value) {
  return String(value || '').trim();
}

function getSafeUid(value) {
  const uid = normaliseString(value);
  if (!uid) {
    throw new Error('Missing participant UID.');
  }
  return uid;
}

function restoreOfflineQueue() {
  if (!isBrowser || typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    parsed.forEach((item) => {
      if (item && item.chatId && item.payload) {
        offlineQueue.push(item);
      }
    });
  } catch (error) {
    console.warn('[chat] Unable to restore offline queue', error);
  }
}

function persistOfflineQueue() {
  if (!isBrowser || typeof localStorage === 'undefined') return;
  try {
    if (!offlineQueue.length) {
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
      return;
    }
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(offlineQueue));
  } catch (error) {
    console.warn('[chat] Unable to persist offline queue', error);
  }
}

function resolveTimestamp(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (typeof value.seconds === 'number') {
    const seconds = value.seconds;
    const nanos = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
    return seconds * 1000 + Math.floor(nanos / 1_000_000);
  }
  const date = new Date(value);
  const ms = date.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function orderChatsByLastTs(chats) {
  return [...chats].sort((a, b) => resolveTimestamp(b.last_ts) - resolveTimestamp(a.last_ts));
}

async function flushOfflineQueue() {
  if (!isBrowser || typeof navigator === 'undefined' || !navigator.onLine || !offlineQueue.length) return;
  const queueCopy = [...offlineQueue];
  offlineQueue.length = 0;
  persistOfflineQueue();
  for (const item of queueCopy) {
    try {
      await sendMessage(item.payload);
    } catch (error) {
      console.error('[chat] Failed to flush offline message', error);
      offlineQueue.push(item);
      persistOfflineQueue();
      break;
    }
  }
}

if (isBrowser) {
  window.addEventListener('online', () => {
    showToast('Back online — sending queued messages.');
    flushOfflineQueue();
  });
}

export function initFirebase() {
  if (!firebaseInitialised) {
    firebaseInitialised = true;
    restoreOfflineQueue();
    flushOfflineQueue();
  }
  return app;
}

export function buildChatId(vendorUid, buyerUid, listingId) {
  const vendor = getSafeUid(vendorUid);
  const buyer = getSafeUid(buyerUid);
  const listing = normaliseString(listingId);
  if (!listing) {
    throw new Error('Missing listing identifier.');
  }
  return `${vendor}__${buyer}__${listing}`;
}

function chatDoc(chatId) {
  return doc(collection(db, CHATS_COLLECTION), chatId);
}

function messagesCollection(chatId) {
  return collection(db, CHATS_COLLECTION, chatId, MESSAGE_SUBCOLLECTION);
}

function typingDoc(chatId) {
  return doc(collection(db, TYPING_COLLECTION), chatId);
}

export async function ensureChat(meta) {
  const chatId = getSafeUid(meta?.chatId || meta?.chat_id);
  const buyerUid = getSafeUid(meta?.buyer_uid || meta?.buyerUid);
  const vendorUid = getSafeUid(meta?.vendor_uid || meta?.vendorUid);
  const listingId = normaliseString(meta?.listing_id || meta?.listingId);
  if (!listingId) {
    throw new Error('Missing listing identifier.');
  }
  const payload = {
    chat_id: chatId,
    buyer_uid: buyerUid,
    buyer_name: normaliseString(meta?.buyer_name || meta?.buyerName),
    buyer_avatar: normaliseString(meta?.buyer_avatar || meta?.buyerAvatar),
    vendor_uid: vendorUid,
    vendor_name: normaliseString(meta?.vendor_name || meta?.vendorName),
    vendor_avatar: normaliseString(meta?.vendor_avatar || meta?.vendorAvatar),
    listing_id: listingId,
    listing_title: normaliseString(meta?.listing_title || meta?.listingTitle),
    listing_image: normaliseString(meta?.listing_image || meta?.listingImage),
    last_ts: serverTimestamp(),
    last_text: normaliseString(meta?.last_text || ''),
    last_type: normaliseString(meta?.last_type || 'system') || 'system',
    unread_for_buyer: Number(meta?.unread_for_buyer || 0),
    unread_for_vendor: Number(meta?.unread_for_vendor || 0),
  };

  const chatRef = chatDoc(chatId);
  const snapshot = await getDoc(chatRef);
  if (!snapshot.exists()) {
    await setDoc(chatRef, payload);
  } else {
    await updateDoc(chatRef, {
      buyer_uid: payload.buyer_uid,
      buyer_name: payload.buyer_name,
      buyer_avatar: payload.buyer_avatar,
      vendor_uid: payload.vendor_uid,
      vendor_name: payload.vendor_name,
      vendor_avatar: payload.vendor_avatar,
      listing_id: payload.listing_id,
      listing_title: payload.listing_title,
      listing_image: payload.listing_image,
    });
  }
  return { chatId, ...payload };
}

export async function fetchChatSummary(chatId) {
  const id = getSafeUid(chatId);
  try {
    const snapshot = await getDoc(chatDoc(id));
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
  } catch (error) {
    console.error('[chat] fetchChatSummary failed', error);
  }
  return null;
}

export function subscribeChatsForBuyer(buyerUid, callback) {
  const uid = getSafeUid(buyerUid);
  const q = query(collection(db, CHATS_COLLECTION), where('buyer_uid', '==', uid), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const chats = orderChatsByLastTs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      callback(chats.slice(0, 100));
    },
    (error) => {
      console.error('[chat] subscribeChatsForBuyer', error);
      showToast('Unable to load chats.');
    }
  );
}

export function subscribeChatsForVendor(vendorUid, callback) {
  const uid = getSafeUid(vendorUid);
  const q = query(collection(db, CHATS_COLLECTION), where('vendor_uid', '==', uid), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const chats = orderChatsByLastTs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      callback(chats.slice(0, 100));
    },
    (error) => {
      console.error('[chat] subscribeChatsForVendor', error);
      showToast('Unable to load chats.');
    }
  );
}

export function subscribeMessages(chatId, callback) {
  const id = getSafeUid(chatId);
  const q = query(messagesCollection(id), orderBy('ts', 'asc'), limit(500));
  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      callback(messages);
    },
    (error) => {
      console.error('[chat] subscribeMessages', error);
      showToast('Unable to load messages.');
    }
  );
}

function normaliseMessagePayload(input) {
  const chatId = getSafeUid(input?.chatId || input?.chat_id);
  const senderRole = normaliseString(input?.as || input?.sender_role);
  const senderUid = getSafeUid(input?.sender_uid || input?.senderUid || input?.viewerUid);
  const text = normaliseString(input?.text || input?.message);
  const imageUrl = normaliseString(input?.image_url || input?.imageUrl);
  const voiceUrl = normaliseString(input?.voice_url || input?.voiceUrl);
  const duration = Number(input?.duration || input?.voice_duration || 0);
  const buyerUid = normaliseString(input?.buyer_uid || input?.buyerUid || '');
  const vendorUid = normaliseString(input?.vendor_uid || input?.vendorUid || '');

  if (!text && !imageUrl && !voiceUrl) {
    throw new Error('Please write a message or attach media.');
  }

  let type = 'text';
  if (imageUrl) type = 'image';
  if (voiceUrl) type = 'voice';

  return {
    chatId,
    senderRole: senderRole === 'vendor' ? 'vendor' : 'buyer',
    senderUid,
    text,
    imageUrl,
    voiceUrl,
    duration,
    buyerUid,
    vendorUid,
    type,
  };
}

async function writeMessage(payload) {
  const { chatId, senderRole, senderUid, text, imageUrl, voiceUrl, duration, buyerUid, vendorUid, type } = payload;
  const messageData = {
    ts: serverTimestamp(),
    sender_uid: senderUid,
    sender_role: senderRole,
    text: text || null,
    image_url: imageUrl || null,
    voice_url: voiceUrl || null,
    duration: duration || null,
    type,
    read_by: { [senderUid]: true },
  };
  const messageRef = await addDoc(messagesCollection(chatId), messageData);

  const chatRef = chatDoc(chatId);
  const chatUpdates = {
    last_ts: serverTimestamp(),
    last_text:
      type === 'text'
        ? text
        : type === 'image'
        ? '🖼️ Photo'
        : type === 'voice'
        ? '🎤 Voice note'
        : type,
    last_type: type,
    last_sender_uid: senderUid,
    last_sender_role: senderRole,
  };

  if (senderRole === 'buyer') {
    chatUpdates.unread_for_vendor = increment(1);
    chatUpdates.unread_for_buyer = 0;
  } else {
    chatUpdates.unread_for_buyer = increment(1);
    chatUpdates.unread_for_vendor = 0;
  }

  if (buyerUid) {
    chatUpdates.buyer_uid = buyerUid;
  }
  if (vendorUid) {
    chatUpdates.vendor_uid = vendorUid;
  }

  await setDoc(chatRef, chatUpdates, { merge: true });

  return { id: messageRef.id, ...messageData };
}

export async function sendMessage(input) {
  try {
    const payload = normaliseMessagePayload(input);
    const isOffline = !isBrowser || typeof navigator === 'undefined' ? false : navigator.onLine === false;
    if (isOffline) {
      offlineQueue.push({ chatId: payload.chatId, payload });
      persistOfflineQueue();
      showToast('Message saved offline — will send when online.');
      return { queued: true };
    }
    const result = await writeMessage(payload);
    return { sent: true, result };
  } catch (error) {
    console.error('[chat] sendMessage error', error);
    showToast(error?.message || 'Unable to send message.');
    throw error;
  }
}

export async function setTyping(chatId, role, isTyping) {
  try {
    const id = getSafeUid(chatId);
    const docRef = typingDoc(id);
    const update = { updatedAt: serverTimestamp() };
    if (role === 'buyer') {
      update.buyer = Boolean(isTyping);
    } else if (role === 'vendor') {
      update.vendor = Boolean(isTyping);
    }
    await setDoc(docRef, update, { merge: true });
  } catch (error) {
    console.error('[chat] setTyping', error);
  }
}

export async function markRead(chatId, role, viewerUid) {
  try {
    const id = getSafeUid(chatId);
    const uid = getSafeUid(viewerUid);
    const messagesRef = messagesCollection(id);
    const q = query(messagesRef, orderBy('ts', 'desc'), limit(MAX_MESSAGES_TO_MARK));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { [`read_by.${uid}`]: true });
    });
    await batch.commit();

    const chatRef = chatDoc(id);
    const unreadField = role === 'buyer' ? 'unread_for_buyer' : 'unread_for_vendor';
    await updateDoc(chatRef, { [unreadField]: 0 });
  } catch (error) {
    console.error('[chat] markRead', error);
  }
}

export function subscribeTyping(chatId, callback) {
  const id = getSafeUid(chatId);
  return onSnapshot(
    typingDoc(id),
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.data() : {});
    },
    (error) => {
      console.error('[chat] subscribeTyping', error);
    }
  );
}

export async function recordVoice(options = {}) {
  if (!isBrowser || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Voice recording is not supported on this device.');
  }
  const constraints = { audio: true };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const recorder = new MediaRecorder(stream, options);
  const chunks = [];
  return {
    stream,
    recorder,
    start: () => {
      chunks.length = 0;
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      });
      recorder.start();
    },
    stop: () =>
      new Promise((resolve, reject) => {
        const cleanup = () => {
          stream.getTracks().forEach((track) => track.stop());
        };
        recorder.addEventListener('error', (event) => {
          cleanup();
          reject(event.error || new Error('Recording failed.'));
        });
        recorder.addEventListener('stop', () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          cleanup();
          resolve(blob);
        });
        recorder.stop();
      }),
    cancel: () => {
      recorder.stop();
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

export { showToast };

