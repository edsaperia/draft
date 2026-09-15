/**
 * design/live.js — the live layer: the page served by the product server
 * (lifted out of session-view.html's inline script as refactor Q1352 (e),
 * 2026-09-14).
 *
 * **A document at `/d/:slug` is real**: identity is the cookie, `view()` is the
 * only read, every command is a POST the server folds as that member, and the
 * page keeps nothing but the provisional layer. Three things live here — the
 * wire (the host's two flags and `api`), the `ConstitutionSession` lookalike
 * the page's predicates render a real document through, and the derivation of
 * everything session.js draws about the charter from the blind projection —
 * plus the two boots, `/d/:slug`'s and the birth's.
 *
 * Two makes, because the two regions sit either side of `S`: `wire(env)` is
 * made where the live-mode constants stand, before `S` exists, so it reads
 * `env.S` the way edit-mode.js does; `make(env)` is made at the live layer's
 * own marker, by which point `S` and the page's maps are values. `cs` is an
 * accessor in both and a settable one in the second, the boot being what
 * assigns it; `LIVE_HOOKS` is an accessor too, being declared below the make.
 *
 * **Nothing rebuilds under a press**: the 4s poll defers on `pressInFlight()`,
 * which is a page wrapper read at every tick — a copy taken at make time would
 * have left the poll free to rebuild a control a hold had captured.
 *
 * Load order: after the other splits, before the inline script that makes it.
 */
