<?php
// Fourge page gate — protects the pages listed in admin/protect.secret.php.
// Branded for 44idigital.com (site header/footer + brand colors); the unlock
// logic is identical to the CMS-generated gate. NOTE: if the CMS's
// set_page_password action ever regenerates this file, it will reset the
// styling to the generic template (the password-check behavior is the same).
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
// The Clean URLs block 301-redirects any explicit ".html" request — and a
// browser following that redirect converts the POST to a GET, silently
// dropping the submitted password. So both the form action and the unlock
// redirect must use the page's EXTENSIONLESS address.
$clean = '/' . preg_replace('/\.html$/', '', $p);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pw = isset($_POST['fourge_pw']) ? (string)$_POST['fourge_pw'] : '';
    if ($pw !== '' && password_verify($pw, $map[$p])) {
        session_regenerate_id(true);
        $_SESSION['fourge_unlocked'][$p] = true;
        header('Location: ' . $clean); exit;
    }
    usleep(400000);
    $err = 'Incorrect password. Please try again.';
}
// 401 for every form render (visitor is not unlocked). No WWW-Authenticate header,
// so browsers show this HTML form rather than the native Basic-Auth popup.
http_response_code(401);
$e = function($s){ return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Protected Page | 44i Digital</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/shared.css">
<style>
.gate-hero{background:var(--ink,#2c4863);padding:60px 0 120px}
.gate-hero .inner{max-width:860px;margin:0 auto;padding:0 clamp(20px,5vw,32px);text-align:center}
.gate-hero .gate-kicker{display:block;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-bottom:18px;color:var(--accent-blue,#629ad0)}
.gate-hero h1{font-family:'Manrope',system-ui,sans-serif;font-weight:800;letter-spacing:-.02em;line-height:1.08;font-size:clamp(32px,4vw,48px);color:#fff;margin:0}
.gate-shell{max-width:420px;margin:-70px auto 90px;position:relative;z-index:2;background:var(--paper,#fff);border-radius:22px;padding:38px 34px;box-shadow:var(--shadow-lg,0 24px 60px rgba(44,72,99,.18));text-align:center}
.gate-lock{width:52px;height:52px;border-radius:14px;background:#eef2f8;color:var(--blue,#2c4863);display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.gate-shell h2{font-family:'Manrope',system-ui,sans-serif;font-weight:800;color:var(--ink,#2c4863);font-size:20px;margin:0 0 6px}
.gate-shell p.gate-sub{font-size:14px;color:var(--ink-quiet,#6b7a89);margin:0 0 20px}
.gate-shell input[type=password]{width:100%;padding:12px 14px;border:1px solid #d8d4cc;border-radius:10px;font-size:15px;font-family:inherit;box-sizing:border-box;margin-bottom:12px;color:var(--ink,#2c4863)}
.gate-shell input[type=password]:focus{outline:none;border-color:var(--accent-blue,#629ad0);box-shadow:0 0 0 3px rgba(98,154,208,.18)}
.gate-shell button{width:100%;padding:12px;background:var(--blue,#2c4863);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer}
.gate-shell button:hover{opacity:.92}
.gate-err{background:#fee2e2;color:#991b1b;border-radius:8px;padding:9px 11px;font-size:13px;margin-bottom:12px}
.gate-help{font-size:12.5px;color:var(--ink-quiet,#6b7a89);margin-top:16px}
.gate-help a{color:var(--blue,#2c4863);font-weight:600}
</style>
</head>
<body class="nav-on-blog">
<a href="#main" style="position:absolute;left:-9999px;top:0;">Skip to main content</a>
<header>
<nav class="top" aria-label="Primary">
  <div class="wrap">
    <a class="logo" href="index.html" aria-label="44i Digital — Return to homepage"><img src="/assets/44i-digital-logo.svg" alt="44i Digital logo"></a>
    <ul>
      <li class="has-menu"><a href="#">Who We Serve</a>
        <div class="dropdown"><div class="dropdown-inner">
          <a href="tv-radio.html">TV &amp; Radio Broadcasters<span class="desc">For station and group leaders</span></a>
          <a href="agencies.html">Advertising Agencies<span class="desc">Fill every gap, invisibly</span></a>
          <a href="publishers.html">Publishers<span class="desc">Newsrooms &amp; media publishers</span></a>
          <a href="ooh.html">OOH Groups<span class="desc">Out-of-home &amp; billboard operators</span></a>
        </div></div>
      </li>
      <li class="has-menu"><a href="services.html">What We Do</a>
        <div class="dropdown"><div class="dropdown-inner">
          <a href="services.html#tier-1">Online Visibility<span class="desc">The foundation — websites, SEO, GBP</span></a>
          <a href="services.html#tier-2">Content Marketing<span class="desc">The walls — social, email, reputation</span></a>
          <a href="services.html#tier-3">Targeted Digital<span class="desc">The roof — programmatic, OTT, SEM</span></a>
        </div></div>
      </li>
      <li><a href="why-44i.html">Why 44i Digital</a></li>
      <li><a href="success-stories.html">Stories</a></li>
      <li><a href="blog.html">Blog</a></li>
    </ul>
    <div class="nav-right">
      <button type="button" class="nav-burger" data-nav-burger="" aria-label="Open menu" aria-expanded="false"><span class="bar"></span></button>
      <a class="nav-phone" href="tel:6052717321"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg><span class="phone-label">605.271.7321</span></a>
      <a class="btn btn-primary" href="book-a-demo.html">Book a Demo</a>
    </div>
  </div>
</nav>
</header>
<main id="main">
<div class="gate-hero"><div class="inner">
<span class="gate-kicker">Partners Only</span>
<h1>This page is protected</h1>
</div></div>
<div class="gate-shell">
<div class="gate-lock"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
<h2>Enter the password to continue</h2>
<p class="gate-sub">This area is reserved for 44i Digital partners.</p>
<?php if ($err) echo '<div class="gate-err">' . $e($err) . '</div>'; ?>
<form method="post" action="<?php echo $e($clean); ?>">
<input type="password" name="fourge_pw" placeholder="Password" autofocus autocomplete="current-password" aria-label="Password">
<button type="submit">Unlock</button>
</form>
<p class="gate-help">Don&rsquo;t have the password? Call us at <a href="tel:6052717321">605.271.7321</a>.</p>
</div>
</main>
<footer>
  <div class="container">
    <div class="foot-grid">
      <div class="foot-col">
        <a class="footer-logo" href="index.html" aria-label="44i Digital">
          <img src="/assets/44i-digital-logo-reverse.svg" alt="44i Digital logo">
        </a>
        <p class="foot-tagline">The white label partner that picks up the phone.</p>
        <div class="foot-contact">
          1600 S. Western Ave.<br>
          Sioux Falls, SD 57105<br>
          <a href="tel:6052717321">605.271.7321</a>
        </div>
      </div>
      <div class="foot-col">
        <h5>Who We Serve</h5>
        <ul>
          <li><a href="tv-radio.html">TV &amp; Radio</a></li>
          <li><a href="agencies.html">Advertising Agencies</a></li>
          <li><a href="publishers.html">Publishers</a></li>
          <li><a href="ooh.html">OOH Groups</a></li>
        </ul>
      </div>
      <div class="foot-col">
        <h5>What We Do</h5>
        <ul>
          <li><a href="services.html#tier-1">Online Visibility</a></li>
          <li><a href="services.html#tier-2">Content Marketing</a></li>
          <li><a href="services.html#tier-3">Targeted Digital</a></li>
          <li><a href="services.html">All Services</a></li>
        </ul>
      </div>
      <div class="foot-col">
        <h5>Why 44i Digital</h5>
        <ul>
          <li><a href="why-44i.html">The 44i Digital Difference</a></li>
          <li><a href="success-stories.html">Success Stories</a></li>
          <li><a href="blog.html">Blog</a></li>
          <li><a href="book-a-demo.html">Book a Demo</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      <div>© 2026 44i Digital. All rights reserved.</div>
      <div>
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Accessibility Statement</a>
        <a href="#">Partner Login</a>
      </div>
    </div>
  </div>
</footer>
<script defer src="/nav.js"></script>
</body>
</html>
