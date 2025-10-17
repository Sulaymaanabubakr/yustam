import { db } from './firebase.js';
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const COLLECTION_SUMMARIES = 'chat_summaries';
const COLLECTION_MESSAGES = 'messages';
const COLLECTION_TYPING = 'typing';

const toastQueue = [];
let activeToast = null;

function showToast(message) {
  if (!message) return;
  toastQueue.push(String(message));
  if (activeToast) return;
  const container = document.getElementById('toast-root') || createToastContainer();
  const next = () => {
    if (!toastQueue.length) {
      activeToast = null;
      return;
    }
    activeToast = toastQueue.shift();
    const toast = document.createElement('div');
    toast.className = 'chat-toast';
    toast.textContent = activeToast;
    container.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add('is-visible');
    }, 10);
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => {
        toast.remove();
        activeToast = null;
        next();
      }, 260);
    }, 4200);
  };
  next();
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-root';
  container.className = 'chat-toast-root';
  document.body.appendChild(container);
  return container;
}

function normaliseUid(value) {
  return String(value || '').trim();
}

function safeToDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampText(text, length = 160) {
  const value = String(text || '').trim();
  if (!value) return '';
  if (value.length <= length) return value;
  return `${value.slice(0, length)}â€¦`;
}

export function buildChatId(vendorUid, buyerUid, listingId) {
  const vendor = normaliseUid(vendorUid);
  const buyer = normaliseUid(buyerUid);
  const listing = normaliseUid(listingId);
  if (!vendor || !buyer || !listing) {
    console.warn('[chat] buildChatId missing identifiers');
    return '';
  }
  return `${vendor}__${buyer}__${listing}`;
}

export function getUserContext() {
  const context = window.__CHAT_CONTEXT__ || {};
  if (!context.role || (context.role === 'buyer' && !context.buyer_uid) || (context.role === 'vendor' && !context.vendor_uid)) {
    return { role: 'guest' };
  }
  return context;
}

function getListingContext(chatId) {
  const threadContext = window.__CHAT_THREADS__?.[chatId] || window.__CHAT_THREAD__ || {};
  return threadContext;
}

function typingDoc(chatId) {
  return doc(collection(db, COLLECTION_TYPING), chatId);
}

function summaryDoc(chatId) {
  return doc(collection(db, COLLECTION_SUMMARIES), chatId);
}

function messagesCollection(chatId) {
  return collection(db, COLLECTION_MESSAGES, chatId, 'items');
}

function handleFirestoreError(prefix, error) {
  console.error(`[chat] ${prefix}`, error);
  showToast('Something went wrong. Please try again.');
}

function reshapeSummaryDoc(docSnap) {
  const data = docSnap.data();
  const lastTs = safeToDate(data?.last_ts) || null;
  return {
    id: docSnap.id,
    chatId: docSnap.id,
    buyer_uid: data?.buyer_uid || '',
    vendor_uid: data?.vendor_uid || '',
    listing_id: data?.listing_id || '',
    buyer_name: data?.buyer_name || 'Buyer',
    vendor_name: data?.vendor_name || 'Vendor',
    listing_title: data?.listing_title || 'Listing',
    listing_image: data?.listing_image || '',
    last_text: data?.last_text || '',
    last_ts: lastTs,
    last_sender_uid: data?.last_sender_uid || '',
    last_sender_role: data?.last_sender_role || '',
    unread_for_buyer: Number(data?.unread_for_buyer || 0),
    unread_for_vendor: Number(data?.unread_for_vendor || 0),
  };
}

function isMissingIndexError(error) {
  if (!error) return false;
  const code = error.code || error?.cause?.code;
  if (code !== 'failed-precondition') return false;
  const message = String(error.message || '').toLowerCase();
  return message.includes('index');
}

