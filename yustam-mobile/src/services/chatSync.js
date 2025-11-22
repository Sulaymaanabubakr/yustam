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
    id: normaliseString(record.id || record.chat_id || record.chatId),
    chat_id: normaliseString(record.chat_id || record.chatId || record.id),
    buyer_uid: normaliseString(
      record.buyer_uid || record.buyerUid || record.buyer_id || record.buyerId || record.userId
    ),
    buyer_name: normaliseString(
      record.buyer_name || record.buyerName || record.user?.displayName || record.user?.email || 'Buyer'
    ),
    buyer_avatar: normaliseString(record.buyer_avatar || record.buyerAvatar || record.user?.photoUrl || ''),
    vendor_uid: normaliseString(record.vendor_uid || record.vendorUid || record.vendor_id || record.vendorId),
    vendor_name: normaliseString(
      record.vendor_business_name || record.vendorBusinessName || record.vendor_name || record.vendorName || ''
    ),
    vendor_business_name: normaliseString(
      record.vendor_business_name || record.vendorBusinessName || record.vendor_name || record.vendorName || ''
    ),
    vendor_avatar: normaliseString(record.vendor_avatar || record.vendorAvatar || ''),
    listing_id: normaliseString(record.listing_id || record.listingId || ''),
    listing_title: normaliseString(record.listing_title || record.listingTitle || ''),
    listing_image: normaliseString(record.listing_image || record.listingImage || ''),
    last_text: normaliseString(
      record.last_text ||
        record.lastText ||
        record.last_message ||
        record.lastMessage ||
        record.lastMessagePreview ||
        ''
    ),
    last_type: normaliseString((record.last_type || record.lastType || '').toLowerCase()),
    last_sender_uid: normaliseString(record.last_sender_uid || record.lastSenderUid || ''),
    last_sender_role: normaliseString((record.last_sender_role || record.lastSenderRole || '').toLowerCase()),
    last_ts:
      resolveTimestamp(
        record.last_ts ||
          record.lastTs ||
          record.last_timestamp ||
          record.updated_at ||
          record.updatedAt ||
          record.created_at ||
          record.createdAt ||
          null
      ) || null,
    unread_for_buyer: parseNumber(record.unread_for_buyer || record.unreadForBuyer || record.buyer_unread_count),
    unread_for_vendor: parseNumber(record.unread_for_vendor || record.unreadForVendor || record.vendor_unread_count),
  };

  if (!mapped.vendor_name && mapped.vendor_business_name) {
    mapped.vendor_name = mapped.vendor_business_name;
  }
  if (!mapped.vendor_business_name && mapped.vendor_name) {
    mapped.vendor_business_name = mapped.vendor_name;
  }

  return mapped;
};

const mapChatSnapshot = (docSnap) => {
  const data = docSnap.data() || {};
  return normaliseChatRecord({
    ...data,
    id: docSnap.id,
    chat_id: data.chat_id || docSnap.id,
  });
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
  return threads.map(normaliseChatRecord);
};

const createChatsSubscription = (queryRef, role, uid, callback, options = {}) => {
  let active = true;
  let seeded = false;

  const deliver = (records, source) => {
    if (!active || typeof callback !== 'function') {
      return;
    }
    const hydrated = records.map(hydrateChat);
    callback(orderChats(filterChatsByRole(hydrated, role, uid)), { source, count: hydrated.length });
  };

  const fetchFallback = async () => {
    try {
      options.onStatus?.('fallback:start');
      const records = await fetchChatsViaApi();
      records.forEach((record) => hydrateChat(record));
      deliver(records, 'api');
      options.onStatus?.('fallback:success');
    } catch (error) {
      options.onStatus?.('fallback:error', error);
      options.onError?.(error);
    }
  };

  const unsubscribe = onSnapshot(
    queryRef,
    (snapshot) => {
      if (!active) {
        return;
      }
      const docs = snapshot.docs.map(mapChatSnapshot);
      if (!docs.length && !seeded) {
        fetchFallback();
        return;
      }
      seeded = true;
      const source = snapshot.metadata?.fromCache ? 'cache' : 'firestore';
      deliver(docs, source);
    },
    (error) => {
      options.onError?.(error);
      fetchFallback();
    }
  );

  fetchFallback();

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
  const typeValue = normaliseString(record.type || record.message_type || '').toLowerCase();
  return {
    id: normaliseString(record.id || record.message_id || record.chat_message_id || ''),
    chat_id: normaliseString(record.chat_id || record.chatId || ''),
    sender_uid: normaliseString(record.sender_uid || record.senderUid || record.sender || ''),
    sender_role: normaliseString((record.sender_role || record.senderRole || record.role || '').toLowerCase()),
    client_tag: normaliseString(record.client_tag || record.clientTag || ''),
    text: normaliseString(record.text || record.message || record.body || ''),
    image_url: normaliseString(record.image_url || record.imageUrl || record.image || ''),
    voice_url: normaliseString(record.voice_url || record.voiceUrl || ''),
    duration: record.duration ?? record.voice_duration ?? null,
    type: typeValue || (record.image_url || record.imageUrl ? 'image' : record.voice_url || record.voiceUrl ? 'voice' : 'text'),
    timestamp:
      resolveTimestamp(record.timestamp || record.ts || record.sent_at || record.sentAt || record.created_at || null) ||
      new Date().toISOString(),
    read_by: record.read_by || record.readBy || {},
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
  let seeded = false;

  const deliver = (records, source) => {
    if (!active || typeof callback !== 'function') {
      return;
    }
    const mapped = records.map(normaliseMessageRecord);
    callback(mapped, { source, count: mapped.length });
  };

  const seedWithApi = async () => {
    try {
      options.onStatus?.('fallback:start');
      const records = await fetchMessagesViaApiInternal(id);
      deliver(records, 'api');
      options.onStatus?.('fallback:success');
    } catch (error) {
      options.onStatus?.('fallback:error', error);
      options.onError?.(error);
    }
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
      if (!docs.length && !seeded) {
        seedWithApi();
        return;
      }
      seeded = true;
      hydrateMessages(id, docs);
      const source = snapshot.metadata?.fromCache ? 'cache' : 'firestore';
      deliver(docs, source);
    },
    (error) => {
      options.onError?.(error);
      seedWithApi();
    }
  );

  seedWithApi();

  return () => {
    active = false;
    try {
      unsubscribe();
    } catch (error) {
      options.onError?.(error);
    }
  };
};
