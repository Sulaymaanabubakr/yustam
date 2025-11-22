import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  increment,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Opens or creates a chat thread in Firestore
 * @param {Object} params - Chat parameters
 * @returns {Promise<string>} The chat ID
 */
export const openChatInFirestore = async ({
  buyerUid,
  vendorUid,
  buyerName = 'Buyer',
  vendorName = 'Vendor',
  buyerAvatar = '',
  vendorAvatar = '',
  listingId = '',
  listingTitle = '',
  listingImage = '',
}) => {
  if (!buyerUid || !vendorUid) {
    throw new Error('Both buyer_uid and vendor_uid are required to open a chat');
  }

  const trimmedListingId = listingId ? String(listingId).trim() : '';
  const chatsCollection = collection(db, 'chats');

  const tryFindExistingThread = async (constraints = []) => {
    try {
      const snapshot = await getDocs(query(chatsCollection, ...constraints, limit(1)));
      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        if (existingDoc?.id) {
          return existingDoc.id;
        }
      }
    } catch (lookupError) {
      console.warn('Chat lookup failed:', lookupError);
    }
    return null;
  };

  // Prefer existing chats that match both participants and listing
  const baseConstraints = [
    where('buyer_uid', '==', buyerUid),
    where('vendor_uid', '==', vendorUid),
  ];

  if (trimmedListingId) {
    const existingForListing = await tryFindExistingThread([
      ...baseConstraints,
      where('listing_id', '==', trimmedListingId),
    ]);
    if (existingForListing) {
      return existingForListing;
    }
  }

  // Fallback: match participants regardless of listing to reuse legacy threads
  const existingGeneric = await tryFindExistingThread(baseConstraints);
  if (existingGeneric) {
    return existingGeneric;
  }

  // Generate consistent chat ID based on participants
  const chatId = `${buyerUid}_${vendorUid}_${trimmedListingId || 'general'}`;
  const chatRef = doc(db, 'chats', chatId);

  // Check if chat already exists
  const chatSnap = await getDoc(chatRef);
  
  if (chatSnap.exists()) {
    // Chat exists, just return the ID
    return chatId;
  }

  // Create new chat document
  await setDoc(chatRef, {
    chat_id: chatId,
    buyer_uid: buyerUid,
    buyer_name: buyerName,
    buyer_avatar: buyerAvatar,
    vendor_uid: vendorUid,
    vendor_name: vendorName,
    vendor_business_name: vendorName,
    vendor_avatar: vendorAvatar,
    listing_id: trimmedListingId,
    listing_title: listingTitle,
    listing_image: listingImage,
    last_text: '',
    last_type: 'text',
    last_sender_uid: '',
    last_sender_role: '',
    last_ts: serverTimestamp(),
    unread_for_buyer: 0,
    unread_for_vendor: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return chatId;
};

/**
 * Sends a message to a chat thread in Firestore
 * @param {Object} params - Message parameters
 * @returns {Promise<Object>} The created message document
 */
export const sendMessageToFirestore = async ({
  chatId,
  senderUid,
  senderRole, // 'buyer' or 'vendor'
  text = '',
  imageUrl = '',
  voiceUrl = '',
  duration = 0,
  buyerUid,
  vendorUid,
  buyerName = 'Buyer',
  vendorName = 'Vendor',
  listingId = '',
  listingTitle = '',
  listingImage = '',
}) => {
  if (!chatId) {
    throw new Error('chat_id is required');
  }
  if (!senderUid || !senderRole) {
    throw new Error('sender_uid and sender_role are required');
  }

  const normalizedRole = senderRole.toLowerCase();
  if (normalizedRole !== 'buyer' && normalizedRole !== 'vendor') {
    throw new Error('sender_role must be either "buyer" or "vendor"');
  }

  const safeListingId = listingId ? String(listingId).trim() : '';

  // Determine message type
  let messageType = 'text';
  if (voiceUrl) {
    messageType = 'voice';
  } else if (imageUrl) {
    messageType = 'image';
  }

  // Prepare message data
  const messageData = {
    sender_uid: senderUid,
    sender_role: normalizedRole,
    text: text || '',
    image_url: imageUrl || '',
    voice_url: voiceUrl || '',
    duration: duration || 0,
    type: messageType,
    ts: serverTimestamp(),
    timestamp: serverTimestamp(),
    sent_at: serverTimestamp(),
    read_by: {},
  };

  // Add message to subcollection
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const messageDoc = await addDoc(messagesRef, messageData);

  // Update chat metadata
  const chatRef = doc(db, 'chats', chatId);
  const chatUpdateData = {
    last_text: text || (messageType === 'image' ? 'Photo' : messageType === 'voice' ? 'Voice note' : ''),
    last_type: messageType,
    last_sender_uid: senderUid,
    last_sender_role: normalizedRole,
    last_ts: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  // Increment unread count for the recipient
  if (normalizedRole === 'buyer') {
    chatUpdateData.unread_for_vendor = increment(1);
    chatUpdateData.unread_for_buyer = 0;
  } else {
    chatUpdateData.unread_for_buyer = increment(1);
    chatUpdateData.unread_for_vendor = 0;
  }

  // Ensure chat document exists with proper metadata
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists() && buyerUid && vendorUid) {
    // Create chat if it doesn't exist
    await setDoc(chatRef, {
      chat_id: chatId,
      buyer_uid: buyerUid,
      buyer_name: buyerName,
      vendor_uid: vendorUid,
      vendor_name: vendorName,
      vendor_business_name: vendorName,
      listing_id: safeListingId,
      listing_title: listingTitle,
      listing_image: listingImage,
      created_at: serverTimestamp(),
      ...chatUpdateData,
    });
  } else {
    // Update existing chat
    await updateDoc(chatRef, chatUpdateData);
  }

  return {
    id: messageDoc.id,
    ...messageData,
    timestamp: new Date().toISOString(), // Return client timestamp for immediate UI update
  };
};

/**
 * Marks messages as read for a specific role
 * @param {string} chatId - The chat ID
 * @param {string} role - 'buyer' or 'vendor'
 * @returns {Promise<void>}
 */
export const markChatAsReadInFirestore = async (chatId, role) => {
  if (!chatId || !role) {
    throw new Error('chat_id and role are required');
  }

  const normalizedRole = role.toLowerCase();
  if (normalizedRole !== 'buyer' && normalizedRole !== 'vendor') {
    throw new Error('role must be either "buyer" or "vendor"');
  }

  const chatRef = doc(db, 'chats', chatId);
  const updateData = normalizedRole === 'buyer' 
    ? { unread_for_buyer: 0 }
    : { unread_for_vendor: 0 };

  await updateDoc(chatRef, updateData);
};
