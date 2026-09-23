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
  const keyOf = (e) => e.kind + ':' + (e.candidateId || e.motionId || e.setting + '@' + e.t);
  const text = (lines) => (lines || []).join('\n');

  // **Before | after, side by side** (the designer's pass, Ed 2026-09-19). One
  // grid per change: a short change's paragraph-before across the full width,
  // the two labels on a line, the two clauses starting on a line, and the
  // paragraph-after across the width again. Each cell names its own place
  // (`g-lb` label-before … `g-cb` context-below), which is what lets a phone
  // put the same cells in one column without a second set of markup.
  const label = (words, place) => '<p class="flabel ' + place + '">' + esc(words) + '</p>';
  const cell = (html, place, cls) =>
    '<div class="ftext ' + place + (cls ? ' ' + cls : '') + '">' + html + '</div>';

  // **A short change is read between its neighbours** (Ed, 2026-09-19: *if the
  // paragraph that changed is short, the previous and next paragraphs should be
  // shown in the feed as context*). Short is both wordings under this many
  // characters — about three lines at the feed's measure; past it the change is
  // its own context, and its neighbours would only push the next entry away.
  const SHORT = 280;
  const ctx = (line, place) => (line ? cell(C.wordingHtml(null, line), place, 'fctx') : '');

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

  // ---- a rule's value as the constitution's own sentence ---------------------
  // The ladder settings read `RULES` through the card grammar's `clauseOf`, as
  // every card does; the ones whose sentence carries a number or a date are
  // spelled from `COPY.feed.rule`, and 👥's from the page's own `quorumRule`.
  // A value this cannot word gives '' and the entry is not drawn: a spectator
  // is never shown a raw value.
  const P = window.COPY.page;
  const PAGE_KEY = { link: 'slug' };
  let ctxOf = { founderIsMember: true, admissionPrice: 'assembly' };
  function dripPhrase(mins) {
    const m = +mins; if (!(m > 0)) return '';
    const p = m % 1440 === 0 ? [m / 1440, 'days'] : m % 60 === 0 ? [m / 60, 'hours'] : [m, 'minutes'];
    return p[0] === 1 ? T.rule.unit[p[1]] : T.rule.units(p[0], p[1]);
  }
  function ruleWords(setting, v, spell) {
    if (!v) return '';
    switch (setting) {
      case 'chamber': case 'judgments': case 'authorship': return C.clauseOf(setting, v.rung, ctxOf);
      case 'admission': case 'removal': return C.clauseOf(setting, v.price, ctxOf);
      case 'applications': return C.clauseOf('applications', v.apply ? 'apply' : 'invite', ctxOf);
      case 'quorum': return v.form === 'count' ? P.quorumRule.count(v.n)
        : P.quorumRule.share(v.n + '%', P.val.quorumTail(
          // the floor a race is held to, max(⌈n·E/100⌉, min(2, E)) — product
          // before quotient (issue #24), the seconder under it (Q1490)
          Math.max(Math.ceil((v.n * roster) / 100), Math.min(2, roster)), roster));
      case 'rate': return dripPhrase(v.dripMinutes) ? T.rule.rate(dripPhrase(v.dripMinutes)) : '';
      case 'lapse': return v.afterMs === null ? T.rule.lapseNever : (spell ? T.rule.lapseAfter(spell) : '');
      case 'ending': return v.endsAtMs === null ? T.rule.endingNever
        : T.rule.endingAfter(new Date(v.endsAtMs).toLocaleString(undefined,
          { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false }).replace(' ', ' at '));
      case 'title': return v.text ? P.titledLead + v.text + '.' : '';
      case 'link': return v.slug ? T.rule.address(v.slug) : '';
      default: return '';
    }
  }
  const nounOf = (setting) => { const c = P.cards[PAGE_KEY[setting] || setting]; return (c && c.n) || ''; };
  const sentence = (words) => C.glyphify(esc(words));

  // a rule's change: the rule as it stood on the left, what is put on the right
  function ruleHtml(e) {
    const to = ruleWords(e.setting, e.to, e.toSpell);
    if (!to) return '';
    const from = ruleWords(e.setting, e.from, e.fromSpell);
    const noun = nounOf(e.setting);
    return '<div class="fchange"><p class="fwhere">§ ' + esc(T.constitution) + (noun ? ' · ' + esc(noun) : '') + '</p>' +
      '<div class="fcols">' + label(T.ruleStood, 'g-lb') + cell('<div class="lp">' + sentence(from || T.noRule) + '</div>', 'g-st', 'stood') +
      label(e.kind === 'proposed' ? T.put : T.ruleNow, 'g-la') + cell(C.glyphify(C.wordingHtml(from || null, to, true)), 'g-pt') +
      '</div></div>';
  }

  // one changed place: what stood there on the left, what is put there on the right
  function changeHtml(e, ch) {
    const before = text(ch.before);
    const after = text(ch.after);
    const where = '<p class="fwhere">' + (ch.heading ? '§ ' + esc(ch.heading) : esc(T.top)) + '</p>';
    const short = before.length <= SHORT && after.length <= SHORT;
    // an insertion has no clause that stood: its left column says where it goes
    const left = ch.before.length
      ? label(T.stood, 'g-lb') + cell(C.wordingHtml(null, before), 'g-st', 'stood')
      : (ch.above ? label(T.after, 'g-lb') + cell(C.wordingHtml(null, ch.above), 'g-st', 'stood')
        : label(T.first, 'g-lb'));
    // **always marked** (the deadlock card's rule, `force`): the floor stops a
    // lane being lit end to end beside its incumbent, and here what stood is
    // beside it and comparison is the whole point of the entry
    const right = label(e.kind === 'proposed' ? T.put : T.nowStands, 'g-la') +
      // an insertion's `above` is already its place, said in the left column
      (short && ch.before.length ? ctx(ch.above, 'g-ca') : '') +
      cell(e.kind !== 'proposed' && !after.trim()
        ? '<div class="lp removed">' + esc(T.removed) + '</div>'
        : C.wordingHtml(ch.before.length ? before : null, after, true), 'g-pt') +
      (short ? ctx(ch.below, 'g-cb') : '');
    return '<div class="fchange">' + where + '<div class="fcols">' + left + right + '</div></div>';
  }

  function whoHtml(e) {
    // the record names the office, never the person (`amendmentBlocks`' rule)
    if (e.kind === 'decreed') return '<div class="fwho"><span class="name">' + esc(T.founder) + '</span></div>';
    const a = e.author;
    const person = a ? { n: a.name, pic: a.picture, erased: a.erased } : null;
    const name = !a ? T.anonymous : (a.erased ? T.redacted : (a.name || T.anonymous));
    return '<div class="fwho">' + C.avHtml(person) + '<span class="name">' + esc(name) + '</span></div>';
  }

  function entryHtml(e, arriving) {
    const o = e.outcome;
    // **the title says the whole outcome** (Ed, 2026-09-19), as a sealed
    // record's head does: what happened, then the passed card's own numbers
    const rule = !!e.setting;
    const body = rule ? ruleHtml(e) : e.changes.map((ch) => changeHtml(e, ch)).join('');
    if (rule && !body) return '';
    const title = rule ? (e.kind === 'proposed'
      ? (e.route === 'constitutional' ? T.proposedConstitutional : T.proposed)
      : e.kind === 'adopted' ? T.passedIn(tookWords(e.tookMs || 0)) : T.decreed)
      : e.kind === 'proposed' ? T.proposed
      : e.kind === 'adopted'
        ? (o ? T.titled(T.passedIn(tookWords(o.tookMs)), T.counts(o.voted, roster, o.floor, o.approvals, o.abstained))
          : T.passed)
        : T.decreed;
    // **and wears its lifecycle mark** (Ed, same note: *an emoji showing the
    // lifecycle*): the rail's own alphabet, drawn by the card grammar — 💡 an
    // idea is on the table, ✔ the charter changed here — and ✒️, the Founder's
    // own hand, on an amendment
    // a proposal about a rule wears **the rule's own icon** (Ed, 2026-09-19)
    const mark = rule ? '<span class="qmark" aria-hidden="true">' + C.glyphHtml(e.glyph) + '</span>'
      : e.kind === 'proposed' ? C.markHtml('needs')
      : e.kind === 'adopted' ? C.markHtml('adopted')
        : '<span class="qmark" aria-hidden="true">' + C.glyphHtml('✒️') + '</span>';
    const cls = e.kind === 'proposed' ? 'proposed' : e.kind === 'adopted' ? 'passed' : 'decreed';
    const who = whoHtml(e) || '';
    const why = (e.rationale || '').trim();
    // the margin — when, and who — then the rule with the mark on it, then the words
    return '<article class="fentry ' + cls + (arriving ? ' arrive' : '') + '" data-key="' + esc(keyOf(e)) + '">' +
      '<aside class="frail"><time datetime="' + new Date(e.t).toISOString() + '">' + timeOf(e.t) + '</time>' + who + '</aside>' +
      // **the reason is said, and said first** (Ed, 2026-09-19: *the Rationale
      // should come top in feed items … and should look more obviously like
      // something "spoken" by the proposer (e.g. closer to the name and
      // avatar)*): a speech bubble under the title, level with the face in the
      // margin and pointing at it. The mark rides inside the title so a phone,
      // which has no rule for it to sit on, can set it inline.
      '<div class="fmain"><p class="ftitle"><span class="fnode">' + mark + '</span>' + sentence(title) + '</p>' +
      (why ? '<p class="fwhy">' + esc(why) + '</p>' : '') +
      body +
      '</div></article>';
  }

  // **a frozen feed must say it is frozen** (issue #68 finding 5): the route
  // carries the host's two flags on every answer, the short one included, and
  // a page that read neither went on showing what it last drew right through a
  // deploy or a store that has stopped saving — where the session-view draws a
  // modal and a red flag. The sentences are the session's own, word for word,
  // since it is the same host saying the same thing.
  function sayOf(v) {
    if (v.paused) return P.host.paused;
    // …except the stalled sentence, which is the feed's own (issue #87 F4):
    // the session's says *nothing you do here will be kept* to a reader who
    // is doing nothing, so the feed says it about the document instead
    if (v.stalled) return T.stalled;
    if (!v.canRead) return (v.holding && v.holding.sentence) || '';
    if (!v.begun) return T.notBegun;
    if (!v.entries || !v.entries.length) return T.empty;
    if (v.closed) return T.closed(dayOf(v.closed.at));
    return '';
  }
  function saying(words) {
    const state = $('feedstate');
    state.textContent = words || '';
    state.hidden = !words;
  }

  function draw(v) {
    last = v;
    roster = v.members || 0;
    ctxOf = { founderIsMember: v.founderIsMember !== false, admissionPrice: v.admissionPrice || 'assembly' };
    document.title = T.tabTitle(v.title || 'docs.vote');
    $('feedname').textContent = v.title || '';
    $('feedword').textContent = T.name;
    const list = $('feed');
    saying(sayOf(v));
    let html = '';
    let day = null;
    for (const e of v.entries) {
      const d = dayOf(e.t);
      if (d !== day) { day = d; html += '<p class="feedday">' + esc(d) + '</p>'; }
      html += entryHtml(e, seen !== null && !seen.has(keyOf(e)));
    }
    // **a reader who has scrolled back stays where they are** (issue #68
    // finding 6): every node is replaced on every poll and entries prepend, so
    // the browser's scroll anchoring has nothing to hold on to, and an arrival
    // walked the page down by its own height — 389px on one entry, measured on
    // a projector at 1920×1080. The list only ever grows above what is being
    // read, so the height it gained is exactly the distance to carry the
    // reader back. At the top nothing is done: there the newest entry
    // arriving into view is the point.
    const was = document.documentElement.scrollHeight;
    list.innerHTML = html;
    const grew = document.documentElement.scrollHeight - was;
    // **an entry leaving is carried too** (issue #87 F2): a withdrawn or
    // voted-down motion now leaves the feed, which moves everything older up
    // by its height, so the correction runs whichever way the list changed
    if (grew !== 0 && window.scrollY > 0) window.scrollBy(0, grew);
    seen = new Set(v.entries.map(keyOf));
  }

  async function poll() {
    if (document.hidden && last) return;
    try {
      const r = await fetch('/api/d/' + encodeURIComponent(slug) + '/feed' +
        (eseq === null ? '' : '?since=' + eseq), { credentials: 'same-origin' });
      if (r.status === 404) { saying(T.missing); return; }
      if (!r.ok) throw new Error('feed ' + r.status);
      const v = await r.json();
      // the short answer builds nothing, but it still carries the two flags,
      // so the sentence is read off it over what was last drawn: a pause that
      // arrives while nothing else is moving is exactly the case that used to
      // be silent (issue #68 finding 5)
      if (v.short) { saying(sayOf(Object.assign({}, last, v))); return; }
      draw(v);
      eseq = v.canRead ? v.eseq : null;
    } catch (err) {
      // **a refused poll says so whether or not anything is drawn** (finding
      // 5): a 429 under a venue's screens on one address used to be silence
      // in front of a stale page
      saying(T.unreachable);
    }
  }

  // the drawn glyphs' sprite, injected inline as the session-view injects it
  // (Q1401) and retried the same way: a fetch that fails costs the pictures
  // and nothing else
  (function sprite(wait, left) {
    const again = () => { if (left > 0) setTimeout(() => sprite(Math.min(wait * 2, 120000), left - 1), wait); };
    fetch('/fluent-glyphs.svg').then((r) => (r.ok ? r.text() : '')).then((t) => {
      if (t) $('glyphsprite').innerHTML = t; else again();
    }).catch(again);
  })(1000, 8);

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
      // proposals about the rules, wearing the rule's own icon: one put to
      // everybody, one the membership passed, and one whose value is a spell
      { t: at(15, 35), kind: 'proposed', motionId: 'mo-4', setting: 'chamber', glyph: '🌍', route: 'constitutional',
        from: { rung: 'closed' }, to: { rung: 'link' }, author: null, changes: [],
        rationale: 'The allotment society keeps asking what we decided. Let them read it.' },
      { t: at(15, 28), kind: 'adopted', motionId: 'mo-3', setting: 'rate', glyph: '⏱️', route: 'ordinary',
        from: { grant: 3, cap: 3, dripMinutes: 240 }, to: { grant: 3, cap: 3, dripMinutes: 60 }, tookMs: 46 * 60000,
        author: null, changes: [], rationale: 'Four hours between proposals is a long afternoon.' },
      { t: at(15, 24), kind: 'proposed', motionId: 'mo-5', setting: 'lapse', glyph: '💤', route: 'constitutional',
        from: { afterMs: null }, to: { afterMs: 1209600000 }, toSpell: '14 days', author: null, changes: [],
        rationale: 'Half of us are away all August and the quorum should not wait for them.' },
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
