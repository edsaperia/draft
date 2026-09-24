/*
 * **The demo panel** (design/DEMO.md Stage 2; Q1535): Ed's controls on the
 * demo document — Reset, the seat switch, and the bot controls that Stages
 * 4–5 bring alive. Built only when the view says `demoPanel`, which the host
 * sends on the demo document to a browser holding the demo key's cookie and
 * nowhere else.
 *
 * Off the design system, like the ladder bar and the dev outbox, and for the
 * same reason: a stagehand's control, not a member of the cast, so its
 * strings are exempt from STYLE.md (T16-exempt). Every control is a POST and
 * a reload — a seat is a cookie, and the page rebuilds itself from the payload
 * it is served.
 */
(function () {
  'use strict';
  const STYLE = 'position:fixed;bottom:84px;left:10px;z-index:61;display:flex;flex-wrap:wrap;' +
    'gap:.35rem;align-items:center;max-width:calc(100vw - 20px);box-sizing:border-box;' +
    'font:12px ui-monospace,monospace;border:1px dashed #b60;background:#fff8ef;padding:.3rem .5rem';
  const BTN = 'border:1px dashed #b60;background:#fff;cursor:pointer;padding:.2rem .5rem;font:inherit';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;' }[c]));
  const post = (path, body) => fetch(path, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })
    .then((r) => r.json().then((j) => ({ ok: r.ok, body: j })));
  /** mm:ss since a moment, for the readout — never the browser's locale (T16-exempt) */
  const ago = (ms) => {
    const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    return Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's ago';
  };

  function draw(d) {
    const old = document.getElementById('demopanel');
    if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = 'demopanel';
    wrap.style.cssText = STYLE;
    const seats = (d.seats || []).map((s) =>
      '<option value="' + esc(s.id) + '"' + (s.id === d.me ? ' selected' : '') + '>' +
      esc(s.name) + (s.founder ? ' — Founder' : '') + '</option>').join('');
    const bots = d.bots; // Stages 4–5: null until the bots exist
    wrap.innerHTML =
      '<b>demo</b>' +
      '<span style="color:#666" id="demostate">' + esc(d.state) + ' · gen ' + esc(d.generation) +
        (d.builtAt ? ' · built ' + esc(ago(d.builtAt)) : '') + '</span>' +
      '<select id="demoseat" style="border:1px dashed #b60;font:inherit">' +
        (d.me ? '' : '<option value="" selected>— sit in a seat —</option>') + seats + '</select>' +
      '<button id="demoreset" style="' + BTN + '">↺ Reset</button>' +
      '<span style="opacity:.5" title="the bots arrive in Stage 4">' +
        '<button disabled style="' + BTN + '">▶️</button> ' +
        '<button disabled style="' + BTN + '">⏸️</button> ' +
        '<select disabled style="font:inherit"><option>8 bots</option></select> ' +
        '<select disabled style="font:inherit"><option>lively</option></select> ' +
        '<select disabled style="font:inherit"><option>Haiku 4.5</option></select>' +
      '</span>' +
      (bots ? '' : '') +
      '<span id="demomsg" style="color:#b00"></span>';
    document.body.appendChild(wrap);
    const msg = (s) => { document.getElementById('demomsg').textContent = s; };
    document.getElementById('demoseat').onchange = (e) => {
      const member = e.target.value;
      if (!member) return;
      post('/api/demo/seat', { member }).then((r) => {
        if (r.ok) location.reload(); else msg(r.body && r.body.error || 'the seat switch failed');
      });
    };
    const reset = document.getElementById('demoreset');
    reset.onclick = () => {
      if (!window.confirm('Reset the demo to the prepared programme? Everything done in it goes.')) return;
      reset.disabled = true;
      reset.textContent = '…';
      post('/api/demo/reset', {}).then((r) => {
        if (r.ok) { location.href = '/d/demo'; return; }
        reset.disabled = false;
        reset.textContent = '↺ Reset';
        const errs = (r.body && r.body.errors) || [];
        msg((r.body && r.body.error || 'reset failed') +
          (errs.length ? ': ' + errs.slice(0, 3).map((x) => x.rule + ' line ' + x.line + ' ' + x.message).join('; ') : ''));
      });
    };
  }

  /** Called by live.js when the view says `demoPanel`; idempotent across polls. */
  function panel() {
    if (document.getElementById('demopanel')) return;
    fetch('/api/demo/panel').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d && !document.getElementById('demopanel')) draw(d);
    }).catch(() => {});
  }

  window.DEMO = { panel };
})();
