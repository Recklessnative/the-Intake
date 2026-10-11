<?php
// Stand-in for Gemini used by tests: answers each of the game's three roles with valid JSON.
$in = json_decode(file_get_contents('php://input'), true);
$sys = $in['systemInstruction']['parts'][0]['text'] ?? '';
if (strpos($sys, 'You are the examiner') === 0) {
  $s = ['score' => 3, 'evidence' => 'q'];
  $out = ['diagnosis' => $s, 'measurement' => $s, 'fit' => $s, 'nextLevel' => $s, 'risks' => $s, 'pitch' => $s,
          'defenceOutcome' => 'none', 'questionNotAsked' => 'What changed?', 'verdict' => 'Fine.'];
} elseif (strpos($sys, 'rate the concept') !== false) {
  $out = ['boldness' => 0, 'boldnessReason' => 'x', 'objections' => ['a', 'b', 'c'], 'acceptReply' => 'ok'];
} else {
  $out = ['reply' => 'Nights, mostly.', 'revealed' => [], 'quality' => 'good'];
}
header('Content-Type: application/json');
echo json_encode(['candidates' => [['content' => ['parts' => [['text' => json_encode($out)]]]]]]);
