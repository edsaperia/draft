/**
 * **The demo panel's bot controls** (design/DEMO.md Stage 4; Q1535): ▶️ / ⏸️,
 * the count, the pace, the model and one line of readout, plus the heartbeat
 * that keeps a run alive while this tab is open — the bots pause by
 * themselves two minutes after the last one, so closing the tab stops the room.
 *
 * **Off the design system**, like the ladder bar and for the same reason: a
 * stagehand's control, seen by Ed alone (the routes answer 404/401 to anybody
 * without the demo key's cookie). Its strings are not member copy.
 *
 * **Mounted by the panel**: Stage 2's `design/demo.js` calls
 * `DEMO_BOTS.mount(el)` with the element the bot row lives in, once, when the
 * view says `demoPanel`. Nothing here runs until then.
 */
(function () {
  'use strict';
  const POLL_MS = 5000;
  const BEAT_MS = 30000;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mmss = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const WHY = { hand: 'paused', heartbeat: 'paused — no heartbeat', 'run-clock': 'paused — ten minutes up',
    spend: 'paused — spend cap reached' };

  async function call(method, path, body) {
    const r = await fetch(path, method === 'GET' ? { credentials: 'same-origin' } : {
      method, credentials: 'same-origin', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    return j;
  }

  function mount(host) {
    if (!host || host.querySelector('.demobots')) return;
    const box = document.createElement('div');
    box.className = 'demobots';
    box.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;font:12px/1.4 system-ui,sans-serif';
    box.innerHTML =
      '<button type="button" data-b="go" style="font-size:16px;min-width:34px">▶️</button>' +
      '<select data-b="count" title="bots"></select>' +
      '<select data-b="pace" title="pace"><option>calm</option><option selected>lively</option><option>frantic</option></select>' +
      '<select data-b="model" title="model"></select>' +
      '<span data-b="line" style="color:#444"></span>';
    host.appendChild(box);
    const $ = (k) => box.querySelector('[data-b="' + k + '"]');
    let stats = null;
    let beat = null;
    let error = '';

    const draw = () => {
      if (!stats) return;
      const count = $('count');
      if (count.options.length !== Math.max(0, stats.seats - 3)) {
        count.innerHTML = '';
        for (let n = Math.min(4, stats.seats); n <= stats.seats; n++) {
          count.insertAdjacentHTML('beforeend', '<option value="' + n + '">' + n + ' bots</option>');
        }
        count.value = String(Math.min(stats.seats, stats.count || 8));
      }
      const model = $('model');
      if (!model.options.length) {
        model.innerHTML = stats.models.map((m) => '<option value="' + esc(m.id) + '">' + esc(m.label) + '</option>').join('');
        model.value = stats.model;
      }
      const running = stats.state === 'running';
      $('go').textContent = running ? '⏸️' : '▶️';
      $('go').disabled = !stats.claudeKey || stats.seats === 0;
      // the model changes for the next ▶️, never mid-run (Stage 5)
      for (const k of ['count', 'pace', 'model']) $(k).disabled = running;
      const a = stats.acts;
      const where = !stats.claudeKey ? 'No Claude key on this host — the bots cannot start'
        : stats.seats === 0 ? 'no demo document to run bots in'
        : running ? 'bots: ' + stats.count + (stats.held ? ' (1 is you)' : '') + ' ' + stats.pace + ' · ' + mmss(stats.runElapsedMs || 0) + ' of ' + mmss(stats.runMs)
        : stats.state === 'paused' ? (WHY[stats.pausedBy] || 'paused')
        : stats.state === 'stopped' ? 'stopped (' + stats.stoppedBy + ')' : 'bots idle';
      $('line').textContent = where + ' · ' + a.proposals + ' proposals (' + a.swaps + ' swaps) · ' +
        a.judgments + ' votes · $' + stats.runUsd.toFixed(2) + ' of $' + stats.capUsd +
        (stats.pace === 'frantic' && running ? ' · not while a real room sits' : '') + (error ? ' · ' + error : '');
      // the heartbeat runs exactly while the bots do
      if (running && beat === null) {
        beat = setInterval(() => { call('POST', '/api/demo/heartbeat').catch(() => {}); }, BEAT_MS);
      } else if (!running && beat !== null) { clearInterval(beat); beat = null; }
    };

    const refresh = () => call('GET', '/api/demo/bots')
      .then((s) => { stats = s; draw(); })
      .catch((e) => { error = e.message; draw(); });

    $('go').addEventListener('click', () => {
      if (!stats) return;
      error = '';
      const chosen = { count: Number($('count').value), pace: $('pace').value, model: $('model').value };
      // ▶️ on a paused run resumes it as it was; changed choices start a fresh run
      const same = chosen.count === stats.count && chosen.pace === stats.pace && chosen.model === stats.model;
      const body = stats.state === 'running' ? { action: 'pause' }
        : stats.state === 'paused' && same ? { action: 'resume' }
        : Object.assign({ action: 'start' }, chosen);
      call('POST', '/api/demo/bots', body).then((j) => { stats = j.bots; draw(); })
        .catch((e) => { error = e.message; refresh(); });
    });
    refresh();
    setInterval(refresh, POLL_MS);
  }

  window.DEMO_BOTS = { mount };
})();
