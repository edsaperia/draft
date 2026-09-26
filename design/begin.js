/**
 * design/begin.js — 🍾 Begin and 🥂 the closing card (lifted out of
 * session-view.html's inline script as refactor Q1352 (b), 2026-09-14).
 *
 * The founder's readiness readout and the one wait no answering can end
 * (Q826–Q828); the ✉️ task derived from it (entry 181); `beginOffered`, the
 * page's half of *a card with a dependency does not appear until it is
 * settled* (F9, F18); the 👑 and 📭 news bodies; 🍾's power table —
 * `BEGIN_ROWS`, the one place the page knows it (entry 158, Q1195 (c)) —
 * its collector and its card; and 🥂's body, which reads the record.
 *
 * `make(env)` is called by the page where this code stood, with the page
 * bindings it reads: values it has by then, `cs` and `FIX` through accessors
 * (both are reassigned by the page), and every page function as a wrapper the
 * page makes, read when called. The walks' seam into the page's closure
 * (`window.__cmd`, `window.__founding`) stays on the page, beside the call.
 * Load order: after door.js, before the inline script.
 */
window.BEGIN = (function () {
  function make(env) {
    const { S, PAGE_COPY, SEC, SESSION } = env;
    // the drawn glyphs (Q1401): every glyph this file emits as markup is one
    // picture from the Fluent Flat set, and the sentences take glyphify
    const { glyphHtml, glyphify } = window.CARDS;
    const { amFounder, card, closeSignatures, closedAtWords, constituted, csState, decidingOf, esc, listOf,
      midOf, mustAct, mySignature, nounOf, pkeyOf, pwPair, pwPend, pwPhrase, remedyOnly,
      servedCards, settled, viewerIsMember, visible } = env;
    // the founder's readiness readout — live from the view (founder only),
    // fixture from the module itself; null for anybody else
    const readinessOf = () => {
      if (!env.cs || constituted()) return null;
      try { return env.cs.readiness ? env.cs.readiness() : null; } catch (e) { return null; }
    };
    // **The one wait no amount of answering can end** (Q826–Q828). `readiness()`
    // now says *why* each question is outstanding, and `one-voice` is the reason
    // that is not a state the founding will leave by itself: a question handed to
    // a membership of one has not been handed to anybody (`maybeResolve`), so the
    // founder answers it, watches nothing happen, and arrives at a 🍾 they cannot
    // press. The two remedies are the founder's and both exist already — invite
    // somebody, or take the setting back — and neither is anywhere in a bare id.
    const oneVoiceHolds = () => { const rd = readinessOf();
      return rd && rd.holds ? rd.holds.filter((h) => h.why === 'one-voice').map((h) => h.setting) : []; };
    // **…and the wait that is upstream** (entry 69). §9.0a serves a question
    // only once its own dependencies stand — 🌡️ waits on ⏰ — so a founder alone
    // who handed 🌡️ over while ⏰ was still undecided was told they were its only
    // member and sent to invite somebody, and inviting would not have moved it:
    // nobody can answer 🌡️ yet, however many are in the room. The holds are read
    // whole, because the dependency has to be named, and the module names it —
    // the page keeps no copy of the catalogue's `deps`.
    const depsHolds = () => { const rd = readinessOf();
      return rd && rd.holds ? rd.holds.filter((h) => h.why === 'deps-unsettled' && (h.on || []).length)
        .map((h) => ({ setting: h.setting, on: h.on })) : []; };
    // …and where that is what the document is waiting for, 🪪 is a **task**, not
    // a settled tab in the band. It is a task by derivation and nothing else: no
    // `S.okd` key, no `ACK_KEYS` entry, no news — it is owed exactly while the
    // reason stands and leaves the instant an invitation goes out (the reason
    // becomes `invitation-open`) or the setting is taken back (it stops
    // collecting). Nothing is acknowledged, because nothing has been decided.
    const oneVoiceRemedy = () => amFounder() && !constituted() && oneVoiceHolds().length > 0;
    // **…and the same card is a task for a second reason** (entry 181, Ed
    // 2026-08-28: *"Invite Members" task for the founder should appear as soon as
    // the membership section is completed*). The remedy above only ever finds a
    // founder who delegated something; one who delegates nothing was never asked
    // to invite anybody at all, and reached 🍾 with a room of one having been told
    // nothing about it. So once the Membership section's rules stand, ✉️ stands
    // too — derived in exactly the same way and acknowledging exactly as much:
    // no `S.okd` key, no `ACK_KEYS` entry, no news, nothing owed (F8). It blocks
    // nothing (F3): it stands beside whatever the founding is asking next, and it
    // leaves by derivation — at the first invitation, or at 🍾.
    // Ed's own five, and deliberately **not** `SEC[0].keys`, which carries the two
    // doors and the three identity rows beside them: the section is complete when
    // its rules are decided, and ✋ 🖼️ are neither rules nor blocking (Q980).
    // A hidden rule completes the section by not existing — `settled` says
    // false for it, `S.seen` never having been written, so the hide is tested
    // here rather than left to it (nothing hides one since Q1363; the seam stays).
    const MEMBERSHIP_RULES = ['admission', 'applications', 'hat', 'lapse', 'removal'];
    const membershipStands = () => MEMBERSHIP_RULES.every((k) => { const c = card(k);
      return !c || (c.hide && c.hide()) || settled(c); });
    // an invitation is a roster row that is not the founder's — invited or arrived
    // alike, the rows the door pushes carrying no `founder` flag of their own
    const noneInvited = () => !S.roster.some((p) => !p.founder);
    const inviteTask = () => amFounder() && !constituted() && membershipStands() && noneInvited();
    // what 🪪 says while it is standing as that remedy: which questions are stuck,
    // why nobody can answer them, and both ways out — the same two acts 🍾's own
    // hold sentence names, said on the card that performs one of them
    const oneVoiceAsk = () => {
      const ov = oneVoiceHolds();
      if (!ov.length || !amFounder()) return '';
      const one = ov.length === 1;
      // **and what is queued behind it** (entry 69): a question waiting on one of
      // these is not a second problem to go and solve, and saying nothing about
      // it leaves the founder to find it standing there afterwards. The remedy is
      // still this card's — the deps hold summons nothing of its own.
      const beh = depsHolds().filter((h) => h.on.some((d) => ov.indexOf(d) >= 0));
      // the pronoun tracks the questions the queued ones are *actually* waiting
      // on, not the whole stuck list: with two stuck and one dependent on only
      // one of them, *waiting on them* claims a wait that is not there — so
      // where the card names more than one, the dependency is named too
      const behOn = beh.reduce((a, h) => a.concat(h.on.filter(
        (d) => ov.indexOf(d) >= 0 && a.indexOf(d) < 0)), []);
      const behind = beh.length ? ' ' + listOf(beh.map((h) => settingNamed(h.setting))) +
        (beh.length === 1 ? ' is' : ' are') + ' waiting on ' +
        (one ? 'it' : listOf(behOn.map(settingNamed))) +
        ' in turn, and will follow once ' + (behOn.length === 1 ? 'it settles' : 'they settle') + '.' : '';
      return '<p class="why"><b>' + listOf(ov.map(settingNamed)) + (one ? ' is' : ' are') +
        ' waiting for somebody to answer ' + (one ? 'it' : 'them') + '.</b> You handed ' +
        (one ? 'it' : 'them') + ' to the membership, and you are its only member — ' +
        'a question answered by one voice has not been handed to anybody, so one more member ' +
        'is enough to start it. If you would rather not invite anybody, take ' +
        (one ? 'it' : 'them') + ' back on ' + (one ? 'its' : 'their') + ' own card and set ' +
        (one ? 'it' : 'them') + ' yourself.' + behind + '</p>';
    };
    // **A card with a dependency does not appear until its dependency is
    // settled — never greyed** (SURFACE F9), and 🍾 was the one card that broke
    // it: it arrived with a dead commit while the founder's own blind answers
    // were outstanding and 🏛️ was unacknowledged. Two independent systems
    // decided *show* and *enable* and nothing reconciled them — `blocksOrder`
    // skips every gate but the pen, and a delegated setting reads *settled* the
    // instant it is handed over — so visibility keys on the module's own
    // answer instead. The voice half is `!mustAct(…)` rather than
    // `acked('grant-voice')` deliberately: a **clerk** founder is not a member,
    // so 🏛️ never opens for them, and an `acked()` test would hold 🍾 shut for
    // ever.
    // **…and 🍾 is served when it is the last thing standing** (Q773, Ed
    // 2026-08-25: *before begin, there shouldn't be a situation where I don't see
    // any queue-cards*). F9 hides a card whose dependency is unsettled because
    // something else is being asked instead; when nothing is, hiding it leaves
    // the founder a blank rail and no way out of it. The ruling this restores is
    // already on the 🪪 card (Ed, 2026-08-21, dropping its one-member minimum):
    // *whether a document can begin with nobody in it is 🍾's question, and 🍾
    // has a readout that names what it is waiting for* — and Q745 hid the card
    // in precisely the state that readout was written for. The commit stays
    // disabled while `readiness()` says so, which is the half of F9 that
    // matters here: the founder is told what the document is waiting for, not
    // invited to press through it.
    // **A dead end is served, not hidden — and the remedy is not a way out of
    // needing the explanation** (Q830). F18's last-resort door asks whether the
    // rail would otherwise be empty, and Q828 puts a task in it in exactly the
    // state the door was written for: serve 🪪 as the remedy for a `one-voice`
    // wait and 🍾 disappears, taking with it the only sentence that says *why* the
    // founder is being sent to 🪪. The two are one thing and have to stand
    // together, so the remedy does not count as *something else being served* —
    // it is the dead end wearing a card, not the next task. Nothing else changes:
    // 🍾 still waits behind every real task the founding has left, which is why
    // this is an exclusion here rather than a second door on `readiness()`. That
    // was tried and was too eager — it opened 🍾 from the founder's first
    // delegation, jumping ahead of their own questions.
    // Re-entrant like `firstAsked` above, and guarded the same way: `servedCards`
    // asks `visible(card('begin'))`, which asks this. Inside that inner ask the
    // door is simply shut, so 🍾 never counts itself as the thing being served.
    let askingLast = false;
    const nothingElseServed = () => {
      if (askingLast) return false;
      askingLast = true;
      try { return !servedCards().some((c) => !c.isBegin && !remedyOnly(c)); }
      finally { askingLast = false; }
    };
    // **🍾 waits in the open while the room answers** (issue #76, Ed
    // 2026-09-22: *a ⏳ Begin task in the rail with a list of the
    // usernames/avatars which have answers still due*). When everything the
    // document is waiting for is a delegated question still collecting, and
    // the founder has given every answer of their own, the founder's part is
    // done and the wait is the room's: 🍾 is served, refused with its reason,
    // as a ⏳ entry naming who is still to answer. Until #76 it was hidden
    // behind F9 whenever anything else stood in the rail — ✋ and 🖼️ are
    // served from the save and never block (Q980), so on every real document
    // the founder met no 🍾, no reason and no names; `founder-answers` passed
    // only because the fixture's founder has a name. Only while *every* hold
    // is `collecting`: an unset rule or the `one-voice` dead end keeps its
    // own road (F5, F19), so 🍾 never jumps ahead of the founder's own work.
    const ownAnswersGiven = (rd) => {
      const me = (rd.members || []).find((m) => m.id === env.viewerId());
      return !me || me.answered >= me.owed;
    };
    const beginCollecting = () => {
      if (!amFounder()) return false;
      const rd = readinessOf();
      if (!rd || rd.ready) return false;
      const holds = rd.holds || [];
      return holds.length > 0 && holds.every((h) => h.why === 'collecting') && ownAnswersGiven(rd);
    };
    // the members whose answers are still due, in the register's order —
    // participation by name, never preference (the module's own readout)
    const dueMembers = () => {
      const rd = readinessOf();
      return rd ? (rd.members || []).filter((m) => m.owed > m.answered) : [];
    };
    const beginOffered = () => {
      const rd = readinessOf();
      // no readout at all is not the same as a readout that says *not yet*: the
      // commit is live when `rd` is null (`cardFor`'s `!rd || rd.ready`), so the
      // last-resort door stays shut here rather than offer a press through an
      // unknown state
      if (!rd) return false;
      if (!rd.ready) return beginCollecting() || nothingElseServed();
      // …and the voice — but only where the voice is actually being served.
      // 🏛️ arrives when you become a member (Q1365) and rides the Founded
      // line, so for a founder-member it is served from the save; a clerk is
      // not a member and never opens it, so `visible` is false for them and
      // a bare `mustAct` (true from arrival, the card being open and
      // unacknowledged) would hold 🍾 shut for ever — the Q645 deadlock in a
      // new place, and the one this file already warns about above
      // `otherTasksLeft`: *what a question hands you cannot be the reason to
      // withhold the question*.
      return !(visible(card('grant-voice')) && mustAct(card('grant-voice')));
    };
    const glyphOfSetting = (mid) => { const c = card(pkeyOf(mid)); return c ? c.g + ' ' : ''; };
    // a setting named inside a sentence — its glyph and its noun (`nounOf`:
    // a name, not a title, so the noun in every state)
    const settingNamed = (mid) => glyphOfSetting(mid) +
      esc(card(pkeyOf(mid)) ? nounOf(card(pkeyOf(mid))) : mid);
    // **The 👑 news card's body** (entry 162, Q1013): what one act laid down,
    // grouped by the constitution's own sections. `SEC` is the page's existing
    // idea of a zone, and 158's editable zone table does not exist yet — when
    // it lands its table becomes the grouping, so nothing here invents a second
    // zone list for it to collide with. 🪜 is in no section's keys (Q512), so a
    // release on it lands in an unheaded tail rather than being filed under a
    // section it does not stand in.
    const secTitleOfKey = (pk) => {
      const s2 = SEC.find((x) => x.keys.includes(pk));
      return s2 ? s2.title : null;
    };
    const releaseBody = (b) => {
      const rows = b.releases.map((r) => ({
        sec: secTitleOfKey(pkeyOf(r.setting)),
        // ✒️ amends at will, 🛡️ refuses — the pair the surface already names
        line: (r.power === 'unilateral' ? '✒️ ' : '🛡️ ') + settingNamed(r.setting) }));
      const groups2 = SEC.map((x) => x.title).filter((t2) => rows.some((r) => r.sec === t2))
        .concat(rows.some((r) => r.sec === null) ? [null] : []);
      return '<p class="why">The Founder has laid these down. Where ✒️ stands they can ' +
        'no longer amend at will; where 🛡️ stands they can no longer refuse what the ' +
        'membership passes. Only the membership can hand either back.</p>' +
        groups2.map((t2) => (t2 ? '<div class="unlocks"><b>' + esc(t2) + '</b></div>' : '') +
          '<ul class="batch">' + rows.filter((r) => r.sec === t2)
            .map((r) => '<li>' + r.line + '</li>').join('') + '</ul>').join('');
    };
    // **What could not be reached, and what follows from it** (SURFACE E34).
    // The membership is told the address and nothing else: the invitation is the
    // register's own fact, and what a member can do about it is nothing — the
    // 📨 re-send is the founder's, on their ✉️ row.
    const mailGiveUpBody = (b) => '<p class="why">' +
      (b.addresses.length > 1
        ? 'These addresses could not be reached, so nobody there has heard about this document. '
        : 'This address could not be reached, so nobody there has heard about this document. ') +
      'The link the message carried has been withdrawn. The Founder can send it again.</p>' +
      '<ul class="batch">' +
      b.addresses.map((a) => '<li>' + esc(a) + '</li>').join('') + '</ul>';
    // **The zones 🍾 asks about, and the one place that knows what is in them**
    // (entry 158, Ed 2026-08-27; **one row per setting since Q1195 (c)**, Ed
    // 2026-09-09, R-098). Eighteen settings × two powers is the whole table, and
    // it is a source literal on purpose: it is the one place the page knows the
    // table, and nothing anywhere else in the page may reconstruct it. The keys
    // are page keys, **in the order the settings appear in the document** — the
    // band's `ORDER` for the settings in it, the doors after the four membership
    // rules they stand under, 🪜 beside 🌡️, the Text after the constitution —
    // and cover `PW_KEYS` exactly once each (`checkBeginRows` in
    // `scripts/spec-check.mjs`, which also holds the order against `ORDER`).
    // Only 📝 starts at *lay down* — SPEC §9.7 rule 8 as amended reads *the
    // start lays down whatever 🍾 was not told to keep*, so not told is laid
    // down and a Founder who never opens the table gets exactly the document
    // they got before this existed. 📝 is a live pair like every other row's —
    // nothing greyed, nothing hidden, no sentence apologising for it: a 🛡️ kept
    // there parks an adoption awaiting the Founder's assent (entry 159), a ✒️
    // kept there is the Founder's own amendment passing on submission (160).
    const BEGIN_ROWS = [
      'title', 'slug', 'chamber',
      'admission', 'applications', 'lapse', 'removal', 'invite', 'remove',
      'rate', 'ending', 'quorum', 'authorship', 'judgments',
      'text',
      // `machines` is not here (Ed, 2026-09-09: *we are not having machines*):
      // it has had no card since 🤖 left the surface (R-078) and stays in the
      // catalogue for replay alone, so the start keeps both powers on it and
      // nothing can ever be proposed on it — `checkBeginRows` exempts it by
      // name rather than the table pretending it is a setting anybody meets.
      // **🌡️ and 🪜 joined it on 2026-09-15** (Q1362 (b), R-117): a power over
      // a setting no card asks about is a power nobody could ever use.
    ];
    // **A switch reflects the tabs** (Ed's rule (i)): the hand actually on a key
    // less what its own ✒️/🛡️ tab has already promised away — the same two
    // functions the tabs read, so the two controls cannot disagree about one
    // power. It is the module's own `stillHeld`, on the page's side.
    const beginStillHeld = (k, pw) => {
      const p = pwPair(k), pend = pwPend(k);
      return pw === 'u' ? (p.u && !pend.u) : (p.a && !pend.a);
    };
    // where a cell's toggle stands: the founder's unsent position if they have
    // touched it, else the row's own start — down on 📝, keep everywhere else
    const beginPos = (k, pw) => {
      const v = S.beginRows[k + ':' + pw];
      return v === undefined ? (k === 'text' ? 'down' : 'keep') : v;
    };
    // …and what the cell reads as, three-valued: **given** where the power is
    // already promised away on the setting's own tab — struck and disabled, it
    // comes back only there — else the toggle's own position. One cell is one
    // power on one setting, so there is no *mixed* (Q1195 (c)): the zones had
    // one, drawn struck like laid down, whose press laid the rest down and
    // moved nothing on the glyph.
    const beginCellState = (k, pw) => !beginStillHeld(k, pw) ? 'given' : beginPos(k, pw);
    // **The collector, pure and the press's only source** (entry 158): the row
    // table and the toggle positions in, one deduplicated list of
    // `{ setting, power }` in **module** ids out, with what is no longer the
    // Founder's already dropped. Written as a function of the table so the walk
    // and the module tests can exercise it without a press — and so the
    // post-start table, when it is built, reuses it and reaches a door that
    // takes the whole list at one `t`. It must never be N `relinquish` calls:
    // post-start that is N news cards (entry 162), pre-start it delegates.
    const beginLayDown = () => {
      const out = [], seen = new Set();
      for (const k of BEGIN_ROWS) {
        for (const pw of ['u', 'a']) {
          if (beginPos(k, pw) !== 'down') continue;
          if (!beginStillHeld(k, pw)) continue;
          const setting = midOf(k), power = pw === 'u' ? 'unilateral' : 'assent';
          if (seen.has(setting + ':' + power)) continue;
          seen.add(setting + ':' + power);
          out.push({ setting, power });
        }
      }
      return out;
    };
    // what the Founder will hold on the Text once the start has run — live,
    // simply what they hold; before the press, what the collector is about to
    // take off them. Derived from the collector itself so the sentence and the
    // act cannot disagree.
    const textAfterBegin = () => {
      if (constituted()) return pwPair('text');
      const goes = beginLayDown().filter((r) => r.setting === 'startingText').map((r) => r.power);
      return { u: beginStillHeld('text', 'u') && !goes.includes('unilateral'),
        a: beginStillHeld('text', 'a') && !goes.includes('assent') };
    };
    // **The first line states the choice made, not a fixed fact** (entry 158,
    // overturning Q387 / R-043's first clause). It has to read both before the
    // press (*what beginning does*) and after it (*what beginning did*), so it
    // is derived rather than written; the four sentences use 📄's own tab
    // grammar (`pwPhrase`), and the one where nothing is kept is the sentence
    // this line has always been.
    const beginTextLine = () => {
      const t2 = textAfterBegin();
      if (!t2.u && !t2.a) return 'The Founder lays down ✒️ and 🛡️ on the Text — from here it changes by proposal alone.';
      if (t2.u && t2.a) return 'The Founder keeps ✒️ and 🛡️ on the Text — they may amend the text at will, and refuse changes to the text that the membership pass.';
      return 'The Founder keeps ' + (t2.u ? '✒️' : '🛡️') + ' on the Text and lays down ' +
        (t2.u ? '🛡️' : '✒️') + ' — they may ' + pwPhrase('text', t2.u ? 'u' : 'a') + '.';
    };
    const BEGIN_BATCH = [
      beginTextLine,
      'Members gain ✏️s on it, at the proposal rate.',
      'Voting opens.',
      'The moment is stamped as the founding, and the settings stop being re-set: from here they are amended.',
    ];
    // **The table itself** (entry 158): drawn only before the press and only
    // for the Founder — after it there is nothing left to choose, and the batch
    // list above says what was chosen. Its shape has moved three times: twelve
    // *Kept / Laid down* radios in two columns (CP1, Q1103 (b)); six clause
    // blocks, one per zone × power, the power's glyph as the toggle where a
    // radio would sit (Q1181, Ed's card review round 3); and since **Q1195 (c)**
    // (Ed, 2026-09-09) **one row per setting, in document order** — the
    // setting's glyph and noun, then ✒️ and 🛡️ as the same glyph toggles:
    // plain for kept, wearing the wallets' red strike for laid down, pressed to
    // flip; struck **and disabled** where the power was already given on the
    // setting's own tab, the tooltip saying it comes back only there. The zones
    // hid *which* power was mixed and made a press on a mixed zone invisible;
    // a cell is one power on one setting and has no mixed state.
    const beginCellHtml = (k, pw) => {
      const st = beginCellState(k, pw);
      const kept = st === 'keep';
      const g = '<span class="tg">' + glyphHtml(pw === 'u' ? '✒️' : '🛡️') + '</span>';
      // **a given cell is not a control** (Q1541 stage 2, principle 5): it
      // can never have a job here — the power comes back only on its own tab
      // — so it is drawn as the struck glyph and nothing to press, where a
      // disabled button promised a thaw that never comes
      if (st === 'given') {
        return '<td class="bcell"><span class="pwtoggle given" data-bkey="' + k + '" data-bpw="' + pw + '"' +
          ' title="' + PAGE_COPY.begin.givenTip + '">' + g + '</span></td>';
      }
      return '<td class="bcell"><button class="pwtoggle" type="button" aria-pressed="' + kept + '"' +
        ' data-bkey="' + k + '" data-bpw="' + pw + '"' +
        ' title="' + (kept ? PAGE_COPY.begin.keptTip : PAGE_COPY.begin.downTip) + '">' + g + '</button></td>';
    };
    // the setting cell: the card's glyph and its noun through `settingNamed`,
    // the one reader of a setting's name inside a sentence — the doors read
    // *Invites* / *Removals*, their `n` (Ed, 2026-09-09)
    const beginRowHtml = (k) => '<tr data-bkey="' + k + '">' +
      '<td class="bname">' + settingNamed(midOf(k)) + '</td>' +
      beginCellHtml(k, 'u') + beginCellHtml(k, 'a') + '</tr>';
    const beginTableHtml = () => {
      if (constituted() || !amFounder()) return '';
      // no header row (Ed, 2026-09-09: *no column heads*): each cell's own
      // glyph says which power it is
      return '<div class="unlocks"><b>What the Founder keeps.</b></div>' +
        '<p class="why">Every power is the Founder’s until they lay it down. Whatever is not kept here goes the moment the document begins.</p>' +
        '<table class="begintable"><tbody>' +
        BEGIN_ROWS.map(beginRowHtml).join('') + '</tbody></table>';
    };
    // the card's last line while it cannot begin: when it comes back. On the
    // one shell it is the dark 🍾's own note where no member is left to
    // answer (Q1541 stage 2, answers Part 4 .22), so `beginBody` leaves it
    // out when asked (`noFoot`) rather than say it twice
    const beginFoot = (rd) => (!rd ? '' : rd.ready
      ? 'Nobody is kept waiting by this: whoever has not answered can still answer after the start, and the document takes what was said.'
      // *it comes back to you* is a promise about a wait that ends by
      // itself, and `one-voice` is the one that does not (Q827)
      : oneVoiceHolds().length ? 'It comes back to you the moment somebody else can answer.'
      : 'It comes back to you the moment the questions stand.');
    const beginBody = (c, rd, o) => {
      const batch =
        '<div class="unlocks"><b>' + (constituted() ? 'What beginning did.' : 'What beginning does, all at once.') + '</b></div>' +
        // the first item is a function of the power table and the rest are
        // constants — one list, four items, whichever way an item is written
        '<ul class="batch">' + BEGIN_BATCH.map((l) => '<li>' +
          (typeof l === 'function' ? l() : l) + '</li>').join('') + '</ul>';
      if (constituted()) return batch;   // the head already says when
      if (!rd) return batch + '<p class="setnote">Only the Founder can begin the document.</p>';
      // informs, never blocks — except the questions judging cannot do without
      const hold = rd.waiting && rd.waiting.length
        ? '<p class="setnote hold">The document cannot begin while ' +
          listOf(rd.waiting.map(settingNamed)) +
          (rd.waiting.length === 1 ? ' is' : ' are') + ' still being decided.</p>' : '';
      // **…and it says what to do about it** (Q827, Ed 2026-08-25: *I did all my
      // open tasks and then got served Begin while being unable to action it. My
      // guess is this is because I delegated things to the members and I'm the
      // only member*). He had to guess, because the counts above are the only
      // thing the card said and they read *1 of 1 have answered* — a question
      // that looks finished beside a start that will not come. The counts stay;
      // what they no longer do is stand alone. Both remedies are named, because
      // the founder may not want either one in particular and has to be able to
      // choose: a second member, or the setting back in their own hand.
      const ov = oneVoiceHolds();
      const one = ov.length === 1;
      const why = ov.length ? '<p class="setnote hold">' + listOf(ov.map(settingNamed)) +
        (one ? ' is' : ' are') + ' delegated to the membership, and you are its only member: ' +
        'a question answered by one voice has not been handed to anybody. Invite somebody at ' +
        '🪪 Membership, or take ' + (one ? 'it' : 'them') + ' back on ' + (one ? 'its' : 'their') +
        ' own card and set ' + (one ? 'it' : 'them') + ' yourself.</p>' : '';
      // **…and where the block is upstream, it says so instead** (entry 69, Ed:
      // *the copy should say this waits on that, which must settle first, never
      // invite someone*). A delegated 🌡️ under an undecided ⏰ read as a room of
      // one and sent the founder to the door; the wait is the dependency's, and
      // ✉️ is not served for it — `oneVoiceHolds` filters the other reason.
      const deps = depsHolds().map((h) => '<p class="setnote hold">' +
        settingNamed(h.setting) + ' is waiting on ' + listOf(h.on.map(settingNamed)) +
        ', which must settle first — it cannot be answered until then.</p>').join('');
      // **A collecting question is a sentence, not a tally** (Ed's QA,
      // 2026-09-02 pm, with Q1176): the counts the retired watch-half carried
      // live here now — *X out of Y of the membership have voted on whether…* —
      // the subject derived from the one `DECIDING` table so it cannot drift
      // from the card's own delegation sentence. The card's fuller design is
      // Q1169's.
      const qs = (rd.questions || []).map((q) => {
        const k = pkeyOf(q.setting);
        let line;
        if (q.settled) {
          line = esc(card(k) ? nounOf(card(k)) : q.setting) + '<span class="rsub"> · settled</span>';
        } else if (q.collecting) {
          const subject = decidingOf(k)
            .replace(/^The membership (?:will decide|(?:are|is) deciding) /, '')
            .replace(/^if /, 'whether ').replace(/\.$/, '');
          line = esc(q.answered + ' out of ' + q.electorate + ' of the membership ' +
            (q.answered === 1 ? 'has' : 'have') + ' voted on ' + subject + '.');
        } else {
          line = esc(card(k) ? nounOf(card(k)) : q.setting) + '<span class="rsub"> · still being decided</span>';
        }
        return '<span class="gaterow"><span class="gg">' + glyphOfSetting(q.setting) + '</span>' + line + '</span>';
      }).join('');
      const ms = (rd.members || []).map((m) => '<span class="gaterow">' +
        esc(m.name || 'Anonymous') + '<span class="rsub"> · ' +
        (!m.arrived ? 'invited, not yet arrived' : m.owed === 0 ? 'nothing owed'
          : m.answered >= m.owed ? 'answered everything' : m.answered + ' of ' + m.owed + ' answered') + '</span></span>').join('');
      return batch + hold + why + deps + beginTableHtml() +
        '<div class="readiness"><div class="fieldlab">The questions</div><div class="gatelist">' + qs + '</div>' +
        '<div class="fieldlab">The people</div><div class="gatelist">' + ms + '</div></div>' +
        (o && o.noFoot ? '' : '<p class="setnote">' + beginFoot(rd) + '</p>');
    };
    // what the close did, in one card: final as of when, what adopted, what
    // carried, what the clock found still running, what was left undecided,
    // whose names the record reveals
    const closingBody = (c) => {
      const rec = env.cs && env.cs.isRemote ? env.cs.record : null;
      const adopted = rec ? rec.adopted.length : (env.FIX ? SESSION.SUGGS.filter((g) => g.state === 'sealed' && g.won && !g.fold).length : 0);
      const undecided = rec ? rec.undecided.length : SESSION.SUGGS.filter((g) => g.undecided).length;
      const motionRecs = env.cs ? [...env.cs.motionRecords().values()] : [];
      const carried = motionRecs.filter((m) => m.status === 'carried').length;
      // **What the clock found running** (Q1450, Ed 2026-09-18), both routes
      // and one count: a constitutional motion the close kept wears its own
      // status, and an ordinary one the close held is a `held` record the
      // module marked — `heldBy: 'close'` over the wire, `heldAtClose` on the
      // module's own record, which is the same two shapes `recAt` and
      // `heldByOf` normalise. Neither says *rejected*: nobody decided them.
      const stillOpen = motionRecs.filter((m) => m.status === 'kept-at-close' ||
        (m.status === 'held' && (m.heldBy === 'close' || m.heldAtClose))).length;
      const unassented = rec ? rec.carriedButUnassented.length : 0;
      const n = (k, one, many) => k + ' ' + (k === 1 ? one : many);
      // **The record says who is named; the card reads the record** (Q770,
      // entry 31). A sentence derived from the rung alone is wrong the moment
      // one person signs, so live the count comes from the field entries the
      // server has already passed through the one reveal rule; the fixture
      // has no record and keeps a plain sentence from the standing rung. The
      // eight sentences are `PAGE_COPY.closingNames` since issue #19, and the
      // reasoning for each of them travelled with it; what is chosen between
      // them is this card's, and stays here.
      const NM = PAGE_COPY.closingNames;
      const fields = rec ? [...(rec.adopted || []), ...(rec.undecided || [])].flatMap((r) => r.field || []) : null;
      let names;
      if (fields) {
        const named = fields.filter((f) => f.author).length;
        names = fields.length === 0 ? NM.nothing
          : named === 0 ? NM.none
          : named === fields.length ? NM.all(n(fields.length, 'proposer', 'proposers'))
          : NM.some(named, n(fields.length, 'proposer', 'proposers'));
        const under = new Set(fields.map((f) => f.madeUnder).filter(Boolean));
        if (under.size > 1 || (rec.rungNow && [...under].some((u) => u !== rec.rungNow))) names += NM.honour;
      } else {
        const auth = csState('authorship');
        const rawRung = auth && auth.value ? auth.value.rung || auth.value : null;
        const reveal = rawRung === 'anonymousElective' ? 'anonymous'
          : rawRung === 'sealedElective' ? 'sealed' : rawRung;
        names = reveal === 'anonymous' ? NM.sealed : reveal === 'public' ? NM.public : NM.unsealed;
      }
      const sigs = closeSignatures();
      const sigList = sigs.length ? '<div class="gatelist sigs">' + sigs.map((sg) =>
        '<span class="gaterow">' + (sg.erased ? esc(PAGE_COPY.synth.redacted)
          : sg.name ? esc(sg.name) : '<span class="disc small" aria-hidden="true"></span>a member') +
        (sg.comment ? '<span class="rsub"> · ' + esc(sg.comment) + '</span>' : '') + '</span>').join('') + '</div>' : '';
      const mine = mySignature();
      return '<div class="unlocks"><b>The document is final as of' + esc(closedAtWords().replace(/^ at /, ' ')) + '.</b></div>' +
        '<ul class="batch">' +
        '<li>' + n(adopted, 'proposal was adopted', 'proposals were adopted') + ' into the text.</li>' +
        '<li>' + n(carried, 'motion passed', 'motions passed') + (unassented ? '; ' + n(unassented, 'passed change waited', 'passed changes waited') + ' on an assent that never came, and goes to the backlog' : '') + '.</li>' +
        // omitted at zero, unlike the lines around it: it is a line that
        // appears when there is something to say (Q1450)
        (stillOpen ? '<li>' + n(stillOpen, PAGE_COPY.closeBatch.stillOpenOne,
          PAGE_COPY.closeBatch.stillOpenMany) + '.</li>' : '') +
        '<li>' + n(undecided, 'question was', 'questions were') + ' left undecided — the text stands, and ' +
          (undecided === 1 ? 'it is' : 'they are') + ' filed below the charter as its backlog.</li>' +
        '<li>' + names + '</li>' +
        '<li>The record is published with the document, at this address.</li></ul>' +
        (viewerIsMember() && !mine
          ? '<div class="fieldlab">Your closing comment</div>' +
            '<div class="speaker"><span class="disc" aria-hidden="true"></span>' +
            '<div class="said edit-why" contenteditable="plaintext-only" data-signwhy="1" data-placeholder="Dissent is as welcome as praise — or nothing at all."></div></div>' +
            '<p class="setnote"><b>OK</b> signs the document. Your comment, or its absence, goes on the record beside your name.</p>'
          : mine ? '<p class="setnote">You signed' + (mine.comment ? ': <i>' + esc(mine.comment) + '</i>' : ' without a comment') + '.</p>' : '') +
        (sigs.length ? '<div class="fieldlab">Signed</div>' + sigList : '');
    };

    return { readinessOf, oneVoiceRemedy, inviteTask, oneVoiceAsk, beginOffered, beginCollecting, dueMembers, releaseBody, mailGiveUpBody,
      BEGIN_ROWS, beginStillHeld, beginPos, beginLayDown, beginBody, beginFoot, closingBody };
  }
  return { make };
})();
