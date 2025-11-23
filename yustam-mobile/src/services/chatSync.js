import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { chatAPI } from './api';

const CHAT_FETCH_LIMIT = 100;
const MESSAGE_FETCH_LIMIT = 200;

const fallbackChatCache = new Map();
const fallbackMessageCache = new Map();

const normaliseString = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const resolveTimestamp = (value) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? new Date(value).toISOString() : null;
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      try {
        return value.toDate().toISOString();
      } catch (error) {
        return null;
      }
    }
    if (typeof value.seconds === 'number') {
      const millis = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
      return new Date(millis).toISOString();
    }
  }
  return null;
};

const compareByLastTimestamp = (a, b) => {
  const aTime = resolveTimestamp(a?.last_ts) ? new Date(resolveTimestamp(a.last_ts)).getTime() : 0;
  const bTime = resolveTimestamp(b?.last_ts) ? new Date(resolveTimestamp(b.last_ts)).getTime() : 0;
  return bTime - aTime;
};

const mergeRecords = (base, update) => {
  const merged = { ...(base || {}) };
  Object.entries(update || {}).forEach(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null) {
      return;
    }
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed === '') {
        return;
      }
      merged[key] = trimmed;
      return;
    }
    merged[key] = rawValue;
  });
  return merged;
};

const normaliseChatRecord = (record = {}) => {
  const mapped = {
    id: normaliseString(record.chatId || record.id),
    chatId: normaliseString(record.chatId || record.id),
    buyerUid: normaliseString(record.buyerUid),
    buyerName: normaliseString(record.buyerName || 'Buyer'),
    buyerAvatar: normaliseString(record.buyerAvatar || ''),
    vendorUid: normaliseString(record.vendorUid),
    vendorName: normaliseString(record.vendorBusinessName || record.vendorName || ''),
    vendorBusinessName: normaliseString(record.vendorBusinessName || record.vendorName || ''),
    vendorAvatar: normaliseString(record.vendorAvatar || ''),
    listingId: normaliseString(record.listingId || ''),
    listingTitle: normaliseString(record.listingTitle || ''),
    listingImage: normaliseString(record.listingImage || ''),
    lastMessage: normaliseString(record.lastMessage || ''),
    lastType: normaliseString((record.lastType || '').toLowerCase()),
    lastSenderUid: normaliseString(record.lastSenderUid || ''),
    lastSenderRole: normaliseString((record.lastSenderRole || '').toLowerCase()),
    lastTs: resolveTimestamp(record.lastTs || null),
    unreadForBuyer: parseNumber(record.unreadForBuyer),
    unreadForVendor: parseNumber(record.unreadForVendor),
  };

  if (!mapped.vendorName && mapped.vendorBusinessName) {
    mapped.vendorName = mapped.vendorBusinessName;
  }
  if (!mapped.vendorBusinessName && mapped.vendorName) {
    mapped.vendorBusinessName = mapped.vendorName;
  }

  return mapped;
};

const mapChatSnapshot = (docSnap) => {
  const data = docSnap.data() || {};
  const camelData = {
    id: docSnap.id,
    chatId: data.chat_id || docSnap.id,
    buyerUid: data.buyer_uid,
    buyerName: data.buyer_name,
    buyerAvatar: data.buyer_avatar,
    vendorUid: data.vendor_uid,
    vendorName: data.vendor_name,
    vendorBusinessName: data.vendor_business_name,
    vendorAvatar: data.vendor_avatar,
    listingId: data.listing_id,
    listingTitle: data.listing_title,
    listingImage: data.listing_image,
    lastMessage: data.last_text,
    lastType: data.last_type,
    lastSenderUid: data.last_sender_uid,
    lastSenderRole: data.last_sender_role,
    lastTs: data.last_ts,
    unreadForBuyer: data.unread_for_buyer,
    unreadForVendor: data.unread_for_vendor,
  };
  return normaliseChatRecord(camelData);
};

const hydrateChat = (chat) => {
  if (!chat || !chat.chat_id) {
    return chat;
  }
  const cached = fallbackChatCache.get(chat.chat_id);
  const merged = mergeRecords(cached, chat);
  merged.last_ts = resolveTimestamp(merged.last_ts) || null;
  fallbackChatCache.set(chat.chat_id, merged);
  return merged;
};

