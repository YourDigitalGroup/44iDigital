<?php
// ── PUBLIC FORM ANTI-SPAM GUARD ──────────────────────────────────────────────
// Nov 2026: the Book a Demo form was being flooded, and send_form accepted
// anything a bot cared to POST. A public submission now has to clear, in order:
//   0. the visitor isn't blocked — by hand (CMS Spam Log) or automatically
//      (any visitor stopped twice in a day is locked out for seven days);
//   1. a form id this site actually publishes (data/forms.json), a hand-coded
//      form listed below, or one with a recipient override — anything else is
//      not a form, it's a relay attempt;
//   2. no spam tells: the honeypot field the runtime adds to every form must
//      be empty (autofill bots fill it), no blocked phrase, no gibberish name,
//      not the same junk pasted into every field, no link-stuffing, nothing
//      oversized;
//   3. a signed token the page fetched on load (form_token), at least 4 s old
//      and under 6 h — a script posting straight to the API has none, and a
//      bot that loads the page and fires instantly is too fast;
//   4. a per-IP rate: 3 accepted submissions per 10 minutes, 8 per day.
// Spam gets a quiet {"ok":true} so bots don't adapt; every block is appended
// to data/spam-log.json (visitors shown as a hash, never the address) so the
// team can see what's being caught. Recipients are never taken from the
// request any more — see cmsSendForm.
//
// Files in data/ (all denied over public HTTP, all server-written):
//   spam-rules.json  — the team's lists, edited from the CMS Spam Log screen:
//                      {"blockedPhrases":[...], "blockedVisitors":[hash...], "blockedIps":[addr...]}
//   spam-blocks.json — automatic blocks: {hash: {"count":n, "first":ts, "until":ts}}
//   spam-log.json    — the last 300 blocked attempts
//   ratelimit.json   — accepted-submission timestamps per visitor hash
require_once __DIR__ . '/gate_token.php';   // fourgeGatePepper(): the server-only secret

