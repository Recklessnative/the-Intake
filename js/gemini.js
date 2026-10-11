// Thin Gemini client. v0.1 calls Google directly with the player's own key;
// a later version swaps the base URL for the PHP proxy on the shared host.
(function () {
  const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
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

  const Gemini = {
    get key() { return read('intake-key'); },
    get model() { return read('intake-model') || DEFAULT_MODEL; },
    defaultModel: DEFAULT_MODEL,
    save(key, model, remember) {
      for (const kind of ['session', 'local']) {
        const s = store(kind);
        try { if (s) { s.removeItem('intake-key'); s.removeItem('intake-model'); } } catch (e) { /* ignore */ }
      }
      const s = store(remember ? 'local' : 'session');
      try { if (s) { s.setItem('intake-key', key); s.setItem('intake-model', model || DEFAULT_MODEL); } } catch (e) { /* ignore */ }
    },

    // Ask for JSON matching `schema`. `turns` is [{role:'user'|'model', text}].
    async json({ system, turns, schema, temperature = 0.7, maxTokens = 800 }) {
      const key = this.key;
      if (!key) throw new Error('No Gemini key set. Add one under "Gemini key" on the title screen.');
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map(t => ({ role: t.role, parts: [{ text: t.text }] })),
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      };
      let lastErr;
      for (let attempt = 0; attempt < 2; attempt++) {
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
        const data = await res.json();
        const text = (((data.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('') || '';
        try { return JSON.parse(text); } catch (e) { lastErr = new Error('Gemini returned something that was not JSON.'); }
      }
      throw lastErr;
    }
  };

  window.Gemini = Gemini;
})();
