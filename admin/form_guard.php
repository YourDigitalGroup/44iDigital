<?php
// ── PUBLIC FORM ANTI-SPAM GUARD ──────────────────────────────────────────────
// Nov 2026: the Book a Demo form was being flooded, and send_form accepted
// anything a bot cared to POST. A public submission now has to clear, in order:
//   1. a form id this site actually publishes (data/forms.json) or one with a
//      recipient override — anything else is not a form, it's a relay attempt;
//   2. no spam tells: the honeypot field the runtime adds to every form must
//      be empty (autofill bots fill it), no link-stuffing, nothing oversized;
//   3. a signed token the page fetched on load (form_token), at least 4 s old
//      and under 6 h — a script posting straight to the API has none, and a
//      bot that loads the page and fires instantly is too fast;
//   4. a per-IP rate: 3 accepted submissions per 10 minutes, 8 per day.
// Spam gets a quiet {"ok":true} so bots don't adapt; every block is appended
// to data/spam-log.json (IPs hashed) so the team can see what's being caught.
// Recipients are never taken from the request any more — see cmsSendForm.
require_once __DIR__ . '/gate_token.php';   // fourgeGatePepper(): the server-only secret

function cmsFormDataDir() { return __DIR__ . '/../data'; }
function cmsFormTokenKey() { return hash('sha256', 'fourge-form-token|' . fourgeGatePepper()); }
function cmsFormToken() { $ts = time(); return $ts . '.' . hash_hmac('sha256', (string)$ts, cmsFormTokenKey()); }
function cmsFormTokenValid($tok, &$why, $minAge = 4, $maxAge = 21600) {
    $why = '';
    $p = explode('.', (string)$tok, 2);
    if (count($p) !== 2 || $p[0] === '' || !ctype_digit($p[0])) { $why = 'missing'; return false; }
    if (!hash_equals(hash_hmac('sha256', $p[0], cmsFormTokenKey()), $p[1])) { $why = 'bad signature'; return false; }
    $age = time() - (int)$p[0];
    if ($age < $minAge) { $why = 'too fast (' . $age . 's)'; return false; }
    if ($age > $maxAge) { $why = 'expired'; return false; }
    return true;
}
function cmsFormIdAllowed($formId, $hasOverride) {
    if ($formId === '') return false;
    if ($hasOverride) return true;
    $f = cmsFormDataDir() . '/forms.json';
    $forms = is_file($f) ? json_decode((string)file_get_contents($f), true) : null;
    if (!is_array($forms)) return false;
    $list = (isset($forms['forms']) && is_array($forms['forms'])) ? $forms['forms'] : $forms;
    foreach ($list as $fm) if (is_array($fm) && (string)($fm['id'] ?? '') === (string)$formId) return true;
    return false;
}
function cmsFormIsSpam(array $fields, &$why) {
    $why = '';
    if (trim((string)($fields['ff_website'] ?? '')) !== '') { $why = 'honeypot filled'; return true; }
    $text = '';
    foreach ($fields as $v) if (is_scalar($v)) $text .= ' ' . $v;
    if (strlen($text) > 20000) { $why = 'oversized (' . strlen($text) . ' chars)'; return true; }
    $urls = preg_match_all('~https?://|\bwww\.[a-z0-9-]+\.[a-z]{2,}~i', $text);
    if ($urls >= 3) { $why = $urls . ' links'; return true; }
    if (preg_match('~<a\s|\[url=|\[link=~i', $text)) { $why = 'markup link'; return true; }
    return false;
}
function cmsFormClientIp() { return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'); }
// Counts ACCEPTED submissions only (called after the token check), so a bot
// flood from a shared network can't lock out the humans behind it.
function cmsFormRateLimited(&$why, $perTenMin = 3, $perDay = 8) {
    $why = '';
    $f = cmsFormDataDir() . '/ratelimit.json';
    $key = substr(sha1(cmsFormClientIp()), 0, 16); $now = time();
    $fh = @fopen($f, 'c+'); if (!$fh) return false;
    if (!flock($fh, LOCK_EX)) { fclose($fh); return false; }
    $raw = stream_get_contents($fh);
    $all = json_decode($raw === '' ? '[]' : $raw, true); if (!is_array($all)) $all = [];
    foreach ($all as $k => $ts) {
        $all[$k] = array_values(array_filter((array)$ts, fn($t) => $now - (int)$t < 86400));
        if (!$all[$k]) unset($all[$k]);
    }
    $mine = $all[$key] ?? [];
    $recent = count(array_filter($mine, fn($t) => $now - (int)$t < 600));
    $limited = $recent >= $perTenMin || count($mine) >= $perDay;
    if ($limited) $why = $recent . ' in 10 min, ' . count($mine) . ' today';
    else { $mine[] = $now; $all[$key] = $mine; }
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($all)); fflush($fh);
    flock($fh, LOCK_UN); fclose($fh);
    return $limited;
}
function cmsFormSpamLog($reason, $formId, array $fields) {
    $f = cmsFormDataDir() . '/spam-log.json';
    $fh = @fopen($f, 'c+'); if (!$fh) return;
    if (!flock($fh, LOCK_EX)) { fclose($fh); return; }
    $raw = stream_get_contents($fh);
    $log = json_decode($raw === '' ? '[]' : $raw, true); if (!is_array($log)) $log = [];
    $preview = '';
    foreach ($fields as $k => $v) {
        if (!is_scalar($v) || $k === 'ff_website') continue;
        $preview .= $k . ': ' . mb_substr(trim((string)$v), 0, 60) . ' | ';
        if (strlen($preview) > 300) break;
    }
    array_unshift($log, ['at' => date('Y-m-d H:i:s'), 'reason' => (string)$reason, 'formId' => (string)$formId,
        'ip' => substr(sha1(cmsFormClientIp()), 0, 10), 'preview' => $preview]);
    $log = array_slice($log, 0, 300);
    ftruncate($fh, 0); rewind($fh); fwrite($fh, json_encode($log, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)); fflush($fh);
    flock($fh, LOCK_UN); fclose($fh);
}
