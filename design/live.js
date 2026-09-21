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
      hydrateSeen, hydrateValues, openCardDirty, pressInFlight, proseText, refusalNoted,
      render, setProse, setStranger, strangerAsView, syncFromCs } = env;
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
    const HOST = { paused: null, stalled: false, build: null, newBuild: null, timer: null };
    // **The reload waits for the member to be done** (issue #12; Ed,
    // 2026-09-17: *defer the reload until nothing is unsent*). Q1347 stands —
    // an open page moves onto the new surface rather than running yesterday's
    // bytes for ever — but a page holds work that exists nowhere else: an
    // unproposed draft lives only in `SUGGS`, an answer chosen and not
    // committed only in `S`, and a reload within 4s of a push threw both away
    // without asking. This changes *when* the reload happens and nothing
    // else. Each clause is read live, never copied at make time — a value
    // taken here would stop deferring the moment the page moved on (the same
    // trap `wallets.js` names for the poll's own `pressInFlight`):
    //  · `pressInFlight()` — a hold, a drag, a travel or the assembly is a
    //    gesture in the air, and nothing rebuilds under a press;
    //  · `S.editMode` — the column is lifted and the caret is in it;
    //  · an `unproposed` draft of your own in `SUGGS`, which is exactly the
    //    item `setData` carries across a data swap (closing a card is not
    //    discarding, and neither is a deploy);
    //  · an open card the bin would have something to put back — the page's
    //    own `openCardDirty`, which asks the snapshot `revertSnap` restores
    //    from rather than inventing a second idea of unsent. **Not the
    //    snapshot's existence**: one is taken at every opening and dropped
    //    only at the commit, so a page that had ever opened a card would
    //    never reload again;
    //  · …and a value typed into a card that was then **closed** (Ed,
    //    2026-09-17, closing this list's last hole): closing a card is not
    //    discarding, so the number is still the member's to send and lives
    //    nowhere but in `S`. `openCardDirty` reads the open card alone, and
    //    the poll has protected the closed ones since issue #11's F4 — so
    //    this asks F4's own question (`handUnsent`, below `make`'s
    //    hydration) rather than a second one, and a value committed, binned
    //    or overtaken by the room stops counting by F4's own two clauses.
    const unsent = () => pressInFlight() || !!env.S.editMode || openCardDirty() ||
      (SESSION.SUGGS || []).some((x) => x.unproposed && (x.mine || x.id === SESSION.DRAFT_ID)) ||
      (!!api.handUnsent && api.handUnsent());
    function noteBuild(build) {
      if (!build) return;
      if (HOST.build === null) { HOST.build = build; return; }
      // **a build that comes back needs no reload**: the question is whether
      // the host is serving bytes other than ours, asked again at every poll,
      // so a rollback to our own build cancels a pending reload rather than
      // leaving it armed for ever
      HOST.newBuild = build !== HOST.build ? build : null;
      // `noteBuild` runs on every poll answer — the 4s one and the refresh
      // that follows every command — so a deferred reload fires at the first
      // poll after the draft is proposed or dropped, the card committed or
      // binned, and the gesture finished. It is never later than 4s after the
      // member is done, and a page with nothing unsent reloads as it always did.
      if (HOST.newBuild && HOST.paused === null && !unsent()) location.reload();
    }
    function noteHost(data) {
      const was = HOST.paused;
      HOST.paused = data.paused || null;
      HOST.stalled = !!data.stalled;
      // the pause lift after a full deploy defers on the same predicate; the
      // poll keeps asking, so the reload lands on the first clean one
      if (was && !HOST.paused && HOST.newBuild && !unsent()) { location.reload(); return; }
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
    // **A part is only kept if it was ever held** (Q1477). The slim view lets
    // the page complete an answer from its own copy of the text and the
    // records; set here, the next poll asks for everything instead, and one
    // full answer clears it. The page's half of the cork defect below.
    let askFull = false;
    const api = {
      chain: Promise.resolve(),
      birth: null, // {pendingId, devLink, slug} once the creation mail is sent
      // **The boot's own answer says which build it is too** (Q1438; Ed,
      // 2026-09-17: *ok*). `noteBuild` is made here, where `HOST` is, but the
      // three boots are `LIVE.make`'s and reach it through `api` — which they
      // already hold for `api.refresh`. Until this crossed, `HOST.build` was
      // first set by the 4s poll, so a page whose HTML came off the old build
      // and whose first poll answered from the new one adopted the new build
      // as its own and never reloaded: a hole in Q1347's `surface-reload`,
      // widest for the page loaded during a deploy, which is the one that
      // most needs the reload.
      noteBuild,
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
            (!askFull && typeof env.cs.v.textVersion === 'number' ? '&tv=' + env.cs.v.textVersion : '') +
            (!askFull && typeof env.cs.v.recordsKey === 'number' ? '&rk=' + env.cs.v.recordsKey : '') : '';
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
            // …**but only from a part this page has actually been served**
            // (Q1477, the nh2026 convention 2026-09-20). The text is left out
            // when the page's `tv` matches the document's version, and
            // `textVersion` reads 0 both over the founder's unversioned text
            // before 🍾 and over the engine's document after it — so the
            // first answer after the cork left the text out of every page
            // that had polled through it, and each went on drawing the
            // founder's text against the engine's line numbers. Cured at the
            // wire, and caught here too: a page holding no engine seq has
            // held no versioned text, so it asks again for the whole thing
            // rather than completing the answer from a text that was never
            // this document's.
            if (!askFull && Array.isArray(data.slim) && env.cs.v &&
              (data.eseq || 0) > 0 && !(env.cs.v.eseq || 0) &&
              data.slim.some((k) => k !== 'view' && data[k] === undefined)) {
              askFull = true;
              console.warn('[live] a slim answer named a part this page has never held; asking again');
              this.refresh();
              return;
            }
            askFull = false;
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
            // …and the other way, which is not a seat moving but a page
            // becoming a different page (issue #11, F1): a door or applicant
            // tab whose cookie has become a member's — a magic link followed
            // in a second tab, an admission at ✒️ — is answered with a
            // member's payload, and there is no in-place handover for it.
            // `S.viewer = 0` is the founder's own row, so the page reported
            // the founder's seat on somebody else's cookie: every predicate
            // that asks *am I the founder* said yes and the surface offered
            // acts the server rightly refused. The whole page is rebuilt
            // instead, which is what the member path's boot does anyway.
            // There is no loop: the payload after the reload is a member's,
            // so this branch is not reached again. The only thing lost is an
            // applicant's unsubmitted words, which membership has just made
            // moot — there is no application left to submit.
            else if (atTheDoor()) { location.reload(); return; }
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
    const { S, CARDS, DKEY, PAGEVAL, ANSBACK, STANDS, FOUNDER, LIVESLUG, SESSION, api, prose } = env;
    const { amFounder, applicantAsView, authorBy, avHtml, constituted, csState, cs_titleNow,
      devInboxButton, effMAns, esc, founderInfo, hydrateApplicant, ladderBar, loadGrants,
      mayApply, midOf, motionRaceSettingOf, msToLocal, now, pkeyOf, pressInFlight,
      proseText, relabel,
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
            // …and `heldBy` with it (Q1447): E41's card says *the Founder
            // refused* or *the membership rejected* (STYLE T8), and `status`
            // alone cannot tell a 🛡️ apart from the room's own answer
            status: rec.status, moot: rec.moot || null, heldBy: rec.heldBy || null,
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
        // one card per failed motion (SURFACE E41; Q1447), so the body names
        // the motion — the whitelist injects whose OK it is, and the module
        // owes it to the mover alone, so another seat's press is nothing
        ackHeld: (t, member, motion) => api.cmd('ack-held', { motion }),
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
    // — and where the hand holds none, the pair the setting race's own row
    // asks with (Q1393): an admission a busy room's hot set never deals is
    // still a vote every member is owed, and the row carries it as a clause
    // row carries its `ask` (Q1202)
    const raceCardOf = (settingId) => ((env.cs && env.cs.v && env.cs.v.raceCards) || []).find((x) =>
      (x.a.setting && x.a.setting.settingId === settingId) ||
      (x.b.setting && x.b.setting.settingId === settingId))
      || (((env.cs && env.cs.v && env.cs.v.settingRaces) || []).find((s) => s.settingId === settingId && s.ask) || {}).ask
      || undefined;
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
    // **A motion card's race is its motion's, not its key's** (issue #6). Since
    // Q1367 a motion is its own card keyed `mo:<id>`, and `midOf` maps page
    // keys to settings — so on the live path every ordinary motion's ✓ looked
    // up a race called `mo:mo-3`, found none, warned to a console nobody
    // reads and left the card marked answered with nothing sent. The record
    // names it (`motionRaceSettingOf`), and for a card that is not a motion —
    // the settled card judging its own setting's race — the key still does.
    const judgeSettingOf = (cw) => {
      if (!cw.motion) return midOf(cw.k);
      let rec = null;
      try { rec = env.cs.motionRecords().get(cw.motion) || null; } catch (e) { rec = null; }
      return motionRaceSettingOf(rec) || midOf(cw.k);
    };
    function liveJudge(cw) {
      const mid = judgeSettingOf(cw);
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
        // **The spell itself, and the unit it is stated in** (Q1439, ruling
        // j): the field was a count of days, so a settled *20 minutes* came
        // back as 0.0139 — a number no founder typed and none could read. The
        // spell lands in milliseconds, exactly, and the number and unit it is
        // typed as are derived from it, so the card re-opens saying *20
        // minutes* on the unit that divides the spell (`lapseParts`).
        // (*Never* writes the rung alone, as it always has: the number fields
        // are a hand nobody has sent, and hydration does not reach into one)
        case 'lapse': if (x.afterMs === null) T.lapse = 'never';
          else { T.lapse = 'days'; T.lapseMs = x.afterMs;
            const p = window.SETUP.lapseParts(x.afterMs);
            T.lapseN = p ? p.n : ''; T.lapseUnit = p ? p.unit : 'days'; } return;
        case 'removal': T.removal = x.price; return;
        case 'admission': T.admission = x.price; return;
        case 'applications': T.joinBy = mayApply(x) ? 'apply' : 'invite'; return;
        default: return;
      }
    }
    const FIELDED_MIDS = ['ending', 'quorum', 'authorship', 'judgments',
      'chamber', 'rate', 'lapse', 'removal', 'admission', 'applications'];
    // **Closing a card is not discarding** (SURFACE C3, issue #11, F4), and
    // the poll did not know it. Hydration skipped the card that is open and
    // wrote every other setting's value back into `S` four seconds at a
    // time — so a number typed into ⏱️ and left there while the founder
    // looked at another card was reverted to the document's own value by the
    // next poll, silently, and the card reopened reading what it always
    // read. 🗑️ is the way back from an uncommitted answer, and nothing else
    // may take it.
    //
    // **What is remembered is what hydration itself last wrote**, per
    // setting. A field that still matches that is a field nobody has
    // touched, and it follows the server as before; a field that matches
    // neither what hydration left nor what is arriving is a member's own
    // unsent hand, and that whole setting is left alone until the hand is
    // committed or binned. A field that already equals the incoming value is
    // not a disagreement, so a room that moves *to* what you typed does not
    // freeze your card. **Not a snapshot test**: a snapshot lives from a
    // card's first opening until ✓, so skipping on one would stop those
    // cards following the server at all and let a later ✓ put back somebody
    // else's change.
    const wrote = {};
    // what a setting's standing value would write into the page's own
    // fields, or null where there is no settled value to write — a non-null
    // value implies settled, every module fold setting or nulling the pair
    // together, so that is the whole of the guard
    const wouldWrite = (mid) => {
      const st = env.cs.settingState(mid);
      if (!st || !st.value) return null;
      const t = {};
      fieldsOf(mid, st.value, t);
      return t;
    };
    /**
     * **Is a member's own unsent hand on this setting?** — F4's question,
     * asked in the one place both its readers come to (Ed, 2026-09-17,
     * closing issue #12's last hole). Hydration asks it to decide what to
     * leave alone; the **deferred reload** asks it to decide what a push
     * would throw away, and the two answering differently is the defect: a
     * second idea of *unsent* is how the reload came to keep a draft and
     * drop a number.
     *
     * A field that still matches what hydration last wrote is a field nobody
     * has touched. A field matching neither that nor what is arriving is a
     * hand, and that whole setting is left alone — and reloaded around —
     * until the hand is committed or binned. **Both halves are what stops a
     * deferral becoming a never**: a value the member commits or bins comes
     * back to what hydration wrote, and a value the room moves *to* equals
     * what is arriving, so each lands on one side of the comparison and
     * stops counting. `wrote[mid]` is asked first, so a page hydration has
     * never run on — the door's, the applicant's — answers no without
     * reading a view at all.
     */
    const handOn = (mid, t) => {
      if (!wrote[mid]) return false;
      const would = t || wouldWrite(mid);
      return !!would && Object.keys(would).some((f) =>
        String(S[f]) !== String(wrote[mid][f]) && String(S[f]) !== String(would[f]));
    };
    /** …over every setting but the one whose card is open, which is
     *  `openCardDirty`'s own question and is asked there. So this is exactly
     *  the set hydration is leaving alone, which is the invariant worth
     *  having: what the poll will not overwrite, the reload will not throw
     *  away. */
    function handUnsent() {
      return FIELDED_MIDS.some((mid) => pkeyOf(mid) !== S.open && handOn(mid));
    }
    // the reload's half of it lives in the wire above (`unsent`), so it
    // crosses on `api` as `noteBuild` crosses the other way — both polls hold
    // `api`, and a value copied at make time would stop asking
    api.handUnsent = handUnsent;
    function hydrateFromModule(skipKey) {
      for (const mid of FIELDED_MIDS) {
        if (pkeyOf(mid) === skipKey) continue;
        const t = wouldWrite(mid);
        if (!t) continue;
        if (handOn(mid, t)) continue;
        Object.assign(S, t);
        wrote[mid] = t;
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
      // **…and *roster* means a blind question, never merely the holder**
      // (Q1364 (a)). After 🍾 a setting whose powers were laid down is the
      // membership's with the founder's value standing, and this read every
      // such setting as delegated: ⏱️ 👥 🤝 came back as open answer cards on
      // every load of a begun document. A question is the room's while the
      // module collects it or once the ceremony resolved it — the same test
      // as the page's `isRoom` — and a value the founder set is *founder*
      // whoever holds the setting now.
      const stOf = (mid) => { try { return env.cs.settingState(mid); } catch (e) { return null; } };
      const byOf = (mid) => { const st = stOf(mid);
        return del(mid) && st && (st.collecting || st.settledBy === 'ceremony') ? 'roster'
          : (st && st.settledBy !== null) ? 'founder' : ''; };
      S.quorumBy = byOf('quorum');
      S.rateBy = byOf('rate');
      S.policyBy = byOf('applications');
      // my committed answers, back in the page's own vocabulary
      for (const q of v.view.questions) {
        if (q.myAnswer === null) continue;
        const k = pkeyOf(q.setting);
        // 💤 and ⏱️ come back as the number and the unit they were stated in
        // (`ANSBACK`, the inverse of `ANSTYPED` — Q1439); everything else is
        // the room's own scalar, which for those two is not a box's value
        const back = ANSBACK[k] ? ANSBACK[k](q.myAnswer) : null;
        if (back) Object.assign(S.myAns, back);
        else S.myAns[k] = PAGEVAL[k] ? PAGEVAL[k](q.myAnswer) : q.myAnswer;
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
        // **which build this page is** (Q1438), read off the boot's own
        // answer and before anything is done with it, so the page's build is
        // its own from its first answer rather than from its first poll. All
        // three boots below are this one fetch — the member's, the door's and
        // the applicant's are branches of its payload, not fetches of their
        // own — so this is the whole of it. It cannot reload here: the first
        // build `noteBuild` is ever told is simply taken (`HOST.build ===
        // null`), and a retry that lands on a *different* build is a page
        // whose bytes are already stale, which is the reload's own case.
        api.noteBuild(r.headers.get('x-build'));
        if (r.status === 401) { console.warn('[live] no seat and no door'); return null; }
        // **The first view is the only one there is until it lands** (issue
        // #11, F3). The 4s poll starts at the foot of a successful boot, so
        // anything that stops the boot stops the page for ever: one 429 off
        // the door's own budget — a room of phones behind one venue Wi-Fi
        // address, which is exactly the case that budget was widened for —
        // or one 502 from a host being deployed, and the reader is left with
        // an empty column, an empty rail and no second attempt. Only the
        // answers that mean *try again* are retried: a 429 and the 5xx
        // family, plus a fetch that never arrived. **401 stays terminal**,
        // and so does every other 4xx — a 404 retried on a timer is a page
        // that polls a document that does not exist for as long as it is
        // open.
        if (r.status === 429 || r.status >= 500) {
          console.warn('[live] boot answered', r.status, '— trying again');
          return { retry: true };
        }
        return r.json();
      }, (e) => {
        // the answer that never came: a dropped connection is the same
        // *try again* as a 503, and it is the ordinary one on a bad line
        console.warn('[live] boot', e && e.message, '— trying again');
        return { retry: true };
      }).then((data) => {
        if (data && data.retry) { setTimeout(liveBoot, 4000); return; }
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
    // a candidate's reading of a span: the current lines with its hunks
    // applied — the words for the card, or with `src` the **source lines**
    // exactly, which is what a lane seeded from the candidate holds (Q1403)
    const applyIn = (lines, sp, hunks) => {
      const region = lines.slice(sp.start, sp.end);
      for (const h of (hunks || []).slice().sort((a, b) => b.start - a.start)) {
        region.splice(h.start - sp.start, h.end - h.start, ...h.lines);
      }
      return region.filter((l) => l.trim()).join('\n');
    };
    const spanOf = (hunks) => ({ start: Math.min(...hunks.map((h) => h.start)),
      end: Math.max(...hunks.map((h) => h.end)) });
    const plain = (lines, sp) => lines.slice(sp.start, sp.end).filter((l) => l.trim()).join('\n');
    // the mark the quick card shows: cards.js's own diff, del and ins both
    // (resultOnly drops the dels where the card states the result) —
    // **rendered as the clause is** (Q1368, Ed 2026-09-15): the markdown-aware
    // diff, so `**Recorder**` reads bold on the proposal block and in the
    // ledger as it does in the clause above them, where this used to escape
    // the source and print the asterisks
    // …and **in blocks** (Q1406): a candidate of several paragraphs keeps its
    // breaks and a heading in it its rank — the markers ride the text now,
    // `unhead` no longer taken off it, and `mdBlocksHtml` consumes them
    const markedOf = (before, after) => window.CARDS.mdBlocksHtml(before, after);
    // the nearest heading above; on a document with none, the document's own
    // title — the outermost heading (Q1303, Ed 2026-09-10) — and only with no
    // title either, the clause's first words
    // …and **a gap takes the heading above the gap** (Q1411, the walk's C3
    // 2026-09-17): a `G<n>` key matches no line in the document, so this walk
    // met no `break`, ran to the end and kept the *last* heading it passed —
    // the rail entry for a preamble before the first line read *Disputes*. A
    // gap stops where it stands, at the last block whose line number is below
    // its own, which is the rule `blockBeforeGap` reads on the page. With
    // nothing above it — G0 — no heading is passed at all and the document's
    // own title stands, which is what the fallback has always said. Asked of
    // the key itself rather than left to the callers, which pass the block
    // before the gap where they know it and the gap key where they do not.
    const gapNum = (key) => { const m = /^G(\d+)$/.exec(String(key || '')); return m ? +m[1] : null; };
    const labelFor = (key) => {
      let h = '';
      const stop = gapNum(key);
      for (const l of SESSION.DOC) {
        if (stop !== null && lineIdx(l.key) >= stop) break;
        if (l.t === 'h') h = l.x;
        if (stop === null && l.key === key) break;
      }
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
      const cards = v.raceCards || [];
      // **The abstention clock arrives in the server's ms and is read in
      // this browser's** (Q1460): the same offset the topbar countdown uses
      // — the view's own `serverNowMs` against the moment it landed — carried
      // once, here, so the ticker downstream compares a plain `Date.now()`
      // and never has to know whose clock the number was written on. Zero on
      // the fixture, which has no server and no skew to correct.
      const skew = (v.serverNowMs != null && v.receivedAtMs != null)
        ? v.receivedAtMs - v.serverNowMs : 0;
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
        // **One live question, one tab, one entry** (Q1367, Ed 2026-09-15,
        // reversing the deck of Q1200 and the ledger of Q1201): every pair the
        // router dealt you on this race is its own item — its own tab in the
        // clause's stack and its own rail entry — and every pair you have a
        // standing judgment on is an item too, in state `deciding`, opening
        // that pair with your verdict pre-selected and revisable. The card
        // shows the pair it is about and nothing else. The hand is ten cards
        // from the hot set, so a race can still have a pair to ask you and be
        // out of it; the view says per race whether anything is left to ask
        // you (`askable`, the engine's own test) and, where the hand holds no
        // card on the race, hands over that pair (`ask`) so the lit entry
        // opens a card without a round trip. A card carries its `raceId`;
        // matching by candidate id survives as the fallback for one that does
        // not. **And ⏳ means *waiting for other people to vote*** (Q1202, Ed
        // 2026-09-07): a judged pair's tab, one per pair, is the ⏳ — there is
        // no ledger card.
        const dealt = cards.filter((rc) => rc.kind === 'edge' &&
          (rc.raceId ? rc.raceId === r.id : !!sideOf(rc, ids)));
        const asked = dealt.length ? dealt : (r.ask ? [r.ask] : []);
        // the contested footprint is a list of spans; the page anchors the race
        // at their union (one clause run)
        const csp = spanOf(r.contested && r.contested.length ? r.contested : r.candidates.flatMap((c) => c.hunks));
        const byId = (id) => r.candidates.find((c) => c.id === id);
        // **A pair's card is cut to the pair's own span** (Q1407, Ed 2026-09-16,
        // from the screenshot *why am I seeing the whole text in this
        // amendment*): the race's span is the union of every candidate's
        // footprint, so once one proposal rewrote the whole document a
        // one-line proviso in the same race drew the whole document at its
        // head and in both lanes. Each pair takes the lines its two readings
        // differ on — the union of its two sides' hunks, the incumbent
        // contributing none — its site, its keys and its label from that span,
        // and each lane is that span's reading. The ⚔️ slate alone keeps the
        // race's whole span, being the whole field at once.
        const spanOfSides = (...sideIds) => {
          const hs = sideIds.map(byId).filter(Boolean).flatMap((c) => c.hunks || []);
          return hs.length ? spanOf(hs) : csp;
        };
        const textIn = (c, sp) => applyIn(lines, sp, c.hunks);
        const textOf = (c) => textIn(c, csp);     // the slate's reading, over the race's span
        const srcOf = textOf;     // one text since Q1406 — the source, markers kept; `src` stays for the seed's readers (Q1403)
        // a name the server attached is one the reveal rule allowed (a signed
        // proposal, Q770, or one made under `public`): the live card shows it,
        // and since backlog 255 their face with it — the picture rides the same
        // `author` object and is blind at exactly the same gate (K30)
        const byOf = (c) => authorBy(c.author);
        // a side resolved to what the card can draw — the incumbent as the
        // current text, a candidate as its reading with its diff and its case.
        // A side the view no longer names (the incumbent a shift replaced)
        // keeps its id and draws no text.
        const sideOfId = (id, sp) => {
          const incText = plain(lines, sp);
          if (id === r.incumbentId) return { id, inc: true, text: incText };
          const c = byId(id);
          if (!c) return { id, inc: false, text: null };
          const t = textIn(c, sp);
          return { id, inc: false, text: t, src: t, marked: markedOf(incText, t), rationale: c.rationale, by: byOf(c) };
        };
        // the pair's own key rides the item id: one item per pair, and the
        // provisional layer (session.js's `pairKey`) is keyed the same way
        const pairId = (x, y) => r.id + '#' + [x, y].sort().join(':');
        // what every item on this race carries, at the site of its own span (Q1407)
        const baseFor = (site) => ({
          raceId: r.id, ...site,
          qLabel: labelFor(site.insertAfterKey || site.keys[0]),
          // the fill is the race's closeness to resolution — a magnitude the
          // engine cannot be made to sign (Q501) — and since Q1362 (c) that
          // magnitude is **the leader's judges over the floor**: voters so far
          // over voters required, the one number the room controls. It is the
          // same two numbers as `judges` and `floor` below; the engine sends
          // the ratio so the page never divides.
          pct: Math.round((r.closeness || 0) * 100),
          judges: r.judges || 0, floor: r.floor,
          // **waiting behind a park on the same clause** (SURFACE E36, R-100):
          // the batch passes this race over until the Founder answers a park
          // it overlaps; it stays live and judgeable, so it keeps its mark and
          // its card, and the sentence rides both — the ⏳ line's tooltip once
          // you have nothing left to say here, and a note on every card
          blockedByPark: r.blockedByPark ? PARK.blocked : false,
          deadlocked: !!r.deadlocked,
          // **when your silence here becomes an abstention** (Q1460): the
          // seat's own deadline, on this browser's clock. The server sends it
          // while this seat is awaited on the race's approval pair and has
          // not answered it — **on either side of the moment** since Q1460
          // (a), a passed one being what the spot reads *💤 abstained* off —
          // so its mere presence is the whole condition for drawing the line
          // and the renderer decides which of the two it says; the items that
          // cannot be voted on strike it again below.
          abstainAt: r.abstainAt != null ? r.abstainAt + skew : undefined,
        });
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
        const slate = r.deadlocked
          ? { slate: r.candidates.map((x) => ({ text: textOf(x), src: srcOf(x), rationale: x.rationale })) } : {};
        const waitCap = r.blockedByPark ? PARK.blocked : RAIL.votedStillRunning;
        // the item for one pair: the quick card where the current text is a
        // side, the race card where two challengers were dealt
        const pairItem = (aId, bId, extra) => {
          const sp = spanOfSides(aId, bId);                  // the pair's own span (Q1407)
          const base = baseFor(siteOfSpan(sp, lines));
          const A = sideOfId(aId, sp), B = sideOfId(bId, sp);
          const incSide = A.inc ? 'a' : B.inc ? 'b' : null;
          const card = { a: A.id, b: B.id, inc: incSide };
          if (incSide) {
            const c = A.inc ? B : A;
            return { ...base, ...extra, id: pairId(A.id, B.id), kind: 'quick', card,
              marked: c.marked || markedOf(plain(lines, sp), c.text || ''), rationale: c.rationale, by: c.by || null,
              candId: c.id, src: c.src, ...slate };
          }
          return { ...base, ...extra, id: pairId(A.id, B.id), kind: 'race', card,
            race: { a: { id: A.id, text: A.text, src: A.src, rationale: A.rationale, by: A.by || null },
                    b: { id: B.id, text: B.text, src: B.src, rationale: B.rationale, by: B.by || null } }, ...slate };
        };
        // a judgment's verdict in the card's own vocabulary: the quick card's
        // keep / approve where the incumbent is a side, the race card's a / b
        // where it is not, and indifferent for a tie
        const isInc = (id) => id === r.incumbentId;
        const whatOf = (a, b, outcome) => (outcome === 'tie' ? 'indifferent'
          : (isInc(a) || isInc(b)) ? (isInc(outcome === 'a' ? a : b) ? 'keep' : 'approve')
          : outcome);
        const judgedKeys = new Set();
        for (const j of r.myJudgments || []) {
          judgedKeys.add(pairId(j.a, j.b));
          // a pair a ground shift locked (↻) is told so and its verdict cannot
          // be changed; every other judged pair is yours to revise (§4.4)
          // **A pair you have answered wears no countdown** (Q1460): the
          // engine's clock is on the race's approval pair, and this card is
          // not asking you anything any more. Ed has not ruled on what a
          // judged card should say, if anything, so it says nothing.
          items.push(pairItem(j.a, j.b, { state: 'deciding', pick: whatOf(j.a, j.b, j.outcome),
            cap: waitCap, shifted: j.locked ? SHIFTED_NOTE : false, locked: !!j.locked, urgency: 0.3,
            abstainAt: undefined }));
        }
        // **How many more questions lie under this one** (Q1462, Ed
        // 2026-09-18: *a queue card stack … that hints that there are other
        // rivals beneath the current one*). The deal is unchanged (Q1312,
        // SPEC §8.3): one pair per race at a time, so a clause holding
        // twenty-two rivals reaches a member as one lit entry saying nothing
        // about the other twenty-one. The count is the rivals still to come
        // for **this seat**: live wordings on the race that are not the
        // member's own (their own is the ✏️ line, never a question), that
        // they have no standing judgment on against the current text — one a
        // ground shift locked will be asked again, so it does not count as
        // answered (§4.4) — and that are not already drawn as an entry of
        // their own, the hand being able to hold more than one pair on a race
        // (Q1200). Page-only: every fact is already on the clause row, so no
        // server change and no full deploy.
        const askedLive = asked.filter((rc) => !judgedKeys.has(pairId(rc.a.id, rc.b.id)));
        const answered = new Set();
        for (const j of r.myJudgments || []) {
          if (j.locked) continue;
          if (j.a === r.incumbentId) answered.add(j.b);
          else if (j.b === r.incumbentId) answered.add(j.a);
        }
        const drawn = new Set(askedLive.flatMap((rc) => [rc.a.id, rc.b.id]));
        const beneath = r.candidates
          .filter((c) => !c.mine && !answered.has(c.id) && !drawn.has(c.id)).length;
        // **The pile belongs to the pair that stands for the race** (Q1462):
        // the first live pair here putting a wording against the current
        // text, which is the question the next one will be too. A
        // rival-against-rival pair asks something else — which of two
        // challengers — so it carries no pile, and a race whose only live
        // pair is one of those carries none at all.
        let piled = false;
        for (const rc of askedLive) {
          // urgency is the router's own (SPEC §8.1): the card's value over
          // the best in the hand, a pair from outside the hand priced against
          // that same top since Q98 — so every entry with a card carries a
          // real number and the 0.3 is reached only where there is no card at
          // all
          const stands = rc.a.id === r.incumbentId || rc.b.id === r.incumbentId;
          const pile = (!piled && stands && beneath > 0) ? { beneath } : {};
          if (pile.beneath) piled = true;
          items.push(pairItem(rc.a.id, rc.b.id, { state: 'needs', ...pile,
            cap: RAIL.wantsVote, urgency: rc.urgency != null ? rc.urgency : 0.3 }));
        }
        // a race with nothing dealt and nothing judged — passed over by the
        // batch, or waiting on people other than you before anything was
        // asked — still stands at its clause, as it always has: one entry,
        // no pair to send, so its card asks nothing it can commit
        if (!asked.length && !(r.myJudgments || []).length) {
          const others = r.candidates.filter((c) => !c.mine);
          const c0 = others[0] || r.candidates[0];
          const two = !(r.candidates.length === 1 || others.length < 2);
          // its span is the pair's it would show (Q1407): the one candidate's, or the two challengers' together
          const sp0 = two ? spanOfSides(others[0].id, others[1].id) : spanOfSides(c0.id);
          // …and no countdown either (Q1460): there is no pair to send from
          // this card, so a line saying when not voting will count would be
          // told to somebody with nothing to vote with.
          const rest = { ...baseFor(siteOfSpan(sp0, lines)), id: r.id, state: r.judged ? 'deciding' : 'needs',
            cap: r.judged ? waitCap : RAIL.wantsVote, urgency: 0.3, card: null,
            abstainAt: undefined, ...slate };
          if (!two) {
            const t0 = textIn(c0, sp0);
            items.push({ ...rest, kind: 'quick', marked: markedOf(plain(lines, sp0), t0),
              rationale: c0.rationale, by: byOf(c0), candId: c0.id, src: t0 });
          } else {
            const ta = textIn(others[0], sp0), tb = textIn(others[1], sp0);
            items.push({ ...rest, kind: 'race',
              race: { a: { id: others[0].id, text: ta, src: ta, rationale: others[0].rationale, by: byOf(others[0]) },
                      b: { id: others[1].id, text: tb, src: tb, rationale: others[1].rationale, by: byOf(others[1]) } } });
          }
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
        // **Your own insertion is a gap site like anybody else's** (Q1410;
        // M19, Q1308, Q1311). This branch alone keyed its sites with
        // `keysOfSpan`, which reads an empty span as the line at `start` — so
        // an insertion of yours stood on the clause *after* the gap, wore that
        // clause's tab, showed its words as the origin and swallowed it when
        // the card opened. `siteOfSpan` is what every other branch uses and
        // what the composer's own unproposed draft already makes: the gap key,
        // the block before it, the insert head. A gap has no block, so its
        // origin is the empty one the composer writes (`originOf`), which is
        // what makes the head read *(no text here)*.
        const sites = spans.map((x, i) => {
          const st = siteOfSpan(x, lines);
          // the site's text and its origin are **source lines** (Q1403): the
          // hunk as proposed, the block as it stands, markers and all — the
          // card dims the marker, and a re-make sends the lines as they are
          return { ...st, label: labelFor(st.insertAfterKey || st.keys[0]),
            text: hunks[i].lines.join('\n'),
            origin: st.keys.map((k) => {
              if (st.isInsert) return { key: k, text: '', note: null, t: 'p', gap: true };
              const l = SESSION.DOC.find((x2) => x2.key === k) || {};
              return { key: k, text: SESSION.sourceTextFor(k), note: null, t: l.t, level: l.level }; }) };
        });
        // the draft's own keys are its sites' (`syncDraftKeys`), never the
        // span between them — a two-site patch holding a gap would otherwise
        // claim every block it jumps over
        const keys = sites.flatMap((s) => s.keys);
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
      // **The engine's one reserved reason, put into words here** (Q1440).
      // `candidate-retired.reason` is host prose everywhere else — the
      // Founder's *Proposal refused by ‹name› 🛡️*, composed by the bridge,
      // which has a name to use — and the engine has never heard of a
      // language, so its own token becomes a sentence at the page's edge and
      // anything else is passed through exactly as it arrives.
      const reasonOf = (f) => (!f || !f.reason ? null
        : f.reason === 'dominated' ? window.COPY.session.record.dominated : f.reason);
      // **A wording of your own in the field is a reason the record announces
      // itself** (Q1451, Ed 2026-09-18: *you should know the outcome of things
      // you propose*). A sealed record pinned only where it changed the
      // document or where you judged in it — *you are part of why it did not*
      // — and an author is never asked to judge their own lone proposal (E13,
      // Q1340), so the one member with a stake in a rejected wording got the
      // silent grey chip everybody else got. The author is part of why. The
      // join is the viewer's own candidate ids against the field's, both of
      // which the view already carries, so nothing new is disclosed: it is
      // their own proposal. Carried as the ids rather than a flag, because an
      // early ✖ taken on one of them (Q1451 part 3) is the acknowledgement of
      // that proposal and `isUnread` has to know which.
      const mineIds = new Set((v.mine || []).map((m) => m.id));
      for (const o of v.records || []) {
        const field = o.field || [];
        const mineIn = field.map((f) => f.candidateId).filter((id) => mineIds.has(id));
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
        const textOfF = (f) => f.hunks.flatMap((h) => h.lines).join('\n');
        const plainOfF = (f) => f.hunks.flatMap((h) => h.lines).filter((l) => l.trim()).join('\n');
        // the seal lifts at the record (§3.5a): `records` stays sealed, the
        // closed `record` carries the names where the anonymity ladder allows
        const byName = (f) => authorBy(f.author) || unsealed.get(f.id || f.candidateId) || null;
        const best = field.slice().sort((x, y) => (y.p ?? -1) - (x.p ?? -1))[0];
        const winner = field.find((f) => f.outcome === 'adopted') || (undecided ? best : null) || field[0] || {};
        const replaced = (o.displaced || []).filter((l) => l.trim()).join('\n') || undefined;
        const slate = field.length > 1
          ? { slate: field.map((f) => ({ text: textOfF(f), src: f.hunks.flatMap((h) => h.lines).join('\n'),
              rationale: f.rationale, by: byName(f),
              underNote: underNoteOf(f), refusal: reasonOf(f),
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
        // **A wording closed early is its author's own news** (Q1451, part 3).
        // The server serves the author — and nobody else — a reduced row while
        // the clause is still racing: their candidate, no rivals, no reading,
        // no judge count. It is keyed apart from the record the race will file
        // when it finally ends, `rec:early:<candidate>`, because that press is
        // the acknowledgement of *this proposal* and the full record must not
        // ask the same person for it twice (`isUnread`'s `minePending`). The
        // card that draws it is the sealed one with its eyebrow of numbers
        // taken off — session.js, on this same flag.
        const early = !!o.early;
        items.push({ id: early ? 'rec:early:' + o.candidateId
          : 'rec:' + (o.raceId || o.candidateId), kind: 'quick', keys, state: 'sealed',
          ...gapSite, ...(changedSince ? { changedSince: true, gone } : {}),
          ...(early ? { early: true } : {}),
          // a gap record is titled by the block before its gap, as a gap draft is
          qLabel: labelFor(site.insertAfterKey || keys[0]), urgency: 0, pct: 100,
          cap: early ? window.COPY.session.record.dominated
            : adopted ? 'decided — adopted' : undecided ? 'undecided at the close — the text stood' : 'decided — the current text stood',
          decided: { outcome: adopted ? 'adopted' : undecided ? 'undecided' : 'retired — the current text stood',
            // `o.threshold` is still on the record row — the engine's own,
            // pinned (R-117) — and nothing reads it: the eyebrow stopped
            // comparing the reading to a line with the line itself (Q1362)
            when: whenOf(o.when), p: o.p == null && best ? best.p : o.p, judges: o.judges,
            // **how many preferred it** (Q1439, ruling a): the quorum counts
            // approvals, so the record carries the winner's approvals beside
            // its judge count — `o.approvals` on the closing record's row
            // (the `adopted` event's optional field, SPEC §8.2). A record
            // written before the rule changed carries none and the tooltip
            // reads as it always did.
            ...(typeof o.approvals === 'number' ? { approvals: o.approvals } : {}),
            // …and its own floor, since the floor is per race and per moment
            // from Q1439: the record states the floor **this** decision was
            // taken against, not the one standing now. Absent, the card falls
            // back to the document's own `v.floor` as it always did.
            ...(typeof o.floor === 'number' ? { floor: o.floor } : {}),
            // …and how many never answered in time (Q1452): the silences 💤's
            // period had already taken out of the group when the batch
            // decided, which is what makes a proposal carried by two of ten
            // legible beside a 👥 clause that still names ten. Carried as the
            // record states it, zero included — the card is what decides to
            // say nothing about a decision nobody ran out of time on.
            ...(typeof o.abstained === 'number' ? { abstained: o.abstained } : {}),
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
          refusal: reasonOf(winner),
          verdict: o.judgedByMe ? 'voted on this' : undefined,
          ...(mineIn.length ? { mineIn } : {}),
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
        const replaced = (c.displaced || []).filter((l) => l.trim()).join('\n') || undefined;
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
      // `pair` is the pair the card is about (Q1367): the item's own, one
      // item being one pair — session.js hands it over with the press; a
      // judgment with none has nothing to send
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
      //
      // **The lines go as the lane holds them** (Q1403): a lane's text is the
      // candidate's markdown, marker and all, so nothing is put back in front
      // of a line here — until Q1403 the origin block's `# ` was, which meant
      // a heading's rank could not be changed from the lane and a marker
      // typed on a heading would have been doubled.
      // **And it says what it is replacing** (Q1463 (1), Ed 2026-09-19; SPEC
      // §2.1 → why: R-136). Every hunk carries `was`, the exact lines of the
      // document the page is holding that it means to replace, and a pure
      // insertion carries `after`, the exact line it means to follow — `null`
      // at the very top, where there is none. The host refuses a patch that
      // carries neither, and refuses one whose wording is not what the
      // version it names actually holds, so a line adopted above a draft can
      // no longer land the words on the wrong clause. Exact lines out of
      // `env.cs.text`: this is the attestation, not the page's own looser
      // comparison (`misaimed` below), which is about whether the draft can
      // still be carried at all.
      const hunksOf = (d) => {
        const all = env.cs.text === '' ? [] : String(env.cs.text).split('\n');
        const nLines = all.length;
        // **Only the places that changed go out** (issue #43's page half;
        // Q1479 (b), Ed 2026-09-19). A site typed into and put back survives
        // with its origin's own wording (Q1382: an unchanged site is kept),
        // and the row beside it already says *1 place changed* — but every
        // site was sent, so the untouched clause joined the proposal's
        // footprint, made it a rival of whatever else was running there, and
        // stranded one of the two when either carried, over a change nobody
        // made. `draftRowState`'s own test, so what goes out is what the row
        // counts; it also stops an empty gap sending one blank line. A site
        // with no remembered wording is sent as it always was.
        const changed = (site) => !Array.isArray(site.origin) ||
          site.text !== site.origin.map((x) => x.text).join('\n');
        return d.sites.filter(changed).map((site) => {
          const ls = site.text.split('\n');
          // a **gap site** (backlog 204) is a pure insertion: `start === end`
          // at the line the gap stands before, clamped to the text's end
          if (/^G\d+$/.test(site.keys[0])) {
            const n = Math.min(lineIdx(site.keys[0]), nLines);
            return { start: n, end: n, lines: ls, after: n === 0 ? null : all[n - 1] };
          }
          const start = Math.min(lineIdx(site.keys[0]), nLines);
          const end = Math.max(start, Math.min(lineIdx(site.keys[site.keys.length - 1]) + 1, nLines));
          // **An emptied site is a deletion** (Q1415, Ed 2026-09-17, from the
          // proposal-shapes pass PF5). A member who clears a clause and
          // proposes meant to take it out, and the engine has a shape for
          // that: a hunk with no lines. This sent `['']` — one empty line —
          // so the candidate replaced the clause with a blank, and the
          // adopted record landed on a line with no text, no block key, no
          // tab and no card, where a bot's `lines: []` removes the line
          // outright. Only where there is something to remove: a **gap** is
          // the branch above (`start === end`, a pure insertion), and an
          // empty document's one block (Q649 (a)) clamps to `start === end`
          // here, so a first insertion into it cannot become a deletion
          // either. A site emptied and then typed into again is not empty and
          // never reaches this.
          const was = all.slice(start, end);
          if (end > start && !site.text.trim()) return { start, end, lines: [], was };
          // a clamped site that replaces nothing is an insertion after all, and
          // an insertion attests with `after` (the empty document, Q649 (a))
          if (start === end) return { start, end, lines: ls, after: start === 0 ? null : all[start - 1] };
          return { start, end, lines: ls, was };
        });
      };
      // what a draft would send, readable by a walk (`SESSION.LIVE_HOOKS.hunksOf`)
      env.LIVE_HOOKS.hunksOf = hunksOf;

      // **Refuse if lost** (Q1463, Ed 2026-09-18), the second half of *follow
      // the paragraph, and refuse if lost*. The page carries a draft's sites
      // to their paragraphs' new lines as the text moves; this is the guard
      // behind that, and it is deliberately written to know nothing about it.
      // It asks one question of the text the command is about to name a
      // version of: does every line the hunk would replace still hold exactly
      // the wording the site was written against — and, for a gap, is the
      // clause it was made after still the line immediately before it. Where
      // the answer is no the press sends nothing.
      //
      // The engine's own guard cannot see this. A hunk carries line numbers
      // and a version, and the version *is* current — the member has been
      // typing, not sleeping — so a stale line number is accepted and the
      // wrong clause is rewritten. Nothing but the origin wording can tell
      // the two apart.
      //
      // The sentence is the one a stale version already gets, and it is true
      // in exactly the same way: the text moved while you were writing.
      // the draft's refusal sentences, the copy file's (`session.refusal`): read
      // here, in the scope the three hooks below share
      const REFUSAL = window.COPY.session.refusal;
      const MOVED_ON = REFUSAL.movedPropose;
      // **The host's two stale answers are one event to a member** (Q1463 (1)):
      // *targets version N* is the text having moved on to a version this
      // draft never saw, and *not what this proposal replaces* is it having
      // moved under a draft whose version is current (R-136). Both mean the
      // same thing to the person typing, so both take the same sentence and
      // no new copy is owed.
      const movedUnder = (e) => /targets version|not what this proposal/.test(String(e || ''));
      const sameLine = (a, b) => String(a == null ? '' : a).replace(/^(#{1,3}|-)\s+/, '$1 ').replace(/\s+$/, '')
        === String(b == null ? '' : b).replace(/^(#{1,3}|-)\s+/, '$1 ').replace(/\s+$/, '');
      env.LIVE_HOOKS.misaimed = (d) => {
        const text = env.cs && env.cs.text != null ? String(env.cs.text) : '';
        const lines = text === '' ? [] : text.split('\n');
        // **Two places never cover the same lines** (SURFACE K14–K16, Q1492).
        // The cure is at the draft model, which no longer makes a site over a
        // line another one holds; this is the backstop under it, because a
        // patch whose hunks overlap is refused *whole* by the host and the
        // member loses every word of it. Asked before the wording checks,
        // since it is about the draft rather than about the text.
        const spans = ((d && d.sites) || []).filter((s) => !/^G\d+$/.test(s.keys[0]))
          .map((s) => [lineIdx(s.keys[0]), lineIdx(s.keys[s.keys.length - 1]) + 1])
          .sort((a, b) => a[0] - b[0]);
        for (let i = 1; i < spans.length; i++) if (spans[i][0] < spans[i - 1][1]) return REFUSAL.overlapping;
        // an empty document is one empty clause and nothing to be stale about
        // (Q649 (a)): the engine holds zero lines, so there is no wording to
        // compare and the first insertion into it is always aimed right
        if (!lines.length) return null;
        // a blank line is a line the engine counts and the page does not draw
        // (`blocksOf`), so *before* means the nearest line with words in it,
        // never the number one lower
        const blanksOnly = (a, b) => lines.slice(a, b).every((l) => !String(l).trim());
        for (const site of (d && d.sites) || []) {
          const first = site.keys[0];
          if (/^G\d+$/.test(first)) {
            const n = lineIdx(first);
            // the top of the document has no clause before it and never moves
            if (site.insertAfterKey == null) { if (n !== 0) return MOVED_ON; continue; }
            const a = lineIdx(site.insertAfterKey);
            if (!(a < n && blanksOnly(a + 1, n))) return MOVED_ON;
            // a site the page never gave a remembered wording (an older draft
            // in flight) is left to the version guard, as it always was
            if (site.afterText == null) continue;
            if (!sameLine(lines[a], site.afterText)) return MOVED_ON;
            continue;
          }
          const origin = site.origin || [];
          if (!origin.length) continue;
          for (let i = 0; i < site.keys.length; i++) {
            const at = lineIdx(site.keys[i]);
            const want = origin[i] ? origin[i].text : null;
            if (want == null) continue;
            if (at >= lines.length || !sameLine(lines[at], want)) return MOVED_ON;
          }
          // a run is a run: the blocks it replaces must still be consecutive
          for (let i = 1; i < site.keys.length; i++) {
            if (lineIdx(site.keys[i]) <= lineIdx(site.keys[i - 1])) return MOVED_ON;
          }
        }
        return null;
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
            const stale = movedUnder(res && res.error);
            back.id = DRAFT_ID; back.unproposed = true;
            back.refusal = stale
              ? REFUSAL.movedAmend
              : REFUSAL.notAmended((res && res.error) || REFUSAL.noAnswer);
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
            const stale = movedUnder(res && res.error);
            const back = liveItem(local) || d;
            back.id = DRAFT_ID; back.unproposed = true;
            back.refusal = stale
              ? REFUSAL.movedPropose
              : REFUSAL.notProposed((res && res.error) || REFUSAL.noAnswer);
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
