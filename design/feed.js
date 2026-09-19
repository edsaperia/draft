/* feed.js — the spectator feed's page (feed.html, Q1466).
 *
 * One read, `GET /api/d/:slug/feed`, polled; one render, the whole list, since
 * nothing on this page is pressed, typed into or held, so nothing is lost by
 * redrawing it. An entry that was not there at the last render arrives with a
 * wash and the rest stand still.
 *
 * **Every wording is drawn by the card grammar's own reader**
 * (`CARDS.wordingHtml`): a clause here reads as it does on a decision card —
 * markdown rendered, additions marked, a removal saying so — because a feed
 * that drew a proposal differently from the card that carries it would be a
 * second opinion about what was proposed.
 *
 * Every string is `COPY.feed`'s. Served with no document behind it (`npm run
 * design`, `/feed.html`) the page shows the fixture at the foot of this file,
 * in the Hollow Oak Club's world like every other.
 */
(function () {
  'use strict';
  const T = window.COPY.feed;
  const MONTHS = window.COPY.session.clock.months;
  const C = window.CARDS;
  const esc = C.esc;
  const $ = (id) => document.getElementById(id);

  const m = /^\/d\/([^/]+)\/feed\/?$/.exec(location.pathname);
  const slug = m ? decodeURIComponent(m[1]) : null;

  const POLL_MS = 10000;
  let eseq = null;          // the engine log length the page last drew
  let seen = null;          // keys drawn so far; null until the first draw
  let last = null;          // the last full answer
  let roster = 0;           // the membership's size, a passed entry's *of E*

  const two = (n) => (n < 10 ? '0' : '') + n;
  const dayOf = (ms) => { const d = new Date(ms); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  const timeOf = (ms) => { const d = new Date(ms); return two(d.getHours()) + ':' + two(d.getMinutes()); };
  const keyOf = (e) => e.kind + ':' + e.candidateId;
  const text = (lines) => (lines || []).join('\n');

  const part = (label, html, cls) =>
    '<div class="fpart"><p class="eyebrow">' + esc(label) + '</p>' +
    '<div class="ftext' + (cls ? ' ' + cls : '') + '">' + html + '</div></div>';

  // **A short change is read between its neighbours** (Ed, 2026-09-19: *if the
  // paragraph that changed is short, the previous and next paragraphs should be
  // shown in the feed as context*). Short is both wordings under this many
  // characters — about three lines at the feed's measure; past it the change is
  // its own context, and its neighbours would only push the next entry away.
  const SHORT = 280;
  const ctx = (line) => (line
    ? '<div class="ftext fctx">' + C.wordingHtml(null, line) + '</div>' : '');

  // how long a proposal took to pass, in its two largest units
  function tookWords(ms) {
    const min = Math.floor(ms / 60000);
    if (min < 1) return T.underMinute;
    if (min < 60) return T.minutes(min);
    const h = Math.floor(min / 60);
    if (h < 24) return T.hours(h) + (min % 60 ? ' ' + T.minutes(min % 60) : '');
    const d = Math.floor(h / 24);
    return T.days(d) + (h % 24 ? ' ' + T.hours(h % 24) : '');
  }

  // one changed place: what stood there, then what is put there
  function changeHtml(e, ch) {
    const before = text(ch.before);
    const after = text(ch.after);
    const put = e.kind === 'proposed' ? T.put : T.nowStands;
    const where = '<p class="fwhere">' + (ch.heading ? '§ ' + esc(ch.heading) : esc(T.top)) + '</p>';
    // an insertion has no clause that stood: it says where it goes instead
    const stood = ch.before.length
      ? part(T.stood, C.wordingHtml(null, before), 'stood')
      : (ch.above ? part(T.after, C.wordingHtml(null, ch.above), 'stood') : part(T.first, '', 'stood'));
    const short = before.length <= SHORT && after.length <= SHORT;
    // an insertion's `above` is already its place, said under its own label
    return '<div class="fchange">' + where +
      (short && ch.before.length ? ctx(ch.above) : '') + stood +
      // **always marked** (the deadlock card's rule, `force`): the floor stops a
      // lane being lit end to end beside its incumbent, and here what stood is
      // directly above and comparison is the whole point of the entry
      part(put, e.kind !== 'proposed' && !after.trim()
        ? '<div class="lp removed">' + esc(T.removed) + '</div>'
        : C.wordingHtml(ch.before.length ? before : null, after, true)) +
      (short ? ctx(ch.below) : '') + '</div>';
  }

  function whoHtml(e) {
    // the record names the office, never the person (`amendmentBlocks`' rule)
    if (e.kind === 'decreed') return null;
    const a = e.author;
    const person = a ? { n: a.name, pic: a.picture, erased: a.erased } : null;
    const name = !a ? T.anonymous : (a.erased ? T.redacted : (a.name || T.anonymous));
    return { face: '<span class="who">' + C.avHtml(person) + '</span>',
      name: '<span class="name">' + esc(name) + '</span>' };
  }

  function entryHtml(e, arriving) {
    const o = e.outcome;
    const label = e.kind === 'proposed' ? T.proposed
      : e.kind === 'adopted' ? (o ? T.passedIn(tookWords(o.tookMs)) : T.passed) : T.decreed;
    const cls = e.kind === 'proposed' ? 'proposed' : e.kind === 'adopted' ? 'passed' : 'decreed';
    const who = whoHtml(e);
    const why = (e.rationale || '').trim();
    return '<article class="fentry ' + cls + (arriving ? ' arrive' : '') + '" data-key="' + esc(keyOf(e)) + '">' +
      '<div class="fhead"><p class="eyebrow">' + esc(label) + '</p>' +
      '<time class="fwhen" datetime="' + new Date(e.t).toISOString() + '">' + timeOf(e.t) + '</time></div>' +
      e.changes.map((ch) => changeHtml(e, ch)).join('') +
      // the passed card's own numbers, where the entry carries them
      (o ? '<p class="fcounts">' + esc(T.counts(o.voted, roster, o.floor, o.approvals, o.abstained)) + '</p>' : '') +
      (who || why
        ? '<div class="fwhy">' + (who ? who.face : '') + '<div class="body">' + (who ? who.name : '') +
          (why ? '<span class="why">' + esc(why) + '</span>' : '') + '</div></div>'
        : '') +
      '</article>';
  }

  function draw(v) {
    last = v;
    roster = v.members || 0;
    document.title = T.tabTitle(v.title || 'docs.vote');
    $('feedname').textContent = v.title || '';
    $('feedword').textContent = T.name;
    const to = $('todoc');
    to.textContent = T.toDocument;
    to.href = slug ? '/d/' + encodeURIComponent(slug) : '#';
    const state = $('feedstate');
    const list = $('feed');
    let say = '';
    if (!v.canRead) say = (v.holding && v.holding.sentence) || '';
    else if (!v.begun) say = T.notBegun;
    else if (!v.entries.length) say = T.empty;
    else if (v.closed) say = T.closed(dayOf(v.closed.at));
    state.textContent = say;
    state.hidden = !say;
    let html = '';
    let day = null;
    for (const e of v.entries) {
      const d = dayOf(e.t);
      if (d !== day) { day = d; html += '<p class="eyebrow feedday">' + esc(d) + '</p>'; }
      html += entryHtml(e, seen !== null && !seen.has(keyOf(e)));
    }
    list.innerHTML = html;
    seen = new Set(v.entries.map(keyOf));
  }

  async function poll() {
    if (document.hidden && last) return;
    try {
      const r = await fetch('/api/d/' + encodeURIComponent(slug) + '/feed' +
        (eseq === null ? '' : '?since=' + eseq), { credentials: 'same-origin' });
      if (r.status === 404) { $('feedstate').hidden = false; $('feedstate').textContent = T.missing; return; }
      if (!r.ok) throw new Error('feed ' + r.status);
      const v = await r.json();
      if (!v.short) { draw(v); eseq = v.canRead ? v.eseq : null; }
    } catch (err) {
      if (!last) { $('feedstate').hidden = false; $('feedstate').textContent = T.unreachable; }
    }
  }

  $('feedstate').textContent = T.loading;
  if (slug) {
    poll();
    setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
    return;
  }

  // ---- the fixture: the Hollow Oak Club's charter, an afternoon of it -------
  const at = (h, mi) => new Date(2026, 8, 19, h, mi).getTime();
  draw({
    title: 'The Hollow Oak Club Charter', begun: true, closed: null, canRead: true, holding: null,
    members: 19,
    entries: [
      { t: at(15, 42), kind: 'adopted', candidateId: 'c7', author: null,
        outcome: { voted: 11, approvals: 8, floor: 5, abstained: 3, tookMs: 71 * 60000 },
        rationale: 'Nobody can find the key on a Sunday, and the list on the door is three treasurers out of date.',
        changes: [{ heading: 'The Shed', above: 'The shed holds the mower, the ladders and the marquee.',
          below: 'Anything borrowed from the shed is written in the book by the door.',
          before: ['The shed key is held by the **Treasurer**.'],
          after: ['The shed key is held by the **Treasurer**, and a second hangs in the kitchen for any member to sign out.'] }] },
      { t: at(15, 20), kind: 'proposed', candidateId: 'c9',
        author: { name: 'Marguerite Okafor', picture: 'e🦉', erased: false },
        rationale: 'A quorum of five was written when we were forty. We are nineteen.',
        changes: [{ heading: 'Meetings', above: null,
          before: ['A general meeting needs five members present.'],
          after: ['A general meeting needs a quarter of the members present, and never fewer than three.'] }] },
      { t: at(14, 58), kind: 'proposed', candidateId: 'c8', author: null,
        rationale: 'The library corner has no rule at all, which is how we lost the bird books.',
        changes: [{ heading: 'The Library Corner', above: 'Books are lent for a month.',
          before: [], after: ['- A book not returned in three months is replaced by the borrower.'] }] },
      { t: at(14, 31), kind: 'proposed', candidateId: 'c7', author: null,
        rationale: 'Nobody can find the key on a Sunday, and the list on the door is three treasurers out of date.',
        changes: [{ heading: 'The Shed', above: null,
          before: ['The shed key is held by the **Treasurer**.'],
          after: ['The shed key is held by the **Treasurer**, and a second hangs in the kitchen for any member to sign out.'] }] },
      { t: at(11, 5) - 86400000, kind: 'decreed', candidateId: 'd1', author: null,
        rationale: 'The old address bounced.',
        changes: [{ heading: null, above: null,
          before: ['Write to the club at the Old Forge.'],
          after: ['Write to the club at 4 Tanners Row.'] }] },
    ],
  });
})();