function cmsFormDataDir() { return __DIR__ . '/../data'; }
function cmsFormClientIp() { return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'); }
// The same visitor always maps to the same 16-character code; the address
// itself is never written anywhere.
function cmsFormVisitorKey($ip = null) { return substr(sha1($ip === null ? cmsFormClientIp() : (string)$ip), 0, 16); }

// Locked read-modify-write of a JSON file; $fn gets the decoded value (or
// $empty) and returns the new value. Serializes bursts of keystroke-speed bot
// posts so none of these small files can be interleaved into corruption.
function cmsFormJsonUpdate($name, callable $fn, $empty = []) {
    $dir = cmsFormDataDir();
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $fh = @fopen($dir . '/' . $name, 'c+');
    if (!$fh) return null;
    if (!flock($fh, LOCK_EX)) { fclose($fh); return null; }
    $raw = stream_get_contents($fh);
    $cur = json_decode($raw === '' ? 'null' : $raw, true);
    if ($cur === null) $cur = $empty;
    $new = $fn($cur);
    ftruncate($fh, 0); rewind($fh);
    fwrite($fh, json_encode($new, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)); fflush($fh);
    flock($fh, LOCK_UN); fclose($fh);
    return $new;
}
function cmsFormJsonRead($name, $empty = []) {
    $f = cmsFormDataDir() . '/' . $name;
    if (!is_file($f)) return $empty;
    $v = json_decode((string)file_get_contents($f), true);
    return $v === null ? $empty : $v;
}

// ── tokens ──
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

// ── which forms exist ──
// Hand-coded forms that post to send_form without a forms.json entry: the
// Willow chatbot's lead capture, the Fourge Insights sample request, and the
// white-label onboarding form. Anything else unknown is a relay attempt.
function cmsFormHandCodedIds() { return ['willow-partner-bot', 'fourge-insights-sample', 'whitelabel-onboarding']; }
function cmsFormIdAllowed($formId, $hasOverride) {
    if ($formId === '') return false;
    if ($hasOverride || in_array((string)$formId, cmsFormHandCodedIds(), true)) return true;
    $forms = cmsFormJsonRead('forms.json', null);
    if (!is_array($forms)) return false;
    $list = (isset($forms['forms']) && is_array($forms['forms'])) ? $forms['forms'] : $forms;
    foreach ($list as $fm) if (is_array($fm) && (string)($fm['id'] ?? '') === (string)$formId) return true;
    return false;
}

// ── the team's block lists + automatic visitor blocks ──
// Phrases blocked out of the box; the CMS list adds to these.
function cmsFormDefaultBlockedPhrases() { return ['LmMqtzme']; }
function cmsFormRules() {
    $r = cmsFormJsonRead('spam-rules.json', []);
    if (!is_array($r)) $r = [];
    $norm = fn($k) => array_values(array_filter(array_map(fn($v) => trim((string)$v), (array)($r[$k] ?? [])), 'strlen'));
    return ['blockedPhrases' => array_values(array_unique(array_merge(cmsFormDefaultBlockedPhrases(), $norm('blockedPhrases')))),
            'blockedVisitors' => $norm('blockedVisitors'), 'blockedIps' => $norm('blockedIps')];
}
function cmsFormIsBlockedVisitor(&$why, $autoAfter = 2, $autoDays = 7) {
    $why = '';
    $rules = cmsFormRules(); $ip = cmsFormClientIp(); $key = cmsFormVisitorKey($ip);
    if (in_array($ip, $rules['blockedIps'], true) || in_array($key, $rules['blockedVisitors'], true)) { $why = 'blocked visitor (manual)'; return true; }
    $auto = cmsFormJsonRead('spam-blocks.json', []);
    $rec = is_array($auto[$key] ?? null) ? $auto[$key] : null;
    if ($rec && (int)($rec['until'] ?? 0) > time()) { $why = 'blocked visitor (auto, until ' . date('Y-m-d H:i', (int)$rec['until']) . ')'; return true; }
    return false;
}
// Called on every block: the second block from one visitor inside 24 h locks
// that visitor out for $autoDays. Returns true when this call set the lock.
function cmsFormNoteBlock($autoAfter = 2, $autoDays = 7) {
    $key = cmsFormVisitorKey(); $now = time(); $locked = false;
    cmsFormJsonUpdate('spam-blocks.json', function ($auto) use ($key, $now, $autoAfter, $autoDays, &$locked) {
        if (!is_array($auto)) $auto = [];
        foreach ($auto as $k => $rec) {   // prune expired, long-finished records
            if (!is_array($rec) || ((int)($rec['until'] ?? 0) < $now && $now - (int)($rec['first'] ?? 0) > 86400)) unset($auto[$k]);
        }
        $rec = is_array($auto[$key] ?? null) ? $auto[$key] : ['count' => 0, 'first' => $now, 'until' => 0];
        if ($now - (int)$rec['first'] > 86400 && (int)$rec['until'] < $now) $rec = ['count' => 0, 'first' => $now, 'until' => 0];
        $rec['count'] = (int)$rec['count'] + 1;
        if ($rec['count'] >= $autoAfter && (int)$rec['until'] < $now) { $rec['until'] = $now + $autoDays * 86400; $locked = true; }
        $auto[$key] = $rec;
        return $auto;
    });
    return $locked;
}

// ── spam tells in the submission itself ──
// A "name" that is one run of letters with almost no vowels, or that flips
// case three or more times mid-word (LmMqtzme, XbQwRtz), is a bot's random
// string, not a person. Real names keep their vowels: McKenzie, DeVries, O'Neil.
function cmsFormLooksGibberish($v) {
    $v = trim((string)$v);
    if (!preg_match('~^[A-Za-z]{6,}$~', $v)) return false;
    $vowels = preg_match_all('~[aeiouyAEIOUY]~', $v);
    $flips = 0;
    for ($i = 1, $n = strlen($v); $i < $n; $i++) if (ctype_upper($v[$i]) !== ctype_upper($v[$i - 1])) $flips++;
    $consonantRun = preg_match('~[^aeiouyAEIOUY]{5,}~', $v);
    // McKenzie / DeVries flip case too, but keep their vowels; random strings don't.
    return $vowels <= 1 || $consonantRun || ($flips >= 3 && $vowels <= 2);
}
function cmsFormIsSpam(array $fields, &$why) {
    $why = '';
    if (trim((string)($fields['ff_website'] ?? '')) !== '') { $why = 'honeypot filled'; return true; }
    $text = ''; $values = [];
    foreach ($fields as $k => $v) { if (!is_scalar($v)) continue; $text .= ' ' . $k . ' ' . $v; if ($k !== 'ff_website') $values[(string)$k] = trim((string)$v); }
    if (strlen($text) > 20000) { $why = 'oversized (' . strlen($text) . ' chars)'; return true; }
    foreach (cmsFormRules()['blockedPhrases'] as $phrase) {
        if ($phrase !== '' && stripos($text, $phrase) !== false) { $why = 'blocked phrase "' . $phrase . '"'; return true; }
    }
    foreach ($values as $k => $v) {
        if (stripos($k, 'name') !== false && cmsFormLooksGibberish($v)) { $why = 'gibberish name "' . $v . '"'; return true; }
    }
    // the same junk pasted into three or more different fields
    $counts = [];
    foreach ($values as $v) if (strlen($v) >= 6 && !filter_var($v, FILTER_VALIDATE_EMAIL)) $counts[strtolower($v)] = ($counts[strtolower($v)] ?? 0) + 1;
    foreach ($counts as $v => $n) if ($n >= 3) { $why = 'same value in ' . $n . ' fields ("' . substr($v, 0, 30) . '")'; return true; }
    $urls = preg_match_all('~https?://|\bwww\.[a-z0-9-]+\.[a-z]{2,}~i', $text);
    if ($urls >= 3) { $why = $urls . ' links'; return true; }
    if (preg_match('~<a\s|\[url=|\[link=~i', $text)) { $why = 'markup link'; return true; }
    return false;
}

// ── per-visitor rate limit on ACCEPTED submissions ──
// Counted after the token check, so a bot flood from a shared network can't
// lock out the humans behind it.
function cmsFormRateLimited(&$why, $perTenMin = 3, $perDay = 8) {
    $why = ''; $key = cmsFormVisitorKey(); $now = time(); $limited = false;
    $r = cmsFormJsonUpdate('ratelimit.json', function ($all) use ($key, $now, $perTenMin, $perDay, &$limited, &$why) {
        if (!is_array($all)) $all = [];
        foreach ($all as $k => $ts) {
            $all[$k] = array_values(array_filter((array)$ts, fn($t) => $now - (int)$t < 86400));
            if (!$all[$k]) unset($all[$k]);
        }
        $mine = $all[$key] ?? [];
        $recent = count(array_filter($mine, fn($t) => $now - (int)$t < 600));
        $limited = $recent >= $perTenMin || count($mine) >= $perDay;
        if ($limited) $why = $recent . ' in 10 min, ' . count($mine) . ' today';
        else { $mine[] = $now; $all[$key] = $mine; }
        return $all;
    });
    return $r === null ? false : $limited;
}

// ── the log the team reads in the CMS ──
function cmsFormSpamLog($reason, $formId, array $fields) {
    $preview = '';
    foreach ($fields as $k => $v) {
        if (!is_scalar($v) || $k === 'ff_website') continue;
        $preview .= $k . ': ' . mb_substr(trim((string)$v), 0, 60) . ' | ';
        if (strlen($preview) > 300) break;
    }
    $locked = cmsFormNoteBlock();
    $entry = ['at' => date('Y-m-d H:i:s'), 'reason' => (string)$reason . ($locked ? ' → visitor auto-blocked 7 days' : ''),
              'formId' => (string)$formId, 'ip' => cmsFormVisitorKey(), 'preview' => $preview];
    cmsFormJsonUpdate('spam-log.json', function ($log) use ($entry) {
        if (!is_array($log)) $log = [];
        array_unshift($log, $entry);
        return array_slice($log, 0, 300);
    });
}
