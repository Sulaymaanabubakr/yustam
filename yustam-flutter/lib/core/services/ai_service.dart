import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../../config/env.dart';
import 'supabase_service.dart';
import 'subscription_service.dart';
import '../../shared/models/user_model.dart';
import '../../shared/models/plan_model.dart';

class AiService {
  final SupabaseService _supabase;
  final SubscriptionService _subscriptionService;
  late final GenerativeModel _model;
  late final ChatSession _chat;

  AiService(this._supabase, this._subscriptionService) {
    _model = GenerativeModel(
      model: 'gemini-pro',
      apiKey: Environment.geminiApiKey,
    );
    _chat = _model.startChat();
  }

  /// Send a message to the AI assistant
  Future<String> sendMessage(String message, UserModel user) async {
    // 1. Check usage limits
    final canUse = await _checkUsageLimit(user);
    if (!canUse) {
      throw Exception('Daily AI limit reached for your plan. Please upgrade to continue.');
    }

    try {
      // 2. Send message to Gemini
      final response = await _chat.sendMessage(Content.text(message));
      final text = response.text;

      if (text == null) {
        throw Exception('No response from AI');
      }

      // 3. Log usage
      await _logUsage(user);

      return text;
    } catch (e) {
      throw Exception('AI Error: $e');
    }
  }

  /// Check if user has reached their daily limit
  Future<bool> _checkUsageLimit(UserModel user) async {
    if (user.role != 'vendor') return true; // Buyers might have different limits or none for now

    final plan = SubscriptionPlans.getBySlug(user.plan ?? 'free') ?? SubscriptionPlans.free;
    
    // Unlimited plans
    if (plan.aiPromptsPerDay == -1) return true;

    // Count today's usage
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day).toIso8601String();
    
    final usage = await _supabase.getFromTable(
      'ai_usage',
      filters: {
        'user_id': user.id,
        'created_at': 'gte.$startOfDay', // This syntax depends on Supabase client, usually we need a specific filter method
      },
      // Note: simple getFromTable might not support complex filters like 'gte'. 
      // We might need to use the raw client or add support in SupabaseService.
      // For now, let's assume we fetch all for user and filter in memory (inefficient but works for MVP) 
      // OR better, use the count if available.
    );

    // Filter in memory for today (since our SupabaseService wrapper is simple)
    final todayUsage = usage.where((log) {
      final createdAt = DateTime.parse(log['created_at']);
      return createdAt.year == now.year && 
             createdAt.month == now.month && 
             createdAt.day == now.day;
    }).length;

    return todayUsage < plan.aiPromptsPerDay;
  }

  /// Log AI usage to database
  Future<void> _logUsage(UserModel user) async {
    await _supabase.insertIntoTable('ai_usage', {
      'user_id': user.id,
      'model': 'gemini-pro',
      'created_at': DateTime.now().toIso8601String(),
    });
  }
  
  /// Get remaining prompts for today
  Future<int> getRemainingPrompts(UserModel user) async {
    if (user.role != 'vendor') return 999;
    
    final plan = SubscriptionPlans.getBySlug(user.plan ?? 'free') ?? SubscriptionPlans.free;
    if (plan.aiPromptsPerDay == -1) return 999;

    final now = DateTime.now();
    final usage = await _supabase.getFromTable(
      'ai_usage',
      filters: {'user_id': user.id},
    );

    final todayUsage = usage.where((log) {
      final createdAt = DateTime.parse(log['created_at']);
      return createdAt.year == now.year && 
             createdAt.month == now.month && 
             createdAt.day == now.day;
    }).length;

    return (plan.aiPromptsPerDay - todayUsage).clamp(0, 999);
  }
}

final aiServiceProvider = Provider<AiService>((ref) {
  final supabase = SupabaseService();
  final subscription = ref.watch(subscriptionServiceProvider);
  return AiService(supabase, subscription);
});
