<?php
// Deepseek API integration for YustaAI bot
// Usage: yustam_bot_call_deepseek($query, $context)

function yustam_bot_is_deepseek_configured(): bool
{
    $key = yustam_api_env('DEEPSEEK_API_KEY');
    return $key !== null && $key !== '';
}

function yustam_bot_select_deepseek_model(): string
{
    $model = trim((string) yustam_api_env('DEEPSEEK_MODEL', 'deepseek-chat')); // Default model name
    return $model !== '' ? $model : 'deepseek-chat';
}

function yustam_bot_call_deepseek(string $query, array $context = []): array
{
    if (!yustam_bot_is_deepseek_configured()) {
        return [
            'success' => false,
            'error' => 'not_configured',
            'message' => 'Deepseek credentials are missing.',
        ];
    }

    $apiKey = yustam_api_env('DEEPSEEK_API_KEY');
    $model = yustam_bot_select_deepseek_model();

    $payload = [
        'model' => $model,
        'messages' => [
            [
                'role' => 'system',
                'content' => yustam_bot_build_system_prompt($context),
            ],
            [
                'role' => 'user',
                'content' => $query,
            ],
        ],
        'temperature' => 0.4,
        'max_tokens' => 400,
    ];

    $ch = curl_init('https://api.deepseek.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

    $responseBody = curl_exec($ch);
    $curlError = curl_error($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($responseBody === false) {
        return [
            'success' => false,
            'error' => 'network_error',
            'message' => $curlError ?: 'Unable to reach Deepseek API.',
        ];
    }

    $decoded = json_decode($responseBody, true);
    if (!is_array($decoded)) {
        return [
            'success' => false,
            'error' => 'invalid_response',
            'message' => 'Unexpected response from Deepseek.',
            'statusCode' => $statusCode,
        ];
    }

    $content = $decoded['choices'][0]['message']['content'] ?? '';
    $parsed = is_string($content) ? json_decode($content, true) : null;
    if (!is_array($parsed)) {
        return [
            'success' => false,
            'error' => 'parse_error',
            'message' => 'Unable to parse Deepseek response.',
            'statusCode' => $statusCode,
            'raw' => $decoded,
        ];
    }

    return [
        'success' => true,
        'model' => $model,
        'intent' => $parsed['intent'] ?? null,
        'filters' => is_array($parsed['filters'] ?? null) ? $parsed['filters'] : [],
        'summary' => is_array($parsed['response_summary'] ?? null) ? $parsed['response_summary'] : [],
        'followUps' => is_array($parsed['follow_up_questions'] ?? null) ? $parsed['follow_up_questions'] : [],
        'raw' => $parsed,
    ];
}
