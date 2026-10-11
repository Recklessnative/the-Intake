#!/usr/bin/env bash
# Serves the game and api/ with PHP (SQLite database, mock Gemini) and plays through it.
set -euo pipefail
HERE=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d)
trap 'kill $(jobs -p) 2>/dev/null; rm -rf "$T"' EXIT
sed -e '/^  INDEX/d' -e 's/ UNSIGNED//' "$HERE/api/schema.sql" | perl -0pe 's/,\s*\n\)/\n)/g' > "$T/s.sql"
php -r '$p=new PDO("sqlite:'"$T"'/db.sqlite"); $p->exec(file_get_contents("'"$T"'/s.sql")); $p->exec("INSERT INTO intake_codes VALUES (\"COFFEE-TEST\", 2, 5, \"test\", 0)");'
cat > "$T/config.php" <<PHP
<?php return ['gemini_key'=>'K','models'=>['gemini-2.5-flash-lite'],'db_dsn'=>'sqlite:$T/db.sqlite','db_user'=>null,'db_pass'=>null,
'free_runs'=>2,'calls_per_run'=>60,'daily_calls'=>100,'max_output'=>1500,'ip_salt'=>'s','allowed_origins'=>[],
'gemini_base'=>'http://127.0.0.1:8794/'];
PHP
php -S 127.0.0.1:8794 "$HERE/tests/mock-gemini.php" >/dev/null 2>&1 &
INTAKE_CONFIG="$T/config.php" php -S 127.0.0.1:8793 -t "$HERE" >/dev/null 2>&1 &
sleep 1
node "$HERE/tests/backend-e2e.cjs"
