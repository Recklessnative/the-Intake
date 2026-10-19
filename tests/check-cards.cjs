// Checks every scenario card in scenarios/ against the v1 schema the game relies on, and flags
// words that don't belong in 2007. Usage: node tests/check-cards.cjs [dir] [id ...]
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || path.join(__dirname, '..', 'scenarios');
const pool = process.argv.length > 3 ? process.argv.slice(3) : JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
// The operator's request (STORY.md, the week after the reveal) is never drawn, but it is a card like any other.
const index = process.argv.length > 3 ? pool : pool.concat(['operator-2041']);
const ANACHRONISM = /\b(AI|A\.I\.|artificial intelligence|ChatGPT|GPT|LLM|chatbot|smartphones?|apps?|app-based|WhatsApp|Teams call|MS Teams|Microsoft Teams|Zoom|Slack|Instagram|TikTok|Snapchat|Uber|Airbnb|Deliveroo|iPad|tablets?|GDPR|COVID|pandemic|lockdown|remote work|hybrid work|working from home|cloud|SaaS|influencer|QR|contactless|e-scooter|crypto|bitcoin|selfie|hashtag|emoji|webinar|Power BI|SharePoint Online|OKR|NPS|Net Promoter|millennials?|Gen Z|metaverse|wearables?|smartwatch|streaming|gamif\w*|microlearning|agile|scrum|Google Meet|Android|iPhone|4G|5G|Wi-?Fi hotspot)\b/i;
let bad = 0;
const fail = (id, msg) => { bad++; console.log('FAIL ' + id + ': ' + msg); };
index.forEach(id => {
  let c;
  try { c = JSON.parse(fs.readFileSync(path.join(dir, id + '.json'), 'utf8')); } catch (e) { fail(id, 'not valid JSON: ' + e.message); return; }
  if (c.id !== id || c.schema_version !== 1) fail(id, 'id or schema_version');
  if (![0, 1, 2, 3].includes(c.tier)) fail(id, 'tier');
  for (const k of ['sector', 'title', 'opening_message', 'surface_ask', 'question_you_didnt_ask']) if (!c[k]) fail(id, 'missing ' + k);
  const s = c.stakeholder || {};
  for (const k of ['name', 'role', 'org', 'voice']) if (!s[k]) fail(id, 'stakeholder.' + k);
  if (!(s.patience >= 1 && s.patience <= 5) || !(s.risk_appetite >= 0 && s.risk_appetite <= 3)) fail(id, 'patience or risk_appetite');
  if (!c.frontline || !c.frontline.name) fail(id, 'frontline');
  if (!c.briefing || !c.briefing.headline || !(c.briefing.points || []).length) fail(id, 'briefing');
  const g = c.gold || {};
  if (!g.real_problem || !g.need_statement || !['yes', 'partly', 'no'].includes(g.is_training_the_lever) || !(g.root_cause_types || []).length) fail(id, 'gold');
  const f = c.hidden_facts || [];
  if (f.length < 3) fail(id, 'fewer than 3 hidden facts');
  if (!f.some(x => x.critical)) fail(id, 'no critical fact');
  f.forEach(x => {
    if (!x.id || !x.fact || !x.unlocks_when || !x.reveal_line) fail(id, 'fact fields ' + x.id);
    const at = x.found_at || ['call'];
    if (at.some(a => a.startsWith('data:')) && (!x.data_doc || !x.data_source)) fail(id, 'data fact without data_doc/data_source ' + x.id);
    if (at.includes('frontline') && !x.frontline_line) fail(id, 'frontline fact without frontline_line ' + x.id);
  });
  if (c.tier > 0) {
    if (!f.some(x => (x.found_at || []).length && x.found_at.every(a => a === 'frontline'))) fail(id, 'no frontline-only fact');
    if (!f.some(x => (x.found_at || []).length && x.found_at.every(a => a.startsWith('data:')))) fail(id, 'no data-only fact');
    if (!f.some(x => (x.found_at || ['call']).includes('call'))) fail(id, 'no fact on the call');
  }
  if (!(c.dependencies || []).length || c.dependencies.some(d => !d.who || !d.concern || !d.if_ignored)) fail(id, 'dependencies');
  const m = c.measurement || {};
  if (!(m.traps || []).length || !m.gold_plan || !m.gold_plan.baseline || !m.gold_plan.business_metric) fail(id, 'measurement');
  const k = c.concepts || {};
  if (!k.conventional || !k.solid || !(k.next_level_examples || []).length || !(k.red_flags || []).length) fail(id, 'concepts');
  if (!(c.defence_objections || []).length || !(c.actor_notes || []).length || !(c.constraints || {}).budget) fail(id, 'objections, actor notes or constraints');
  // 2007: nothing that did not exist yet. The 2041 card is the one allowed exception.
  if (c.era === '2041') return;
  const text = JSON.stringify(Object.assign({}, c, { id: '' }));
  const hits = new Set();
  let m2; const re = new RegExp(ANACHRONISM.source, 'gi');
  while ((m2 = re.exec(text))) hits.add(m2[0]);
  if (hits.size) fail(id, 'not 2007: ' + [...hits].join(', '));
});
console.log(pool.length + ' cards' + (index.length > pool.length ? ' and the 2041 card' : '') + ', ' + (bad ? bad + ' problem(s)' : 'all fine'));
process.exit(bad ? 1 : 0);
