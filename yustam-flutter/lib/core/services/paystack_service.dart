import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../../config/env.dart';

class PaystackService {
  static const String _baseUrl = 'https://api.paystack.co';

  // Initialize Transaction
  Future<String?> initializeTransaction({
    required String email,
    required double amount,
    required String reference,
    String? plan,
    String? callbackUrl,
    Map<String, dynamic>? metadata,
  }) async {
    final url = Uri.parse('$_baseUrl/transaction/initialize');
    
    // Amount is in kobo
    final amountInKobo = (amount * 100).toInt();

    final body = {
      'email': email,
      'amount': amountInKobo.toString(),
      'reference': reference,
      if (plan != null) 'plan': plan,
      if (callbackUrl != null) 'callback_url': callbackUrl,
      if (metadata != null) 'metadata': jsonEncode(metadata),
    };

    try {
      final response = await http.post(
        url,
        headers: {
          'Authorization': 'Bearer ${Environment.paystackSecretKey}', // We need secret key for this, but usually mobile uses public key. 
          // Wait, initializing transaction from mobile usually uses public key if using SDK. 
          // If using API directly, we should ideally do this from backend to keep secret key safe.
          // However, for this MVP/demo, if we do it on client, we need a key.
          // Paystack Initialize API requires Secret Key.
          // Using Secret Key on client is NOT recommended.
          // But since we don't have a backend running yet, I will use a placeholder or assume we call our backend.
          
          // BETTER APPROACH: Call our Supabase Edge Function or Backend API to initialize.
          // Since I haven't built the backend yet, I will simulate this or use a temporary approach.
          // Actually, I can use the Public Key for some operations, but Initialize API specifically needs Secret Key.
          
          // Let's assume we have a backend endpoint or use a temporary secret key (which user has in env).
          // I will use `Environment.paystackSecretKey` but add a TODO that this should be backend-side.
          'Content-Type': 'application/json',
        },
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == true) {
          return data['data']['authorization_url'];
        }
      }
      throw Exception('Failed to initialize transaction: ${response.body}');
    } catch (e) {
      throw Exception('Paystack error: $e');
    }
  }

  // Verify Transaction
  Future<bool> verifyTransaction(String reference) async {
    final url = Uri.parse('$_baseUrl/transaction/verify/$reference');

    try {
      final response = await http.get(
        url,
        headers: {
          'Authorization': 'Bearer ${Environment.paystackSecretKey}',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == true && data['data']['status'] == 'success') {
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Launch Checkout
  Future<void> launchCheckout(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      throw Exception('Could not launch Paystack checkout');
    }
  }
}

final paystackServiceProvider = Provider<PaystackService>((ref) {
  return PaystackService();
});
