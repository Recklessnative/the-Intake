<?php
// Copy this file to intake-config.php ONE FOLDER ABOVE your web root (for example
// next to public_html/), so nobody can download it. If your host does not allow
// that, put it next to index.php as config.php; the .htaccess here blocks access to it.
return [
    // Gemini key from Google AI Studio. Billing is on this key.
    'gemini_key'     => 'PASTE-YOUR-KEY-HERE',
    // Models the game may ask for. The first one is the default.
    'models'         => ['gemini-3.5-flash-lite', 'gemini-3.6-flash'],

    // Database (shared hosting MySQL).
    'db_dsn'         => 'mysql:host=localhost;dbname=YOUR_DB;charset=utf8mb4',
    'db_user'        => 'YOUR_DB_USER',
    'db_pass'        => 'YOUR_DB_PASSWORD',

    // Free runs per player on your key. A browser token and an IP address each count.
    'free_runs'      => 3,
    // Gemini calls one run may make (a full week is about 30 to 65, with three examiner and three boldness runs per request).
    'calls_per_run'  => 80,
    // A week counts as played at its first scorecard, or once it used this many calls.
    'charge_after_calls' => 15,
    // Hard stop for the whole site per day, whatever happens.
    'daily_calls'    => 3000,
    // Largest answer the game may request, in tokens (thinking tokens count too).
    'max_output'     => 4000,

    // Long random string, used to hash IP addresses. Change it once, then leave it.
    'ip_salt'        => 'CHANGE-ME-TO-SOMETHING-LONG-AND-RANDOM',

    // Sites allowed to call this API from a browser (the game's own address).
    'allowed_origins'=> ['https://yannickwillems.be', 'https://www.yannickwillems.be', 'https://recklessnative.github.io'],
];
