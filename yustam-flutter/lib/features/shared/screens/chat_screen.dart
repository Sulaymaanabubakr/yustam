import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:record/record.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:io';
import '../../../config/theme.dart';
import '../../../core/services/chat_service.dart';
import '../../../core/services/auth_service.dart';
import '../widgets/voice_recorder_widget.dart';
import '../widgets/media_message_widget.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String threadId;
  final String? vendorPhone; // For call button
  final bool isBuyer; // To show/hide call button

  const ChatScreen({
    super.key,
    required this.threadId,
    this.vendorPhone,
    this.isBuyer = false,
  });

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final _audioRecorder = AudioRecorder();
  final _imagePicker = ImagePicker();
  
  List<ChatMessage> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  bool _isRecording = false;
  bool _isRecordingPaused = false;
  RealtimeChannel? _subscription;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _subscribeToMessages();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _audioRecorder.dispose();
    if (_subscription != null) {
      ref.read(chatServiceProvider).unsubscribe(_subscription!);
    }
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final service = ref.read(chatServiceProvider);
      final messages = await service.getThreadMessages(widget.threadId);

      final currentUser = ref.read(currentUserProvider).value;
      if (currentUser != null) {
        await service.markAsRead(widget.threadId, currentUser.id);
      }

      setState(() {
        _messages = messages;
        _isLoading = false;
      });

      _scrollToBottom();
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _subscribeToMessages() {
    final service = ref.read(chatServiceProvider);
    _subscription = service.subscribeToThread(
      widget.threadId,
      (message) {
        setState(() {
          _messages.add(message);
        });
        _scrollToBottom();
      },
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage({
    String? messageText,
    String messageType = 'text',
    String? mediaUrl,
    int? voiceDuration,
    int? mediaSize,
    int? mediaWidth,
    int? mediaHeight,
  }) async {
    final currentUser = ref.read(currentUserProvider).value;
    if (currentUser == null) return;

    final text = messageText ?? _messageController.text.trim();
    if (text.isEmpty && mediaUrl == null) return;

    _messageController.clear();
    setState(() {
      _isSending = true;
    });

    try {
      final service = ref.read(chatServiceProvider);
      await service.sendMessage(
        threadId: widget.threadId,
        senderId: currentUser.id,
        senderRole: currentUser.role,
        message: text,
        messageType: messageType,
        mediaUrl: mediaUrl,
        voiceDuration: voiceDuration,
        mediaSize: mediaSize,
        mediaWidth: mediaWidth,
        mediaHeight: mediaHeight,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send: $e')),
        );
      }
    } finally {
      setState(() {
        _isSending = false;
      });
    }
  }

  // Voice recording
  Future<void> _startRecording() async {
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Microphone permission required')),
        );
      }
      return;
    }

    try {
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a';
      
      await _audioRecorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc),
        path: path,
      );
      
      setState(() {
        _isRecording = true;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to start recording: $e')),
        );
      }
    }
  }

  Future<void> _stopRecording(int duration) async {
    try {
      final path = await _audioRecorder.stop();
      setState(() {
        _isRecording = false;
      });

      if (path != null) {
        // TODO: Upload to Supabase storage and get URL
        final file = File(path);
        final size = await file.length();
        
        // For now, using local path (should upload to storage)
        await _sendMessage(
          messageText: '🎤 Voice message',
          messageType: 'voice',
          mediaUrl: path,
          voiceDuration: duration,
          mediaSize: size,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send voice message: $e')),
        );
      }
    }
  }

  Future<void> _cancelRecording() async {
    await _audioRecorder.stop();
    setState(() {
      _isRecording = false;
    });
  }

  void _toggleRecordingPause(bool isPaused) {
    setState(() {
      _isRecordingPaused = isPaused;
    });
    if (isPaused) {
      _audioRecorder.pause();
    } else {
      _audioRecorder.resume();
    }
  }

  // Photo capture
  Future<void> _capturePhoto() async {
    try {
      final XFile? photo = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 70,
      );

      if (photo != null) {
        final file = File(photo.path);
        final size = await file.length();
        
        // TODO: Upload to Supabase storage
        await _sendMessage(
          messageText: '📷 Photo',
          messageType: 'image',
          mediaUrl: photo.path,
          mediaSize: size,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to capture photo: $e')),
        );
      }
    }
  }

  // Media attachment
  Future<void> _pickMedia() async {
    try {
      final XFile? media = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 70,
      );

      if (media != null) {
        final file = File(media.path);
        final size = await file.length();
        
        // TODO: Upload to Supabase storage and compress video if needed
        await _sendMessage(
          messageText: '📎 Media',
          messageType: 'image',
          mediaUrl: media.path,
          mediaSize: size,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to attach media: $e')),
        );
      }
    }
  }

  // Call vendor
  Future<void> _makeCall() async {
    if (widget.vendorPhone == null) return;

    final uri = Uri.parse('tel:${widget.vendorPhone}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cannot make call')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(currentUserProvider).value;

    if (currentUser == null) {
      return const Scaffold(
        body: Center(child: Text('Please log in')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat'),
        actions: [
          // Call button (buyers only)
          if (widget.isBuyer && widget.vendorPhone != null)
            IconButton(
              icon: const Icon(Icons.call),
              onPressed: _makeCall,
              tooltip: 'Call vendor',
            ),
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () {
              // TODO: Show chat options
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.chat_bubble_outline,
                              size: 64,
                              color: AppTheme.gray400,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No messages yet',
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Send a message to start the conversation',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final message = _messages[index];
                          final isMe = message.senderId == currentUser.id;

                          return _MessageBubble(
                            message: message,
                            isMe: isMe,
                          );
                        },
                      ),
          ),

          // Voice Recorder (when recording)
          if (_isRecording)
            VoiceRecorderWidget(
              onCancel: _cancelRecording,
              onSend: _stopRecording,
              onPauseToggle: _toggleRecordingPause,
            ),

          // Input Area
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              boxShadow: [
                BoxShadow(
                  color: AppTheme.black.withOpacity(0.05),
                  blurRadius: 8,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                // Attachment button
                IconButton(
                  onPressed: _isRecording ? null : _pickMedia,
                  icon: const Icon(Icons.attach_file),
                  color: AppTheme.primaryOrange,
                ),
                
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                    maxLines: null,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessage(),
                    enabled: !_isRecording,
                  ),
                ),
                
                const SizedBox(width: 8),
                
                // Send or Mic button
                IconButton.filled(
                  onPressed: _isSending || _isRecording
                      ? null
                      : (_messageController.text.trim().isEmpty
                          ? _startRecording
                          : () => _sendMessage()),
                  icon: _isSending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              AppTheme.white,
                            ),
                          ),
                        )
                      : Icon(
                          _messageController.text.trim().isEmpty
                              ? Icons.mic
                              : Icons.send,
                        ),
                  style: IconButton.styleFrom(
                    backgroundColor: AppTheme.primaryOrange,
                    foregroundColor: AppTheme.white,
                  ),
                ),
                
                const SizedBox(width: 8),
                
                // Camera button
                IconButton(
                  onPressed: _isRecording ? null : _capturePhoto,
                  icon: const Icon(Icons.camera_alt),
                  color: AppTheme.primaryOrange,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isMe;

  const _MessageBubble({
    required this.message,
    required this.isMe,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          gradient: isMe ? AppTheme.gradientPrimary : null,
          color: isMe ? null : AppTheme.gray100,
          borderRadius: BorderRadius.circular(16).copyWith(
            bottomRight: isMe ? const Radius.circular(4) : null,
            bottomLeft: isMe ? null : const Radius.circular(4),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Media content
            if (message.messageType != 'text')
              MediaMessageWidget(
                messageType: message.messageType,
                mediaUrl: message.mediaUrl,
                voiceDuration: message.voiceDuration,
                mediaWidth: message.mediaWidth,
                mediaHeight: message.mediaHeight,
                isMe: isMe,
              ),
            
            // Text content
            if (message.message.isNotEmpty)
              Padding(
                padding: message.messageType != 'text'
                    ? const EdgeInsets.only(top: 8)
                    : EdgeInsets.zero,
                child: Text(
                  message.message,
                  style: TextStyle(
                    color: isMe ? AppTheme.white : AppTheme.gray900,
                    fontSize: 15,
                  ),
                ),
              ),
            
            const SizedBox(height: 4),
            
            // Timestamp
            Text(
              _formatTime(message.createdAt),
              style: TextStyle(
                color: isMe
                    ? AppTheme.white.withOpacity(0.8)
                    : AppTheme.gray600,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}
