import resolveMediaUrl from './url';

export const mapThreadToState = (chat = {}) => ({
  id:
    chat.chat_id ||
    chat.id ||
    (chat.buyer_uid || chat.buyerUid || chat.userUid || '') + '_' +
    (chat.vendor_uid || chat.vendorUid || chat.user_uid || chat.userUid || '') + '_' +
    (chat.listing_id || chat.listingId || 'general'),
  vendorName: chat.vendor_name || chat.vendorName || chat.name || 'Vendor',
  vendorPhoto: resolveMediaUrl(chat.vendor_avatar || chat.vendorAvatar),
  lastMessage: chat.last_text || chat.last_message || chat.lastMessage || '',
  lastMessageTime: chat.last_ts || chat.updated_at || chat.updatedAt || chat.created_at || chat.createdAt || null,
  unreadCount: Number(
    chat.unread_for_buyer ?? chat.unreadForBuyer ?? chat.unread_for_vendor ?? chat.unreadForVendor ?? 0
  ) || 0,
  lastType: chat.last_type || chat.lastType || 'text',
  vendorId: chat.vendor_uid || chat.vendorUid || chat.user_uid || chat.userUid || '',
  listingId: chat.listing_id || chat.listingId || '',
  listingTitle: chat.listing_title || chat.listingTitle || '',
  listingImage: resolveMediaUrl(chat.listing_image || chat.listingImage),
});

export default mapThreadToState;
