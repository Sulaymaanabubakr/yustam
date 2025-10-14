<?php
// Database connection file for YUSTAM Marketplace
error_reporting(E_ALL);
ini_set('display_errors', 1);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'yustamco_yustam_admin');   // your cPanel DB username
define('DB_PASS', 'Aduagbemi24434$');          // your database password
define('DB_NAME', 'yustamco_yustam_users');    // your database name

// Connection function
function get_db_connection(): mysqli {
    static $conn = null;

    if ($conn instanceof mysqli) {
        return $conn;
    }

    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        $conn->set_charset('utf8mb4');
    } catch (Exception $e) {
        die('Database connection failed: ' . $e->getMessage());
    }

    return $conn;
}

// Define table constants for clarity
define('YUSTAM_VENDORS_TABLE', 'vendors');
define('YUSTAM_ADMINS_TABLE', 'admins');
if (!defined('YUSTAM_USERS_TABLE')) {
    define('YUSTAM_USERS_TABLE', YUSTAM_VENDORS_TABLE);
}

/**
 * Retrieve and cache the list of column names on the vendors table.
 */
function yustam_vendor_table_columns(): array
{
    static $columns = null;

    if (is_array($columns)) {
        return $columns;
    }

    $columns = [];

    try {
        $conn = get_db_connection();
        $result = $conn->query('SHOW COLUMNS FROM `' . YUSTAM_VENDORS_TABLE . '`');
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                if (isset($row['Field'])) {
                    $columns[] = $row['Field'];
                }
            }
            $result->free();
        }
    } catch (Throwable $e) {
        error_log('Unable to inspect vendor table columns: ' . $e->getMessage());
    }

    return $columns;
}

function yustam_vendor_table_has_column(string $column): bool
{
    return in_array($column, yustam_vendor_table_columns(), true);
}

function yustam_vendor_name_column(): string
{
    foreach (['full_name', 'name'] as $candidate) {
        if (yustam_vendor_table_has_column($candidate)) {
            return $candidate;
        }
    }

    return 'full_name';
}

// Backwards-compatible helpers
function yustam_users_column($name) {
    if ($name === 'name') {
        return yustam_vendor_name_column();
    }
    return $name;
}

function yustam_users_table_has_column($column) {
    return yustam_vendor_table_has_column($column);
}

/**
 * Admin table helpers
 */
function yustam_admin_table_columns(): array
{
    static $columns = null;

    if (is_array($columns)) {
        return $columns;
    }

    $columns = [];

    try {
        $conn = get_db_connection();
        $result = $conn->query('SHOW COLUMNS FROM `' . YUSTAM_ADMINS_TABLE . '`');
        if ($result instanceof mysqli_result) {
            while ($row = $result->fetch_assoc()) {
                if (isset($row['Field'])) {
                    $columns[] = $row['Field'];
                }
            }
            $result->free();
        }
    } catch (Throwable $e) {
        error_log('Unable to inspect admin table columns: ' . $e->getMessage());
    }

    return $columns;
}

function yustam_admin_table_has_column(string $column): bool
{
    return in_array($column, yustam_admin_table_columns(), true);
}

function yustam_admin_email_column(): string
{
    foreach (['email', 'admin_email', 'username'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'email';
}

function yustam_admin_password_column(): string
{
    foreach (['password', 'password_hash', 'passcode'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'password';
}

function yustam_admin_name_column(): string
{
    foreach (['name', 'full_name', 'admin_name'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'name';
}

function yustam_admin_role_column(): ?string
{
    foreach (['role', 'admin_role', 'type'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return null;
}

function yustam_admin_id_column(): string
{
    foreach (['id', 'admin_id'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return 'id';
}

function yustam_admin_last_login_column(): ?string
{
    foreach (['last_login_at', 'last_login', 'last_active_at'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return null;
}

function yustam_admin_updated_column(): ?string
{
    foreach (['updated_at', 'updated_on', 'modified_at'] as $candidate) {
        if (yustam_admin_table_has_column($candidate)) {
            return $candidate;
        }
    }
    return null;
}
?>
