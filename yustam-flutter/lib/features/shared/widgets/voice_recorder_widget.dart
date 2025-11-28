import 'package:flutter/material.dart';
import 'dart:async';
import '../../../config/theme.dart';

class VoiceRecorderWidget extends StatefulWidget {
  final VoidCallback onCancel;
  final Function(int duration) onSend;
  final Function(bool isPaused) onPauseToggle;

  const VoiceRecorderWidget({
    super.key,
    required this.onCancel,
    required this.onSend,
    required this.onPauseToggle,
  });

  @override
  State<VoiceRecorderWidget> createState() => _VoiceRecorderWidgetState();
}

class _VoiceRecorderWidgetState extends State<VoiceRecorderWidget>
    with SingleTickerProviderStateMixin {
  int _duration = 0;
  Timer? _timer;
  bool _isPaused = false;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _startTimer();
    
    // Pulsing animation for recording dot
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!_isPaused) {
        setState(() {
          _duration++;
        });
      }
    });
  }

  void _togglePause() {
    setState(() {
      _isPaused = !_isPaused;
    });
    widget.onPauseToggle(_isPaused);
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.black.withOpacity(0.1),
            blurRadius: 12,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Cancel button
          IconButton(
            onPressed: widget.onCancel,
            icon: const Icon(Icons.delete_outline),
            color: AppTheme.error,
            style: IconButton.styleFrom(
              backgroundColor: AppTheme.error.withOpacity(0.1),
            ),
          ),
          
          const SizedBox(width: 16),
          
          // Recording indicator
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Pulsing red dot
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    return Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _isPaused 
                            ? AppTheme.gray400 
                            : AppTheme.error,
                        boxShadow: _isPaused
                            ? null
                            : [
                                BoxShadow(
                                  color: AppTheme.error.withOpacity(
                                    0.5 * _pulseController.value,
                                  ),
                                  blurRadius: 8,
                                  spreadRadius: 2,
                                ),
                              ],
                      ),
                    );
                  },
                ),
                
                const SizedBox(width: 12),
                
                // Duration
                Text(
                  _formatDuration(_duration),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(width: 16),
          
          // Pause/Resume button
          IconButton(
            onPressed: _togglePause,
            icon: Icon(_isPaused ? Icons.play_arrow : Icons.pause),
            color: AppTheme.emeraldGreen,
            style: IconButton.styleFrom(
              backgroundColor: AppTheme.emeraldGreen.withOpacity(0.1),
            ),
          ),
          
          const SizedBox(width: 8),
          
          // Send button
          IconButton.filled(
            onPressed: () => widget.onSend(_duration),
            icon: const Icon(Icons.send),
            style: IconButton.styleFrom(
              backgroundColor: AppTheme.primaryOrange,
              foregroundColor: AppTheme.white,
            ),
          ),
        ],
      ),
    );
  }
}
