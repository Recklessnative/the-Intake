// Thin Gemini client. With the player's own key it calls Google directly;
// otherwise it goes through the PHP backend (api/index.php), which holds the key and the run cap.
(function () {
  const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
  // Retired models a browser may still remember; fall back to the default instead.
  const RETIRED = /^gemini-(1|2)\./;
  const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

  function store(kind) {
    try { return kind === 'local' ? window.localStorage : window.sessionStorage; } catch (e) { return null; }
  }
  function read(k) {
    for (const kind of ['session', 'local']) {
      const s = store(kind);
      try { const v = s && s.getItem(k); if (v) return v; } catch (e) { /* storage blocked */ }
    }
    return '';
  }

  const api = () => ((window.INTAKE_CONFIG || {}).api || '');
  const withAction = (url, action) => url + (url.includes('?') ? '&' : '?') + 'action=' + action;

  async function post(url, payload) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty body */ }
    return { status: res.status, ok: res.ok, data };
  }

  const Gemini = {
    runId: null,
    get hasBackend() { return !!api(); },
    get token() { try { return window.localStorage.getItem('intake-token') || ''; } catch (e) { return ''; } },
    set token(t) { try { window.localStorage.setItem('intake-token', t); } catch (e) { /* storage blocked */ } },

    // Backend calls: start a run (counts against the cap), redeem a code, check runs left.
    async backend(action, extra) {
      const r = await post(withAction(api(), action), Object.assign({ token: this.token }, extra || {}));
      if (r.data.token) this.token = r.data.token;
      return r;
    },

    get key() { return read('intake-key'); },
    get model() { const m = read('intake-model'); return m && !RETIRED.test(m) ? m : DEFAULT_MODEL; },
    defaultModel: DEFAULT_MODEL,
    forget() {
      for (const kind of ['session', 'local']) {
        const s = store(kind);
        try { if (s) { s.removeItem('intake-key'); } } catch (e) { /* ignore */ }
      }
    },
    save(key, model, remember) {
      for (const kind of ['session', 'local']) {
        const s = store(kind);
        try { if (s) { s.removeItem('intake-key'); s.removeItem('intake-model'); } } catch (e) { /* ignore */ }
      }
      const s = store(remember ? 'local' : 'session');
      try { if (s) { s.setItem('intake-key', key); s.setItem('intake-model', model || DEFAULT_MODEL); } } catch (e) { /* ignore */ }
    },

    // Ask for JSON matching `schema`. `turns` is [{role:'user'|'model', text}].
    // No temperature: Gemini 3.5+ ignores it (and later models reject it); determinism comes from the prompts.
    // maxTokens covers thinking tokens too, so it is generous.
    async json({ system, turns, schema, maxTokens = 2000 }) {
      const key = this.key;
      if (!key && !(this.hasBackend && this.runId)) throw new Error('No Gemini key set. Add one under "Gemini key" on the title screen.');
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map(t => ({ role: t.role, parts: [{ text: t.text }] })),
        generationConfig: {
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json',
          responseJsonSchema: schema
        }
      };
      let lastErr;
      for (let attempt = 0; attempt < 2; attempt++) {
        let data;
        if (key) {
          const res = await fetch(BASE + encodeURIComponent(this.model) + ':generateContent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify(body)
          });
          if (!res.ok) {
            let msg = res.status + ' ' + res.statusText;
            try { const e = await res.json(); if (e.error && e.error.message) msg = e.error.message; } catch (e) { /* keep status */ }
            throw new Error('Gemini said: ' + msg);
          }
          data = await res.json();
        } else {
          const r = await post(withAction(api(), 'gemini'), { runId: this.runId, model: this.model, request: body });
          if (!r.ok) {
            const e = r.data.error;
            throw new Error(typeof e === 'string' ? e : (e && e.message) || 'The game server could not reach Gemini (' + r.status + ').');
          }
          data = r.data;
        }
        const text = (((data.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('') || '';
        try { return JSON.parse(text); } catch (e) { lastErr = new Error('Gemini returned something that was not JSON.'); }
      }
      throw lastErr;
    }
  };

  window.Gemini = Gemini;
})();