function mapRestSummary(raw, viewerRole) {
  if (!raw) return null;
  const role = viewerRole === 'vendor' ? 'vendor' : 'buyer';
  const buyerUid = raw.buyerUid || '';
  const vendorUid = raw.vendorUid || '';
  const listingTitle = raw.productTitle || 'Listing';
  const listingImage = raw.productImage || '';
  const lastTimestamp = raw.lastMessageAt || raw.updatedAt || raw.createdAt || null;
  const lastTs = safeToDate(lastTimestamp);
  const lastSenderUid = raw.lastSenderUid || '';
  let lastSenderRole = '';
  if (lastSenderUid) {
    if (lastSenderUid === buyerUid) {
      lastSenderRole = 'buyer';
    } else if (lastSenderUid === vendorUid) {
      lastSenderRole = 'vendor';
    } else {
      lastSenderRole = role;
    }
  }

  const summary = {
    id: raw.chatId,
    chatId: raw.chatId,
    buyer_uid: buyerUid,
    vendor_uid: vendorUid,
    listing_id: raw.productId || '',
    buyer_name: raw.buyerName || (role === 'vendor' ? raw.counterpartyName || 'Buyer' : 'Buyer'),
    vendor_name: raw.vendorName || (role === 'buyer' ? raw.counterpartyName || 'Vendor' : 'Vendor'),
    listing_title: listingTitle,
    listing_image: listingImage,
    last_text: clampText(raw.lastMessagePreview || ''),
    last_ts: lastTs,
    last_sender_uid: lastSenderUid,
    last_sender_role: lastSenderRole,
    unread_for_buyer: role === 'buyer' ? Number(raw.unreadCount || 0) : 0,
    unread_for_vendor: role === 'vendor' ? Number(raw.unreadCount || 0) : 0,
  };

  return summary;
}

function createRestSummariesController({ pageSize, onUpdate, onError }) {
  let stopped = false;
  let pollTimer = null;
  let currentRole = 'buyer';

  const fetchLatest = async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      const response = await fetch(`./fetch-chats.php?${params.toString()}`, {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.message || 'Unable to load chats.');
      }
      currentRole = payload.role === 'vendor' ? 'vendor' : 'buyer';
      const items = Array.isArray(payload.conversations)
        ? payload.conversations
            .map((entry) => mapRestSummary(entry, currentRole))
            .filter(Boolean)
        : [];
      if (stopped) {
        return items;
      }
      onUpdate?.(items, {
        append: false,
        hasMore: false,
        fromRealtime: false,
        source: 'rest',
      });
      return items;
    } catch (error) {
      if (stopped) {
        return [];
      }
      console.error('[chat] rest summaries failed', error);
      showToast('Loading conversations from backup. Some updates may be delayed.');
      onError?.(error);
      return [];
    }
  };

  const start = async () => {
    await fetchLatest();
    if (stopped) return;
    pollTimer = window.setInterval(() => {
      fetchLatest();
    }, 15000);
  };

  const stop = () => {
    stopped = true;
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  return {
    start,
    stop,
    async loadMore() {
      return [];
    },
  };
}

