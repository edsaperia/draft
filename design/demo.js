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
  const STYLE = 'position:fixed;bottom:10px;left:10px;z-index:61;display:flex;flex-wrap:wrap;' +
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
    const bots = d.bots; // the bots' readout (Stages 4–5); absent on a host without them
    // **Folds to its own button** (Ed, 2026-09-24: *the control box takes up
    // a lot of the screen; please make it so I can toggle it*): the rest of
    // the panel hides behind the one toggle, remembered per browser; the bots'
    // heartbeat runs on regardless, since hiding a node stops no timer
    let folded = false;
    try { folded = localStorage.getItem('demoPanelFolded') === '1'; } catch (e) { /* no storage */ }
    wrap.innerHTML =
      '<button id="demofold" style="' + BTN + ';font-weight:bold" title="Show or hide the demo controls">' +
        (folded ? '▸ demo' : '▾ demo') + '</button>' +
      '<span id="demobody" style="display:' + (folded ? 'none' : 'contents') + '">' +
      '<span style="color:#666" id="demostate">' + esc(d.state) + ' · gen ' + esc(d.generation) +
        (d.builtAt ? ' · built ' + esc(ago(d.builtAt)) : '') +
        ' · ' + esc(d.visitors || 0) + ' visitors</span>' +
      '<select id="demoseat" style="border:1px dashed #b60;font:inherit">' +
        (d.me ? '' : '<option value="" selected>— sit in a seat —</option>') + seats + '</select>' +
      '<button id="demoreset" style="' + BTN + '">↺ Reset</button>' +
      '<button id="demoqr" style="' + BTN + '">▦ QR</button>' +
      // the bot controls (Stages 4–5): ▶️/⏸️, count, pace, model and the
      // readout with the spend so far, drawn by demo-bots.js into this panel
      '<span id="demobotsrow" style="display:contents"></span>' +
      '<span id="demomsg" style="color:#b00"></span>' +
      '</span>';
    document.body.appendChild(wrap);
    const fold = document.getElementById('demofold');
    fold.onclick = () => {
      folded = !folded;
      document.getElementById('demobody').style.display = folded ? 'none' : 'contents';
      fold.textContent = folded ? '▸ demo' : '▾ demo';
      try { localStorage.setItem('demoPanelFolded', folded ? '1' : '0'); } catch (e) { /* no storage */ }
    };
    if (bots && window.DEMO_BOTS) window.DEMO_BOTS.mount(document.getElementById('demobotsrow'));
    const msg = (s) => { document.getElementById('demomsg').textContent = s; };
    const joinUrl = d.joinUrl || location.origin + '/d/demo?try=1';
    document.getElementById('demoqr').onclick = () => qrToggle(joinUrl, msg);
    if (qrRemembered() && !document.getElementById('demoqrmodal')) qrModal(joinUrl, msg);
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

  /**
   * **The QR card** (Stage 3; `demo-qr`): one code for the whole room, which
   * Ed leaves on the presentation screen while the demo runs, so people can
   * go on joining — pinned top-left under the topbar, over the contents rail,
   * never over the document (Ed, 2026-09-24: *where it can be left during
   * the demo … not cover the whole screen*). Black on white, the address
   * under it; ▦ QR toggles it, ✕ closes it, and it is remembered open across
   * the reloads a Reset or a seat switch makes. The encoder is `design/qr.js`
   * (qrcode-generator, MIT, Kazuhiko Arase — vendored, licence header kept),
   * fetched on the first open, so a visitor's page never loads it.
   */
  let qrLoading = null;
  function loadQr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (!qrLoading) {
      qrLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/design/qr.js';
        s.onload = () => (window.qrcode ? resolve(window.qrcode) : reject(new Error('the QR encoder did not load')));
        s.onerror = () => { qrLoading = null; reject(new Error('the QR encoder did not load')); };
        document.head.appendChild(s);
      });
    }
    return qrLoading;
  }

  /** The code as one SVG path, four modules of quiet zone round it. */
  function qrSvg(qrcode, text) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const q = 4;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
    }
    return '<svg id="demoqrcode" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 2 * q) + ' ' + (n + 2 * q) +
      '" shape-rendering="crispEdges" style="display:block;width:100%;height:100%;background:#fff" ' +
      'role="img" aria-label="QR code for ' + esc(text) + '"><path fill="#000" d="' + d + '"/></svg>';
  }

  const QR_KEY = 'demoQrOpen';
  const qrRemember = (open) => { try { localStorage.setItem(QR_KEY, open ? '1' : '0'); } catch (e) { /* no storage */ } };
  const qrRemembered = () => { try { return localStorage.getItem(QR_KEY) === '1'; } catch (e) { return false; } };
  function qrToggle(url, msg) {
    const old = document.getElementById('demoqrmodal');
    if (old) { old.remove(); qrRemember(false); return; }
    qrModal(url, msg);
  }
  function qrModal(url, msg) {
    loadQr().then((qrcode) => {
      const old = document.getElementById('demoqrmodal');
      if (old) old.remove();
      const shown = url.replace(/^https?:\/\//, '').replace(/\?try=1$/, '');
      const m = document.createElement('div');
      m.id = 'demoqrmodal';
      m.dataset.url = url;
      m.style.cssText = 'position:fixed;top:calc(var(--nav-h, 58px) + 10px);left:10px;z-index:1000;' +
        'background:#fff;color:#000;display:flex;flex-direction:column;align-items:center;gap:8px;' +
        'padding:12px;box-sizing:border-box;border:2px solid #000;border-radius:8px;' +
        'box-shadow:0 4px 18px rgba(0,0,0,.18)';
      m.innerHTML =
        '<button id="demoqrclose" aria-label="Close" style="position:absolute;top:4px;right:4px;' +
          'font:bold 14px/1 system-ui,sans-serif;background:#fff;color:#000;border:1px solid #000;' +
          'border-radius:4px;width:22px;height:22px;padding:0;cursor:pointer">✕</button>' +
        '<div id="demoqrbox" style="width:min(260px,34vh);height:min(260px,34vh)">' + qrSvg(qrcode, url) + '</div>' +
        '<div id="demoqraddr" style="font:bold 18px/1.15 system-ui,sans-serif;max-width:min(260px,34vh);' +
          'text-align:center;word-break:break-all">' + esc(shown) + '</div>';
      document.body.appendChild(m);
      qrRemember(true);
      m.querySelector('#demoqrclose').onclick = () => { m.remove(); qrRemember(false); };
    }, (e) => msg(e.message));
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