window.LIVE = (function () {
  // ---- the wire: the host's two flags and `api` (Q391b, Q1345, Q1346) -----
  // Made where the live-mode constants stand, which is above `S` — so `S` and
  // `cs` are accessors, and every page function arrives as a wrapper.
  function wire(env) {
    const { LIVESLUG, PAGE_COPY, SESSION } = env;
    const { amFounder, applicantAsView, atTheDoor, constituted, esc, hydrateApplicant,
      hydrateSeen, hydrateValues, proseText, refusalNoted, render, setProse, setStranger,
      strangerAsView, syncFromCs } = env;
    // **The host's two flags** (Q1345, Q1346; Ed, 2026-09-12). `paused` is the
    // announced pause a deploy runs under: the whole page goes behind a modal
    // that names the wait and fills a bar over the host's guess, and every
    // command is held back rather than sent to a host that will not keep it.
    // `stalled` is a document whose saves the store rejects: a red flag where
    // the alpha flag stands, and nothing else changes — reading is fine. Both
    // are read off every poll answer, the short one included, so a page that
    // has seen everything still hears them. And a deploy ends with a new
    // build answering: when `x-build` changes under a page that was paused,
    // the page reloads itself, since its own bytes are the old ones.
    const HOST = { paused: null, stalled: false, build: null, timer: null };
    function noteBuild(build) {
      if (!build) return;
      if (HOST.build === null) { HOST.build = build; return; }
      if (build !== HOST.build && HOST.paused === null) location.reload();
      if (build !== HOST.build) HOST.newBuild = build;
    }
    function noteHost(data) {
      const was = HOST.paused;
      HOST.paused = data.paused || null;
      HOST.stalled = !!data.stalled;
      if (was && !HOST.paused && HOST.newBuild) { location.reload(); return; }
      renderHost();
    }
    function renderHost() {
      let flag = document.getElementById('stalledflag');
      if (HOST.stalled && !flag) {
        flag = document.createElement('div');
        flag.id = 'stalledflag'; flag.className = 'stalledflag';
        flag.innerHTML = '<b>Warning:</b> ' + esc(PAGE_COPY.host.stalled);
        const alpha = document.querySelector('.alphaflag');
        (alpha && alpha.parentElement || document.body).insertBefore(flag, alpha ? alpha.nextSibling : null);
      } else if (!HOST.stalled && flag) flag.remove();
      let modal = document.getElementById('pausemodal');
      if (HOST.paused && !modal) {
        modal = document.createElement('div');
        modal.id = 'pausemodal'; modal.className = 'pausemodal'; modal.setAttribute('role', 'dialog');
        modal.innerHTML = '<div class="box"><p class="lead">' + esc(PAGE_COPY.host.paused) + '</p>' +
          '<p class="when"></p><div class="track"><i></i></div></div>';
        document.body.appendChild(modal);
        HOST.timer = setInterval(renderHost, 1000);
      } else if (!HOST.paused && modal) {
        modal.remove();
        clearInterval(HOST.timer); HOST.timer = null;
      }
      if (HOST.paused && modal) {
        // the bar fills over the host's guess and holds short of full: the
        // guess is a guess, and a bar that reads done while nothing happens
        // is worse than one that waits (elapsed is the host's, plus the time
        // since the answer that carried it)
        const elapsed = HOST.paused.elapsedMs + (Date.now() - (HOST.paused.heardAtMs || Date.now()));
        if (!HOST.paused.heardAtMs) HOST.paused.heardAtMs = Date.now();
        const frac = Math.min(0.96, elapsed / Math.max(1, HOST.paused.expectedMs));
        const left = Math.max(0, HOST.paused.expectedMs - elapsed);
        modal.querySelector('.track i').style.width = Math.round(frac * 100) + '%';
        modal.querySelector('.when').textContent = left > 0
          ? PAGE_COPY.host.pausedWait(Math.max(1, Math.round(left / 60000)))
          : PAGE_COPY.host.pausedOver;
      }
    }
    const api = {
      chain: Promise.resolve(),
      birth: null, // {pendingId, devLink, slug} once the creation mail is sent
      post(path, body) {
        return fetch(path, { method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body || {}) }).then((r) => r.json());
      },
      cmd(name, args, opts) {
        // resolves with the server's answer ({ok, result} or {error}) after the
        // refresh that follows it — a hook that has to act on a refusal (a
        // stale base under a text proposal) reads it here.
        // **And every refusal prints** (Q1330): the card open when the command
        // left is the control that sent it, where there is one, and
        // `refusalNoted` puts the sentence under it and the stagehand's line
        // at the foot of the window. A wire that answers with a status and no
        // sentence (a 502, a body that is not JSON) or does not answer at all
        // is a refusal too, with the status for its reason.
        let answer = null;
        const card = (opts && opts.card) || env.S.open || null;
        const sentAt = Date.now();
        this.chain = this.chain
          .then(() => fetch('/api/d/' + LIVESLUG + '/cmd', { method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ cmd: name, args: args || {} }) })
            .then((r) => r.json().then((j) => ({ status: r.status, j }), () => ({ status: r.status, j: null }))))
          .then(({ status, j }) => {
            answer = j && (j.error || j.ok) ? j : { error: PAGE_COPY.noAnswer(status), status };
            // a paused host (Q1345) is not a refusal: the modal says it all
            if (status === 503 && j && j.paused) { noteHost(j); return; }
            if (answer.error) {
              console.warn('[live]', name, answer.error);
              refusalNoted({ name, args, card, status, error: answer.error, at: sentAt });
            }
          })
          .catch((e) => {
            answer = { error: PAGE_COPY.noAnswer(0), status: 0 };
            console.warn('[live]', name, e && e.message);
            refusalNoted({ name, args, card, status: 0, error: answer.error, detail: String(e && e.message), at: sentAt });
          })
          .then(() => this.refresh());
        return this.chain.then(() => answer);
      },
      refresh() {
        // the poll says what it has seen (document seq . engine seq); a
        // quiet server answers with the seqs alone and builds no view
        // …and what it holds of the three heavy, slow-moving parts (the slim
        // view, 2026-09-11): the text version and the records' key ride beside
        // the seqs, and the server leaves out whichever has not moved
        const since = env.cs && env.cs.isRemote
          ? '?since=' + encodeURIComponent(env.cs.v.seq + '.' + (env.cs.v.eseq || 0)) +
            (typeof env.cs.v.textVersion === 'number' ? '&tv=' + env.cs.v.textVersion : '') +
            (typeof env.cs.v.recordsKey === 'number' ? '&rk=' + env.cs.v.recordsKey : '') : '';
        return fetch('/api/d/' + LIVESLUG + '/view' + since)
          .then((r) => {
            noteBuild(r.headers.get('x-build'));
            // **An answer that is not a view is not news** (Ed's phone,
            // 2026-09-12, the ?debug=1 strip: *undefined is not an object
            // (evaluating 'v.view.settings')*). A 429 from the door's budget,
            // a 500, a 503 with the pause — each is JSON, and each used to be
            // taken as the view: `cs.v` became `{error}` and every render from
            // then on threw at the first `v.view` read, until a reload. Only a
            // 2xx body is read; a 503 still carries the pause, so it is heard.
            if (r.status === 401) return null;
            if (r.status === 503) return r.json().then((j) => (j && j.paused ? { hostOnly: true, paused: j.paused } : null), () => null);
            if (!r.ok) { console.warn('[live] view answered', r.status); return null; }
            return r.json().catch(() => null);
          })
          .then((data) => {
            if (!data || !env.cs || !env.cs.isRemote) return;
            // the host's two flags ride every answer, the short one included
            // (Q1345, Q1346): heard before anything else is read
            noteHost(data);
            if (data.short || data.hostOnly) return; // unchanged — the short answer carries the seqs alone
            // a body with no view in it (an error sentence with a 200 would be
            // a server bug, but the page must not die of it) — **unless the
            // server left the view out on purpose** (the slim answer below
            // names it): this guard, added the morning of 2026-09-12, stood
            // above the slim merge and threw away every poll on which only the
            // engine had moved, so a proposal just made never reached the page
            // until a full view happened along — journey's L5 went red on the
            // deployed commit, and the founder's own proposal vanished from the
            // rail for a poll or more
            const slimView = Array.isArray(data.slim) && data.slim.includes('view');
            if (!data.view && !slimView && !data.stranger && !data.applicant) { console.warn('[live] view without a view', data); return; }
            // **A view older than the one we hold is not news, it is a
            // rollback** (Q846's last window). `api.cmd` resolves after its own
            // refresh, but a 4s poll already in flight when the command was sent
            // answers on its own clock and can land *after* it, carrying the
            // state from before the command — and `cs.v = data` below would put
            // that state back. `okInFlight` has been released by then, so
            // `syncOwedOks` reads the stale `owedOks` and un-gives the OK this
            // seat has just given, for one whole poll interval. Sequences only
            // ever grow, so an answer that goes backwards is simply dropped.
            if (env.cs.v && typeof data.seq === 'number' && typeof env.cs.v.seq === 'number' &&
              (data.seq < env.cs.v.seq ||
                (data.seq === env.cs.v.seq && (data.eseq || 0) < (env.cs.v.eseq || 0)))) return;
            // **a slim answer is completed from what the page holds** (2026-09-11):
            // the server names the parts it left out because the poll said it
            // already had them, and each is the page's own copy from the last
            // full view — merged here, at the one boundary, so nothing
            // downstream knows a view can arrive in pieces
            if (Array.isArray(data.slim) && env.cs.v) {
              for (const k of data.slim) if (data[k] === undefined) data[k] = env.cs.v[k];
            }
            // the stranger's payload is reshaped to what the predicates read
            // a seat can die mid-session (removal, §9.5a): the door is what
            // the poll starts serving, so the viewer moves to it — the boot
            // path does the same, and without this the member surface would
            // re-render over an empty view with nothing to say why
            if (data.stranger) { setStranger(data); data = strangerAsView(data); env.S.viewer = 'stranger'; }
            // the applicant's payload is the door's plus their application
            // (Q1281): reshaped the same way, the application re-read into S
            else if (data.applicant) { setStranger(data); data = applicantAsView(data); env.S.viewer = 'applicant'; hydrateApplicant(data.applicant); }
            else if (atTheDoor()) { setStranger(null); env.S.viewer = 0; }
            // the engine's seq moves on every judgment, proposal and adoption,
            // so it is the cheap fingerprint for the charter's side of the view
            const moved = data.seq !== env.cs.v.seq || (data.eseq || 0) !== (env.cs.v.eseq || 0) ||
              data.textVersion !== env.cs.v.textVersion ||
              JSON.stringify(data.raceCards) !== JSON.stringify(env.cs.v.raceCards);
            data.receivedAtMs = Date.now();
            env.cs.v = data;
            // **A column nobody may type in still has to follow the document.**
            // `charterOn()` is the start now rather than 📄's OK (Q819), so
            // between the OK and the cork *everybody* is looking at `#prose` —
            // and `#prose` is filled once, at boot. For the founder that is
            // right (it is their caret), but for every other reader it froze
            // the text at the moment they loaded the page: the founder could
            // go on writing and re-confirming right up to 🍾 and no member
            // would see a word of it until they reloaded. Nothing else
            // repaints the column before the charter mounts, so the poll does.
            // Repainted only when the words actually differ: `innerHTML` on a
            // column somebody is reading drops their selection, and the poll
            // runs every four seconds.
            let repainted = false;
            if (!atTheDoor() && !constituted() && !amFounder()) {
              const want = data.text || data.provisionalText || '';
              // `proseText` trims, so the comparison does too — otherwise a
              // stored text with an edge newline would repaint for ever
              if (want.trim() !== proseText()) { setProse(want); repainted = true; }
            }
            if (moved || repainted) {
              // `room-pulse`: one beat per movement by anybody, yourself
              // included — content-free by rule (what moved is never said)
              SESSION.beat();
              syncFromCs(); hydrateSeen(false); hydrateValues(env.S.open); render();
            }
          })
          .catch((e) => console.warn('[live] view', e && e.message));
      },
    };
    return { api };
  }

  // ---- the live layer: the remote session, hydration and the view in ------
  // Made at the live layer's own marker, so `S`, `CARDS`, the page's key maps
  // and `api` are values; `cs` is set by the boot and `LIVE_HOOKS` is declared
  // below, so those two ride accessors.
  function make(env) {
    const { S, CARDS, DKEY, PAGEVAL, STANDS, FOUNDER, LIVESLUG, SESSION, api, prose } = env;
    const { amFounder, applicantAsView, authorBy, avHtml, constituted, csState, cs_titleNow,
      devInboxButton, effMAns, esc, founderInfo, hydrateApplicant, ladderBar, loadGrants,
      mayApply, midOf, msToLocal, now, pkeyOf, pressInFlight, proseText, pwPair, relabel,
      render, setStranger, srcDivs, strangerAsView, syncFromCs, syncProseRow, syncWallet,
      textDivs, viewerId } = env;
    // A ConstitutionSession lookalike over the last-fetched view: the page's
    // predicates render a real document through the same `cs` they render
    // the fixture through. Reads come from the blind projection — a member's
    // client never holds the log (§3.5/§9.0a on the wire) — and every
    // command is a POST the server folds as the cookie's member.
    function remoteCS(v0) {
      v0.receivedAtMs = Date.now();       // the clock offsets from when the view arrived
      // the page's predicates call settingState and the record maps per card
      // per render, over data that only changes when a new view lands — so
      // the fetched view is indexed once per assignment, not per call
      let v = v0, ix = null;
      const index = () => ix || (ix = {
        settings: new Map(v.view.settings.map((x) => [x.setting, x])),
        questions: new Map(v.view.questions.map((x) => [x.setting, x])),
        resolutions: new Map(v.view.resolutions.map((x) => [x.setting, x])),
        members: null, motions: null, crowns: null, applicants: null,
      });
      const self = {
        isRemote: true,
        get v() { return v; },
        set v(nv) { v = nv; ix = null; },
        get textConfirmed() { return self.v.textConfirmed; },
        get constitutedAtT() { return self.v.constitutedAtT; },
        get closed() { return !!self.v.view.closed; },
        get closedAt() { return self.v.view.closed ? self.v.view.closed.at : null; },
        get record() { return self.v.record || null; },
        readiness: () => self.v.readiness || null,
        closingSignatures: () => (self.v.view.closed && self.v.view.closed.signatures) || [],
        // the list 🍾's power table collected rides the one command (entry 158)
        begin: (t, laidDown) => api.cmd('begin', { laidDown }),
        acknowledgeClose: (t, member, comment) => api.cmd('acknowledge-close', { comment }),
        get titleOf() { return self.v.title; },
        get slug() { return self.v.slug; },
        get quorumForm() { return self.v.quorumForm; },
        get text() { return self.v.text; },
        E: () => self.v.electorateSize,
        motionElectorate: () => [],
        membershipReserved: () => self.v.membershipReserved,
        crowned: () => self.v.crowned,
        canPropose: () => self.v.view.gates.proposing,
        canJudge: () => self.v.view.gates.judging,
        settingState: (mid) => {
          // the doors (entry 94): a crown pair and nothing else — served
          // beside the settings, read through the same shape
          if (mid === 'door:invite' || mid === 'door:remove') {
            const d = (self.v.view.doors || {})[mid === 'door:invite' ? 'invite' : 'remove'] ||
              { holder: 'members', powers: { unilateral: false, assent: false } };
            return { holder: d.holder, powers: d.powers,
              powerFrom: d.powerFrom || { unilateral: null, assent: null },
              pendingRelease: d.pendingRelease ||
                { unilateral: false, assent: false }, value: null,
              settledBy: null, settledAtT: null, collecting: false,
              distribution: null, answeredCount: 0,
              answers: { has: () => false } };
          }
          const st = index().settings.get(mid);
          if (!st) return null;
          const q = index().questions.get(mid);
          const res = index().resolutions.get(mid);
          const mine = q ? q.myAnswer !== null : false;
          return { holder: st.holder, powers: st.powers, powerFrom: st.powerFrom,
            pendingRelease: st.pendingRelease || { unilateral: false, assent: false },
            value: st.value,
            settledBy: st.settledBy, settledAtT: st.settledAtT,
            collecting: st.collecting,
            distribution: res ? res.distribution : null,
            answeredCount: q ? q.answeredCount
              : (st.settledBy === 'ceremony' ? self.v.electorateSize : 0),
            answers: { has: (id) => id === self.v.me && mine } };
        },
        memberRecords: () => index().members || (index().members = new Map(
          self.v.view.members.map((r) => [r.id, { id: r.id, email: r.email,
            name: r.name, picture: r.picture, erased: !!r.erased, arrivedAtT: r.arrived ? 1 : null,
            arrival: r.arrival,
            lapsed: r.lapsed, removed: false,
            okOwed: r.id === self.v.me ? self.v.view.owedOks : [],
            // the batch ids alone; the contents ride `view.owedReleases`, which
            // `releaseBatches` reads directly on the remote path (entry 162)
            releasesOwed: new Set(r.id === self.v.me
              ? (self.v.view.owedReleases || []).map((b) => b.id) : []),
            // the same two shapes for a mail that gave up (SURFACE E34): the
            // subject's own flag on every row, the owed batch ids on yours
            mailGaveUp: !!r.mailGaveUp,
            mailGaveUpOwed: new Set(r.id === self.v.me
              ? (self.v.view.owedMailGiveUps || []).map((b) => b.id) : []) }]))),
        convenorRecord: () => self.v.convenor,
        motionRecords: () => index().motions || (index().motions = new Map(
          self.v.view.motions.map((rec) => [rec.id, { id: rec.id,
            route: rec.route, payload: rec.payload, why: rec.why,
            // `moot` rides the view (Q1348 (b)): a proposal that passed
            // without changing anything, and the hand that had already set
            // what it asked for — the record card's whole extra sentence
            status: rec.status, moot: rec.moot || null,
            by: rec.mine ? self.v.me : '(sealed)',
            at: rec.at, from: rec.from,
            answers: { has: (id) => id === self.v.me && rec.myAnswer !== null,
              get: (id) => (id === self.v.me ? rec.myAnswer : undefined),
              size: rec.answeredCount } }]))),
        // `text` is carried (R-056): a text 👑 question parks no motion, so
        // dropping it left the record with nothing to say what was being
        // asked about and no way to find its candidate
        crownQuestionRecords: () => index().crowns || (index().crowns = new Map(
          self.v.view.crownTasks.map((q) =>
            [q.id, { id: q.id, motion: q.motion, text: q.text || null, status: 'pending' }]))),
        applicantRecords: () => index().applicants || (index().applicants =
          new Map(((self.v.view && self.v.view.applicants) || [])
            .map((a) => [a.id, a]))),
        setSetting: (t, mid, value) => api.cmd('set-setting', { setting: mid, value }),
        delegate: (t, mid) => api.cmd('delegate', { setting: mid }),
        reclaim: (t, mid) => api.cmd('reclaim', { setting: mid }),
        relinquish: (t, mid, power) => api.cmd('relinquish', { setting: mid, power }),
        setQuorumForm: (t, form) => api.cmd('set-quorum-form', { form }),
        confirmStartingText: (t, text) => api.cmd('confirm-starting-text', { text }),
        invite: (t, email) => { api.cmd('invite', { email }); return null; },
        uninvite: (t, member) => api.cmd('uninvite', { member }),
        // the two acts at will and the one act nobody refuses (entry 94)
        remove: (t, member) => api.cmd('remove', { member }),
        resign: () => api.cmd('resign', {}),
        arrive: () => {}, // arrival is the invitation link (§9.6a), never a page act
        setIdentity: (t, member, identity) => api.cmd('set-identity', identity),
        answer: (t, member, setting, value) => api.cmd('answer', { setting, value }),
        giveOk: (t, member, setting) => api.cmd('give-ok', { setting }),
        ackRelease: (t, member, batch) => api.cmd('ack-release', { batch }),
        // one card per amendment (SURFACE E35), so the body names the candidate
        ackAmendment: (t, member, candidate) => api.cmd('ack-amendment', { candidate }),
        ackMailGaveUp: (t, member, batch) => api.cmd('ack-mail-gave-up', { batch }),
        // one card per departure (SURFACE E31, E32, E40), so the body names
        // who left — the whitelist injects whose OK it is
        ackDeparture: (t, member, departed) => api.cmd('ack-departure', { member: departed }),
        // the applicant's second act (SURFACE E33): the OK on a door that
        // shut under them — their own seat, so the body names nothing
        ackApplyShut: () => api.cmd('ack-apply-shut', {}),
        resendInvite: (t, member) => api.cmd('resend-invite', { member }),
        openMotion: (t, by, payload, why) => api.cmd('open-motion', { payload, why }),
        answerMotion: (t, member, motion, answer) => api.cmd('answer-motion', { motion, answer }),
        withdrawMotion: (t, member, motion) => api.cmd('withdraw-motion', { motion }),
        answerCrownQuestion: (t, question, outcome) => api.cmd('answer-crown-question', { question, outcome }),
        setConvenorMembership: (t, isMember) => api.cmd('set-convenor-membership', { isMember }),
        adjudicateOrdinaryMotion: () => {}, // the engine's job now (Q391a)
        // live, the address is verified by the magic link before the page
        // exists (§9.7½), so nothing starts or verifies an application here;
        // **submit is the applicant's one act**, and it goes over the wire
        // (Q1281) — the handler reads the answer, so a refusal at the door
        // lands under the control that tried (E33)
        startApplication: () => { throw new Error('an application starts at the door, by magic link'); },
        verifyApplication: () => {},
        submitApplication: (t, applicant, fields) => api.cmd('submit-application', fields || {}),
        tick: () => {},
      };
      return self;
    }

    // an ordinary motion's judgment is a real pairwise judgment (Q391c): the
    // served race card carries the two option ids; keep prefers the standing
    // side, the proposal prefers the candidate side, abstain is indifference
    // the served race card carrying a setting's motion, by the setting's id
    const raceCardOf = (settingId) => ((env.cs && env.cs.v && env.cs.v.raceCards) || []).find((x) =>
      (x.a.setting && x.a.setting.settingId === settingId) ||
      (x.b.setting && x.b.setting.settingId === settingId));
    // one encoding of a pairwise judgment on a served card: the engine marks
    // which option is what stands (OptionView.incumbent), and keep / prefer /
    // indifferent translate into the race's own outcome vocabulary here and
    // nowhere else
    function judgeRaceCard(rc, pick) {
      const incSide = rc.a.incumbent ? 'a' : rc.b.incumbent ? 'b' : null;
      const outcome = (pick === 'either' || pick === 'abstain') ? 'tie'
        : (pick === 'stands' || pick === 'no') ? (incSide || 'tie')
        : (incSide === 'a' ? 'b' : 'a');
      api.cmd('judge-race', { a: rc.a.id, b: rc.b.id, outcome });
    }
    function liveJudge(cw) {
      const mid = midOf(cw.k);
      const rc = raceCardOf(mid);
      if (!rc) { console.warn('[live] no race card served for', mid); return; }
      judgeRaceCard(rc, effMAns(cw)); // 'stands' | 'proposed' | 'either'
    }

    // the document column, filled from the server's text (confirmed, or the
    // founder's provisional draft riding the §9.7a stash)
    function setProse(text) {
      // in the view the column wears (Q1313): 🗑️ puts the text back as source
      // while the source is showing
      const html = prose.classList.contains('mdsrc') ? srcDivs(text) : textDivs(text);
      prose.innerHTML = html;
      prose.classList.toggle('empty', html === '');
      relabel();
    }

    // the value half of hydration, re-run on every refresh: what stands is
    // the server's; the card you have open keeps your provisional hand
    function hydrateValues(skipKey) {
      const v = env.cs.v;
      if (skipKey !== 'title') S.title = v.title;
      if (skipKey !== 'slug') S.slug = v.slug;
      hydrateFromModule(skipKey);
    }
    // the value half alone: the door has no provisional layer of its own, so
    // what it prints must come from the module — the same mapping the member
    // surface hydrates through, never a second copy of it
    // **One mapping, two targets** (Q1293): the module's value written into the
    // page's own fields on `T` — `S` when hydrating, a scratch object when the
    // founder's settled ladder asks what stands (`standingFields`), so the two
    // cannot disagree about how a value lands. A function declaration rather
    // than a table, so it is hoisted past every caller above it.
    function fieldsOf(mid, x, T) {
      switch (mid) {
        case 'ending': T.ending = x.endsAtMs === null ? 'perpetual' : 'ends';
          if (x.endsAtMs !== null) T.endsAt = msToLocal(x.endsAtMs); return;
        // 🌡️ and 🪜 had a case each until 2026-09-15 (Q1362): the page holds
        // no field for either now, and a document that carries their values
        // hydrates without them, as it does for 🤖
        case 'quorum': if (x.form === 'share') T.quorumPct = x.n; else T.quorumN = x.n; return;
        case 'authorship': T.authorship = x.rung; return;
        case 'judgments': T.judgments = x.rung; return;
        case 'chamber': T.chamber = x.rung; return;
        case 'rate': T.grant = x.grant; T.cap = x.cap; T.dripMin = x.dripMinutes; return;
        // the rung and its number are two fields (entry 166): this wrote the
        // day count into the rung's own key, so a finite 💤 — which no walk had
        // ever founded until the ongoing shape set one — read as unanswered
        // (`CHOSEN.lapse` wants `'days'` and a numeric `lapseDays`) and was
        // served to the founder as a task on every reload
        case 'lapse': if (x.afterMs === null) T.lapse = 'never';
          // exact, never rounded (Q1321): a spell under a day is a fraction
          // of one, and rounding it made every reader of the field say *0 days*
          else { T.lapse = 'days'; T.lapseDays = x.afterMs / 86400000; } return;
        case 'removal': T.removal = x.price; return;
        case 'admission': T.admission = x.price; return;
        case 'applications': T.joinBy = mayApply(x) ? 'apply' : 'invite'; return;
        default: return;
      }
    }
    const FIELDED_MIDS = ['ending', 'quorum', 'authorship', 'judgments',
      'chamber', 'rate', 'lapse', 'removal', 'admission', 'applications'];
    function hydrateFromModule(skipKey) {
      const val2 = (mid) => { const st = env.cs.settingState(mid); return st && st.value; };
      for (const mid of FIELDED_MIDS) {
        if (pkeyOf(mid) === skipKey) continue;
        const x = val2(mid);
        // value non-null implies settled (every module fold sets or nulls
        // the pair together), so this guard is the whole condition
        if (x) fieldsOf(mid, x, S);
      }
    }

    // the provisional radio layer, hydrated once from what the server holds.
    // The value half is hydrateValues — one mapping, shared with the 4s poll,
    // so boot and refresh cannot disagree about how a value lands in S —
    // plus what is genuinely boot's own: identity, the delegation seeds,
    // committed answers, and the seen/okd reconstruction.
    function hydrateS() {
      const v = env.cs.v;
      const meRow2 = v.view.members.find((r) => r.id === v.me);
      S.myemail = (meRow2 ? meRow2.email : v.convenor.email) || '';
      S.emailSent = true; S.emailVerified = true;
      S.myname = v.view.identity.name || '';
      S.mypic = v.view.identity.picture || '';
      // whether they were ever *answered*, which the values cannot say (Q645)
      S.nameSet = !!v.view.identity.nameSet;
      S.picSet = !!v.view.identity.pictureSet;
      S.quorumForm = v.quorumForm;
      hydrateValues(null);
      // delegation seeds: a members-held setting with no resolved value reads
      // 'roster' in the page's own radio vocabulary; the *By flags say who
      // holds where the radio and the value are separate fields
      const val = (mid) => { const st = env.cs.settingState(mid); return st && st.value; };
      const del = (mid) => { const st = env.cs.settingState(mid); return !!st && st.holder === 'members'; };
      for (const mid of ['ending', 'authorship', 'judgments', 'chamber',
        'removal', 'lapse']) {
        if (del(mid) && !val(mid)) S[DKEY[pkeyOf(mid)]] = 'roster';
      }
      // **A holder radio reports an act, never a default** (Ed, 2026-08-21).
      // Since nothing arrives delegated, `holder === 'convenor'` no longer
      // means *the founder chose to keep it* — it is also what an untouched
      // setting looks like, and the two must not render alike. Delegated reads
      // 'roster'; held **and set** reads 'founder'; held and unset is the
      // undecided '' the page starts every radio at. This line used to read
      // `del(mid) ? 'roster' : 'founder'`, which stated an answer the founder
      // had not given — the same defect as arriving delegated, mirrored.
      const stOf = (mid) => { try { return env.cs.settingState(mid); } catch (e) { return null; } };
      const byOf = (mid) => { const st = stOf(mid);
        return del(mid) ? 'roster' : (st && st.settledBy !== null) ? 'founder' : ''; };
      S.quorumBy = byOf('quorum');
      S.rateBy = byOf('rate');
      S.policyBy = byOf('applications');
      // my committed answers, back in the page's own vocabulary
      for (const q of v.view.questions) {
        if (q.myAnswer === null) continue;
        const k = pkeyOf(q.setting);
        S.myAns[k] = PAGEVAL[k] ? PAGEVAL[k](q.myAnswer) : q.myAnswer;
      }
      hydrateSeen(true);
    }
    /**
     * **What is settled is re-read on every poll, not only at boot** (Q919 (b),
     * Ed 2026-08-27; built 2026-09-07 — the seat matrix's whole member-hat
     * cluster was this). `S.seen` is page state, and until today only `hydrateS`
     * wrote it, once, at boot: a member's page open across a later founder act
     * never learned the setting settled, `blocksOrder` hid every card below it,
     * and the band stopped dead for as long as the tab stayed open — while a
     * page booted a minute later carried everything. The poll calls this with
     * `withOks` false: the acknowledgement half stays boot-only, because an OK
     * pressed between two polls would otherwise be un-pressed by a view fetched
     * before the command landed (the two-press family, Q846).
     */
    function hydrateSeen(withOks) {
      const v = env.cs.v;
      // settled means confirmed here (the server's record IS the confirm),
      // and acknowledged means not owed (§9.0b)
      const owed = new Set(v.view.owedOks);
      CARDS.forEach((c) => {
        if (c.isGate || c.ansFor) return;
        // the three birth acts: seen, never re-offered
        if (c.k === 'title' || c.k === 'slug' || c.k === 'myemail') { S.seen.add(c.k); return; }
        // the text is never a task (backlog 204): `settled()` answers for it
        if (c.k === 'text') return;
        // ✋ and 🖼️ answer for themselves now, per seat, off `view.identity`'s
        // own flags (Q645) — this line used to declare them settled on every
        // live render, which is why neither task existed on a real document.
        if (c.k === 'myname' || c.k === 'mypic') return;
        const st = csState(c.k);
        if (st && (st.settledBy !== null || st.holder === 'members')) {
          S.seen.add(c.k);
          // **Owed means not acknowledged, in both directions** (Q530). This
          // only ever *added*, so an acknowledgement given once could never be
          // taken back — and a change re-owes the OK it dropped, which is the
          // whole mechanism by which a change announces itself.
          if (withOks && st.settledBy !== null) {
            if (owed.has(midOf(c.k))) { S.okd.delete('set-' + c.k); S.okd.delete('res-' + c.k); }
            else { S.okd.add('set-' + c.k); S.okd.add('res-' + c.k); }
          }
        }
      });
    }

    // ---- the live Applicants block (§9.7½ v0.56, Q397) ----------------------
    // Members see who is asking, in their own words, and judge each admit
    // motion as the one-candidate race it is: admit them, or keep the
    // membership as it is. Live only — the fixture has its own applicant
    // seat and no server to race against.
    const admitCardOf = (apId) => raceCardOf('admit:' + apId);
    // **Applicants under the Members heading is a second view, not a move**
    // (Q869, Ed 2026-08-26: *separate subheadings under Members for applicants
    // and invitees*). The two are different objects wearing one word. This one is
    // **document text** — the Members section saying who is asking, a name and a
    // face in the same compact dress as the rows above it — and it belongs to
    // `SEC[0].body`, where Ed pointed. `liveApplicantsHtml` below is the **🪪
    // card's clause**, where the judging lives: the lanes, the ✏️ Propose them
    // button, the admit race. Moving that into the document would put controls in
    // the prose; copying the controls would put the same race in front of a
    // member twice. They are never on screen together — an open 🪪 replaces the
    // paragraph the list stands in — so one source, read two ways, is the whole
    // of it. Only the people still **asking** stand here: an admitted applicant
    // is a member row above, and a refused one is not asking.
    const allApplicants = () => (env.cs && env.cs.isRemote
      ? ((env.cs.v.view && env.cs.v.view.applicants) || []) : []);
    // the people still **asking**: an admitted applicant is a member row above,
    // and a refused one is not asking
    const applicantsAsking = () => allApplicants()
      .filter((ap) => ap.status !== 'admitted' && ap.status !== 'refused');
    // **Applicants is a subsection of the constitution** (entry 95): its rows are
    // document text — a name and a face in the compact dress the rows above wear
    // — and the heading stands whether or not anybody is asking, because entry
    // 96 gives it a control and a control needs a fixed home.
    function memApplicantRows() {
      return applicantsAsking().map((ap) =>
        '<div class="memrow">' + avHtml({ n: ap.name, pic: ap.picture }) +
        '<span class="mn">' + esc(ap.name || ap.email || 'Anonymous') + '</span></div>').join('');
    }
    // `liveApplicantsHtml` — the 🪪 clause’s admit judgment — is gone with the
    // clause it hung off (entry 96). Its lanes and its `liveJudgeAdmit` commit are
    // the `adm:` card’s now, on the *Applicants* subsection, where a door stands
    // by its result. It had been unreachable since entry 94 (Q900).
    // The admit judgment is the same pairwise act as any ordinary motion's
    // (liveJudge): admit prefers the candidate side, keep the incumbent.
    function liveJudgeAdmit(apId) {
      const rc = admitCardOf(apId);
      if (!rc) { console.warn('[live] no admit card served for', apId); return; }
      const pick = S['adm:' + apId];
      if (!pick) return;
      delete S['adm:' + apId];
      judgeRaceCard(rc, pick); // 'admit' prefers the candidate side
    }

    // ---- the two boots, and the 4s poll each of them starts -----------------
    // They stood under the dev inbox's marker, which stays in the page — the
    // stagehand's two controls are asked for from here (`devMail`, Q1349) but
    // are not the live layer. **Nothing rebuilds under a press**: every poll
    // defers while `pressInFlight()` says a gesture is in the air.
    function liveBoot() {
      const dev = document.querySelector('.devswitch');
      if (dev) dev.style.display = 'none';
      fetch('/api/d/' + LIVESLUG + '/view').then((r) => {
        if (r.status === 401) { console.warn('[live] no seat and no door'); return null; }
        return r.json();
      }).then((data) => {
        if (!data) return;
        // **The stagehand's controls are asked for only where the host says
        // it has them** (Q1349, Ed 2026-09-12): `devMail` rides every view
        // answer, the stranger's included, and the ladder exists exactly where
        // the dev outbox does — so docs.vote no longer fires two 404s per load
        // (two red console lines, two of the stranger's budget). The birth
        // page has no view to read and still probes; its flag is Q1349's
        // owed half, on `/healthz`.
        if (data.devMail) { devInboxButton(); ladderBar(); }
        // **There is no login screen** (Q456): a stranger arrives at the three
        // columns like everybody else — the rules, the text's shape, one
        // sentence, and a rail holding the 📧 task
        if (data.stranger) {
          setStranger(data);
          env.cs = remoteCS(strangerAsView(data));
          S.viewer = 'stranger';
          hydrateS();
          render();
          setInterval(() => {
          // **Nothing rebuilds under a press.** A pen hold is a gesture in
          // progress — the glyph is in the air and the button is under the
          // pointer — and a poll that re-renders mid-hold replaces the very
          // control being held. The same rule the draft typing guard keeps,
          // for the same reason: the surface must not move under the hand.
          // The poll simply waits for the next tick.
          // a pen hold here, a propose hold in the charter, a slider drag on an
          // answer card — either way a press is in progress and the surface
          // must not move under it
          if (pressInFlight()) return;
          api.refresh();
        }, 4000);
          return;
        }
        // **An applicant is a stranger who has knocked** (Q1281, 2026-09-07):
        // the door's payload plus their application, read through the
        // stranger's projection, the rail holding the applicant's own cards.
        // Until this branch existed the payload fell through to the member
        // path below and the first `view.*` read threw, and the catch at the
        // foot of this chain swallowed it — a blank page for every applicant.
        if (data.applicant) {
          setStranger(data);
          env.cs = remoteCS(applicantAsView(data));
          S.viewer = 'applicant';
          hydrateApplicant(data.applicant);
          hydrateS();
          render();
          setInterval(() => {
            if (pressInFlight()) return;
            api.refresh();
          }, 4000);
          return;
        }
        env.cs = remoteCS(data);
        wireLive();
        syncFromCs();
        const at = S.roster.findIndex((row) => (row.mid || FOUNDER) === data.me);
        if (at >= 0) S.viewer = at;
        const f = S.roster[0];
        if (f && data.convenor) { f.e = data.convenor.email;
          f.role = data.convenor.isMember ? 'member' : 'clerk';
          f.n = (data.me === data.convenor.id ? data.view.identity.name : data.convenor.name) || f.n || ''; }
        hydrateS();
        for (const k of loadGrants()) S.okd.add(k);
        if (data.text) setProse(data.text);
        else if (data.provisionalText) setProse(data.provisionalText);
        render();
        setInterval(() => {
          // **Nothing rebuilds under a press.** A pen hold is a gesture in
          // progress — the glyph is in the air and the button is under the
          // pointer — and a poll that re-renders mid-hold replaces the very
          // control being held. The same rule the draft typing guard keeps,
          // for the same reason: the surface must not move under the hand.
          // The poll simply waits for the next tick.
          // a pen hold here, a propose hold in the charter, a slider drag on an
          // answer card — either way a press is in progress and the surface
          // must not move under it
          if (pressInFlight()) return;
          api.refresh();
        }, 4000);
        // **✒️ is the only save** (Ed, 2026-08-30, QA on the text card). Until
        // the first confirm the founder's draft rides the stash (§9.7a v0.55),
        // so a reload before anything was ever saved still finds the column.
        // After it the stash route is shut — the confirm supersedes the
        // provisional draft — and Q821's write channel used to re-confirm the
        // column on a debounce, which saved the text before the founder's hand
        // reached the row and left ✒️ greyed as *Saved* almost always: a
        // control whose job something else did first reads as a dead one. So
        // nothing past the first confirm is sent until ✒️ (every press) or 🍾,
        // which confirms whatever stands (R-081). The row's ✒️ follows the
        // column in place, lighting on the first change.
        let deb = null;
        prose.addEventListener('input', () => {
          if (constituted() || !amFounder()) return;
          syncProseRow();
          clearTimeout(deb);
          if (env.cs.textConfirmed) return;
          deb = setTimeout(() => {
            // …and asked again when the debounce lands: a confirm can arrive
            // inside the 800ms (journey's ✒️ follows its typing at once), and
            // the route refuses a stash after it — a refusal CI's walks job
            // counted red on every push from 2026-09-05 (Ed, 2026-09-06)
            if (env.cs.textConfirmed || constituted()) return;
            api.post('/api/d/' + LIVESLUG + '/stash', { text: proseText() }).catch(() => {});
          }, 800);
        });
      }).catch((e) => {
        // **A swallowed boot error hides a dead seat from every walk** (Q1281):
        // this warn was the whole of it for as long as applicants have existed,
        // so Playwright's `pageerror` never fired and the seat read as quiet.
        // Rethrown out of the chain, the failure is an uncaught error again.
        console.warn('[live] boot', e && e.message);
        setTimeout(() => { throw e; });
      });
    }

    function birthBoot() {
      const dev = document.querySelector('.devswitch');
      if (dev) dev.style.display = 'none';
      // the stagehand's controls only where the host says it has them (Q1349,
      // Ed 2026-09-12): the birth has no view to read `devMail` from, so it
      // asks /healthz, and a host that does not answer draws nothing
      fetch('/healthz').then((r) => (r.ok ? r.json() : null)).then((h) => {
        if (h && h.devMail === true) { devInboxButton(); ladderBar(); }
      }).catch(() => {});
      // pasted text syncs against the pending creation (§9.7a v0.55)
      let deb = null;
      prose.addEventListener('input', () => {
        if (!api.birth || !api.birth.pendingId) return;
        clearTimeout(deb);
        deb = setTimeout(() => {
          api.post('/api/docs/pending',
            { pendingId: api.birth.pendingId, text: proseText() })
            .catch(() => {}); }, 800);
      });
    }
    // ---- the live wiring (B2b): the view in, the commands out ---------------
    // Everything session.js renders about the charter is derived here from the
    // server's blind projection — `clauses` (the text races), `mine`, `records`,
    // the served `raceCards` and the `wallet` — as items in the fixture's own
    // shape, so the cards, the rail and the wires need no second grammar. What
    // is NOT in the view is not invented: no fill on a live race (Q501), no
    // drip clock, no judge counts.
    const lineIdx = (key) => +String(key).slice(1);
    const unhead = (l) => String(l).replace(/^#{1,3}\s+/, '');
    const headOf = (o) => (o && o.t === 'h' ? '#'.repeat(o.level || 1) + ' ' : o && o.bullet ? '- ' : '');
    // the keys of a span, the ones the charter actually shows first (a blank
    // line is a line the engine counts and nothing the page anchors to)
    const keysOfSpan = (sp, lines) => {
      const out = [];
      for (let i = sp.start; i < sp.end; i++) if ((lines[i] || '').trim()) out.push('L' + i);
      if (!out.length) out.push('L' + Math.min(sp.start, Math.max(0, lines.length - 1)));
      return out;
    };
    // **A race on a gap stands in the gap** (Q1308, Ed's bot room 2026-09-10):
    // an insertion's contested span is empty, so keying it to the line at
    // `start` filed it beside the clause *after* the gap and drew its card as
    // that clause's replacement. It takes the draft's own shape instead (Q261,
    // `gap-site`): the gap key, the block before it as `insertAfterKey` — the
    // read side's held-open anchor — and the insert head. A crown question and
    // a park on an inserted line take the same site.
    const siteOfSpan = (sp, lines) => {
      if (sp.end > sp.start) return { keys: keysOfSpan(sp, lines) };
      let at = -1;
      for (let i = Math.min(sp.start, lines.length) - 1; i >= 0; i--) if ((lines[i] || '').trim()) { at = i; break; }
      const gapKey = 'G' + sp.start;
      return { keys: [gapKey], gapKey, insertAfterKey: at >= 0 ? 'L' + at : null, isInsert: true };
    };
    // a candidate's reading of a span: the current lines with its hunks applied
    const applyIn = (lines, sp, hunks) => {
      const region = lines.slice(sp.start, sp.end);
      for (const h of (hunks || []).slice().sort((a, b) => b.start - a.start)) {
        region.splice(h.start - sp.start, h.end - h.start, ...h.lines);
      }
      return region.filter((l) => l.trim()).map(unhead).join('\n');
    };
    const spanOf = (hunks) => ({ start: Math.min(...hunks.map((h) => h.start)),
      end: Math.max(...hunks.map((h) => h.end)) });
    const plain = (lines, sp) => lines.slice(sp.start, sp.end).filter((l) => l.trim()).map(unhead).join('\n');
    // the mark the quick card shows: cards.js's own diff, del and ins both
    // (resultOnly drops the dels where the card states the result)
    const markedOf = (before, after) => window.CARDS.diffPieces(before, after, true)
      .map(([t, mk]) => (mk ? window.CARDS.markHtml2(t, mk) : esc(t))).join('');
    // the nearest heading above; on a document with none, the document's own
    // title — the outermost heading (Q1303, Ed 2026-09-10) — and only with no
    // title either, the clause's first words
    const labelFor = (key) => {
      let h = '';
      for (const l of SESSION.DOC) { if (l.t === 'h') h = l.x; if (l.key === key) break; }
      return h || cs_titleNow() || ((SESSION.DOC.find((l) => l.key === key) || {}).x || '').split(/\s+/).slice(0, 5).join(' ');
    };
    // **Raw values are not copy**: a record's moment reads like a diary entry
    const whenOf = (ms) => {
      const d = new Date(ms), today = new Date();
      const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const same = (a, b) => a.toDateString() === b.toDateString();
      const y = new Date(today); y.setDate(today.getDate() - 1);
      return (same(d, today) ? 'today' : same(d, y) ? 'yesterday'
        : d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })) + ', ' + hm;
    };
    // read state survives a reload: one key per document and seat
    const seenKey = () => 'draft:seen:' + LIVESLUG + ':' + ((env.cs && env.cs.v && env.cs.v.me) || '');
    const loadSeen = () => { try { return JSON.parse(localStorage.getItem(seenKey()) || '[]'); } catch (e) { return []; } };
    const saveSeen = () => { try { localStorage.setItem(seenKey(), JSON.stringify([...SESSION.readSeals])); } catch (e) { /* private mode */ } };
    // a proposal keeps the id the card opened under until the view knows it
    const localIdOf = new Map();      // candidate id → the id the draft was proposed as
    const proposedAs = new Map();     // the draft's local id → candidate id, once known
    // the stranded candidates whose re-make is on the wire (Q170): the view
    // goes on calling them `rebase-pending` until the confirmation lands, and
    // a poll in that window would rebuild the ↻ entry over the draft that
    // replaced it. Emptied by the answer, refusal included
    const remakeSent = new Set();
    const DRAFT_ID = SESSION.DRAFT_ID;

    function itemsFromView(v) {
      const lines = String(v.text || '').split(/\n/);
      // the Text's shield (Q440): a carried change waits on the Founder's OK —
      // the cards say so while it is held (this binding was lost in the glyph
      // batch's stash detour; every live race threw on it)
      let textAssent = false;
      try { textAssent = !!pwPair('text').a; } catch (e) { textAssent = false; }
      const cards = v.raceCards || [];
      const sideOf = (rc, ids) => (ids.has(rc.a.id) ? 'a' : ids.has(rc.b.id) ? 'b' : null);
      const RAIL = window.COPY.session.rail;
      const PARK = window.COPY.session.park;
      const STRANDED = window.COPY.session.stranded;
      // **and the ground shift says what happened** (SURFACE E16). The
      // server's `shifted` is a flag — *a judgment of mine locked by a
      // ground shift* — and the rail entry's tooltip is the sentence, as
      // the fixture has always supplied it; handing the renderer `true`
      // threw `esc` and took the whole rail with it. The live sentence
      // names no candidate because the view does not carry which one was
      // adopted, only that this wording is no longer the one you judged.
      const SHIFTED_NOTE = 'The wording was changed here after you voted, so your vote was about a wording that no longer exists.';
      const items = [];
      for (const r of v.clauses || []) {
        const ids = new Set(r.candidates.map((c) => c.id).concat([r.incumbentId]));
        // **The card is a deck** (Q1200, Ed 2026-09-06): every served edge card
        // on this race, in the router's order — `nextCards` keeps the feed's
        // order and the engine has already excluded every pair this member
        // judged on the current ground — and the front one is the card. The
        // card carries its `raceId`; matching by candidate id survives as the
        // fallback for a card that does not.
        // **And ⏳ means *waiting for other people to vote*** (Q1202, Ed
        // 2026-09-07: *if there are things you can do, it should show the
        // symbol of that action, even if it's not urgent*). The hand is ten
        // cards from the hot set, so a race can still have a pair to ask you
        // and be out of it; the view says per race whether anything is left
        // to ask you (`askable`, the engine's own test) and, where the hand
        // holds no card on the race, hands over that pair (`ask`) so the lit
        // entry opens a card without a round trip. The race files as ⏳ only
        // when nothing on it is left for you and a vote of yours stands.
        const dealt = cards.filter((rc) => rc.kind === 'edge' &&
          (rc.raceId ? rc.raceId === r.id : !!sideOf(rc, ids)));
        const rc = dealt[0] || r.ask || null;
        const canAsk = !!(r.askable || rc);
        // the contested footprint is a list of spans; the page anchors the race
        // at their union (one clause run)
        const csp = spanOf(r.contested && r.contested.length ? r.contested : r.candidates.flatMap((c) => c.hunks));
        const site = siteOfSpan(csp, lines);
        const keys = site.keys;
        const inc = plain(lines, csp);
        const textOf = (c) => applyIn(lines, csp, c.hunks);
        const byId = (id) => r.candidates.find((c) => c.id === id);
        // a name the server attached is one the reveal rule allowed (a signed
        // proposal, Q770, or one made under `public`): the live card shows it,
        // and since backlog 255 their face with it — the picture rides the same
        // `author` object and is blind at exactly the same gate (K30)
        const byOf = (c) => authorBy(c.author);
        // **Your ledger** (Q1201): every pair you have a standing judgment on
        // in this race, oldest first, each side resolved to what the card can
        // draw — the incumbent as the current text, a candidate as its reading
        // with its diff and its case. A side the view no longer names (the
        // incumbent a shift replaced) keeps its id and draws no text.
        const sideOfId = (id) => {
          if (id === r.incumbentId) return { id, inc: true, text: inc };
          const c = byId(id);
          if (!c) return { id, inc: false, text: null };
          const t = textOf(c);
          return { id, inc: false, text: t, marked: markedOf(inc, t), rationale: c.rationale, by: byOf(c) };
        };
        const ledger = (r.myJudgments || []).map((j) => ({
          a: sideOfId(j.a), b: sideOfId(j.b), outcome: j.outcome,
          locked: !!j.locked, note: j.locked ? SHIFTED_NOTE : null }));
        const base = {
          id: r.id, ...site, state: canAsk ? 'needs' : r.judged ? 'deciding' : 'needs',
          qLabel: labelFor(site.insertAfterKey || keys[0]),
          // urgency is the router's own (SPEC §8.1): the card's value over
          // the best in the hand, a pair from outside the hand priced against
          // that same top since Q98 — so every entry with a card carries a
          // real number and the 0.3 is reached only where there is no card at
          // all, a race with nothing left to ask you. The fill is the race's
          // closeness to resolution — a magnitude the engine cannot be made
          // to sign (Q501) — and since Q1362 (c) that magnitude is **the
          // leader's judges over the floor**: voters so far over voters
          // required, the one number the room controls. It is the same two
          // numbers as `judges` and `floor` below; the engine sends the ratio
          // so the page never divides.
          urgency: rc && rc.urgency != null ? rc.urgency : 0.3,
          pct: Math.round((r.closeness || 0) * 100),
          judges: r.judges || 0, floor: r.floor,
          // **waiting behind a park on the same clause** (SURFACE E36, R-100):
          // the batch passes this race over until the Founder answers a park
          // it overlaps; it stays live and judgeable, so it keeps its mark and
          // its card, and the sentence rides both — the ⏳ line's tooltip once
          // you have nothing left to say here, and a note on every card
          cap: canAsk || !r.judged ? RAIL.wantsVote
            : r.blockedByPark ? PARK.blocked : RAIL.votedStillRunning,
          blockedByPark: r.blockedByPark ? PARK.blocked : false,
          shifted: r.shifted ? SHIFTED_NOTE : false,
          deadlocked: !!r.deadlocked,
          crownWaits: textAssent,
          // the front of the deck, for the judgment that goes back
          card: rc ? { a: rc.a.id, b: rc.b.id, inc: rc.a.incumbent ? 'a' : rc.b.incumbent ? 'b' : null } : null,
          ledger,
        };
        // a race holding only my own proposal is mine to withdraw, not to judge
        // — the `mine` item carries it (the author's preference is derived, never
        // asked). **Unconditional again since backlog 253** (Ed, 2026-08-29): the
        // engine serves no pair at all for an all-mine race now, at any E, since
        // an author is never asked about their own text against the incumbent
        // (SPEC §3.3, R-062) — so there is no card here to draw. Q835's `E() > 1`
        // condition existed to hand the sole member a self-judgment, and at E = 1
        // the race adopts on submission instead, before the page could draw it.
        // The withdrawal line (`v.mine`) is the whole of what an author sees of
        // an all-mine race.
        if (r.candidates.every((c) => c.mine)) continue;
        const others = r.candidates.filter((c) => !c.mine);
        const slate = r.deadlocked
          ? { slate: r.candidates.map((x) => ({ text: textOf(x), rationale: x.rationale })) } : {};
        if (r.candidates.length === 1 || (rc && (rc.a.incumbent || rc.b.incumbent))) {
          // one challenger against what stands: the quick card
          const c = (rc ? byId(rc.a.incumbent ? rc.b.id : rc.a.id) : null) || r.candidates[0];
          items.push({ ...base, kind: 'quick', marked: markedOf(inc, textOf(c)),
            rationale: c.rationale, by: byOf(c), candId: c.id, ...slate });
        } else {
          const a = (rc ? byId(rc.a.id) : null) || others[0] || r.candidates[0];
          const b = (rc ? byId(rc.b.id) : null) || others[1] || r.candidates[1];
          items.push({ ...base, kind: 'race',
            race: { a: { id: a.id, text: textOf(a), rationale: a.rationale, by: byOf(a) },
                    b: { id: b.id, text: textOf(b), rationale: b.rationale, by: byOf(b) } }, ...slate });
        }
      }
      // 🛡️ on the Text (R-056): what the room passed sits parked until the
      // Founder answers, and this is where it is put in front of them. One
      // item per pending text 👑 question — the Founder's alone, the server
      // serving `awaitingAssent` to nobody else — filed beside the clause the
      // parked candidate rewrites, because this array is the only thing that
      // files anything beside a clause. The setting-side 👑 card is untouched:
      // it finds its question backwards from a motion, which a text question
      // does not have.
      if ((v.awaitingAssent || []).length && env.cs && env.cs.crownQuestionRecords && amFounder()) {
        const parked = new Map((v.awaitingAssent || []).map((c) => [c.candidateId, c]));
        for (const q of env.cs.crownQuestionRecords().values()) {
          if (q.status !== 'pending' || !q.text) continue;
          const c = parked.get(q.text.candidateId);
          if (!c || !(c.hunks || []).length) continue;
          const sp = spanOf(c.hunks);
          const site = siteOfSpan(sp, lines);
          items.push({ id: 'crown:' + q.id, kind: 'crown', question: q.id, ...site,
            state: 'needs', qLabel: labelFor(site.insertAfterKey || site.keys[0]), urgency: 1, pct: 100,
            cap: 'the membership passed this — it waits on you',
            marked: markedOf(plain(lines, sp), applyIn(lines, sp, c.hunks)),
            rationale: c.rationale, by: authorBy(c.author) });
        }
      }
      // **The room's side of a park** (SURFACE E36; Ed, 2026-09-09, Q1015; R-100).
      // Every seat but the Founder's — whose card is the 👑 above — and the
      // author's, whose line is their own *yours* entry below (E37), is told
      // that the membership passed a change to this clause and the Founder has
      // not answered: a ⏳ entry beside the clause opening one sentence and OK.
      // Keyed `park:<race>`, so a later park on the same clause is a new entry
      // and a new OK; the OK is remembered per seat through `readSeals`, like a
      // sealed record's, and the entry stands until the park resolves — at
      // which point the item stops being built and its key is dropped below,
      // tidiness rather than correctness, since a key nothing builds re-asks
      // nothing. The span is the park's footprint in the current line space,
      // which `rebaseOthers` keeps current under neighbouring adoptions.
      const parkKeys = new Set();
      for (const p of v.parked || []) {
        const pid = 'park:' + p.raceId;
        parkKeys.add(pid);
        if (amFounder() || p.mine) continue;
        const sp = spanOf(p.contested && p.contested.length ? p.contested : [{ start: 0, end: 0 }]);
        const site = siteOfSpan(sp, lines);
        items.push({ id: pid, kind: 'park', ...site, state: 'deciding',
          qLabel: labelFor(site.insertAfterKey || site.keys[0]), urgency: 0, pct: 100,
          cap: PARK.awaiting, parkNote: PARK.awaiting,
          unread: !SESSION.readSeals.has(pid) });
      }
      for (const k of [...SESSION.readSeals]) {
        if (typeof k === 'string' && k.startsWith('park:') && !parkKeys.has(k)) SESSION.readSeals.delete(k);
      }
      // **The stranded proposal being re-made is the draft, not a second
      // entry** (Q170). The press turns the ↻ item into the composer's own
      // draft in place, carrying the candidate's id as `rebaseOf`; the view
      // still reports the candidate as `rebase-pending` until the commit
      // lands, so without this the very next poll would rebuild the entry
      // beside the draft that replaced it. Read before the swap, off the array
      // the draft is still in.
      const remaking = (SESSION.SUGGS.find((x) => x.id === DRAFT_ID) || {}).rebaseOf || null;
      const beingRemade = (id) => id === remaking || remakeSent.has(id);
      for (const m of v.mine || []) {
        // **your own passed proposal** (SURFACE E37): once it has cleared the
        // bar under the Founder's 🛡️ it is out of every race and waits on the
        // Founder; your entry stays ✏️ and its line says so, nothing asked
        const awaiting = m.state === 'awaiting-assent';
        // **and your own stranded one** (SURFACE E38, Q170): the text under it
        // was replaced and its patch could not be carried across, so it is out
        // of every race and held for you. It keeps its entry — ↻ in your own
        // blue — and its card offers the two acts that are left.
        const stranded = m.state === 'rebase-pending';
        if (stranded && beingRemade(m.id)) continue;
        if (m.state !== 'live' && !awaiting && !stranded) continue;
        // a stranded patch is still written against the version it was made
        // for, so the server carries each hunk's span forward for it (`at`);
        // everything else is already in the current text's own coordinates
        const hunks = m.patch.hunks;
        const spans = stranded && (m.at || []).length === hunks.length ? m.at : hunks;
        const sp = spanOf(spans);
        const keys = keysOfSpan(sp, lines);
        const sites = spans.map((x, i) => {
          const ks = keysOfSpan(x, lines);
          return { keys: ks, label: labelFor(ks[0]), text: hunks[i].lines.map(unhead).join('\n'),
            origin: ks.map((k) => { const l = SESSION.DOC.find((x2) => x2.key === k) || {};
              return { key: k, text: l.x || '', note: null, t: l.t, level: l.level }; }) };
        });
        // once proposed the sign choice is part of its record (Q770): the line
        // says *signed* and offers no switch
        items.push({ id: localIdOf.get(m.id) || ('mine:' + m.id), kind: 'draft', mine: true, keys,
          state: 'needs', qLabel: sites[0].label, urgency: 0,
          pct: awaiting ? 100 : 0,
          cap: (stranded ? STRANDED.cap : awaiting ? PARK.yours : 'yours · in the race') +
            (m.signed ? ' · signed' : ''),
          signed: !!m.signed, awaiting, stranded,
          rationale: m.rationale, sites, candidate: m.id });
      }
      // one record per race (Q503c): the whole field, the text it displaced
      // as it stood, and how many weighed in
      const unsealed = new Map();
      // **The record shows the rung then and the rung now** (entry 31, Ed
      // 2026-08-26, R-050). *Now* is what the 👤 clause states and what the 🥂
      // card counts off the record; *then* is per proposal, and prints only
      // where it differs from what stands — a record whose every entry repeated
      // the standing rule would be noise. The server states both on the closed
      // record: `madeUnder` per field entry, `rungNow` once.
      const madeUnder = new Map();
      if (v.record) for (const o of (v.record.adopted || []).concat(v.record.undecided || [])) {
        for (const f of o.field || []) {
          const by = authorBy(f.author);
          if (by) unsealed.set(f.id || f.candidateId, by);
          if (f.madeUnder) madeUnder.set(f.id || f.candidateId, f.madeUnder);
        }
      }
      // the words are `STANDS.authorship`'s — one label per rung everywhere
      // (Q620) — and they are resolved here rather than in `session.js`, which
      // draws the card and has no access to `S`
      const rungNow = v.record ? v.record.rungNow : null;
      const underNoteOf = (f) => {
        const u = f && madeUnder.get(f.id || f.candidateId);
        if (!u || !rungNow || u === rungNow) return undefined;
        const w = STANDS.authorship(u);
        return w ? 'made under ' + w + ', before the rule changed' : undefined;
      };
      for (const o of v.records || []) {
        const field = o.field || [];
        const hs = field.flatMap((f) => f.hunks);
        // **A record stands beside the lines that descend from what it decided**
        // (Q1333, Ed 2026-09-11, the moon room: a ✔ on the Food heading). The
        // hunks are in the coordinates of the version the race was decided
        // against, and every adoption since that inserted or deleted lines
        // above has moved the clause; the host carries the span forward as
        // `at` — a clause changed again maps to its replacement, a clause
        // deleted to the gap where it stood — and the entry, the tab and the
        // card key on that. The fixture's records carry no `at`, so the span
        // of the hunks is the fallback, which is what it always was.
        const sp = o.at && typeof o.at.start === 'number' ? o.at
          : hs.length ? spanOf(hs) : spanOf(o.footprint || o.hunks || []);
        const adopted = o.outcome === 'adopted';
        // undecided at the close (§4.6): the race files at its backlog
        // paragraph — its best wording IS the paragraph — under the PAUSE mark,
        // never pinned (the 🥂 card is the acknowledgment the close asks for)
        const undecided = o.outcome === 'undecided';
        // a deleted clause's record takes the gap's own site, as a race on a gap
        // does (M19): the gap key, the block before it, the insert head
        const site = undecided ? { keys: ['U:' + (o.raceId || o.candidateId)] } : siteOfSpan(sp, lines);
        const keys = site.keys;
        const gapSite = site.isInsert
          ? { gapKey: site.gapKey, insertAfterKey: site.insertAfterKey, isInsert: true } : {};
        const textOfF = (f) => f.hunks.flatMap((h) => h.lines).map(unhead).join('\n');
        const plainOfF = (f) => f.hunks.flatMap((h) => h.lines).filter((l) => l.trim()).map(unhead).join('\n');
        // the seal lifts at the record (§3.5a): `records` stays sealed, the
        // closed `record` carries the names where the anonymity ladder allows
        const byName = (f) => authorBy(f.author) || unsealed.get(f.id || f.candidateId) || null;
        const best = field.slice().sort((x, y) => (y.p ?? -1) - (x.p ?? -1))[0];
        const winner = field.find((f) => f.outcome === 'adopted') || (undecided ? best : null) || field[0] || {};
        const replaced = (o.displaced || []).filter((l) => l.trim()).map(unhead).join('\n') || undefined;
        const slate = field.length > 1
          ? { slate: field.map((f) => ({ text: textOfF(f), rationale: f.rationale, by: byName(f),
              underNote: underNoteOf(f), refusal: f.reason || null,
              p: f.p == null ? undefined : f.p, won: f === winner && (adopted || undecided) })) } : {};
        // **The card says which text it changed** where the clause under it has
        // changed again since (Q1333): the head is the clause as it stands, so
        // where that is no longer the wording this record put there — or, on a
        // retired record, the wording that stood — one line under the head
        // says so, and a clause since deleted says that instead. Compared on
        // the page against the current lines, blank lines and heading marks
        // aside, exactly as the head reads them.
        const standsNow = undecided ? null : adopted ? (winner.hunks ? plainOfF(winner) : '') : (replaced || '');
        const nowText = undecided ? null : plain(lines, sp);
        const gone = !undecided && sp.start === sp.end;
        const changedSince = standsNow !== null && (gone || nowText !== standsNow);
        items.push({ id: 'rec:' + (o.raceId || o.candidateId), kind: 'quick', keys, state: 'sealed',
          ...gapSite, ...(changedSince ? { changedSince: true, gone } : {}),
          // a gap record is titled by the block before its gap, as a gap draft is
          qLabel: labelFor(site.insertAfterKey || keys[0]), urgency: 0, pct: 100,
          cap: adopted ? 'decided — adopted' : undecided ? 'undecided at the close — the text stood' : 'decided — the current text stood',
          decided: { outcome: adopted ? 'adopted' : undecided ? 'undecided' : 'retired — the current text stood',
            // `o.threshold` is still on the record row — the engine's own,
            // pinned (R-117) — and nothing reads it: the eyebrow stopped
            // comparing the reading to a line with the line itself (Q1362)
            when: whenOf(o.when), p: o.p == null && best ? best.p : o.p, judges: o.judges,
            // the cap mark (R-051), reduced to a boolean on the way in: the
            // card says one sentence and none of the arithmetic (STYLE §2 —
            // raw values are not copy), and the two numbers stay in the event
            // and the payload for an auditor
            ...(o.cappedFit ? { capped: true } : {}) },
          undecided,
          won: adopted || undecided ? 'b' : undefined,
          optionB: textOfF(winner), replaced,
          rationale: winner.rationale, by: byName(winner), underNote: underNoteOf(winner),
          // *Proposal refused by ‹name› 🛡️* (R-056): where the resolution had a
          // reason, the record is where its author reads it
          refusal: winner.reason || null,
          verdict: o.judgedByMe ? 'voted on this' : undefined,
          unread: !undecided, ...slate });
      }
      // ✒️ on the Text (R-058, SURFACE E35, Q1034; Ed 2026-08-29, decision
      // D47): the Founder's amendment passed the instant they submitted it, and
      // everybody who had no say is told **beside the clause it changed** —
      // which is why it is filed here, this array being the only thing that
      // files anything beside a clause. One item per amendment and never a
      // batch: entry 162 groups because one press of 🍾 lays down powers that
      // belong to no clause, where here the card *is* the clause.
      //
      // The module says what is owed and carries the reason and the moment; the
      // engine says what the words are. Joined by candidate id, exactly as the
      // 👑 task above joins `awaitingAssent`; an id the engine cannot speak for
      // is skipped rather than filed as a card with nothing on it.
      const amended = new Map(((v.amendments || [])
        .filter((a) => (a.hunks || []).length)).map((a) => [a.candidateId, a]));
      for (const a of (v.view && v.view.owedAmendments) || []) {
        const c = amended.get(a.candidate);
        if (!c) continue;
        // **The amended span is the one the amendment produced.** `keysOfSpan`
        // takes a span in the *current* line space, and a decreed patch's hunks
        // are against the version it replaced — so `spanOf(hunks)` would name
        // the lines that are gone and anchor the card at the paragraph above or
        // below the one that changed, which is the whole of what this card is
        // for. Per hunk the produced start is its own `start` shifted by every
        // **earlier** hunk's growth and the produced end is that plus its lines,
        // unioned across the hunks: an amendment made at two draft sites whose
        // first site grew still names the second site's lines. Later adoptions
        // moving lines under it are the same drift `awaitingAssent` and the
        // records loop tolerate, and `keysOfSpan` clamps to the document.
        const hs = c.hunks.slice().sort((x, y) => x.start - y.start);
        let shift = 0, lo = Infinity, hi = 0;
        for (const h of hs) {
          lo = Math.min(lo, h.start + shift);
          hi = Math.max(hi, h.start + shift + h.lines.length);
          shift += h.lines.length - (h.end - h.start);
        }
        const sp = { start: lo, end: hi };
        const keys = keysOfSpan(sp, lines);
        const replaced = (c.displaced || []).filter((l) => l.trim()).map(unhead).join('\n') || undefined;
        items.push({ id: 'amd:' + a.candidate, kind: 'quick', keys, state: 'sealed',
          qLabel: labelFor(keys[0]), urgency: 0, pct: 100,
          cap: 'the Founder amended this',
          decided: { when: whenOf(a.at) },
          // `won: 'b'` with `optionB` is what `fieldOf`'s default lane reads, so
          // `carried()` is true and `markKindOf` gives the green ✔ — *the
          // charter changed here*, which is what happened. No new mark, and no
          // new `STACK_ORDER` token.
          won: 'b', optionB: applyIn(lines, sp, []), replaced,
          // the founder as the room sees them (K30): a ✒️ act is attributed by
          // construction, so the card names and faces them the way the settings
          // side already does — `The Founder` where they have given no name
          rationale: a.why || '',
          by: { n: (founderInfo().n || '').trim() || 'The Founder', pic: founderInfo().pic || '' },
          unread: true,
          // the one field of its own: the wire and the card body key on it
          amendment: a.candidate });
      }
      // the draft being typed is the page's own, never the view's — it survives
      // every rebind
      const d = SESSION.SUGGS.find((x) => x.id === DRAFT_ID);
      if (d) items.push(d);
      return items;
    }

    const liveItem = (id) => SESSION.SUGGS.find((x) => x.id === id);
    function wireLive() {
      for (const id of loadSeen()) SESSION.readSeals.add(id);
      env.LIVE_HOOKS.items = () => itemsFromView(env.cs.v);
      // Filing a sealed record is a page fact and stays one — `readSeals` in
      // `localStorage`, per document and seat. **An amendment's OK is not**
      // (SURFACE E35, Q1034): the module owes it and the module is the truth in
      // both directions, `syncOwedReleases`' stated rule, so the press sends the
      // acknowledgement and the item simply stops being built once the
      // command's refresh lands. `readSeals` stays what it already is, the
      // page's optimism between the press and that refresh.
      env.LIVE_HOOKS.seen = (id) => {
        saveSeen();
        const s = liveItem(id);
        if (s && s.amendment) { try { env.cs.ackAmendment(now(), viewerId(), s.amendment); } catch (e) {} }
      };
      // `pair` is the pair the card was about (Q1201): a ledger block you
      // pressed to revise, else the front of the deck — session.js says which,
      // since it holds the press; a judgment with neither has nothing to send
      env.LIVE_HOOKS.judge = (id, what, pair) => {
        const s = liveItem(id);
        const c = pair || (s && s.card);
        if (!c) { console.warn('[live] no card served for', id); return; }
        const challenger = c.inc === 'a' ? 'b' : 'a';
        const outcome = what === 'indifferent' ? 'tie'
          : what === 'keep' ? (c.inc || 'tie')
          : what === 'approve' ? challenger
          : what === 'a' ? 'a' : what === 'b' ? 'b' : 'tie';
        api.cmd('judge-race', { a: c.a, b: c.b, outcome });
      };
      // A hunk replaces the document's lines [start, end); the engine holds an
      // empty document as **zero** lines, so the empty clause an empty
      // document renders (Q649 (a)) proposes an insert at [0, 0), never a
      // replacement of a line that does not exist. Clamped to the text the
      // engine actually holds, which is the rule for every hunk.
      //
      // **One helper, two doors** (R-058): ✏️ proposes and ✒️ decrees over
      // exactly the same hunks. The empty-document rule and the clamp are
      // subtle enough that a second copy would drift.
      const hunksOf = (d) => {
        const nLines = env.cs.text === '' ? 0 : String(env.cs.text).split('\n').length;
        return d.sites.map((site) => {
          const ls = site.text.split('\n');
          // a **gap site** (backlog 204) is a pure insertion: `start === end`
          // at the line the gap stands before, clamped to the text's end
          if (/^G\d+$/.test(site.keys[0])) {
            const n = Math.min(lineIdx(site.keys[0]), nLines);
            return { start: n, end: n, lines: ls.map((ln, i) => headOf(site.origin[i]) + ln) };
          }
          const start = Math.min(lineIdx(site.keys[0]), nLines);
          return { start, end: Math.max(start, Math.min(lineIdx(site.keys[site.keys.length - 1]) + 1, nLines)),
            lines: ls.map((ln, i) => headOf(site.origin[i]) + ln) };
        });
      };
      // ✒️ on the Text (R-058, entry 160): the Founder's amendment passes the
      // instant it is submitted, so there is nothing to keep a local id for and
      // no wallet to re-read — the command's own refresh brings back a document
      // that already says the new thing. A refusal takes `propose`'s path: the
      // draft comes back unproposed with the refusal on its own card.
      env.LIVE_HOOKS.pen = (d) => {
        const back = d;
        api.cmd('pen-text', { baseVersion: env.cs.v.textVersion, hunks: hunksOf(d), why: d.rationale || '' })
          .then((res) => {
            if (res && res.ok) { SESSION.setData({ SUGGS: itemsFromView(env.cs.v) }); return; }
            const stale = /targets version/.test((res && res.error) || '');
            back.id = DRAFT_ID; back.unproposed = true;
            back.refusal = stale
              ? 'The text moved while you were writing — your draft is kept; read the new wording and amend again.'
              : 'That could not be amended: ' + ((res && res.error) || 'the server did not answer') + '.';
            if (!SESSION.SUGGS.includes(back)) SESSION.SUGGS.push(back);
            SESSION.setData({ SUGGS: itemsFromView(env.cs.v) });
            SESSION.toggle(DRAFT_ID, false);
          });
      };
      env.LIVE_HOOKS.propose = (d) => {
        const hunks = hunksOf(d);
        const local = d.id;
        // **Re-making a stranded proposal confirms it; it does not open a
        // second one** (Q170, SURFACE E38). The draft was seeded from a
        // candidate the failed rebase handed back, so `rebaseOf` carries its
        // id and what goes over the wire is `rebase-text`: the same patch
        // shape, no stake, **no `signed`** — the sign choice was fixed at the
        // first Propose (K28) and the candidate keeps it — and the rationale
        // as revised, §2.4's middle road. The answer carries the candidate's
        // own id, so everything below it reads exactly as a proposal's does.
        const remake = d.rebaseOf || null;
        if (remake) remakeSent.add(remake);
        // Two spelled-out calls rather than one with the name in a ternary:
        // `spec-check`'s whitelist scan reads `cmd('…')` literally, and a
        // command it cannot see is a command nothing holds against HANDLERS.
        // `signed` is the draft's own choice (Q770); the server is the gate that
        // refuses it under a rung that offers no choice
        (remake
          ? api.cmd('rebase-text', { candidate: remake, baseVersion: env.cs.v.textVersion, hunks, why: d.rationale || '' })
          : api.cmd('propose-text', { baseVersion: env.cs.v.textVersion, hunks, why: d.rationale || '', signed: !!d.signed }))
          .then((res) => {
            if (remake) remakeSent.delete(remake);
            if (res && res.ok && res.result && res.result.id) {
              localIdOf.set(res.result.id, local); proposedAs.set(local, res.result.id);
              SESSION.setData({ SUGGS: itemsFromView(env.cs.v) });
              return;
            }
            // refused: the draft comes back unproposed, the pencil with it
            const stale = /targets version/.test((res && res.error) || '');
            const back = liveItem(local) || d;
            back.id = DRAFT_ID; back.unproposed = true;
            back.refusal = stale
              ? 'The text moved while you were writing — your draft is kept; read the new wording and propose again.'
              : 'That could not be proposed: ' + ((res && res.error) || 'the server did not answer') + '.';
            if (!SESSION.SUGGS.includes(back)) SESSION.SUGGS.push(back);
            syncWallet();
            SESSION.setData({ SUGGS: itemsFromView(env.cs.v) });
            // the card was open under the id it was proposed as; it opens again
            // as the draft, with the refusal on it
            if (SESSION.openId === local) SESSION.toggle(DRAFT_ID, false);
          });
      };
      env.LIVE_HOOKS.withdraw = (id) => {
        // called after session.js has already dropped the item, so the
        // candidate is read off the id: the view's own ('mine:<id>') or the one
        // this page proposed it as
        const s = liveItem(id) || { candidate: proposedAs.get(id) || (String(id).startsWith('mine:') ? id.slice(5) : null) };
        if (!s.candidate) return;
        api.cmd('withdraw-text', { candidate: s.candidate });
      };
      // 🛡️ on the Text (R-056): the Founder's answer carries the question's own
      // id off the card, so nothing has to make the setting-side lookup
      // (`x.motion === rec.id`) work for a question with no motion.
      env.LIVE_HOOKS.crownAnswer = (question, outcome) => {
        if (!question) return;
        env.cs.answerCrownQuestion(now(), question, outcome)
          .then(() => { SESSION.setData({ SUGGS: itemsFromView(env.cs.v) }); });
      };
    }
    return { setProse, hydrateValues, fieldsOf, hydrateFromModule, hydrateSeen,
      liveJudge, liveJudgeAdmit, admitCardOf, allApplicants, applicantsAsking,
      memApplicantRows, whenOf, unhead, liveBoot, birthBoot };
  }
  return { wire, make };
})();