export function listSummariesForUser(options = {}) {
  const { pageSize = 20, onUpdate, onError } = options;
  const context = getUserContext();
  const role = context.role;
  const userUid = role === 'buyer' ? context.buyer_uid : context.vendor_uid;
  if (!role || !userUid) {
    const error = new Error('Missing chat user context.');
    console.warn('[chat] listSummariesForUser', error);
    onError?.(error);
    return { unsubscribe: () => {}, loadMore: async () => [] };
  }

  const field = role === 'buyer' ? 'buyer_uid' : 'vendor_uid';
  const summariesRef = collection(db, COLLECTION_SUMMARIES);
  const constraints = [where(field, '==', userUid), orderBy('last_ts', 'desc'), limit(pageSize)];
  const q = query(summariesRef, ...constraints);

  let lastVisible = null;
  let hasMore = true;
  let mode = 'firestore';
  let firestoreUnsubscribe = () => {};
  let restController = null;

  const activateRestFallback = (reason) => {
    if (mode === 'rest') return;
    console.warn('[chat] Switching to REST chat summaries fallback.', reason);
    mode = 'rest';
    firestoreUnsubscribe?.();
    showToast('Realtime chat index unavailable. Showing the latest conversations in compatibility mode.');
    restController = createRestSummariesController({ pageSize, onUpdate, onError });
    restController.start();
  };

  try {
    firestoreUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (mode !== 'firestore') {
          return;
        }
        if (!snapshot.empty) {
          lastVisible = snapshot.docs[snapshot.docs.length - 1];
        }
        const items = snapshot.docs.map(reshapeSummaryDoc);
        hasMore = snapshot.size >= pageSize;
        onUpdate?.(items, { append: false, hasMore, fromRealtime: true });
      },
      (error) => {
        if (isMissingIndexError(error)) {
          activateRestFallback(error);
          return;
        }
        handleFirestoreError('listSummariesForUser subscribe failed', error);
        onError?.(error);
      },
    );
  } catch (error) {
    if (isMissingIndexError(error)) {
      activateRestFallback(error);
    } else {
      handleFirestoreError('listSummariesForUser subscribe failed', error);
      onError?.(error);
    }
  }

  async function loadMore() {
    if (mode === 'rest') {
      return restController?.loadMore?.() ?? [];
    }
    if (!hasMore || !lastVisible) return [];
    try {
      const nextQuery = query(
        summariesRef,
        where(field, '==', userUid),
        orderBy('last_ts', 'desc'),
        startAfter(lastVisible),
        limit(pageSize),
      );
      const nextSnapshot = await getDocs(nextQuery);
      if (nextSnapshot.empty) {
        hasMore = false;
        return [];
      }
      lastVisible = nextSnapshot.docs[nextSnapshot.docs.length - 1];
      const items = nextSnapshot.docs.map(reshapeSummaryDoc);
      hasMore = nextSnapshot.size >= pageSize;
      onUpdate?.(items, { append: true, hasMore, fromRealtime: false });
      return items;
    } catch (error) {
      if (isMissingIndexError(error)) {
        activateRestFallback(error);
        return restController?.loadMore?.() ?? [];
      }
      handleFirestoreError('listSummariesForUser loadMore failed', error);
      onError?.(error);
      return [];
    }
  }

  return {
    unsubscribe() {
      if (mode === 'rest') {
        restController?.stop?.();
      } else {
        firestoreUnsubscribe?.();
      }
    },
    loadMore,
  };
}

