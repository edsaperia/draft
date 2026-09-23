/**
 * design/door.js — the stranger's door (Q452/455/456; Q508; lifted out of
 * session-view.html's inline script as refactor Q1352 (a), 2026-09-14).
 *
 * There is no login screen. A stranger arrives at the three columns: the
 * rules are public while the text is private, the text's *shape* stands as
 * bars at real metrics, one sentence says who decided, what they decided and
 * what you may do about it, and the rail holds one card. An applicant is a
 * stranger who has knocked (Q1281), so their projection lives here too.
 *
 * `make(env)` is called by the page where this code stood, with the page
 * bindings it reads. Two of them are mutable in the page (`cs`, the module
 * the page renders over, and `charterKey`, the charter column's key) and are
 * read and written through env's accessors; every page function arrives as a
 * wrapper the page makes, so a binding the page has not initialised yet at
 * make time is read when it is called, never before. The door owns
 * the server's stranger payload (`STR`); the page hands it in by
 * `setStranger`. Load order: after session.js, before the inline script.
 */
window.DOOR = (function () {
  function make(env) {
    const { S, PAGE_COPY, FOUNDER, LIVEMODE, LIVESLUG, api, SESSION, ctx } = env;
    // the drawn glyphs (Q1401): every glyph this file emits as markup is one
    // picture from the Fluent Flat set, and the sentences take glyphify
    const { glyphHtml, glyphify } = window.CARDS;
    const { policyNow, admissionPrice, avHtml, esc, csState, card, recordBody, cardHtml,
      binBtn, departedSentence, textDivs, hydrateFromModule, blocksOf, isStranger, E, render,
      plainRefusal, setDoorErr, doorErrHtml, showErrLine } = env;
    // There is no login screen. A stranger arrives at the three columns: the
    // rules are public while the text is private, the text's *shape* stands
    // as bars at real metrics, one sentence says who decided, what they
    // decided and what you may do about it, and the rail holds one card.
    let STR = null;   // the server's stranger payload (live); the fixture derives its own
    const setStranger = (d) => { STR = d; };
    const HOLDING = {
      drafting: () => 'The constitution is being drafted.',
      'founder-deciding': (f) => 'The Founder ' + (f ? f + ' ' : '') + 'is deciding if you can see this document.',
      'members-deciding': () => 'The members are deciding if you can see this document.',
      'members-only': (f, by) => (by === 'members' ? 'The members decided' : 'The Founder ' + (f ? f + ' ' : '') + 'decided') +
        ' this document is visible to members only.',
      open: () => '',
    };
    // the fixture's own door: the payload the server would build, derived from
    // the fixture's module state, so the stagehand's fifth seat is honest
    const fixtureStrangerPayload = () => {
      const f = S.roster[0] || {};
      const ch = env.cs ? env.cs.settingState('chamber') : null;
      const rung = ch && ch.value ? ch.value.rung : null;
      const kind = !env.cs || !env.cs.textConfirmed ? 'drafting'
        : !ch || ch.settledBy === null
          ? (ch && ch.holder === 'members' ? 'members-deciding' : 'founder-deciding')
        : rung === 'link' || rung === 'public' ? 'open' : 'members-only';
      const canRead = kind === 'open';
      const applyAllowed = policyNow() === 'apply';
      const admission = admissionPrice();
      const begun = !!(env.cs && env.cs.constitutedAtT !== null);
      return { stranger: true, title: S.title, slug: S.slug,
        holding: { kind, sentence: HOLDING[kind](f.n, ch && ch.settledBy === 'convenor' ? 'founder' : 'members') },
        founder: { name: f.n || null, picture: f.pic || null },
        canRead, text: canRead && env.cs ? env.cs.text : null,
        textShape: env.cs && env.cs.text ? shapeOf(env.cs.text) : [],
        mayApply: applyAllowed, admission,
        applyOpen: begun && !env.cs.closed && applyAllowed && admission !== 'pen',
        joinOpen: begun && !env.cs.closed && applyAllowed && admission === 'pen',
        members: { arrived: env.cs ? env.cs.E() : 0,
          list: canRead && env.cs ? S.roster.filter((r) => r.in).map((r) => ({ name: r.n || null, picture: r.pic || null })) : null } };
    };
    const strPayload = () => (LIVEMODE ? STR : fixtureStrangerPayload());
    // the shape of a text: per block, heading level and character count — the
    // server's own rule (never a word)
    const shapeOf = (text) => String(text).split(/\n/).map((l) => {
      const m = l.match(/^(#{1,3})\s+/);
      return { heading: m ? m[1].length : 0, chars: (m ? l.slice(m[0].length) : l).length };
    });
    // the server's stranger payload, reshaped to the member view the page's
    // predicates read: no members, no questions, no motions, no identity
    const strangerAsView = (d) => {
      const quorum = (d.view.settings.find((x) => x.setting === 'quorum') || {}).value;
      return { ...d, me: null, electorateSize: d.members.arrived, membershipReserved: false,
        quorumForm: quorum && quorum.form ? quorum.form : 'count',
        convenor: { id: FOUNDER, email: '', name: d.founder.name, isMember: true },
        view: { settings: d.view.settings, gates: d.view.gates, crowned: d.view.crowned,
          questions: [], resolutions: [], members: [], applicants: [], owedOks: [],
          owedReleases: [], owedMailGiveUps: [], owedAmendments: [], motions: [],
          crownTasks: [], identity: { name: null, picture: null },
          closed: d.closed } };
    };
    // **An applicant is a stranger who has knocked** (Q1281, 2026-09-07): the
    // server serves them the door's payload plus their own application, and
    // the page reads it through the stranger's projection with that one row
    // added — the shape `remoteCS`'s `applicantRecords` indexes, so
    // `cs.applicantRecords().get(S.app.csId)` finds them. `me` is their seat.
    const applicantAsView = (d) => {
      const v = strangerAsView(d);
      const a = d.applicant;
      return { ...v, me: d.me, stranger: false,
        view: { ...v.view, applicants: a ? [{ id: a.id, email: a.email || '', name: a.name,
          picture: a.picture, words: a.words, status: a.status, motion: a.motion,
          shutAcked: !!a.shutAcked }] : [] } };
    };
    // the applicant's provisional layer, from the server's record: what they
    // have typed stays theirs (the server holds nothing until Submit), so a
    // null field never overwrites a value in hand; `submitted` is the status
    // (started · verified · submitted · proposed · admitted · refused)
    const hydrateApplicant = (a) => {
      if (!a) return;
      S.app.csId = a.id;
      if (a.email) S.app.email = a.email;
      if (a.name !== null && a.name !== undefined) S.app.name = a.name;
      if (a.picture !== null && a.picture !== undefined) S.app.pic = a.picture;
      if (a.words !== null && a.words !== undefined) S.app.text = a.words;
      // the link verified them before the page existed (§9.7½)
      S.app.started = true; S.app.emailSent = true; S.app.emailVerified = true; S.app.mailOpen = false;
      S.app.submitted = a.status !== 'started' && a.status !== 'verified';
      // **and whether the answer was no** (Q1473, Ed 2026-09-19): the one
      // status a submitted application can end in badly, which the surface had
      // no word for — the 🪪 card went on reading *the members are deciding*
      // after they had decided. Monotone like `shutAcked` below and for the
      // same reason: a poll already in flight must not take the news back.
      if (a.status === 'refused') S.app.refused = true;
      // …and whether it was yes (issue #29 F2), monotone for the same reason
      if (a.status === 'admitted') S.app.admitted = true;
      // the OK on a shut door is the module's (SURFACE E33, Q901), and it
      // **only ever sets** — `owedSettings`' rule from the other side: the flag
      // is monotone in the module, so a poll already in flight when the press
      // landed cannot take the card back for one round trip
      if (a.shutAcked) S.app.shutAcked = true;
    };
    const founderInfo = () => (isStranger() && strPayload()
      ? { n: strPayload().founder.name || '', pic: strPayload().founder.picture || '' }
      : (S.roster[0] || { n: '', pic: '' }));
    // **Q508(c)**: where 🌍 lets a stranger read the document it lets them read
    // the membership, because the Members list is a section of the very
    // constitution they are being shown. Where it does not, the door says how
    // many have arrived and no more.
    const strMembersLine = () => {
      const n = (strPayload() || { members: { arrived: 0 } }).members.arrived;
      return n === 1 ? 'One member.' : n + ' members.';
    };
    const strMemberList = () => {
      const p = strPayload();
      const list = p && p.members && p.members.list;
      if (!list) return null;
      return '<div class="memlist">' + (list.length === 0
        ? '<div class="memrow nobody">(nobody here yet)</div>'
        : list.map((m) => '<div class="memrow">' +
          avHtml({ n: m.name || '', pic: m.picture || '', erased: !!m.erased }) +
          '<span class="mn">' + esc(m.erased ? PAGE_COPY.synth.redacted : (m.name || 'Anonymous')) +
          '</span></div>').join('')) + '</div>';
    };
    // the band, read-only: the rule as it stands, no composer, no radios
    const strCtx = Object.create(ctx, {
      clauseFor: { value: (c) => (ctx.clauseFor ? ctx.clauseFor(c) : '') },
      tasksFor: { value: () => [] },
      // nothing is asked of a stranger and nothing is news to them: every tab
      // is the rule's own state — settled grey, or ⏳ while the room decides
      mustAct: { value: () => false },
      news: { value: () => false },
      // a value the room settled is not "set by the founder": the shared body
      // takes its sentence from whoever is calling it (STYLE 5)
      lockline: { value: (c) => {
        const st = csState(c.k);
        return st && st.settledBy && st.settledBy !== 'convenor'
          ? PAGE_COPY.lockline.members
          : PAGE_COPY.lockline.founder;
      } },
    });
    // An undecided rule has no value to print and nobody to attribute it to,
    // so the card says who is deciding it — the paragraph's own sentence.
    // **A stranger's tab opens the settled card, read-only** (Ed's card
    // review round 3, 2026-09-05, 64/65, Q1183): the head — inherited from
    // `ctx.headFor` — is the standing rule as its block with the provenance
    // radio, exactly the member's card minus the composer, so the body is
    // empty. The *Set to / Set by the founder* readBody retires with this.
    const strangerReadBody = (c) => {
      const st = csState(c.k);
      if (st && st.settledBy === null) {
        return '<p class="why">' + esc(st.holder === 'members'
          ? 'The members are deciding this.'
          : 'The Founder is deciding this.') + '</p>';
      }
      return '';
    };
    const strangerReadCard = (g) => {
      const c = card(S.open);
      if (!c || !g.cards.some((x) => x.k === c.k)) return '';
      // `strCtx` inherits `chipsFor`, so a door that lets the constitution be
      // read carries the record chips too — the rules are public wherever the
      // rules are, and a rule's history is part of what it is (Q942)
      const body = c.record ? recordBody(c)
        : c.k === 'text' ? strangerTextBody() : strangerReadBody(c);
      // every card here asks nothing, so every one takes the close-only OK
      // (reading 1190)
      return cardHtml(c, strCtx, body,
        binBtn() + '<button class="btn btn-approve okbtn" data-close="1">OK</button>',
        g.cards);
    };
    const strangerTextBody = () => {
      const p = strPayload();
      // the sentence is plain text in the payload (its other consumer sets it
      // with textContent, and the founder's name is a member's own string):
      // it is escaped here, at the one place it becomes markup
      // a dead seat's door says why, above the holding sentence (E31–E32)
      return (departedSentence() ? '<p class="why">' + esc(departedSentence()) + '</p>' : '') +
        '<p class="why">' + esc(p && p.holding.sentence ? p.holding.sentence : 'The text is readable.') + '</p>' +
        (p && p.canRead ? '<div class="doctext">' + textDivs(p.text || '') + '</div>' : '');
    };
    // the charter column: the text where 🌍 permits (read-only — typing opens
    // nothing), else its shape as bars
    function syncStrangerCharter() {
      const p = strPayload();
      // the door prints what the module holds and nothing else: there is no
      // provisional layer behind a stranger, so the page fields are filled
      // from the settings the payload carries (the same mapping the member
      // surface uses — a second copy of it would be a second truth)
      if (env.cs) hydrateFromModule();
      const hold = document.getElementById('holding'), red = document.getElementById('redacted');
      // **A seat that dies mid-session becomes the door, and the door says
      // why** (Q901, E31–E32): the departure sentence stands above the holding
      // one, grey, asking nothing — the seat is gone whatever 🌍 says
      const sentence = [departedSentence(), p ? p.holding.sentence : ''].filter(Boolean).join(' ');
      hold.textContent = sentence;
      hold.hidden = !sentence;
      const key = 'stranger:' + (p ? (p.canRead ? 'read:' + p.text : 'shape:' + JSON.stringify(p.textShape)) : '');
      if (key !== env.charterKey) {
        env.charterKey = key;
        SESSION.setData({ DOC: p && p.canRead && p.text ? blocksOf(p.text) : [], SUGGS: [] });
        const shape = p && !p.canRead ? p.textShape.filter((b) => b.chars > 0) : [];
        red.classList.toggle('black', new URLSearchParams(location.search).get('bars') === 'black');
        red.innerHTML = shape.length ? barsHtml(shape, red) : '';
        red.hidden = !shape.length;
      } else {
        SESSION.refreshRail();
      }
      SESSION.setClosed(true);
      document.getElementById('doc').classList.add('begun');
    }
    // **Bars at real metrics**: a line is as many characters as the prose
    // column holds at its own font, measured — not guessed — from a probe
    // string in that font, so a 340-character paragraph wraps into the same
    // number of lines the real one would, and a heading is one bar as wide
    // as its words
    function barsHtml(shape, host) {
      const probe = document.createElement('span');
      probe.textContent = 'abcdefghijklmnopqrstuvwxyz abcdefghijklmnopqrstuvwxyz ';
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
      host.hidden = false;
      host.appendChild(probe);
      const w = host.clientWidth || 600;
      const cw = (probe.getBoundingClientRect().width || 300) / probe.textContent.length;
      probe.remove();
      const hw = { 1: 1.5, 2: 1.3, 3: 1.15 };
      return shape.map((b) => {
        if (b.chars === 0) return '';
        const charW = cw * (hw[b.heading] || 1);
        const cpl = Math.max(12, Math.floor(w / charW));
        const lines = Math.max(1, Math.ceil(b.chars / cpl));
        const bars = [];
        for (let i = 0; i < lines; i++) {
          const n = i === lines - 1 ? b.chars - cpl * (lines - 1) : cpl;
          bars.push('<i class="bar" style="width:' + Math.min(100, (n / cpl) * 100).toFixed(1) + '%"></i>');
        }
        return '<div class="rblock' + (b.heading ? ' h' + b.heading : '') + '">' + bars.join('') + '</div>';
      }).join('');
    }
    // the rail's one card
    const STRCARDS = () => {
      const p = strPayload() || {};
      const login = { k: 'strlogin', g: '📧', t: 'Log In', kind: 'personal', own: 'you',
        done: () => false };
      // **an open door is joined from the page** (issue #36 F1; Q509 (a)): at
      // 🤝 yes with 🪪 at ✒️ the payload says `joinOpen` and never `applyOpen`,
      // and the door offered Log In alone, which mails a stranger nothing. The
      // card keeps the key `strapply` — it posts the same knock, and the link
      // it mails is the joining (`/auth/apply` admits at ✒️)
      const apply = { k: 'strapply', g: '🪪', t: joining() ? PAGE_COPY.strjoin.title : 'Apply for Membership',
        kind: 'personal', own: 'you', done: () => false };
      return (p.applyOpen || p.joinOpen) ? [login, apply] : [login];
    };
    // an open door with no application to make: the 🪪 card is a Join
    const joining = () => { const p = strPayload() || {}; return !p.applyOpen && !!p.joinOpen; };
    const STRS = { email: '', sent: null, sentTo: '' };   // the stranger's provisional layer
    const strRailCtx = {
      get open() { return S.open; }, get E() { return E(); },
      mustAct: (c) => STRS.sent !== c.k,
      yours: () => false,
      waiting: (c) => STRS.sent === c.k,
      fillOf: () => '100%',
      // the login card carries no title head (Ed's card review round 3, 66):
      // its tab says what it is, and the field is the whole of the card
      noTitleHead: (c) => c.k === 'strlogin',
      summary: (c) => (STRS.sent === c.k ? 'Check your inbox'
        : c.k === 'strapply' ? (joining() ? 'Anyone with the link may join' : 'Membership is by application')
        : (strPayload() || {}).joinOpen ? 'Anyone with the link may join' : 'Members log in by email'),
      value: (c) => strRailCtx.summary(c), isRoom: () => false,
    };
    function strangerCardHtml() {
      const c = STRCARDS().find((x) => x.k === S.open);
      if (!c) return '';
      const okAddr = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(STRS.email.trim());
      const p = strPayload() || {};
      // **📧 Log In is a field and a commit** (Ed's card review round 3,
      // 2026-09-05, 66): the title, the hairline, the explanatory paragraph and
      // the *Your email* label all go; the send is the commit row's right-hand
      // button, a 📧 glyph under T47's rule (reading 1194), armed by a valid
      // address. 🪪 Apply keeps its sentence: what an application is has to be
      // said somewhere, and its card is the only place — and since Q1390 (Ed,
      // 2026-09-16: *send the link should be a submit button*) it sends from
      // the same 📧 in the row; the field's width is the stylesheet's (Q1389).
      const login = c.k === 'strlogin';
      const field = '<span class="fld">' + (login ? '' : '<label>Your email</label>') +
        '<input type="email" data-stremail="1" value="' + esc(STRS.email) + '" placeholder="you@example.com"></span>';
      const body = STRS.sent === c.k
        ? '<p class="why">Sent to <b>' + esc(STRS.sentTo) + '</b>. ' +
          (c.k === 'strapply' ? (joining() ? PAGE_COPY.strjoin.sent
            : 'Follow the link to begin your application — the address is your identity here.')
            : 'If that address is on the membership, a link is on its way.') + '</p>' +
          // the field stays after the send (Q609): typing a different address
          // un-sends, and the send button returns
          field
        : (login ? '' : '<p class="why">' + (joining() ? esc(PAGE_COPY.strjoin.why) :
            'Membership is by application. Your email is your identity here — the link it sends is the login, and the answer arrives on it.') + '</p>') +
          field +
          // a refused send is said under the card that sent it (Y25; issue #36 F2)
          (doorErrHtml ? doorErrHtml(c.k) : '');
      const foot = binBtn() + (STRS.sent !== c.k
        ? '<button class="btn btn-approve glyphbtn emojibtn"' + (okAddr ? '' : ' disabled') +
          ' data-strsend="' + c.k + '" title="Send the link">' + glyphHtml('📧') + '</button>'
        : '');
      return cardHtml(c, strRailCtx, body, foot, [c]);
    }
    document.addEventListener('input', (ev) => {
      const t = ev.target.closest('[data-stremail]');
      if (!t) return;
      STRS.email = t.value;
      // the next keystroke retires a refusal (Y25)
      if (S.doorErr && S.doorErr.k === S.open) S.doorErr = null;
      if (STRS.sent && STRS.email.trim() !== STRS.sentTo) { STRS.sent = null; return render(); }
      const b = document.querySelector('[data-strsend]');
      if (b) b.disabled = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(STRS.email.trim());
    });
    document.addEventListener('click', (ev) => {
      const send = ev.target.closest('[data-strsend]');
      if (send) {
        const k = send.dataset.strsend;
        const to = STRS.email.trim();
        // the fixture has no wire: the send is the press
        if (!LIVEMODE) { STRS.sent = k; STRS.sentTo = to; return render(); }
        // **sent means the host took it** (issue #36 F2; SURFACE Y25): the card
        // read *Sent to …* before the knock was posted and the answer was
        // thrown away, so a 429, a 400 or a host answering 502 all promised a
        // link that never came. The door is still no oracle — a member's
        // address and a stranger's get the same `ok` — but a refusal is said
        // under the card and on the stagehand's line, in Y25's words.
        send.disabled = true;
        const name = k === 'strapply' ? 'apply' : 'login';
        const path = '/api/d/' + LIVESLUG + '/' + name;
        const no = (error, status) => {
          STRS.sent = null;
          if (setDoorErr) setDoorErr(k, PAGE_COPY.refused(plainRefusal ? plainRefusal(error) : error));
          if (showErrLine) showErrLine({ name: 'POST ' + path, args: { email: to }, error, status, at: Date.now() });
          render();
        };
        fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: to }) })
          .then((r) => r.json().then((j) => ({ status: r.status, j }), () => ({ status: r.status, j: null })))
          .then(({ status, j }) => {
            if (j && j.ok) { STRS.sent = k; STRS.sentTo = to; if (S.doorErr && S.doorErr.k === k) S.doorErr = null; return render(); }
            no((j && j.error) || PAGE_COPY.noAnswer(status), status);
          })
          .catch(() => no(PAGE_COPY.noAnswer(0), 0));
        return undefined;
      }
    });

    return { setStranger, strPayload, shapeOf, strangerAsView, applicantAsView, hydrateApplicant, founderInfo, strMembersLine, strMemberList, strCtx, strangerReadCard, syncStrangerCharter, STRCARDS, strRailCtx, strangerCardHtml };
  }
  return { make };
})();
