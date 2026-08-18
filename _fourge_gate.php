<?php
// Fourge page gate — protects the pages listed in admin/protect.secret.php.
// Managed by the CMS; do not edit by hand.
$store = __DIR__ . '/admin/protect.secret.php';
$map = is_file($store) ? (include $store) : array();
if (!is_array($map)) $map = array();
$p = isset($_GET['p']) ? (string)$_GET['p'] : '';
$p = ltrim(str_replace('\\', '/', $p), '/');
if ($p === '' || strpos($p, '..') !== false || !array_key_exists($p, $map)) { http_response_code(404); echo 'Not found'; exit; }
$file = realpath(__DIR__ . '/' . $p);
$root = realpath(__DIR__);
if (!$file || strpos($file, $root) !== 0 || !is_file($file)) { http_response_code(404); echo 'Not found'; exit; }
$secure = (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') || ((isset($_SERVER['HTTP_X_FORWARDED_PROTO']) ? $_SERVER['HTTP_X_FORWARDED_PROTO'] : '') === 'https');
if (PHP_VERSION_ID >= 70300) {
    session_set_cookie_params(array('lifetime'=>0,'path'=>'/','httponly'=>true,'samesite'=>'Lax','secure'=>$secure));
} else {
    session_set_cookie_params(0, '/; samesite=Lax', '', $secure, true);
}
session_name('fourge_gate');
session_start();
if (!empty($_SESSION['fourge_unlocked'][$p])) {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: private, no-store');
    readfile($file); exit;
}
$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pw = isset($_POST['fourge_pw']) ? (string)$_POST['fourge_pw'] : '';
    if ($pw !== '' && password_verify($pw, $map[$p])) {
        session_regenerate_id(true);
        $_SESSION['fourge_unlocked'][$p] = true;
        header('Location: /' . $p); exit;
    }
    usleep(400000);
    $err = 'Incorrect password. Please try again.';
}
// 401 for every form render (visitor is not unlocked). No WWW-Authenticate header,
// so browsers show this HTML form rather than the native Basic-Auth popup.
http_response_code(401);
$e = function($s){ return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
?><!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Protected page</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f2ee;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1a1814;padding:20px}
.card{background:#fff;border:1px solid #e6e1d8;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.08);padding:34px 30px;width:100%;max-width:380px;text-align:center}
.lock{width:46px;height:46px;border-radius:12px;background:#fdf0e8;color:#c8531e;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
h1{font-size:18px;margin:0 0 6px}p.sub{font-size:13px;color:#6b6557;margin:0 0 20px}
input[type=password]{width:100%;padding:11px 13px;border:1px solid #d9d3c8;border-radius:10px;font-size:14px;margin-bottom:12px}
input[type=password]:focus{outline:none;border-color:#c8531e;box-shadow:0 0 0 3px rgba(200,83,30,.12)}
button{width:100%;padding:11px;background:#c8531e;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer}
button:hover{background:#b0481a}.err{background:#fceae6;color:#b3261e;border:1px solid #f3c0bb;border-radius:8px;padding:8px 10px;font-size:12px;margin-bottom:12px}
</style></head>
<body><div class="card">
<div class="lock"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
<h1>This page is protected</h1><p class="sub">Enter the password to continue.</p>
<?php if ($err) echo '<div class="err">' . $e($err) . '</div>'; ?>
<form method="post" action="/<?php echo $e($p); ?>">
<input type="password" name="fourge_pw" placeholder="Password" autofocus autocomplete="current-password">
<button type="submit">Unlock</button>
</form>
</div></body></html>