export async function markThreadRead(chatId) {
  const context = getUserContext();
  const role = context.role;
  const userUid = role === 'buyer' ? context.buyer_uid : context.vendor_uid;
  if (!chatId || !role || !userUid) return;

  try {
    await runTransaction(db, async (transaction) => {
      const summaryRef = summaryDoc(chatId);
      const summarySnap = await transaction.get(summaryRef);
      if (!summarySnap.exists()) return;
      const unreadField = role === 'buyer' ? 'unread_for_buyer' : 'unread_for_vendor';
      transaction.update(summaryRef, {
        [unreadField]: 0,
      });
    });
    const messagesRef = messagesCollection(chatId);
    const unreadQuery = query(
      messagesRef,
      where('receiver_uid', '==', userUid),
      where('read', '==', false),
    );
    const unreadSnapshot = await getDocs(unreadQuery);
    if (!unreadSnapshot.empty) {
      const batch = writeBatch(db);
      unreadSnapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          read: true,
          read_at: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError('markThreadRead failed', error);
  }
}

export async function setTyping(chatId, role, isTyping) {
  if (!chatId || !role) return;
  try {
    await setDoc(
      typingDoc(chatId),
      {
        [role]: Boolean(isTyping),
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    handleFirestoreError('setTyping failed', error);
  }
}

export async function sendMessage(chatId, payload = {}) {
  const context = getUserContext();
  const role = context.role;
  const senderUid = role === 'buyer' ? context.buyer_uid : context.vendor_uid;
  if (!chatId || !role || !senderUid) {
    throw new Error('Cannot send message without a valid chat and user.');
  }

  const {
    text = '',
    imageUrl = '',
    width = null,
    height = null,
    audioUrl = '',
    audioDurationMs = null,
  } = payload;
  const trimmedText = text.trim();
  if (!trimmedText && !imageUrl && !audioUrl) {
    throw new Error('Message content required.');
  }

  const threadContext = getListingContext(chatId);
  const buyerUid = threadContext.buyer_uid || context.buyer_uid || '';
  const vendorUid = threadContext.vendor_uid || context.vendor_uid || '';
  const listingId = threadContext.listing_id || threadContext.listingId || '';
  const buyerName = threadContext.buyer_name || threadContext.buyerName || 'Buyer';
  const vendorName = threadContext.vendor_name || threadContext.vendorName || 'Vendor';
  const listingTitle = threadContext.listing_title || threadContext.listingTitle || 'Listing';
  const listingImage = threadContext.listing_image || threadContext.listingImage || '';

  const receiverRole = role === 'buyer' ? 'vendor' : 'buyer';
  const receiverUid = receiverRole === 'buyer' ? buyerUid : vendorUid;
  if (!buyerUid || !vendorUid || !listingId) {
    throw new Error('Conversation metadata missing.');
  }

  const summaryRef = summaryDoc(chatId);
  const messagesRef = messagesCollection(chatId);

  try {
    await runTransaction(db, async (transaction) => {
      const now = serverTimestamp();
      const preview = trimmedText || (audioUrl ? '[Voice message]' : imageUrl ? '[Photo]' : '');
      const summarySnapshot = await transaction.get(summaryRef);
      const summaryData = summarySnapshot.exists() ? summarySnapshot.data() : {};
      const unreadField = receiverRole === 'buyer' ? 'unread_for_buyer' : 'unread_for_vendor';
      const senderUnreadField = role === 'buyer' ? 'unread_for_buyer' : 'unread_for_vendor';

      const nextSummary = {
        chatId,
        buyer_uid: buyerUid,
        vendor_uid: vendorUid,
        listing_id: listingId,
        buyer_name: buyerName,
        vendor_name: vendorName,
        listing_title: listingTitle,
        listing_image: listingImage,
        last_text: clampText(preview),
        last_ts: now,
        last_sender_uid: senderUid,
        last_sender_role: role,
        unread_for_buyer: role === 'buyer' ? 0 : Number(summaryData.unread_for_buyer || 0) + 1,
        unread_for_vendor: role === 'vendor' ? 0 : Number(summaryData.unread_for_vendor || 0) + 1,
      };

      if (role === 'buyer') {
        nextSummary.unread_for_vendor = Number(summaryData.unread_for_vendor || 0) + 1;
        nextSummary.unread_for_buyer = 0;
      } else {
        nextSummary.unread_for_buyer = Number(summaryData.unread_for_buyer || 0) + 1;
        nextSummary.unread_for_vendor = 0;
      }

      transaction.set(summaryRef, nextSummary, { merge: true });

      const messageRef = doc(messagesRef);
      transaction.set(messageRef, {
        text: trimmedText,
        image_url: imageUrl || '',
        image_width: width || null,
        image_height: height || null,
        audio_url: audioUrl || '',
        audio_duration_ms: audioDurationMs || null,
        sender_role: role,
        sender_uid: senderUid,
        receiver_role: receiverRole,
        receiver_uid: receiverUid,
        ts: now,
        read: false,
      });
    });
  } catch (error) {
    handleFirestoreError('sendMessage failed', error);
    throw error;
  }
}

function buildThreadMetadataFromOptions(options = {}) {
  return {
    chatId: options.chatId,
    buyer_uid: options.buyerUid || options.buyer_uid || '',
    buyer_name: options.buyerName || options.buyer_name || 'Buyer',
    vendor_uid: options.vendorUid || options.vendor_uid || '',
    vendor_name: options.vendorName || options.vendor_name || 'Vendor',
    listing_id: options.productId || options.listing_id || '',
    listing_title: options.productTitle || options.listing_title || 'Listing',
    listing_image: options.productImage || options.listing_image || '',
  };
}

function buildContextOverride(options = {}) {
  if (options.senderType === 'vendor' || options.sender_role === 'vendor') {
    return {
      role: 'vendor',
      vendor_uid: options.senderUid || options.sender_uid || options.vendorUid || '',
      vendor_name: options.vendorName || 'Vendor',
    };
  }
  return {
    role: 'buyer',
    buyer_uid: options.senderUid || options.sender_uid || options.buyerUid || '',
    buyer_name: options.buyerName || 'Buyer',
  };
}

export async function sendChatMessage(options = {}) {
  const metadata = buildThreadMetadataFromOptions(options);
  if (!metadata.chatId) throw new Error('Missing chat identifier.');
  const contextOverride = buildContextOverride(options);
  const previousContext = window.__CHAT_CONTEXT__;
  const hadThread = Boolean(window.__CHAT_THREADS__?.[metadata.chatId]);
  setThreadContext(metadata.chatId, metadata);
  window.__CHAT_CONTEXT__ = contextOverride;
  try {
    await ensureSummary(metadata.chatId, metadata);
    const payload = {};
    if (options.imageUrl) {
      payload.imageUrl = options.imageUrl;
    }
    if (options.audioUrl) {
      payload.audioUrl = options.audioUrl;
      if (options.audioDurationMs !== undefined) {
        payload.audioDurationMs = options.audioDurationMs;
      }
    }
    if (options.message) {
      payload.text = options.message;
    }
    if (!payload.text && !payload.imageUrl && !payload.audioUrl) {
      throw new Error('Message content required.');
    }
    await sendMessage(metadata.chatId, payload);
  } finally {
    if (!hadThread) {
      clearThreadContext(metadata.chatId);
    }
    if (previousContext === undefined) {
      delete window.__CHAT_CONTEXT__;
    } else {
      window.__CHAT_CONTEXT__ = previousContext;
    }
  }
}

export async function ensureInitialMessage(options = {}) {
  const metadata = buildThreadMetadataFromOptions(options);
  if (!metadata.chatId) return false;
  await ensureSummary(metadata.chatId, metadata);
  const snapshot = await getDocs(query(messagesCollection(metadata.chatId), limit(1)));
  if (!snapshot.empty) {
    return false;
  }
  await sendChatMessage(options);
  return true;
}

export function subscribeToMessages(chatId, callback, onError) {
  if (!chatId) return () => {};
  const messagesRef = messagesCollection(chatId);
  const q = query(messagesRef, orderBy('ts', 'asc'), limit(400));
  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          text: data?.text || '',
          image_url: data?.image_url || '',
          image_width: data?.image_width || null,
          image_height: data?.image_height || null,
          audio_url: data?.audio_url || '',
          audio_duration_ms: data?.audio_duration_ms ?? null,
          sender_role: data?.sender_role || 'buyer',
          sender_uid: data?.sender_uid || '',
          receiver_role: data?.receiver_role || 'vendor',
          receiver_uid: data?.receiver_uid || '',
          ts: safeToDate(data?.ts),
          read: Boolean(data?.read),
          read_at: safeToDate(data?.read_at || null),
        };
      });
      callback(messages);
    },
    (error) => {
      handleFirestoreError('subscribeToMessages failed', error);
      onError?.(error);
    },
  );
}

