import { db } from './firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  runTransaction,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

/**
 * Builds the canonical chat ID using buyer uid, vendor uid and product id.
 * @param {string} buyerUid
 * @param {string} vendorUid
 * @param {string} productId
 * @returns {string}
 */
export function buildChatId(buyerUid, vendorUid, productId) {
  const buyer = String(buyerUid || '').trim();
  const vendor = String(vendorUid || '').trim();
  const product = String(productId || '').trim();
  if (!buyer || !vendor || !product) {
    return '';
  }
  return `${buyer}_${vendor}_${product}`;
}

const COLLECTION_SUMMARIES = 'chat_summaries';
const COLLECTION_CHATS = 'chats';

function chatMessagesCollection(chatId) {
  return collection(db, COLLECTION_CHATS, chatId, 'messages');
}

function chatSummaryDoc(chatId) {
  return doc(db, COLLECTION_SUMMARIES, chatId);
}

function normalisePreview(message, imageUrl) {
  const text = String(message || '').trim();
  if (text) return text.slice(0, 160);
  if (imageUrl) return '📷 Photo';
  return '';
}

/**
 * Ensures a chat summary document exists and is hydrated with core metadata.
 */
export async function ensureChatSummary({
  chatId,
  buyerUid,
  vendorUid,
  productId,
  buyerName = 'Buyer',
  vendorName = 'Vendor',
  productTitle = 'Marketplace Listing',
  productImage = '',
}) {
  if (!chatId) return;
  const summaryRef = chatSummaryDoc(chatId);
  await setDoc(
    summaryRef,
    {
      chat_id: chatId,
      buyer_uid: buyerUid,
      vendor_uid: vendorUid,
      product_id: productId,
      buyer_name: buyerName,
      vendor_name: vendorName,
      product_title: productTitle,
      product_image: productImage,
      last_updated: serverTimestamp(),
      unread_for_buyer: 0,
      unread_for_vendor: 0,
    },
    { merge: true },
  );
}

/**
 * Sends a text or media message and updates chat summary atomically.
 */
export async function sendChatMessage({
  chatId,
  buyerUid,
  vendorUid,
  productId,
  senderUid,
  receiverUid,
  senderType,
  receiverType,
  message,
  imageUrl = '',
  buyerName = 'Buyer',
  vendorName = 'Vendor',
  productTitle = 'Marketplace Listing',
  productImage = '',
}) {
  if (!chatId || !senderUid || !receiverUid) {
    throw new Error('Missing chat identifiers.');
  }

  const trimmedMessage = String(message || '').trim();
  if (!trimmedMessage && !imageUrl) {
    throw new Error('Message content required.');
  }

  const messagesRef = chatMessagesCollection(chatId);
  const summaryRef = chatSummaryDoc(chatId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(summaryRef);
    const data = snapshot.exists() ? snapshot.data() : {};

    const now = serverTimestamp();
    const preview = normalisePreview(trimmedMessage, imageUrl);

    transaction.set(
      summaryRef,
      {
        chat_id: chatId,
        buyer_uid: buyerUid,
        vendor_uid: vendorUid,
        product_id: productId,
        buyer_name: buyerName,
        vendor_name: vendorName,
        product_title: productTitle,
        product_image: productImage,
        last_message: preview,
        last_sender: senderUid,
        last_sender_type: senderType,
        last_updated: now,
        unread_for_buyer: senderType === 'buyer' ? 0 : (data.unread_for_buyer || 0) + 1,
        unread_for_vendor: senderType === 'vendor' ? 0 : (data.unread_for_vendor || 0) + 1,
      },
      { merge: true },
    );

    const messageRef = doc(messagesRef);
    transaction.set(messageRef, {
      sender_uid: senderUid,
      receiver_uid: receiverUid,
      sender_type: senderType,
      receiver_type: receiverType,
      message: trimmedMessage,
      image_url: imageUrl || '',
      product_id: productId,
      timestamp: now,
      read: false,
    });
  });
}

export function subscribeToChatMessages(chatId, callback) {
  if (!chatId) return () => {};
  const q = query(chatMessagesCollection(chatId), orderBy('timestamp', 'asc'));
  return onSnapshot(q, callback, (error) => {
    console.error('[chat] message subscription failed', error);
  });
}

export function subscribeToChatSummary(chatId, callback) {
  if (!chatId) return () => {};
  const summaryRef = chatSummaryDoc(chatId);
  return onSnapshot(summaryRef, callback, (error) => {
    console.error('[chat] summary subscription failed', error);
  });
}

export function subscribeToUserChatSummaries(role, userUid, callback) {
  const scopedUid = String(userUid || '').trim();
  if (!role || !scopedUid) return () => {};
  const field = role === 'vendor' ? 'vendor_uid' : 'buyer_uid';
  const q = query(
    collection(db, COLLECTION_SUMMARIES),
    where(field, '==', scopedUid),
    orderBy('last_updated', 'desc'),
  );
  return onSnapshot(q, callback, (error) => {
    console.error('[chat] summary list subscription failed', error);
  });
}

export async function markChatRead(chatId, viewerUid, viewerRole) {
  if (!chatId || !viewerUid || !viewerRole) return;
  const summaryRef = chatSummaryDoc(chatId);
  const roleField = viewerRole === 'vendor' ? 'unread_for_vendor' : 'unread_for_buyer';

  await runTransaction(db, async (transaction) => {
    const summarySnap = await transaction.get(summaryRef);
    if (summarySnap.exists()) {
      transaction.update(summaryRef, {
        [roleField]: 0,
      });
    }
  });

  const unreadQuery = query(
    chatMessagesCollection(chatId),
    where('receiver_uid', '==', viewerUid),
    where('read', '==', false),
  );

  const unreadSnapshot = await getDocs(unreadQuery);
  if (unreadSnapshot.empty) return;
  const batch = writeBatch(db);
  unreadSnapshot.forEach((docSnap) => {
    batch.update(docSnap.ref, {
      read: true,
      read_at: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function setTypingStatus(chatId, role, isTyping) {
  if (!chatId || !role) return;
  const field = role === 'vendor' ? 'vendor_typing' : 'buyer_typing';
  const summaryRef = chatSummaryDoc(chatId);
  await setDoc(
    summaryRef,
    {
      [field]: Boolean(isTyping),
    },
    { merge: true },
  );
}

export async function getChatSummary(chatId) {
  if (!chatId) return null;
  const summaryRef = chatSummaryDoc(chatId);
  const snapshot = await getDoc(summaryRef);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function ensureInitialMessage({
  chatId,
  buyerUid,
  vendorUid,
  productId,
  senderUid,
  receiverUid,
  senderType,
  receiverType,
  message,
  buyerName,
  vendorName,
  productTitle,
  productImage,
}) {
  await ensureChatSummary({
    chatId,
    buyerUid,
    vendorUid,
    productId,
    buyerName,
    vendorName,
    productTitle,
    productImage,
  });

  const messagesRef = chatMessagesCollection(chatId);
  const existingSnapshot = await getDocs(query(messagesRef, orderBy('timestamp', 'asc')));
  if (!existingSnapshot.empty) {
    return false;
  }

  await sendChatMessage({
    chatId,
    buyerUid,
    vendorUid,
    productId,
    senderUid,
    receiverUid,
    senderType,
    receiverType,
    message,
    buyerName,
    vendorName,
    productTitle,
    productImage,
  });
  return true;
}
