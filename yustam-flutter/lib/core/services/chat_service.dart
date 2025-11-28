import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/supabase_service.dart';

/// Chat Message Model
class ChatMessage {
  final String id;
  final String threadId;
  final String senderId;
  final String senderRole;
  final String message;
  final String messageType; // 'text', 'voice', 'image', 'video'
  final String? mediaUrl;
  final int? voiceDuration; // in seconds
  final int? mediaSize; // in bytes
  final int? mediaWidth;
  final int? mediaHeight;
  final bool isRead;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.threadId,
    required this.senderId,
    required this.senderRole,
    required this.message,
    this.messageType = 'text',
    this.mediaUrl,
    this.voiceDuration,
    this.mediaSize,
    this.mediaWidth,
    this.mediaHeight,
    this.isRead = false,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id']?.toString() ?? '',
      threadId: json['thread_id']?.toString() ?? '',
      senderId: json['sender_id']?.toString() ?? '',
      senderRole: json['sender_role']?.toString() ?? 'buyer',
      message: json['message']?.toString() ?? '',
      messageType: json['message_type']?.toString() ?? 'text',
      mediaUrl: json['media_url']?.toString(),
      voiceDuration: json['voice_duration'] is int 
          ? json['voice_duration']
          : int.tryParse(json['voice_duration']?.toString() ?? '0'),
      mediaSize: json['media_size'] is int
          ? json['media_size']
          : int.tryParse(json['media_size']?.toString() ?? '0'),
      mediaWidth: json['media_width'] is int
          ? json['media_width']
          : int.tryParse(json['media_width']?.toString() ?? '0'),
      mediaHeight: json['media_height'] is int
          ? json['media_height']
          : int.tryParse(json['media_height']?.toString() ?? '0'),
      isRead: json['is_read'] == true || json['is_read'] == 1,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'thread_id': threadId,
      'sender_id': senderId,
      'sender_role': senderRole,
      'message': message,
      'message_type': messageType,
      'media_url': mediaUrl,
      'voice_duration': voiceDuration,
      'media_size': mediaSize,
      'media_width': mediaWidth,
      'media_height': mediaHeight,
      'is_read': isRead,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

/// Chat Thread Model
class ChatThread {
  final String id;
  final String chatId;
  final String buyerId;
  final String vendorId;
  final String? listingId;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final int unreadCountBuyer;
  final int unreadCountVendor;
  final DateTime createdAt;

  // Optional vendor/buyer info
  final Map<String, dynamic>? buyerInfo;
  final Map<String, dynamic>? vendorInfo;

  ChatThread({
    required this.id,
    required this.chatId,
    required this.buyerId,
    required this.vendorId,
    this.listingId,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCountBuyer = 0,
    this.unreadCountVendor = 0,
    required this.createdAt,
    this.buyerInfo,
    this.vendorInfo,
  });

  factory ChatThread.fromJson(Map<String, dynamic> json) {
    return ChatThread(
      id: json['id']?.toString() ?? '',
      chatId: json['chat_id']?.toString() ?? '',
      buyerId: json['buyer_id']?.toString() ?? '',
      vendorId: json['vendor_id']?.toString() ?? '',
      listingId: json['listing_id']?.toString(),
      lastMessage: json['last_message']?.toString(),
      lastMessageAt: json['last_message_at'] != null
          ? DateTime.parse(json['last_message_at'].toString())
          : null,
      unreadCountBuyer: json['unread_count_buyer'] is int
          ? json['unread_count_buyer']
          : int.tryParse(json['unread_count_buyer']?.toString() ?? '0') ?? 0,
      unreadCountVendor: json['unread_count_vendor'] is int
          ? json['unread_count_vendor']
          : int.tryParse(json['unread_count_vendor']?.toString() ?? '0') ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : DateTime.now(),
      buyerInfo: json['buyer'] is Map ? Map<String, dynamic>.from(json['buyer']) : null,
      vendorInfo: json['vendor'] is Map ? Map<String, dynamic>.from(json['vendor']) : null,
    );
  }
}

/// Chat Service
class ChatService {
  final SupabaseService _supabase;

  ChatService(this._supabase);

  // ============================================================================
  // Chat Threads
  // ============================================================================