export function subscribeToSummary(chatId, callback, onError) {
  if (!chatId) return () => {};
  return onSnapshot(
    summaryDoc(chatId),
    (docSnap) => {
      if (!docSnap.exists()) {
        callback(null);
        return;
      }
      callback(reshapeSummaryDoc(docSnap));
    },
    (error) => {
      handleFirestoreError('subscribeToSummary failed', error);
      onError?.(error);
    },
  );
}

export function subscribeToTyping(chatId, callback, onError) {
  if (!chatId) return () => {};
  return onSnapshot(
    typingDoc(chatId),
    (docSnap) => {
      callback(docSnap.exists() ? docSnap.data() : { buyer: false, vendor: false });
    },
    (error) => {
      handleFirestoreError('subscribeToTyping failed', error);
      onError?.(error);
    },
  );
}

export async function ensureSummary(chatId, metadata = {}) {
  if (!chatId) return;
  try {
    await setDoc(
      summaryDoc(chatId),
      {
        chatId,
        buyer_uid: metadata.buyer_uid || '',
        vendor_uid: metadata.vendor_uid || '',
        listing_id: metadata.listing_id || '',
        buyer_name: metadata.buyer_name || 'Buyer',
        vendor_name: metadata.vendor_name || 'Vendor',
        listing_title: metadata.listing_title || 'Listing',
        listing_image: metadata.listing_image || '',
        last_ts: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    handleFirestoreError('ensureSummary failed', error);
  }
}

export function setThreadContext(chatId, context = {}) {
  if (!window.__CHAT_THREADS__) {
    window.__CHAT_THREADS__ = {};
  }
  window.__CHAT_THREADS__[chatId] = context;
}

export function clearThreadContext(chatId) {
  if (window.__CHAT_THREADS__) {
    delete window.__CHAT_THREADS__[chatId];
  }
}

export { showToast };
