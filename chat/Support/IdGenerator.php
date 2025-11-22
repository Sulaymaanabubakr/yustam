<?php

declare(strict_types=1);

namespace Chat\Support;

final class IdGenerator
{
    public static function messageId(): string
    {
        return 'msg_' . bin2hex(random_bytes(12));
    }

    public static function attachmentId(): string
    {
        return 'att_' . bin2hex(random_bytes(12));
    }
}
