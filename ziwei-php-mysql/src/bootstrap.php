<?php
declare(strict_types=1);

// Minimal .env loader: container/system environment always wins.
$envFile = dirname(__DIR__) . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$k, $v] = array_map('trim', explode('=', $line, 2));
        $v = trim($v, "\"'");
        if ($k !== '' && getenv($k) === false) putenv($k . '=' . $v);
    }
}

function envv(string $key, ?string $default = null): ?string
{
    $v = getenv($key);
    return ($v === false || $v === '') ? $default : $v;
}

date_default_timezone_set(envv('APP_TIMEZONE', 'Asia/Taipei') ?? 'Asia/Taipei');

final class ValidationException extends RuntimeException {}

function validation_error(string $message): never
{
    throw new ValidationException($message);
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = envv('DB_HOST', '127.0.0.1');
    $port = envv('DB_PORT', '3306');
    $name = envv('DB_NAME', 'ziwei');
    $user = envv('DB_USER', 'root');
    $pass = envv('DB_PASS', '');

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]);
    return $pdo;
}

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_response(['ok' => false, 'error' => 'JSON 格式錯誤'], 400);
    }
    return $data;
}

function require_method(string ...$methods): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (!in_array($method, $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        json_response(['ok' => false, 'error' => 'Method not allowed'], 405);
    }
}

function clean_string(mixed $v, int $max = 255): string
{
    $s = trim((string)$v);
    if (function_exists('mb_strlen') && function_exists('mb_substr')) {
        if (mb_strlen($s, 'UTF-8') > $max) $s = mb_substr($s, 0, $max, 'UTF-8');
    } elseif (strlen($s) > $max) {
        $s = substr($s, 0, $max);
    }
    return $s;
}

function validate_case(array $in): array
{
    $name = clean_string($in['name'] ?? '', 100);
    if ($name === '') $name = '匿名';

    $calendarType = (string)($in['calendar_type'] ?? 'solar');
    if (!in_array($calendarType, ['solar', 'lunar'], true)) $calendarType = 'solar';

    $year = filter_var($in['birth_year'] ?? null, FILTER_VALIDATE_INT);
    $month = filter_var($in['birth_month'] ?? null, FILTER_VALIDATE_INT);
    $day = filter_var($in['birth_day'] ?? null, FILTER_VALIDATE_INT);
    if ($year === false || $year < 1900 || $year > 2100 || $month === false || $month < 1 || $month > 12 || $day === false) {
        validation_error('出生年月日格式錯誤（目前支援 1900–2100）');
    }
    if ($calendarType === 'solar') {
        if (!checkdate((int)$month, (int)$day, (int)$year)) {
            validation_error('公曆日期不存在');
        }
    } elseif ($day < 1 || $day > 30) {
        validation_error('農曆日期需為 1–30 日');
    }

    $hour = filter_var($in['birth_hour'] ?? null, FILTER_VALIDATE_INT);
    if ($hour === false || $hour < 0 || $hour > 23) {
        validation_error('出生時間需為 0–23 時');
    }

    $gender = (string)($in['gender'] ?? '');
    if (!in_array($gender, ['男', '女'], true)) {
        validation_error('性別格式錯誤');
    }

    $chartJson = $in['chart_json'] ?? null;
    if (is_array($chartJson)) {
        $chartJson = json_encode($chartJson, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    } elseif (is_string($chartJson) && trim($chartJson) !== '') {
        try {
            $decoded = json_decode($chartJson, true, 512, JSON_THROW_ON_ERROR);
            $chartJson = json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            validation_error('命盤快照 JSON 格式錯誤');
        }
    } else {
        $chartJson = null;
    }

    $timezone = clean_string($in['timezone'] ?? 'Asia/Taipei', 64) ?: 'Asia/Taipei';
    if (!in_array($timezone, timezone_identifiers_list(), true)) {
        validation_error('時區格式錯誤');
    }

    return [
        'name' => $name,
        'birth_year' => (int)$year,
        'birth_month' => (int)$month,
        'birth_day' => (int)$day,
        'birth_hour' => (int)$hour,
        'gender' => $gender,
        'calendar_type' => $calendarType,
        'is_leap_month' => !empty($in['is_leap_month']) ? 1 : 0,
        'fix_leap' => array_key_exists('fix_leap', $in) && !$in['fix_leap'] ? 0 : 1,
        'timezone' => $timezone,
        'note' => clean_string($in['note'] ?? '', 10000),
        'chart_json' => $chartJson,
    ];
}
