<?php
// THE INTAKE backend: run cap, unlock codes and a Gemini proxy that keeps the key on the server.
// One file, no framework, PHP 7.4+ with PDO. Called as index.php?action=status|start|unlock|gemini.

declare(strict_types=1);

function config(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $candidates = [
        getenv('INTAKE_CONFIG') ?: '',
        dirname(__DIR__, 2) . '/intake-config.php',
        __DIR__ . '/config.php',
    ];
    foreach ($candidates as $file) {
        if ($file !== '' && is_file($file)) return $cfg = require $file;
    }
    fail(500, 'The server is not configured yet.');
}

function fail(int $status, string $message, array $extra = []): void {
    http_response_code($status);
    echo json_encode(['error' => $message] + $extra);
    exit;
}

function ok(array $data): void {
    echo json_encode($data);
    exit;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = config();
    $pdo = new PDO($c['db_dsn'], $c['db_user'] ?? null, $c['db_pass'] ?? null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function q(string $sql, array $args = []): PDOStatement {
    $st = db()->prepare($sql);
    $st->execute($args);
    return $st;
}

function one(string $sql, array $args = []) {
    return q($sql, $args)->fetchColumn();
}

function newId(): string { return bin2hex(random_bytes(16)); }

function ipHash(): string {
    return hash('sha256', config()['ip_salt'] . '|' . ($_SERVER['REMOTE_ADDR'] ?? ''));
}

function validToken($t): bool { return is_string($t) && preg_match('/^[a-f0-9]{32}$/', $t) === 1; }

// Make sure the player exists and return their row.
function player(?string $token): array {
    if (!validToken($token)) $token = newId();
    $row = q('SELECT * FROM intake_players WHERE token = ?', [$token])->fetch();
    if (!$row) {
        q('INSERT INTO intake_players (token, ip_hash, bonus_runs, created_at) VALUES (?, ?, 0, ?)', [$token, ipHash(), time()]);
        $row = ['token' => $token, 'ip_hash' => ipHash(), 'bonus_runs' => 0];
    }
    return $row;
}

// Runs left: the player's own count against free + bonus, and the IP's count against a
// looser limit (an office shares one IP), so clearing the browser alone doesn't reset it.
function runsLeft(array $p): int {
    $c = config();
    $free = (int)$c['free_runs'];
    $bonus = (int)$p['bonus_runs'];
    $byToken = (int)one('SELECT COUNT(*) FROM intake_runs WHERE token = ?', [$p['token']]);
    $byIp = (int)one('SELECT COUNT(*) FROM intake_runs WHERE ip_hash = ?', [ipHash()]);
    $left = $free + $bonus - $byToken;
    if ($bonus === 0) $left = min($left, $free * 3 - $byIp);
    return max(0, $left);
}

// ---------- request plumbing ----------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, config()['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail(405, 'POST only.');

$raw = file_get_contents('php://input', false, null, 0, 200000);
$in = json_decode($raw ?: '{}', true);
if (!is_array($in)) fail(400, 'Expected JSON.');

$action = $_GET['action'] ?? '';

try {
    if ($action === 'status') {
        $p = player($in['token'] ?? null);
        ok(['token' => $p['token'], 'runsLeft' => runsLeft($p)]);
    }

    if ($action === 'start') {
        $p = player($in['token'] ?? null);
        $left = runsLeft($p);
        if ($left <= 0) fail(402, 'No free runs left.', ['token' => $p['token'], 'runsLeft' => 0, 'capped' => true]);
        $run = newId();
        q('INSERT INTO intake_runs (id, token, ip_hash, calls, started_at) VALUES (?, ?, ?, 0, ?)', [$run, $p['token'], ipHash(), time()]);
        ok(['token' => $p['token'], 'runId' => $run, 'runsLeft' => $left - 1]);
    }

    if ($action === 'unlock') {
        $p = player($in['token'] ?? null);
        $code = strtoupper(trim((string)($in['code'] ?? '')));
        if ($code === '' || strlen($code) > 40) fail(400, 'That is not a code.');
        $c = q('SELECT * FROM intake_codes WHERE code = ?', [$code])->fetch();
        if (!$c || (int)$c['uses_left'] <= 0) fail(404, 'That code does not work (any more).');
        if (one('SELECT COUNT(*) FROM intake_redemptions WHERE code = ? AND token = ?', [$code, $p['token']])) fail(409, 'You already used this code.');
        db()->beginTransaction();
        $taken = q('UPDATE intake_codes SET uses_left = uses_left - 1 WHERE code = ? AND uses_left > 0', [$code])->rowCount();
        if (!$taken) { db()->rollBack(); fail(404, 'That code does not work (any more).'); }
        q('INSERT INTO intake_redemptions (code, token, redeemed_at) VALUES (?, ?, ?)', [$code, $p['token'], time()]);
        q('UPDATE intake_players SET bonus_runs = bonus_runs + ? WHERE token = ?', [(int)$c['runs'], $p['token']]);
        db()->commit();
        $p['bonus_runs'] = (int)$p['bonus_runs'] + (int)$c['runs'];
        ok(['token' => $p['token'], 'runsLeft' => runsLeft($p)]);
    }

    if ($action === 'gemini') {
        $cfg = config();
        $runId = $in['runId'] ?? '';
        if (!validToken($runId)) fail(400, 'Missing run.');
        $run = q('SELECT * FROM intake_runs WHERE id = ?', [$runId])->fetch();
        if (!$run) fail(403, 'Unknown run.');
        if (time() - (int)$run['started_at'] > 6 * 3600) fail(403, 'This run has expired. Start a new week.');
        if ((int)$run['calls'] >= (int)$cfg['calls_per_run']) fail(429, 'This run has used all its Gemini calls.');

        $day = date('Y-m-d');
        $today = one('SELECT calls FROM intake_daily WHERE day = ?', [$day]);
        if ($today === false) {
            try { q('INSERT INTO intake_daily (day, calls) VALUES (?, 0)', [$day]); } catch (PDOException $e) { /* another request created it first */ }
            $today = 0;
        }
        if ((int)$today >= (int)$cfg['daily_calls']) fail(503, 'THE INTAKE is closed for today. Come back tomorrow, or use your own Gemini key.');

        $model = $in['model'] ?? $cfg['models'][0];
        if (!in_array($model, $cfg['models'], true)) $model = $cfg['models'][0];

        // Forward only the parts of the request the game uses, with the output capped.
        $r = $in['request'] ?? [];
        if (!is_array($r) || !isset($r['contents']) || !is_array($r['contents'])) fail(400, 'Bad request.');
        $gen = is_array($r['generationConfig'] ?? null) ? $r['generationConfig'] : [];
        $gen['maxOutputTokens'] = min((int)($gen['maxOutputTokens'] ?? 800), (int)$cfg['max_output']);
        $body = ['contents' => $r['contents'], 'generationConfig' => $gen];
        if (isset($r['systemInstruction'])) $body['systemInstruction'] = $r['systemInstruction'];

        q('UPDATE intake_runs SET calls = calls + 1 WHERE id = ?', [$runId]);
        q('UPDATE intake_daily SET calls = calls + 1 WHERE day = ?', [$day]);

        $base = $cfg['gemini_base'] ?? 'https://generativelanguage.googleapis.com/v1beta/models/';
        $url = $base . rawurlencode($model) . ':generateContent';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $cfg['gemini_key']],
            CURLOPT_POSTFIELDS => json_encode($body),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
        ]);
        $res = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($res === false) fail(502, 'Could not reach Gemini: ' . $err);
        http_response_code($status ?: 502);
        echo $res;
        exit;
    }

    fail(404, 'Unknown action.');
} catch (Throwable $e) {
    error_log('[intake] ' . $e->getMessage());
    fail(500, 'Something went wrong on the server.');
}
