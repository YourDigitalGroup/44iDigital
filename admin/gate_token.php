<?php
// ── Page-gate unlock cookie ───────────────────────────────────────────────────
// Shared by the public page gate (_fourge_gate.php) and the API actions that
// must only serve unlocked visitors (cmsOnboardingUpload). The unlock used to
// live solely in a PHP session with a browser-session cookie: the server
// garbage-collects idle sessions after ~24 minutes on typical hosting, so a
// partner who unlocked /onboarding and then spent half an hour filling in the
// form was told to "unlock the onboarding page first" on submit. The unlock is
// now a signed, self-contained cookie that lasts FOURGE_GATE_DAYS and is
// renewed on every visit — no server-side state to expire.
//
// Signature key = the page's own password hash + a server-only pepper, so
// changing the page password invalidates every outstanding unlock, and the
// cookie cannot be forged from the repository alone.
define('FOURGE_GATE_DAYS', 30);

function fourgeGatePepper() {
    $f = __DIR__ . '/gate.pepper.secret.php';
    if (is_file($f)) { $v = include $f; if (is_string($v) && $v !== '') return $v; }
    $v = bin2hex(random_bytes(32));
    @file_put_contents($f, "<?php\nreturn '" . $v . "';\n", LOCK_EX);
    return $v;
}
function fourgeGateCookieName($p) { return 'fourge_unlock_' . substr(sha1((string)$p), 0, 8); }
function fourgeGateKey(array $map, $p) { return hash('sha256', 'fourge-gate|' . $p . '|' . (string)($map[$p] ?? '') . '|' . fourgeGatePepper()); }
function fourgeGateSign(array $map, $p, $exp) { return hash_hmac('sha256', $p . '|' . $exp, fourgeGateKey($map, $p)); }
function fourgeGateSecure() {
    return (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off')
        || ((isset($_SERVER['HTTP_X_FORWARDED_PROTO']) ? $_SERVER['HTTP_X_FORWARDED_PROTO'] : '') === 'https');
}
// Issue (or renew) the unlock cookie for $p.
function fourgeGateIssue(array $map, $p) {
    $exp = time() + FOURGE_GATE_DAYS * 86400;
    $val = $exp . '.' . fourgeGateSign($map, $p, $exp);
    $opts = array('expires' => $exp, 'path' => '/', 'secure' => fourgeGateSecure(), 'httponly' => true, 'samesite' => 'Lax');
    if (PHP_VERSION_ID >= 70300) setcookie(fourgeGateCookieName($p), $val, $opts);
    else setcookie(fourgeGateCookieName($p), $val, $exp, '/; samesite=Lax', '', $opts['secure'], true);
    $_COOKIE[fourgeGateCookieName($p)] = $val;
}
// True when the request carries a valid, unexpired unlock cookie for $p.
function fourgeGateVerify(array $map, $p) {
    $raw = isset($_COOKIE[fourgeGateCookieName($p)]) ? (string)$_COOKIE[fourgeGateCookieName($p)] : '';
    if ($raw === '' || !array_key_exists($p, $map)) return false;
    $parts = explode('.', $raw, 2);
    if (count($parts) !== 2 || !ctype_digit($parts[0])) return false;
    $exp = (int)$parts[0];
    if ($exp < time()) return false;
    return hash_equals(fourgeGateSign($map, $p, $exp), $parts[1]);
}
