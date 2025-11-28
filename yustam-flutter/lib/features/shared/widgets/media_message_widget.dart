import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:just_audio/just_audio.dart';
import '../../../config/theme.dart';

class MediaMessageWidget extends StatelessWidget {
  final String messageType;
  final String? mediaUrl;
  final int? voiceDuration;
  final int? mediaWidth;
  final int? mediaHeight;
  final bool isMe;

  const MediaMessageWidget({
    super.key,
    required this.messageType,
    this.mediaUrl,
    this.voiceDuration,
    this.mediaWidth,
    this.mediaHeight,
    required this.isMe,
  });

  @override
  Widget build(BuildContext context) {
    if (mediaUrl == null) return const SizedBox.shrink();

    switch (messageType) {
      case 'image':
        return _ImageMessage(
          imageUrl: mediaUrl!,
          width: mediaWidth,
          height: mediaHeight,
        );
      case 'video':
        return _VideoMessage(
          videoUrl: mediaUrl!,
          width: mediaWidth,
          height: mediaHeight,
        );
      case 'voice':
        return _VoiceMessage(
          audioUrl: mediaUrl!,
          duration: voiceDuration ?? 0,
          isMe: isMe,
        );
      default:
        return const SizedBox.shrink();
    }
  }
}

class _ImageMessage extends StatelessWidget {
  final String imageUrl;
  final int? width;
  final int? height;

  const _ImageMessage({
    required this.imageUrl,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // TODO: Open full-screen image viewer
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: CachedNetworkImage(
          imageUrl: imageUrl,
          width: 200,
          height: 150,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(
            width: 200,
            height: 150,
            color: AppTheme.gray200,
            child: const Center(
              child: CircularProgressIndicator(),
            ),
          ),
          errorWidget: (context, url, error) => Container(
            width: 200,
            height: 150,
            color: AppTheme.gray200,
            child: const Icon(Icons.error),
          ),
        ),
      ),
    );
  }
}

class _VideoMessage extends StatelessWidget {
  final String videoUrl;
  final int? width;
  final int? height;

  const _VideoMessage({
    required this.videoUrl,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // TODO: Open video player
      },
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 200,
            height: 150,
            decoration: BoxDecoration(
              color: AppTheme.gray200,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.videocam,
              size: 48,
              color: AppTheme.gray600,
            ),
          ),
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppTheme.black.withOpacity(0.6),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.play_arrow,
              size: 36,
              color: AppTheme.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _VoiceMessage extends StatefulWidget {
  final String audioUrl;
  final int duration;
  final bool isMe;

  const _VoiceMessage({
    required this.audioUrl,
    required this.duration,
    required this.isMe,
  });

  @override
  State<_VoiceMessage> createState() => _VoiceMessageState();
}

class _VoiceMessageState extends State<_VoiceMessage> {
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isPlaying = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;

  @override
  void initState() {
    super.initState();
    _initAudio();
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }

  Future<void> _initAudio() async {
    try {
      await _audioPlayer.setUrl(widget.audioUrl);
      _audioPlayer.positionStream.listen((position) {
        setState(() {
          _position = position;
        });
      });
      _audioPlayer.durationStream.listen((duration) {
        setState(() {
          _duration = duration ?? Duration(seconds: widget.duration);
        });
      });
      _audioPlayer.playerStateStream.listen((state) {
        setState(() {
          _isPlaying = state.playing;
        });
      });
    } catch (e) {
      debugPrint('Error loading audio: $e');
    }
  }

  Future<void> _togglePlayPause() async {
    if (_isPlaying) {
      await _audioPlayer.pause();
    } else {
      await _audioPlayer.play();
    }
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final progress = _duration.inSeconds > 0
        ? _position.inSeconds / _duration.inSeconds
        : 0.0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Play/Pause button
          IconButton(
            onPressed: _togglePlayPause,
            icon: Icon(
              _isPlaying ? Icons.pause : Icons.play_arrow,
              color: widget.isMe ? AppTheme.white : AppTheme.primaryOrange,
            ),
            style: IconButton.styleFrom(
              backgroundColor: widget.isMe
                  ? AppTheme.white.withOpacity(0.2)
                  : AppTheme.primaryOrange.withOpacity(0.1),
              padding: EdgeInsets.zero,
              minimumSize: const Size(32, 32),
            ),
          ),
          
          const SizedBox(width: 8),
          
          // Waveform (simplified as a progress bar)
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor: widget.isMe
                        ? AppTheme.white.withOpacity(0.3)
                        : AppTheme.gray300,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      widget.isMe ? AppTheme.white : AppTheme.primaryOrange,
                    ),
                    minHeight: 4,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _isPlaying
                      ? _formatDuration(_position)
                      : _formatDuration(_duration),
                  style: TextStyle(
                    fontSize: 11,
                    color: widget.isMe
                        ? AppTheme.white.withOpacity(0.8)
                        : AppTheme.gray600,
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(width: 8),
          
          // Microphone icon
          Icon(
            Icons.mic,
            size: 16,
            color: widget.isMe
                ? AppTheme.white.withOpacity(0.8)
                : AppTheme.gray600,
          ),
        ],
      ),
    );
  }
}