  /// Get user's chat threads
  Future<List<ChatThread>> getUserThreads(String userId, String userRole) async {
    final filterKey = userRole == 'buyer' ? 'buyer_id' : 'vendor_id';

    final data = await _supabase.getFromTable(
      'chat_threads',
      filters: {filterKey: userId},
      orderBy: 'updated_at',
      ascending: false,
    );

    return data.map((json) => ChatThread.fromJson(json)).toList();
  }

  /// Get or create chat thread
  Future<ChatThread> getOrCreateThread({
    required String buyerId,
    required String vendorId,
    String? listingId,
  }) async {
    // Try to find existing thread
    final existing = await _supabase.getFromTable(
      'chat_threads',
      filters: {
        'buyer_id': buyerId,
        'vendor_id': vendorId,
      },
      limit: 1,
    );

    if (existing.isNotEmpty) {
      return ChatThread.fromJson(existing.first);
    }

    // Create new thread
    final chatId = 'chat_${buyerId}_${vendorId}_${DateTime.now().millisecondsSinceEpoch}';

    final data = await _supabase.insertIntoTable('chat_threads', {
      'chat_id': chatId,
      'buyer_id': buyerId,
      'vendor_id': vendorId,
      'listing_id': listingId,
    });

    return ChatThread.fromJson(data);
  }

  // ============================================================================
  // Messages
  // ============================================================================

  /// Get messages for a thread
  Future<List<ChatMessage>> getThreadMessages(String threadId) async {
    final data = await _supabase.getFromTable(
      'chat_messages',
      filters: {'thread_id': threadId},
      orderBy: 'created_at',
      ascending: true,
    );

    return data.map((json) => ChatMessage.fromJson(json)).toList();
  }

  /// Send message
  Future<ChatMessage> sendMessage({
    required String threadId,
    required String senderId,
    required String senderRole,
    required String message,
    String messageType = 'text',
    String? mediaUrl,
    int? voiceDuration,
    int? mediaSize,
    int? mediaWidth,
    int? mediaHeight,
  }) async {
    final data = await _supabase.insertIntoTable('chat_messages', {
      'thread_id': threadId,
      'sender_id': senderId,
      'sender_role': senderRole,
      'message': message,
      'message_type': messageType,
      'media_url': mediaUrl,
      'voice_duration': voiceDuration,
      'media_size': mediaSize,
      'media_width': mediaWidth,
      'media_height': mediaHeight,
    });

    return ChatMessage.fromJson(data);
  }

  /// Mark messages as read
  Future<void> markAsRead(String threadId, String userId) async {
    // Update all unread messages in the thread
    await _supabase.client
        .from('chat_messages')
        .update({'is_read': true, 'read_at': DateTime.now().toIso8601String()})
        .eq('thread_id', threadId)
        .eq('is_read', false)
        .neq('sender_id', userId);
  }

  // ============================================================================
  // Realtime
  // ============================================================================

  /// Subscribe to new messages in a thread
  RealtimeChannel subscribeToThread(
    String threadId,
    void Function(ChatMessage message) onNewMessage,
  ) {
    return _supabase.subscribeToTable(
      'chat_messages',
      (payload) {
        if (payload.newRecord != null) {
          final message = ChatMessage.fromJson(payload.newRecord!);
          if (message.threadId == threadId) {
            onNewMessage(message);
          }
        }
      },
    );
  }

  /// Unsubscribe from realtime
  Future<void> unsubscribe(RealtimeChannel channel) async {
    await _supabase.unsubscribe(channel);
  }
}

// ============================================================================
// Riverpod Providers
// ============================================================================

/// Chat service provider
final chatServiceProvider = Provider<ChatService>((ref) {
  final supabase = SupabaseService();
  return ChatService(supabase);
});

/// User chat threads provider
final userChatThreadsProvider = FutureProvider.family<List<ChatThread>, Map<String, String>>(
  (ref, params) async {
    final service = ref.watch(chatServiceProvider);
    return await service.getUserThreads(params['userId']!, params['userRole']!);
  },
);

/// Thread messages provider
final threadMessagesProvider = FutureProvider.family<List<ChatMessage>, String>(
  (ref, threadId) async {
    final service = ref.watch(chatServiceProvider);
    return await service.getThreadMessages(threadId);
  },
);

// Supabase service provider
final supabaseServiceProvider = Provider<SupabaseService>((ref) {
  return SupabaseService();
});
