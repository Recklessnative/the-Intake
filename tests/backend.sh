#!/usr/bin/env bash
# Exercises api/index.php against SQLite and a mock Gemini. Needs php with pdo_sqlite and curl.
set -euo pipefail
HERE=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d)
trap 'kill $(jobs -p) 2>/dev/null; rm -rf "$T"' EXIT

# MySQL schema -> SQLite (drop inline INDEX lines and UNSIGNED)
sed -e '/^  INDEX/d' -e 's/ UNSIGNED//' "$HERE/api/schema.sql" | perl -0pe 's/,\s*\n\)/\n)/g' > "$T/schema.sqlite.sql"
php -r '$p=new PDO("sqlite:'"$T"'/db.sqlite"); $p->exec(file_get_contents("'"$T"'/schema.sqlite.sql"));'
php -r '$p=new PDO("sqlite:'"$T"'/db.sqlite"); $p->exec("INSERT INTO intake_codes VALUES (\"COFFEE-TEST\", 2, 1, \"test\", 0)");'

mkdir "$T/mock"
cat > "$T/mock/index.php" <<'PHP'
<?php
$in = json_decode(file_get_contents('php://input'), true);
header('Content-Type: application/json');
echo json_encode(['candidates' => [['content' => ['parts' => [['text' => json_encode([
  'key' => $_SERVER['HTTP_X_GOOG_API_KEY'] ?? '', 'path' => $_SERVER['REQUEST_URI'], 'max' => $in['generationConfig']['maxOutputTokens'], 'sys' => isset($in['systemInstruction']), 'temp' => isset($in['generationConfig']['temperature'])
])]]]]]]);
PHP
cat > "$T/config.php" <<PHP
<?php return ['gemini_key'=>'SERVER-KEY','models'=>['gemini-3.5-flash-lite'],'db_dsn'=>'sqlite:$T/db.sqlite','db_user'=>null,'db_pass'=>null,
'free_runs'=>2,'calls_per_run'=>3,'daily_calls'=>100,'max_output'=>1500,'ip_salt'=>'salt','allowed_origins'=>['https://example.test'],
'gemini_base'=>'http://127.0.0.1:8792/models/'];
PHP
php -S 127.0.0.1:8792 -t "$T/mock" "$T/mock/index.php" >/dev/null 2>&1 &
INTAKE_CONFIG="$T/config.php" php -S 127.0.0.1:8791 -t "$HERE/api" >/dev/null 2>&1 &
sleep 1
API=http://127.0.0.1:8791/index.php
call() { curl -s -w ' %{http_code}' -H 'Content-Type: application/json' -H 'Origin: https://example.test' -d "$2" "$API?action=$1"; echo; }
fails=0
check() { if [[ "$2" == *"$3"* ]]; then echo "ok   $1"; else echo "FAIL $1: $2"; fails=$((fails+1)); fi; }

r=$(call status '{}'); check "status gives a token and 2 runs" "$r" '"runsLeft":2'
TOKEN=$(echo "$r" | sed -E 's/.*"token":"([a-f0-9]{32})".*/\1/')
r=$(call start "{\"token\":\"$TOKEN\"}"); check "first run starts" "$r" '"runsLeft":1'
RUN=$(echo "$r" | sed -E 's/.*"runId":"([a-f0-9]{32})".*/\1/')
REQ='{"contents":[{"role":"user","parts":[{"text":"hi"}]}],"systemInstruction":{"parts":[{"text":"s"}]},"generationConfig":{"maxOutputTokens":99999,"temperature":0}}'
r=$(call gemini "{\"runId\":\"$RUN\",\"request\":$REQ}"); check "proxy uses the server key" "$r" 'SERVER-KEY'
check "proxy caps output tokens" "$r" '\"max\":1500'
check "proxy keeps the system prompt" "$r" '\"sys\":true'
check "proxy strips temperature" "$r" '\"temp\":false'
call gemini "{\"runId\":\"$RUN\",\"request\":$REQ}" >/dev/null; call gemini "{\"runId\":\"$RUN\",\"request\":$REQ}" >/dev/null
r=$(call gemini "{\"runId\":\"$RUN\",\"request\":$REQ}"); check "per-run call limit" "$r" ' 429'
r=$(call gemini "{\"runId\":\"$(printf 'a%.0s' {1..32})\",\"request\":$REQ}"); check "unknown run refused" "$r" ' 403'
r=$(call start "{\"token\":\"$TOKEN\"}"); check "second run starts" "$r" '"runsLeft":0'
r=$(call start "{\"token\":\"$TOKEN\"}"); check "third run capped" "$r" ' 402'
r=$(call unlock "{\"token\":\"$TOKEN\",\"code\":\"nope\"}"); check "bad code refused" "$r" ' 404'
r=$(call unlock "{\"token\":\"$TOKEN\",\"code\":\"coffee-test\"}"); check "code unlocks 2 runs" "$r" '"runsLeft":2'
r=$(call unlock "{\"token\":\"$TOKEN\",\"code\":\"COFFEE-TEST\"}"); check "code used up" "$r" ' 404'
r=$(call start "{\"token\":\"$TOKEN\"}"); check "unlocked run starts" "$r" '"runsLeft":1'
r=$(call status '{}'); check "fresh browser on same IP still has runs (office IP)" "$r" '"runsLeft":2'
r=$(curl -s -D - -o /dev/null -X OPTIONS -H 'Origin: https://example.test' "$API?action=status"); check "CORS for allowed origin" "$r" 'Access-Control-Allow-Origin: https://example.test'
r=$(curl -s -D - -o /dev/null -X OPTIONS -H 'Origin: https://evil.test' "$API?action=status"); [[ "$r" != *"Access-Control-Allow-Origin"* ]] && echo "ok   no CORS for other origins" || { echo "FAIL CORS leak"; fails=$((fails+1)); }
r=$(curl -s -w ' %{http_code}' "$API?action=status"); check "GET refused" "$r" ' 405'
exit $fails