const orderChats = (chats) => chats.slice().sort(compareByLastTimestamp);

const filterChatsByRole = (chats, role, uid) => {
  const targetUid = normaliseString(uid);
  if (!targetUid) {
    return chats;
  }
  if (role === 'vendor') {
    return chats.filter((chat) => normaliseString(chat.vendor_uid) === targetUid);
  }
  if (role === 'buyer') {
    return chats.filter((chat) => normaliseString(chat.buyer_uid) === targetUid);
  }
  return chats;
};

const fetchChatsViaApi = async () => {
  const threads = await chatAPI.listThreads();
  if (!Array.isArray(threads)) {
    return [];
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      const sample = threads.slice(0, 5).map(t => ({ id: t.id || t.chat_id, buyer_uid: t.userId || t.buyerUid || t.buyer_uid, vendor_uid: t.vendorUid || t.vendor_uid }));
      console.debug('[chatSync:fetchChatsViaApi] threads', { count: threads.length, sample });
    } catch (e) {
      console.debug('[chatSync:fetchChatsViaApi] threads', { count: Array.isArray(threads) ? threads.length : 0 });
    }
  }
  return threads.map(normaliseChatRecord);
};

const createChatsSubscription = (queryRef, role, uid, callback, options = {}) => {
  let active = true;
  let lastSource = null;
  let didApiFallback = false;

  const deliver = (records, source) => {
    if (!active || typeof callback !== 'function') {
      return;
    }
    const hydrated = records.map(hydrateChat);
    callback(orderChats(filterChatsByRole(hydrated, role, uid)), { source, count: hydrated.length });
  };

  const unsubscribe = onSnapshot(
    queryRef,
    (snapshot) => {
      if (!active) {
        return;
      }
      const docs = snapshot.docs.map(mapChatSnapshot);
      const source = snapshot.metadata?.fromCache ? 'cache' : 'server';
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        try {
          const ids = snapshot.docs.map(d => d.id);
          console.debug('[chatSync:createChatsSubscription] snapshot', { role, uid, source, count: snapshot.size, ids });
        } catch (e) {
          console.debug('[chatSync:createChatsSubscription] snapshot', { role, uid, source, count: snapshot.size });
        }
      }
      deliver(docs, source);
      // Only notify status when the source changes to avoid noisy repeated logs
      if (source !== lastSource) {
        lastSource = source;
        options.onStatus?.(`firestore:${source}`);
      }
      // If Firestore returned no docs and we haven't attempted an API fallback yet,
      // try fetching from the backend API so the UI can show threads while
      // Firestore syncs from the server. This applies to both cache and server
      // snapshots because some threads may only exist on the backend or use
      // different doc schemas.
      if (!didApiFallback && snapshot.size === 0) {
        didApiFallback = true;
        fetchChatsViaApi()
          .then((records) => {
            if (!active) return;
            if (Array.isArray(records) && records.length > 0) {
              deliver(records, 'api');
              options.onStatus?.('api');
            }
          })
          .catch((err) => {
            options.onError?.(err);
          });
      }
    },
    (error) => {
      console.error('Firestore chat subscription error:', error);
      options.onError?.(error);
      // Deliver empty array on error instead of falling back to API
      if (typeof callback === 'function') {
        callback([], { source: 'error', count: 0 });
      }
    }
  );

  return () => {
    active = false;
    try {
      unsubscribe();
    } catch (error) {
      options.onError?.(error);
    }
  };
};

export const subscribeChatsForVendor = (vendorUid, callback, options = {}) => {
  const uid = normaliseString(vendorUid);
  if (!uid) {
    if (typeof callback === 'function') {
      callback([], { source: 'empty', count: 0 });
    }
    return () => {};
  }
  const q = query(
    collection(db, 'chats'),
    where('vendor_uid', '==', uid),
    orderBy('last_ts', 'desc'),
    limit(CHAT_FETCH_LIMIT)
  );
  return createChatsSubscription(q, 'vendor', uid, callback, options);
};

