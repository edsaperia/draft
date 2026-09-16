/**
 * design/wallets.js — the wallet family, the socket’s speech bubble and the
 * hold ladder (lifted out of session-view.html’s inline script as refactor
 * Q1352 (c), 2026-09-14).
 *
 * **Every power is an object you hold, kept where you can see it, spent by
 * flying it** (SURFACE §7). The four sockets the page draws itself — 🪶 ✒️
 * 🛡️ 🏛️, every one of them shown to everybody from the start and struck
 * until its grant is acknowledged (Q532) — the one table of sentences feeding
 * both the tooltip and the bubble a press opens, the wallet farewell and the
 * grant’s landing, and the hold ladder: which wallet a commit spends from,
 * the click guard, the flight out and the nudge home.
 *
 * `make(env)` is called by the page where the first of the two regions
 * stood, so the pointer listeners keep their order among the page’s own and
 * the spend-probe still registers after session.js’s. `cs` is an accessor,
 * being reassigned by the page at boot; everything else arrives as a value
 * or as a page-made wrapper read when called.
 *
 * The flags go back as properties rather than names, because four of them
 * are read and two written from outside: `penHold` is what both polls
 * defer on (nothing rebuilds under a press), so a copy taken at `make` time
 * would silently stop deferring.
 *
 * Load order: after session.js and the other splits, before the inline
 * script that makes it.
 */