export const subscribeChatsForBuyer = (buyerUid, callback, options = {}) => {
  const uid = normaliseString(buyerUid);
  if (!uid) {
    if (typeof callback === 'function') {
      callback([], { source: 'empty', count: 0 });
    }
    return () => {};
  }
  const q = query(
    collection(db, 'chats'),
    where('buyer_uid', '==', uid),
    orderBy('last_ts', 'desc'),
    limit(CHAT_FETCH_LIMIT)
  );
  return createChatsSubscription(q, 'buyer', uid, callback, options);
};

export const fetchChatsFromApi = async () => {
  const records = await fetchChatsViaApi();
  return orderChats(records.map(hydrateChat));
};

const normaliseMessageRecord = (record = {}) => {
  const typeValue = normaliseString(record.type || '').toLowerCase();
  return {
    id: normaliseString(record.id || ''),
    chatId: normaliseString(record.chatId || ''),
    senderUid: normaliseString(record.senderUid || ''),
    senderRole: normaliseString((record.senderRole || '').toLowerCase()),
    clientTag: normaliseString(record.clientTag || ''),
    text: normaliseString(record.text || ''),
    imageUrl: normaliseString(record.imageUrl || ''),
    voiceUrl: normaliseString(record.voiceUrl || ''),
    duration: record.duration ?? null,
    type: typeValue || (record.imageUrl ? 'image' : record.voiceUrl ? 'voice' : 'text'),
    timestamp: resolveTimestamp(record.timestamp || null) || new Date().toISOString(),
    readBy: record.readBy || {},
  };
};

const mapMessageSnapshot = (docSnap) => {
  const data = docSnap.data() || {};
  return normaliseMessageRecord({
    ...data,
    id: docSnap.id,
    timestamp: resolveTimestamp(data.ts || data.timestamp || data.sent_at || data.sentAt),
  });
};

const hydrateMessages = (chatId, messages) => {
  fallbackMessageCache.set(chatId, messages);
  return messages;
};

const fetchMessagesViaApiInternal = async (chatId) => {
  const response = await chatAPI.listMessages(chatId);
  const payload = response?.data?.messages ?? response?.data ?? [];
  const records = Array.isArray(payload) ? payload : [];
  return hydrateMessages(chatId, records.map(normaliseMessageRecord));
};

export const fetchMessagesViaApi = async (chatId) =>
  fetchMessagesViaApiInternal(normaliseString(chatId));

export const subscribeMessages = (chatId, callback, options = {}) => {
  const id = normaliseString(chatId);
  if (id === '') {
    if (typeof callback === 'function') {
      callback([], { source: 'empty', count: 0 });
    }
    return () => {};
  }

  let active = true;
  let lastSource = null;

  const deliver = (records, source) => {
    if (!active || typeof callback !== 'function') {
      return;
    }
    const mapped = records.map(normaliseMessageRecord);
    callback(mapped, { source, count: mapped.length });
  };

  const q = query(
    collection(db, 'chats', id, 'messages'),
    orderBy('ts', 'asc'),
    limit(MESSAGE_FETCH_LIMIT)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (!active) {
        return;
      }
      const docs = snapshot.docs.map(mapMessageSnapshot);
      hydrateMessages(id, docs);
      const source = snapshot.metadata?.fromCache ? 'cache' : 'server';
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        try {
          const ids = snapshot.docs.map(d => d.id);
          console.debug('[chatSync:subscribeMessages] snapshot', { chatId: id, source, count: snapshot.size, ids });
        } catch (e) {
          console.debug('[chatSync:subscribeMessages] snapshot', { chatId: id, source, count: snapshot.size });
        }
      }
      deliver(docs, source);
      // Only notify status when the source changes to reduce repeated logs
      if (source !== lastSource) {
        lastSource = source;
        options.onStatus?.(`firestore:${source}`);
      }
    },
    (error) => {
      console.error('Firestore message subscription error:', error);
      options.onError?.(error);
      // Deliver empty array on error instead of falling back to API
      if (typeof callback === 'function') {
        callback([], { source: 'error', count: 0 });
      }
    }
  );

  return () => {
    active = false;
    try {
      unsubscribe();
    } catch (error) {
      options.onError?.(error);
    }
  };
};