window.WALLETS = (function () {
  function make(env) {
    const { S, SESSION, PW_KEYS, HOLD_MS, LIVESLUG, LIVEMODE } = env;
    const { ackPersists, amFounder, charterOn, csState, esc, isStranger, mayPen, mayPropose,
      mayShield, mayVoice, penLocks, pwState, shieldLocks, signedClose, viewerId, viewerIsMember } = env;
    // the drawn glyphs (Q1401): a socket's tool is a picture from the one set,
    // and `glyphTextOf` is how the hold ladder still reads which glyph a
    // commit carries now that the character is no longer in the button's text
    const { glyphHtml, glyphify, glyphTextOf } = window.CARDS;
    // ---- the wallet family (Q444–448, 453, 458, 461; 2026-08-21) -----------
    // 🪶 top left: four feathers at the birth, one spent per founding act
    // (title, link, the mail), the fourth permanent and the logo. ✏️ ✒️ 🛡️ 🏛️
    // on the right, every socket shown to everybody from the start (Q532) and
    // struck until its grant is acknowledged — a power you were never asked
    // for arrives by a task, never by itself. A clerk holds nothing but 🪶
    // (Q458: a clerk's only power is to found something else), so their
    // other four sockets stay struck.
    let quillGhost = false, penGhost = false, shieldGhost = false, voiceGhost = false, stormHolding = false;
    let pendingGrant = null;
    const heldMotion = () => {
      if (!env.cs) return false;
      if (env.cs.isRemote) return !!(env.cs.v && env.cs.v.view && env.cs.v.view.myHeldMotion);
      const me2 = viewerId();
      return [...env.cs.motionRecords().values()].some((m) => m.by === me2 && m.status === 'running');
    };
    function renderPowerWallets() {
      const q = document.getElementById('quill');
      const spent = env.cs ? 3 : (S.seen.has('title') ? 1 : 0) + (S.seen.has('slug') ? 1 : 0) + (S.emailSent ? 1 : 0);
      const left = 4 - Math.min(3, spent);
      // on a phone the quill is one feather and its number, as the ✏️ wallet
      // is one pencil and its number (Q1351): the flight finds `#quill i`
      // either way, and the one feather that remains after the founding is
      // the logo on both widths
      const qh = SESSION.narrow()
        ? '<i' + (quillGhost ? ' class="gone"' : '') + '>' + glyphHtml('🪶') + '</i>' + (left > 1 ? '<span class="pmore">' + left + '</span>' : '')
        : Array.from({ length: left }, (_, i) =>
          '<i' + (quillGhost && i === left - 1 ? ' class="gone"' : '') + '>' + glyphHtml('🪶') + '</i>').join('');
      if (q.innerHTML !== qh) q.innerHTML = qh;
      const notApp = S.viewer !== 'applicant' && !isStranger() &&
        // after the farewell the wallets are gone (a reader arriving after the
        // close, or one who has signed, never sees them)
        !(env.cs && env.cs.closed && (farewellDone || signedClose() || !viewerIsMember()));
      const pen = document.getElementById('penwallet');
      const showPen = notApp && mayPen();
      // **✒️∞ — the pen wallet says how many, and the answer is not one** (Ed,
      // 2026-08-22). A single ✒️ standing where a row of ✏️s stands reads as a
      // quantity of one, which is exactly the scarcity a pen does not have: it is
      // perpetual and never spent, and a founder who thinks they are about to use
      // theirs up will not use it. The ∞ goes in the **count slot** rather than
      // beside the pen as a second token, because that is what this row already
      // means by the position — `✏️✏️✏️+5` is the same sentence with a number in
      // it — and because a token is a thing that can fly and a count is not.
      // `.pmore` therefore, never an `<i>`: `holdWallet` and the flight both find
      // their pen with `#penwallet i`, and a second `<i>` would be picked up as
      // the last one drawn and flown to the button instead.
      //
      // **The text infinity, not the emoji ♾️** (Ed, 2026-08-22). `.pmore` is
      // `font-weight: 700; color: var(--fg)`, and a text character takes both —
      // so ∞ is the same object as `+5`, set in the same ink at the same weight,
      // which is the whole of what makes it read as a count. The emoji renders as
      // a coloured picture with its own design in every font and would have stood
      // beside the pen as a second *glyph*, which is the one thing this must not
      // say. It also cannot be anybody's face, being no kind of pictograph, so
      // the reserved-emoji lists do not move.
      // wrapped in `.pencils` like the ✏️ row, so the glyph and its count are one
      // object at the same 1px gap rather than two children of the wallet's own
      // 6px one — the pen and its ∞ are a single statement, not two things
      const penh = '<span class="pencils"><i' + (penGhost ? ' class="gone"' : '') + '>' + glyphHtml('✒️') + '</i>' +
        // in flight the whole wallet goes quiet: a lone ∞ counts nothing
        '<span class="pmore' + (penGhost ? ' gone' : '') + '">∞</span></span>';
      // **The socket is always there; the slash says whether the tool is yours**
      // (Q532, Ed 2026-08-22: *give all of the wallets to all users at the
      // beginning, and explicitly show that empty ones are empty; the topbar is a
      // toolbar, and tools are added and taken away depending on what's
      // happening*). A wallet you did not hold used to be an empty element that
      // `:empty` hid, so the ladder of powers was visible only to somebody who
      // already held all of it. Now every socket renders its own tool and a
      // reader can see what their role can do — *nothing* included.
      //
      // **…and the closed page too** (Ed, 2026-09-08, Q1286 (b): *all sockets
      // should show at all times; empty sockets show with a strikethrough. We
      // show the sockets to educate the user on what the different powers are*).
      // After the farewell every tool is gone, so every socket stands struck —
      // the same row a stranger sees. Until this date the closed page hid the
      // sockets outright (`gonewallet`, the residual on Q532), retired here.
      const gone = env.cs && env.cs.closed && (farewellDone || signedClose() || !viewerIsMember());
      const socket = (el, held, inner, glyph) => {
        const h = held && !gone ? inner : '<i>' + glyphHtml(glyph) + '</i>';
        // the idempotent write the quill has always had, extended to the rest
        // (Q531): these strings almost never change, and rewriting identical
        // markup every render destroys any animation running on the token —
        // which is why `.navbar .quill i`'s own 240ms transition could never run
        // here, and what the spend-preview would have stuttered against.
        if (el.innerHTML !== h) el.innerHTML = h;
        el.classList.toggle('notheld', gone || !held);
      };
      socket(pen, showPen, penh, '✒️');
      // 🛡️ joins the toolbar (Q532(3)). It is the pen's other half and behaves
      // like it in every way that shows: one shield, many locks, never spent —
      // so it takes the ∞ too. What it does is the opposite of the pen: the pen
      // writes, the shield only refuses.
      const shield = document.getElementById('shieldwallet');
      const showShield = notApp && mayShield();
      socket(shield, showShield,
        '<span class="pencils"><i>' + glyphHtml('🛡️') + '</i><span class="pmore">∞</span></span>', '🛡️');
      const voice = document.getElementById('voicewallet');
      const out = heldMotion();
      const showVoice = notApp && mayVoice();
      socket(voice, showVoice, '<i' + (out || voiceGhost ? ' class="gone"' : '') + '>' + glyphHtml('🏛️') + '</i>', '🏛️');
      // one sentence per socket, from one table, in both channels: the tooltip a
      // pointer gets and the bubble a press gets say exactly the same thing
      [q, pen, shield, voice].forEach((el) => { if (el) el.title = SAY(el).t; });
      // the ✏️ socket is rendered by session.js, which rewrites its own title on
      // every drip tick — so its sentence goes in through the seam rather than
      // being set here and overwritten a second later
      const pwEl = document.getElementById('wallet');
      if (pwEl) SESSION.setWalletTitle(SAY(pwEl).t);
      // the spend-preview is render state like the ghosts above it, so every
      // wallet render has to hand it back to whichever token now stands in the
      // slot — see `applyLean` in session.js for why it cannot be a CSS rule
      SESSION.applyLean();
      if (sayFor && sayFor.isConnected) showSay(sayFor);
    }

    // ---- the socket's speech bubble (Q532, Ed 2026-08-22) --------------------
    // *If you click on the wallet, we can have a speech bubble that explains what
    // it means.* The wallets already carried that sentence in a `title`, which is
    // a tooltip: it wants a pointer that hovers, it cannot be read on a touch
    // screen, and it is the browser's furniture rather than this surface's. The
    // bubble reads the socket's own `title`, so there is **one** piece of copy per
    // tool feeding both channels — two would drift, and the not-held sentence is
    // the one that most needs to be readable, since it is the answer to *why is
    // this one crossed out*.
    // **What a socket says: the symbol, then the verb** (Ed, 2026-08-22: *don't
    // name the item — just have the symbol, larger than in the wallet, and then
    // explain what it is using the verb; keep the language as clear and
    // functional as possible, using verbs and nouns that relate to concrete
    // things on the page*). So no *"The shield."* opening — naming a thing is not
    // explaining it, and the glyph has already said which one this is. Each
    // sentence starts with **who can do what**, and every noun in it is something
    // the reader can point at: the document, the settings, a ✒️ tab, the
    // membership, an address.
    //
    // Held and not-held are different sentences, and the difference is the
    // subject. Holding it, the sentence is about **you** and says what it costs
    // and what comes back. Not holding it, the sentence names **who can** — which
    // answers the question a struck-through tool actually raises, and does it
    // without a word of apology.
    //
    // One table, both channels: the bubble draws it, and the tooltip is the same
    // sentence, so the two can never drift.
    const SAY = (el) => {
      const k = el.id;
      if (k === 'quill') {
        const spent = env.cs ? 3 : (S.seen.has('title') ? 1 : 0) + (S.seen.has('slug') ? 1 : 0) + (S.emailSent ? 1 : 0);
        const left = 4 - Math.min(3, spent) - 1;
        return { g: '🪶', t: left > 0
          ? 'You can name this document, choose its address and verify your email. Each one spends a feather. The last feather stays, and starts a new document.'
          : 'You can start a new document.' };
      }
      if (k === 'wallet') {
        return { g: '✏️', t: (charterOn() && mayPropose())
          ? 'You can propose changes to the text. A ✏️ comes back if the membership passes yours, and more arrive as the document runs.'
          : 'Members can propose changes to the text, once the document has begun.' };
      }
      if (k === 'penwallet') {
        return { g: '✒️', t: mayPen()
          ? 'You can change ' + penLocks() + (penLocks() === 1 ? ' setting' : ' settings') + ' yourself, without asking anybody. Each setting’s ✒️ tab says whether you can.'
          : 'The Founder can change some settings without asking anybody, where they have kept Founder Actions.' };
      }
      if (k === 'shieldwallet') {
        return { g: '🛡️', t: mayShield()
          ? 'You can refuse a change the membership passes on ' + shieldLocks() + (shieldLocks() === 1 ? ' setting' : ' settings') + '. Nothing changes there until you accept it.'
          : 'The Founder can refuse a change the membership passes, where they have kept the Founder Veto.' };
      }
      if (k === 'voicewallet') {
        return { g: '🏛️', t: !mayVoice()
          ? 'Any member can propose a constitutional change 🏛️; all members must agree for it to pass.'
          : heldMotion()
            ? 'You are asking all members to agree to a constitutional change. This comes back when that question settles, or when you withdraw it.'
            : 'You can ask all members to agree to a constitutional change. One question at a time.' };
      }
      return { g: '', t: el.title || '' };
    };
    let sayEl = null, sayFor = null;
    function showSay(el) {
      if (!sayEl) { sayEl = document.createElement('div'); sayEl.className = 'walletsay'; document.body.appendChild(sayEl); }
      sayFor = el;
      // the quill is also the logo, and its link is the one capability a bubble
      // over it would swallow — so the navigation moves *inside* the bubble
      // rather than being lost. It is safer there anyway: a founder mid-birth
      // who clicked the mark used to be navigated away from their own document.
      const s = SAY(el);
      // the symbol, bigger than it is in the socket — in the wallet it is a
      // token in a row and here it is the subject of the sentence beside it
      sayEl.innerHTML = '<span class="saysym">' + glyphHtml(s.g) + '</span><span class="saytxt">' + glyphify(esc(s.t)) +
        (el.id === 'quill' ? '<br><a class="doclink" href="/">Start a new document</a>' : '') + '</span>';
      const r = el.getBoundingClientRect();
      // clamped to the window, with the nib following the socket rather than the
      // box — a bubble pushed off a right-hand wallet must still point at it
      const w = Math.min(264, window.innerWidth - 16);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      sayEl.style.left = left + 'px';
      sayEl.style.top = (r.bottom + 9) + 'px';
      sayEl.style.setProperty('--nib', Math.max(8, Math.min(r.left + r.width / 2 - left - 5, w - 18)) + 'px');
      requestAnimationFrame(() => sayEl && sayEl.classList.add('in'));
    }
    function hideSay() {
      sayFor = null;
      if (!sayEl) return;
      const el = sayEl; sayEl = null;
      el.classList.remove('in');
      setTimeout(() => el.remove(), 180);
    }
    document.addEventListener('click', (ev) => {
      const w = ev.target.closest && ev.target.closest('.navbar .wallet, .navbar .quill');
      if (w) {
        // the quill's own navigation lives in the bubble now
        if (w.id === 'quill') ev.preventDefault();
        if (sayFor === w) hideSay(); else showSay(w);
        return;
      }
      if (sayEl && !ev.target.closest('.walletsay')) hideSay();
    });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && sayEl) hideSay(); });
    window.addEventListener('resize', hideSay);
    // `?slash=muted` — the same toolbar with the strike in the surface's own
    // muted ink rather than red, so the two can be looked at side by side. The
    // same shape as the stranger's door's `?bars=black`: an experiment you can
    // see rather than an argument you have to have.
    if (new URLSearchParams(location.search).get('slash') === 'muted') document.documentElement.dataset.slash = 'muted';
    // the wallet farewell (Q468): from the OK that signed, the ✏️s and the 🏛️
    // fly into the card — the storm inverted — and the Founder's ✒️ leaves the
    // same way; the wallets are gone after
    let pendingFarewell = null;
    function launchFarewell() {
      if (!pendingFarewell) return;
      const to = pendingFarewell; pendingFarewell = null;
      const w = document.getElementById('wallet');
      if (w && w.offsetParent) {
        const n = env.cs && env.cs.isRemote && env.cs.v ? Math.floor(env.cs.v.wallet || 0) : (SESSION.editsHeld || 0);
        SESSION.pencilStorm(w.getBoundingClientRect(), to, Math.max(n, 2), () => {});
      }
      // the shield leaves with the pen (Q621 (a), 2026-08-22): it is a power
      // held like the others, so it flies out like them
      for (const [id, glyph] of [['voicewallet', '🏛️'], ['penwallet', '✒️'], ['shieldwallet', '🛡️']]) {
        const el = document.querySelector('#' + id + ' i');
        if (el) SESSION.flyGlyph(glyph, el.getBoundingClientRect(), to, 640, { r0: 0, r1: 25 });
      }
      setTimeout(() => { farewellDone = true; renderPowerWallets(); SESSION.renderWallet(); }, 700);
    }
    let farewellDone = false;
    // **A grant says who gave it** (Ed, 2026-08-21: *when I get a power, the
    // acknowledgement card should say who gave it to me*). A power arriving
    // unattributed reads as weather — something that happened to you — when in
    // fact somebody performed an act that conferred it, and knowing whose act
    // it was is most of what tells you whether it can be taken back.
    //
    // The sentence is in the constitution's own register: **third person, and
    // the office rather than the name**. Every other clause on this surface
    // says *The Founder*, the role is what acted, and it sidesteps §9.0c's
    // Anonymous — which is a rule about how a person appears in the membership,
    // not about how an office is named in a sentence.
    // **Read, not inferred** (Q524, Ed 2026-08-21: *worth building!*). The
    // module now folds a per-member arrival record and a per-power source from
    // events it already had, so these sentences state what happened rather than
    // reconstructing it from who currently holds the roster — which was a guess
    // that went wrong exactly when the roster changed hands after somebody
    // arrived.
    const myArrival = () => { try {
      const rec = env.cs && env.cs.memberRecords && env.cs.memberRecords().get(viewerId());
      return (rec && rec.arrival) || null;
    } catch (e) { return null; } };
    // where the founder's pen came from: 'motion' if any setting they hold it on
    // was handed back by the room, otherwise the birth
    // where a founder's power came from: 'motion' if any setting they hold it on
    // was handed back by the room, otherwise the birth. One function for both
    // halves of the pair, since the only difference is which power is read —
    // `powerFrom` carries the two separately and always has.
    const powerFrom = (half) => { try {
      return PW_KEYS.some((k) => { const st = pwState(k);
        return st && st.powers && st.powers[half] &&
          st.powerFrom && st.powerFrom[half] === 'motion'; }) ? 'motion' : 'founding';
    } catch (e) { return 'founding'; } };
    const penFrom = () => powerFrom('unilateral');
    const grantedBy = (c) => {
      if (!c.open()) return '';                    // nothing has been conferred yet
      // **The founder is not told they founded the document** (Ed's card
      // review, 2026-09-02): the *You founded this document, and X came with
      // it.* sentences are cut on all three grants. A power that arrived by
      // somebody else's act keeps its provenance — that is E8's news value.
      if (c.k === 'grant-pen') {
        return penFrom() === 'motion'
          ? 'The membership returned Founder Actions to you.' : '';
      }
      if (c.k === 'grant-shield') {
        return powerFrom('assent') === 'motion'
          ? 'The membership returned the Founder Veto to you.' : '';
      }
      if (c.k === 'grant-voice') {
        const a = myArrival();
        const via = a ? a.via : (amFounder() ? 'founding' : 'invitation');
        if (via === 'founding') return '';
        if (via === 'application') {
          return 'The membership admitted you on your application, and Constitutional Proposals came with it.';
        }
        return (a && a.by === 'members')
          ? 'The membership agreed to invite you, and Constitutional Proposals came with it.'
          : 'The Founder invited you into the membership, and Constitutional Proposals came with it.';
      }
      // 💡 and ⚖️ both open at 🍾, which is always the founder's own press
      if (c.k === 'canpropose') return 'The Founder began the document, granting every member the right to propose changes to it.';
      if (c.k === 'canjudge') return 'The Founder began the document, granting every member the right to vote on what is proposed.';
      return '';
    };
    // The provenance goes **first on the card**, above the explanation of what
    // the power is: what happened, then what it means, then what to do about
    // it. Below `gateBody` it landed after *OK files it and it leaves your
    // queue*, so the card gave its closing instruction and then said something
    // the reader still had to take in.
    const grantProv = (c) => {
      const from = grantedBy(c);
      return from ? '<p class="setnote grantline">' + esc(from) + '</p>' : '';
    };
    // 💡's own count line (*You hold 5 ✏️s to propose with.*, Q1129) went with
    // the rest of the open gate's body at the card review (46, 2026-09-05) and
    // the cut stands (Q1195 (d), Ed 2026-09-09): the number lives in the ✏️
    // socket, where every power is kept (W1).
    // the grant's flight, after the render that took its card away
    function launchGrant() {
      if (!pendingGrant) return;
      const g = pendingGrant; pendingGrant = null;
      if (g.k === 'canpropose') {
        stormHolding = true;
        const w = document.getElementById('wallet');
        w.style.display = '';
        const to = w.getBoundingClientRect();
        w.style.display = 'none';
        const n = env.cs && env.cs.isRemote && env.cs.v ? Math.floor(env.cs.v.wallet || 0) : (SESSION.editsHeld || 0);
        // **A wallet must not depend on its own animation finishing.** The
        // storm hides the wallet so the pencils can fly into an empty one, and
        // hands it back in its completion callback — so anything that stops
        // that callback (a backgrounded tab, where rAF never fires; a
        // cancelled animation; reduced motion taking an unexpected path) hides
        // a power the member has just been granted, permanently and with no
        // way back. That is the *worst* failure this animation can have and it
        // was one missed callback away. The safety net runs the same
        // restoration on a timer well past the storm's own length; whichever
        // arrives first wins, and `done` makes the second a no-op.
        let done = false;
        const land = () => { if (done) return; done = true;
          stormHolding = false; w.style.display = ''; syncWallet(); SESSION.renderWallet(); };
        SESSION.pencilStorm(g.from, to, Math.max(n, 3), land);
        setTimeout(land, 4000);
        return;
      }
      // which socket this grant lands in. A table rather than the ternary pair
      // this was, because 🛡️ made it three and a ternary chain that has to agree
      // with itself three times in a row is a place two of them drift.
      const LANDS = {
        'grant-pen': { id: 'penwallet', g: '✒️', ghost: (v) => { penGhost = v; } },
        'grant-shield': { id: 'shieldwallet', g: '🛡️', ghost: (v) => { shieldGhost = v; } },
        'grant-voice': { id: 'voicewallet', g: '🏛️', ghost: (v) => { voiceGhost = v; } },
      };
      const L = LANDS[g.k];
      if (!L) return;
      L.ghost(true);
      renderPowerWallets();
      const slot = document.querySelector('#' + L.id + ' i') || document.getElementById(L.id);
      SESSION.flyGlyph(L.g, g.from, slot.getBoundingClientRect(), 640, { onLand: () => {
        L.ghost(false); renderPowerWallets(); } });
    }
    // **The hold ladder** (Q445c; Ed, 2026-08-21: 🪶 joins ✒️). A commit that
    // spends something out of a wallet is a **one-second hold**: the glyph
    // flies from the wallet to the button and the act lands when it arrives;
    // let go early and it flies home with nothing spent. The feather used to
    // fly on the click, which taught the animation without teaching the
    // gesture — and the birth is where a founder first learns that an act
    // costs something, so it is the last place the lesson should be optional.
    // A click with no pointer behind it (a key, a script) still acts at once.
    // The length is `HOLD_MS`, declared with the assembly above and read from
    // `SESSION.holdMs` — this page holds no hold duration of its own.
    //
    // which wallet a commit spends from — the quill before the save, the pen
    // after it. Nothing else on the surface commits out of a wallet.
    // A branch may carry its own length and floor (Q614, 2026-08-22), but since
    // backlog 206 no branch carries a length: **every hold is the one length**,
    // and what still differs from branch to branch is the *easing* and therefore
    // the quarter-way floor — 288ms for the pencil's bezier, 250 for the pen's
    // and the quill's `linear`, each of them the point at which its own curve
    // has covered a quarter of the way. `ms` and `floorAt` default to the pen's
    // where a branch says nothing.
    const holdWallet = (b) => {
      if (!b || b.disabled) return null;
      // **A motion's ✏️ Propose is a hold with the pencil flight** (Q614, Ed
      // 2026-08-22: the same act as the charter's Propose — it spends a ✏️ —
      // so it takes the same gesture: the last ✏️ flies from `#wallet` to the
      // button over the hold and the motion goes in when it lands). The
      // ghost is session.js's own wallet state (`setWalletGhost`), so the drip
      // cannot put the traveller straight back, and `mayPropose()` is asked
      // rather than the DOM (W13).
      if (b.matches('[data-putmotion]')) return env.cs && mayPropose() && document.querySelector('#wallet i')
        ? { g: '✏️', sel: '#wallet i', floorAt: 288, ghost: 'wallet',
          live: '.setupcard [data-putmotion]', r0: -24, r1: 0, easing: 'cubic-bezier(.45, .05, .3, 1)' }
        : null;
      if (!b.matches('[data-confirm]')) return null;
      if (!env.cs && /🪶/.test(glyphTextOf(b)) && document.querySelector('#quill i')) return { g: '🪶', sel: '#quill i' };
      // 🍾 has no wallet and never will (Q516: a wallet is a capacity you hold
      // and spend, and beginning is a moment that happens once) — but it is
      // held like every consequential act, and the cork flies **out of the
      // button into the document** rather than out of a balance into the
      // button. A pop, not a spend.
      // It lands on the document's **name**, and since backlog 33 the name
      // stands at the head of the prose column: the pre-save heading is hidden
      // from the save, and a selector list picks the first match in *document
      // order*, so `#doctitle, .doctitle` would have aimed the cork at a
      // display:none element with a rect of zeros — the top-left of the window.
      // Neither of these two can match it.
      if (env.cs && /🍾/.test(glyphTextOf(b))) return { g: '🍾', sel: null, to: '.doctitle.dochead, #charter .doctitle' };
      // **Asks whether the pen is held, not whether it is drawn** (Q532). This
      // used to test `document.querySelector('#penwallet i')` — the token's mere
      // presence — which was a true proxy only while an unheld wallet rendered
      // nothing. Now every socket draws its tool whether or not it is yours, so
      // that test would be permanently true: an unacknowledged pen would become a
      // working hold, and the guard that swallows a hold's trailing click reads
      // `isPenCommit(held)`, so its behaviour would have shifted with it. The
      // question was always *do you hold a pen*, and `mayPen()` is that question.
      if (env.cs && /✒️/.test(glyphTextOf(b)) && mayPen()) return { g: '✒️', sel: '#penwallet i' };
      return null;
    };
    let penHold = null, penHoldFired = false, penPointerDown = false, penNudge = null;
    const isPenCommit = (b) => !!holdWallet(b);
    // **What a click on a wallet commit means, one rule per gesture** (backlog
    // 184). Both click sites — the `[data-putmotion]` branch and the general one
    // above `[data-confirm]` — ask this and nothing else, so the two can never
    // drift apart. It answers `'act'` (fall through and commit), `'swallow'`
    // (this click is not an act) or `'started'` (the click was the gesture and a
    // flight is now in the air; nothing acts yet).
    const penClickGuard = (x) => {
      if (SESSION.gesture === 'hold') {
        // today's rule, unchanged: a press let go early, or the trailing click
        // of a completed hold, is swallowed; the hold's own synthetic click
        // (`penHoldFired`) and a pointerless click act at once
        if (isPenCommit(x) && !penHoldFired && penPointerDown) { penPointerDown = false; return 'swallow'; }
        return 'act';
      }
      // (a) the flight's own synthetic click, fired by the timer when the token
      // lands. This is the act, and the only click under this gesture that is.
      if (penHoldFired) return 'act';
      // (b) a flight is in the air — for this control or any other wallet
      // commit — so this is the second half of a double click, or an impatient
      // press. Nothing happens, and the pointer flag goes with it.
      if (penHold) { penPointerDown = false; return 'swallow'; }
      // (c) the click is the gesture. The flag is consumed here, so it cannot
      // leak into the next click.
      if (isPenCommit(x) && penPointerDown) {
        penPointerDown = false;
        startPenFlight(x, holdWallet(x));
        return 'started';
      }
      // (d) no pointer behind it — a key, a script, `card-audit`'s `clickIn` —
      // and it acts at once, exactly as it does under hold.
      return 'act';
    };
    // **The spend-preview** (Q531): hovering a commit that spends leans the token
    // that will pay toward the button it will fly to. Gated on `holdWallet`, so
    // the preview and the hold can never disagree about whether this press costs
    // anything — an unaffordable or disabled commit previews nothing, and the two
    // glyphs without a wallet fall out for free: 🏛️ has no branch there at all,
    // and 🍾's returns `sel: null`, because beginning is a moment rather than a
    // capacity you hold (Q516).
    const leanPickFor = (w) => () => [...document.querySelectorAll(w.sel)].pop();
    SESSION.addSpendProbe((t) => {
      const b = t && t.closest && t.closest('[data-confirm], [data-putmotion]');
      const w = holdWallet(b);
      return w && w.sel ? { btn: b, pick: leanPickFor(w) } : null;
    });
    // **The flight, lifted out of the press that used to be its only start**
    // (backlog 184). Under `hold` the pointerdown listener below calls this, as
    // it always did; under `click` the click guard does, and nothing about the
    // flight itself — its length, its floor, its easing, its id-resolving timer
    // — is different between the two.
    function startPenFlight(b, w) {
      // a press begins: the token is about to leave for real, and any previous
      // token still on its way home is no longer the one being spent
      SESSION.stopLean();
      if (penNudge) { penNudge.cancel(); penNudge = null; }
      // the feather leaves from the last one in the row, as it always has; the
      // cork leaves from the button and lands in the document
      const src = w.sel ? [...document.querySelectorAll(w.sel)].pop() : b;
      const dst = w.to ? (document.querySelector(w.to) || b) : b;
      const from = (src || b).getBoundingClientRect();
      const to = dst.getBoundingClientRect();
      // **The fallback below may only find the card the press was made on.**
      // Under `hold` the pointer is on the button for the whole flight, so the
      // open card cannot change under it and the fallback always re-finds the
      // same card's commit. Under `click` the user is free for the length of the
      // flight: open another card and the first card's button is destroyed by
      // the render, so an unguarded fallback would click *the new card's*
      // commit and land the act on a decision nobody asked for.
      const openAt = S.open;
      b.classList.add('penholding');
      // inert while the token is in the air, and **never `disabled`**: the
      // timer's `live.click()` on a disabled button is a silent no-op, which is
      // the exact bug shape of 2026-08-22 (backlog 184)
      b.setAttribute('aria-disabled', 'true');
      if (w.g === '🪶') quillGhost = true; else if (w.g === '✒️') penGhost = true;
      else if (w.ghost === 'wallet') SESSION.setWalletGhost(true);
      renderPowerWallets();
      const ms = w.ms || HOLD_MS;
      const flight = SESSION.flyGlyph(w.g, from, to, ms,
        { r0: w.r0 ?? -30, r1: w.r1 ?? 0, easing: w.easing || 'linear' });
      penHold = { b, w, flight, timer: setTimeout(() => {
        penHold = null; penHoldFired = true;
        b.classList.remove('penholding'); b.removeAttribute('aria-disabled');
        penGhost = false; quillGhost = false;
        if (w.ghost === 'wallet') SESSION.setWalletGhost(false);
        // penPointerDown stays true on purpose: the real click that arrives on
        // pointerup is the trailing half of this same press, and the guard
        // above swallows it
        //
        // **The press outlives the button** (Ed's live walk, 2026-08-22: *I
        // still haven't managed to get all the way from founding a document to
        // proposing an amendment*). `b` is captured at pointerdown, a second
        // before this runs, and the live page re-renders the whole band on its
        // 4s poll — so a poll landing inside the hold replaces the button and
        // leaves `b` detached. A click on a detached element never reaches the
        // `document` listener that commits, so the act **vanished in silence**:
        // no command, no error, the card simply sitting there as though the
        // press had not happened. Deterministic in a harness, and for a person
        // a different card every time, which is what made it so hard to
        // report. The hold belongs to the open card, not to one DOM node, so
        // it re-finds the live commit control when its own has gone.
        const live = b.isConnected ? b
          : S.open !== openAt ? null
          : w.live ? document.querySelector(w.live)
          : (document.querySelector('.setupcard .commitrow [data-confirm]') ||
             document.querySelector('.setupcard [data-confirm]'));
        try { if (live) live.click(); } finally { penHoldFired = false; }
        renderPowerWallets();
      }, ms) };
    }
    document.addEventListener('pointerdown', (ev) => {
      const b = ev.target.closest && ev.target.closest('[data-confirm], [data-putmotion]');
      const w = holdWallet(b);
      if (!w || ev.button !== 0) {
        // a press that lands anywhere else clears the flag, because under
        // `click` a stale true would turn the *next* pointerless click on a
        // wallet commit into a flight instead of the act it is (backlog 184)
        if (ev.button === 0 && SESSION.gesture === 'click') penPointerDown = false;
        return;
      }
      // **The flag is the pointer, in both positions.** It is what tells a
      // click made with a pointer from a pointerless one (a key, a script,
      // `card-audit`'s `clickIn`), and a pointerless click acts at once whatever
      // the gesture is. Under `click` that is the whole of the press: nothing
      // starts here, and the click that follows is the gesture.
      penPointerDown = true;
      if (SESSION.gesture === 'hold') startPenFlight(b, w);
    });
    // **Let go early and the token comes home** (Q531). It used to be deleted
    // where it stood — `flight.cancel()` removes the glyph outright — so a tap on
    // ✒️ or 🪶 made a feather appear near the wallet and vanish, which is no
    // motion at all on the two buttons a founder meets first. Now it flies back
    // along its own arc, and never travels less than a quarter of the way out
    // first, so a press too short to be a hold is still unmistakably a press.
    //
    // Two things this has to get right. The ghost is cleared **when the token
    // lands**, not here: clearing it now would draw the pen back in the wallet
    // while a copy of it was still in the air. And `penHold` is nulled first and
    // unconditionally, because `pointercancel` follows `pointerup` on touch and
    // the early return at the top is what stops the second one starting a second
    // return flight.
    //
    // Load-bearing, and not obviously: the ghost is a **`visibility` ghost** —
    // `.gone` hides the token and keeps its box (system.css) — and it must never
    // become a removal or an omitted element. `holdWallet` tests for the token's
    // *existence*, and the guard that swallows the trailing click of a hold is
    // `isPenCommit(held) && ...`; if the token left the DOM during the return
    // flight, that guard would stop firing and an early release would commit the
    // act with no hold at all.
    const penRelease = () => {
      // **Under `click` there is no release** (backlog 184): letting go is not
      // part of the gesture, so nothing here cancels and the flight's own timer
      // is its only end. W16 governs the hold position.
      if (SESSION.gesture !== 'hold') return;
      if (!penHold) return;
      const { b, w, flight } = penHold;
      clearTimeout(penHold.timer);
      penHold = null;
      b.classList.remove('penholding'); b.removeAttribute('aria-disabled');
      penNudge = SESSION.nudgeHome(flight, { floorAt: w.floorAt || 250, onDone: () => {
        penNudge = null;
        penGhost = false; quillGhost = false;
        if (w.ghost === 'wallet') SESSION.setWalletGhost(false);
        renderPowerWallets();
        // the token is back in the wallet, so it may start straining again —
        // but only if the pointer never left the button that was asking
        SESSION.resumeLean(b);
      } });
    };
    document.addEventListener('pointerup', penRelease);
    document.addEventListener('pointercancel', penRelease);
    // a grant's OK survives a reload: one key per document and seat, like readSeals
    const grantsKey = () => 'draft:grants:' + LIVESLUG + ':' + ((env.cs && env.cs.v && env.cs.v.me) || '');
    const loadGrants = () => { try { return JSON.parse(localStorage.getItem(grantsKey()) || '[]'); } catch (e) { return []; } };
    const saveGrants = () => { if (!LIVEMODE) return;
      try { localStorage.setItem(grantsKey(), JSON.stringify([...S.okd].filter(ackPersists))); } catch (e) { /* private mode */ } };
    // what the wallet holds, from the view — the rules from the rate setting
    function syncWallet() {
      if (!LIVEMODE || !env.cs || !env.cs.v) return;
      const rs = csState('rate');
      const rv = (rs && rs.value) || {};
      // the engine's balance accrues by the minute, so it is fractional: the
      // whole part is what you can spend, the fraction how far the next has got
      const bal = env.cs.v.wallet == null ? 0 : env.cs.v.wallet;
      // the clock rides the view (Q503a): how long until the next ✏️ lands and
      // the interval it runs on, so the tray says *when* from the server's own
      // numbers and nothing when the document does not drip
      const wi = env.cs.v.walletInfo || {};
      const drips = wi.dripIntervalMs != null && wi.nextDripInMs != null;
      const frac = drips ? Math.max(0, Math.min(1, 1 - wi.nextDripInMs / wi.dripIntervalMs)) : (bal - Math.floor(bal));
      SESSION.setWallet({ held: Math.floor(bal), toNext: frac,
        dripSeconds: drips ? wi.dripIntervalMs / 1000 : null,
        rules: { grant: rv.grant ?? 4, cap: wi.cap ?? rv.cap ?? 8, stake: 1 } });
      SESSION.setRoom({ E: env.cs.E(), floor: env.cs.v.floor });
    }

    return {
      renderPowerWallets, syncWallet, launchGrant, launchFarewell, grantProv,
      saveGrants, loadGrants, penClickGuard,
      // the flags the page reads and writes. `penHold` is the one that must
      // be a property and not a name: both polls defer while it is set, and a
      // value copied out at make time would leave a poll free to rebuild the
      // control a hold has captured.
      get penHold() { return penHold; },
      get penHoldFired() { return penHoldFired; },
      get penPointerDown() { return penPointerDown; },
      set penPointerDown(v) { penPointerDown = v; },
      get stormHolding() { return stormHolding; },
      get farewellDone() { return farewellDone; },
      get pendingFarewell() { return pendingFarewell; },
      set pendingFarewell(v) { pendingFarewell = v; },
      get pendingGrant() { return pendingGrant; },
      set pendingGrant(v) { pendingGrant = v; },
    };
  }
  return { make };
})();
