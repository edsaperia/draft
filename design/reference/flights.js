/**
 * design/flights.js — the flights and the ✏️ wallet (lifted out of
 * session.js as refactor Q1352 (h), 2026-09-14).
 *
 * **Every power is an object you hold, spent by flying it** (Q444, SURFACE
 * §7): the bowed arc a glyph travels (`arcFrames`), the flights over it — the
 * refund home, `flyGlyph` for any glyph between any two rects, `nudgeHome`'s
 * quarter-way floor and the grant’s `pencilStorm` — the ✏️ socket’s own
 * renderer with the three pieces of render state it draws from, and the
 * spend-preview (Q531) with the probe seam both surfaces register against.
 *
 * `make(env)` is called by session.js where this code stood. The five names
 * it reads out of that file are all reassigned after load — `walletEl` at
 * init, `editsHeld` and `editsToNext` by the drip and every spend,
 * `EDIT_RULES` and `closedMode` by `setWallet` and `setClosed` — so each
 * arrives as an accessor read at call time rather than a value copied in.
 * `walletGhost` goes the other way: `flyStart`/`flyStop` stayed behind with
 * the propose hold and still set it raw, so it comes back as a settable
 * property rather than only through `setWalletGhost`.
 *
 * Load order: before session.js, which calls `make` as it is evaluated.
 */
window.FLIGHTS = (function () {
  function make(env) {
    const { REDUCED, NARROW, dripIn } = env;
    // The wallet: one glyph per edit you hold, and a tray under the next one
    // whose fill is how far the drip has got toward it. Spending removes a
    // pencil; the tray keeps whatever it had accrued, which is what makes the
    // two magnitudes legible as separate things.

    // **The arc.** A pencil crossing the room does not travel in a straight line,
    // and it does not travel the same line twice (Ed, 2026-08-17), so the flight
    // is a quadratic bowed off the straight run by a signed amount drawn fresh
    // each time — which side it swings and how far are the whole of the variation
    // and everything else about the journey is fixed. It has to be sampled into
    // keyframes because a shape that changes every flight cannot be a CSS rule.
    // The rotation runs alongside the curve rather than following it: an emoji has
    // its own axis, so a pencil steered by the path points its tip somewhere
    // different in every font.
    function arcFrames(a, b, r0, r1) {
      const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
      const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
      const len = Math.hypot(dx, dy) || 1;
      const side = Math.random() < 0.5 ? -1 : 1;
      const bow = len * (0.09 + Math.random() * 0.15) * side;
      const cx = dx / 2 - (dy / len) * bow, cy = dy / 2 + (dx / len) * bow;
      // **Sometimes it tumbles** (Ed, 2026-08-17): one turn in five flights, two in
      // twenty, three in a hundred. A rarity you cannot make happen is worth more
      // than one you can — the point is the flight you were not expecting, and a
      // pencil that spun every time would just be a pencil that spins. It turns
      // the way it was thrown, because the curve and the tumble come off the same
      // flick of the wrist, and the whole-turn count means it always lands in the
      // pose it would have landed in anyway.
      const r = Math.random();
      const spin = (r < 0.01 ? 3 : r < 0.06 ? 2 : r < 0.26 ? 1 : 0) * 360 * side;
      return Array.from({ length: 21 }, (_, i) => {
        const t = i / 20, u = 1 - t;
        return { transform: 'translate(-50%, -50%) translate(' +
          (2 * u * t * cx + t * t * dx).toFixed(1) + 'px, ' +
          (2 * u * t * cy + t * t * dy).toFixed(1) + 'px) rotate(' +
          (r0 + (r1 - r0 + spin) * t).toFixed(1) + 'deg)' };
      });
    }

    // **The refund, flying home.** Withdrawing hands the edit back in full (SPEC
    // §3.3a), and what comes back is the same object that paid — so it makes the
    // return journey, and the wallet holds at its old count until the pencil is
    // actually in it (Ed, 2026-08-17). It leaves in the pose it arrived in and
    // lands flat, which is the outbound tilt run backwards.
    //
    // Where it lands is measured by rendering the after-state, reading whichever
    // slot changed, and rendering the before-state back — two synchronous renders
    // with no paint between them, so the wallet never flickers forward. Which
    // slot changed is not always a new pencil: past four the wallet counts, and
    // there the landing is the counter itself ticking up.
    const REFUND_MS = 640;
    function refundFlight(from, before) {
      renderWallet();
      const grew = (env.editsHeld <= 4 ? env.editsHeld : 3) > (before <= 4 ? before : 3);
      const slot = grew ? [...env.walletEl.querySelectorAll('.pencils i')].pop()
                        : env.walletEl.querySelector('.pmore');
      const to = (slot || env.walletEl).getBoundingClientRect();
      walletShow = before;
      renderWallet();
      const land = () => { walletShow = null; renderWallet(); };
      const pencil = document.createElement('div');
      pencil.className = 'flypencil';
      pencil.textContent = '✏️';
      pencil.style.left = (from.left + from.width / 2) + 'px';
      pencil.style.top = (from.top + from.height / 2) + 'px';
      document.body.appendChild(pencil);
      const anim = REDUCED()
        ? pencil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: REFUND_MS, fill: 'both' })
        : pencil.animate(arcFrames(from, to, -24, 0),
            { duration: REFUND_MS, easing: 'cubic-bezier(.3, 0, .2, 1)', fill: 'both' });
      const done = () => { pencil.remove(); land(); };
      anim.onfinish = done;
      setTimeout(() => { if (pencil.isConnected) done(); }, REFUND_MS + 60);
    }
    // **One gesture, four currencies** (Q444, 2026-08-21): every power is an
    // object you hold, spent by flying it — so a feather, a pen and the
    // consensus voice travel the same bowed arc the pencil does. `flyGlyph`
    // is that arc for any glyph, between any two rects; `pencilStorm` is the
    // grant's flurry (Q442 b.ii): a decorative scatter of pencils from the
    // card you pressed OK on, resolving into the real count in the wallet.
    // Reduced motion: fade at the destination, no travel, same duration.
    function flyGlyph(glyph, from, to, ms, opts) {
      const o = opts || {};
      const el = document.createElement('div');
      el.className = 'flypencil' + (o.cls ? ' ' + o.cls : '');
      el.textContent = glyph;
      const start = REDUCED() ? to : from;
      el.style.left = (start.left + start.width / 2) + 'px';
      el.style.top = (start.top + start.height / 2) + 'px';
      document.body.appendChild(el);
      const anim = REDUCED()
        ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, fill: 'both' })
        : el.animate(arcFrames(from, to, o.r0 ?? -24, o.r1 ?? 0),
            { duration: ms, easing: o.easing || 'cubic-bezier(.3, 0, .2, 1)', fill: 'both', delay: o.delay || 0 });
      let finished = false;
      const done = () => { if (finished) return; finished = true; el.remove(); if (o.onLand) o.onLand(); };
      anim.onfinish = done;
      const fb = setTimeout(() => { if (el.isConnected) done(); }, ms + (o.delay || 0) + 80);
      // **A flight can be handed back** (Q531): a caller that means to bring the
      // glyph home rather than let it land has to take ownership first, because
      // both the `onfinish` above and the belt-and-braces timeout beside it will
      // otherwise remove the traveller at the landing moment — and a release at
      // 990ms of a 1000ms flight rewinds for another 250ms, well past it. So the
      // glyph would vanish in mid-air on exactly the presses this exists for.
      // `disarm` transfers that responsibility; `cancel` is unchanged and still
      // the right thing where the flight simply stops meaning anything.
      const disarm = () => { clearTimeout(fb); anim.onfinish = null; finished = true; };
      return { anim, el, disarm, cancel: () => { try { anim.cancel(); } catch (e) {} el.remove(); } };
    }
    // **A press always carries the token a quarter of the way** (Q531, Ed
    // 2026-08-22: *when someone just clicks and doesn't hold, the token jumps 1/4
    // the way towards the button, so that it's hard to miss that you're making
    // something happen*). Nobody realised these buttons had to be held, and the
    // reason is that a tap showed almost nothing: 80ms of a 1000ms flight is 8%
    // of the arc, and on the pen path the glyph was not even flown home — it was
    // deleted where it stood. So a release short of the floor is rounded **up**
    // to it.
    //
    // Three things this is careful about.
    //
    // **The floor is distance, not time.** "A quarter of the way" is ambiguous by
    // 60%: the pen flies `linear`, so a quarter of its duration is a quarter of
    // its arc, but the pencil flies `cubic-bezier(.45, .05, .3, 1)`, whose slow
    // start means a quarter of *its* duration is only 18% of the arc. Distance is
    // what the eye reads — there is no track on the surface, so nobody can
    // perceive a fraction of a duration at all — so each caller passes the
    // *time at which its own easing reaches a quarter of the way*: 250ms of 1000
    // for the pen, 288ms of 1000 for the pencil (the solve for that bezier —
    // 0.288 of the duration, whatever the duration is, which is why the floor
    // moved with the hold when every hold became one second, backlog 206).
    //
    // **It is a floor, not a jump.** `t >= floorAt` rewinds from where it got to,
    // so letting go at nine-tenths never snaps backwards to a quarter — which
    // would be a worse lie than the one below.
    //
    // **The push runs at a speed the hold cannot produce.** A fixed ~160ms flick
    // means the token is *thrown* rather than slid: from a standing start on the
    // pencil, whose floor is 288 of 1000, that is `minRate` exactly — 1.8x the
    // hold's own pace, the slowest a throw is allowed to be. (It was 5.4x while
    // the pencil ran for three seconds; the floor came down with the hold and
    // the rate floor is what holds the gesture up now.) This is the whole reason
    // the exaggeration is honest. Position on an arc is only a progress reading if
    // there is a scale to read it against, and there deliberately is none — so
    // what a viewer can perceive is departure, distance and return, not "this is
    // 25%". A floor on time in the air instead would be unimpeachable and
    // useless: 100ms of the pencil's easing is 3% of the arc, under 20px, which
    // is nothing at all at the corner of your eye.
    //
    // It takes an animation rather than a distance, which is what makes reduced
    // motion free: there the flight is an opacity fade, so a quarter of the way
    // is a quarter of a fade, and nothing here needs to know the difference.
    const nudgeHome = (flight, opts) => {
      const o = opts || {};
      const anim = flight && flight.anim, el = flight && flight.el;
      if (!anim || !el) { if (o.onDone) o.onDone(); return { cancel: () => {} }; }
      if (flight.disarm) flight.disarm();
      // `push` is the *longest* the throw may take and `minRate` the slowest it
      // may go, and the second is what makes it read as a throw. Measured on the
      // pen: a quarter of its arc is 250ms of a 1000ms flight, so covering the
      // last 150ms of that over a fixed 160ms push came out at **0.94x** — the
      // token drifting forward *slower* than the hold moves it, which is the
      // exact opposite of the point. A floor on the rate means the flick is
      // always a speed the hold itself cannot produce, on a pen press and a
      // pencil one alike, and the duration falls out of it.
      const rewind = o.rewind || 4, push = o.push || 160, hang = o.hang || 90, minRate = o.minRate || 1.8;
      const dur = Number((anim.effect && anim.effect.getTiming().duration) || 0) || 0;
      const floorAt = dur ? Math.min(o.floorAt || 0, dur) : (o.floorAt || 0);
      const t = Math.max(0, Number(anim.currentTime) || 0);
      let done = false, timers = [];
      const finish = () => {
        if (done) return;
        done = true;
        timers.forEach(clearTimeout);
        try { anim.cancel(); } catch (e) { /* already gone */ }
        el.remove();
        if (o.onDone) o.onDone();
      };
      // the reversal is the existing idiom — the flight run backwards along its
      // own arc rather than a second, straighter journey — and `onfinish` is
      // attached only once the rate is negative, or a forward push that happens
      // to reach the end would fire it early
      const reverse = (from) => { anim.playbackRate = -rewind; anim.play(); anim.onfinish = finish; return from / rewind; };
      let total;
      if (t >= floorAt) { total = reverse(t); }
      else {
        const rate = Math.max(minRate, (floorAt - t) / push);
        const pushMs = (floorAt - t) / rate;
        anim.playbackRate = rate;
        anim.play();
        // land exactly on the floor rather than wherever the rate has carried it,
        // then hold still, so the turn reads as a decision and not a bounce
        timers.push(setTimeout(() => { try { anim.currentTime = floorAt; anim.pause(); } catch (e) { /* gone */ } }, pushMs));
        timers.push(setTimeout(() => reverse(floorAt), pushMs + hang));
        total = pushMs + hang + floorAt / rewind;
      }
      // belt and braces on both paths, derived from the journey rather than a
      // literal: a document timeline is paused while the tab is hidden, so
      // `onfinish` can be arbitrarily late, and what must not happen is a wallet
      // left holding a gap for a token that is no longer in the air
      timers.push(setTimeout(finish, total + 80));
      return { cancel: finish };
    };
    const STORM_MS = 900;
    function pencilStorm(from, to, count, onLand) {
      const n = Math.max(1, Math.min(12, count));
      let landed = 0;
      for (let i = 0; i < n; i++) {
        // each pencil takes its own arc and its own moment, so the flurry reads
        // as a scatter rather than a queue
        flyGlyph('✏️', from, to, STORM_MS - 200 + Math.round(Math.random() * 300),
          { delay: Math.round(i * 70 + Math.random() * 40), r0: -40 + Math.random() * 80, r1: 0,
            onLand: () => { landed++; if (landed === n && onLand) onLand(); } });
      }
    }
    // **An edit in flight is drawn once.** Both flights hold the wallet at the
    // count that has not happened yet — outbound, the edit is not spent until it
    // lands (let go and it comes home), so the wallet keeps its five and leaves
    // the traveller's slot empty; inbound, it is not yours again until it lands,
    // so the wallet keeps its old count until the pencil arrives. Two pieces of
    // *render* state rather than a poke at the DOM, because the drip re-renders
    // the wallet every second and was putting the flying pencil back (Ed,
    // 2026-08-17).
    //   `walletShow` — draw this count instead of what is held (the refund's hold)
    //   `walletGhost` — draw the count, but leave the last slot empty (the spend's)
    //   `walletHeld` — whether this reader holds the power at all (Q532). Not the
    //     same question as how many they have: a member with an empty wallet still
    //     holds it and the drip is running, which is `.empty` and a countdown. This
    //     one is *your role does not include proposing* — a stranger, an applicant,
    //     a clerk, a member before the document begins or before they have accepted
    //     the grant — and it draws the tool struck through in its socket instead of
    //     hiding the socket, which is what the toolbar is for.
    //   `walletTitle` — the host's own sentence for this socket, if it has one.
    //     Since Q532 the page keeps one copy per tool feeding both the tooltip and
    //     the bubble a press opens, and this wallet is the one the page does not
    //     render itself — without a seam the drip would overwrite the page's
    //     sentence every second with this file's, and the two channels would
    //     disagree about the same tool.
    let walletShow = null, walletGhost = false, walletHeld = true, walletTitle = null;
    const setWalletHeld = (v) => { if (walletHeld !== !!v) { walletHeld = !!v; renderWallet(); } };
    // The ghost, for a hold this file does not run (Q614, 2026-08-22): the page's
    // `holdWallet` flies a ✏️ out of `#wallet` for a motion's Propose, and the
    // drip would put the traveller straight back unless the wallet is told its
    // last slot is in the air. Same rule as `flyStart` above — render state, set
    // for the hold and cleared when the token lands or flies home.
    const setWalletGhost = (v) => { if (walletGhost !== !!v) { walletGhost = !!v; renderWallet(); } };
    const setWalletTitle = (s) => { if (walletTitle !== s) { walletTitle = s; if (env.walletEl) env.walletEl.title = s || ''; } };
    function renderWallet(showAs) {
      // **Every socket shows at all times; a tool you do not hold is struck**
      // (Ed, 2026-09-08, Q1286 (b): *we show the sockets to educate the user on
      // what the different powers are*) — the closed page included: after the
      // farewell the ✏️ socket stands struck like every other, where it used to
      // empty into a bare pill (the `gonewallet` state, retired with this).
      if (!walletHeld || env.closedMode) {
        env.walletEl.className = 'wallet notheld';
        const nh = '<span class="pencils"><i>✏️</i></span>';
        if (env.walletEl.innerHTML !== nh) env.walletEl.innerHTML = nh;
        env.walletEl.title = env.closedMode ? '' : (walletTitle || '');
        applyLean();
        return;
      }
      const held = showAs != null ? showAs : (walletShow != null ? walletShow : env.editsHeld);
      const full = held >= env.EDIT_RULES.cap;
      env.walletEl.className = 'wallet' + (full ? ' full' : '') + (held === 0 ? ' empty' : '');
      env.walletEl.title = walletTitle || (held === 0
        ? 'No ✏️ left. Another arrives as the drip accrues; proposing costs one.'
        : 'Your ✏️s — proposing one costs ' + env.EDIT_RULES.stake +
          '. You hold ' + held + ' of a possible ' + env.EDIT_RULES.cap +
          (full ? ', which is the cap.' : '; the tray shows how far the drip has got toward the next.'));
      // **On a phone the wallet is one pencil and its number** (Q1351, Ed
      // 2026-09-12: *the icons without the sockets*): the four slots and the
      // drip tray are desktop width, and the top row has the title to keep.
      // The flights still find their token at `#wallet i`.
      if (NARROW()) {
        const nh = '<span class="pencils"><i' + (walletGhost ? ' class="gone"' : '') + '>✏️</i>' +
          '<span class="pmore">' + held + '</span></span>';
        if (env.walletEl.innerHTML !== nh) env.walletEl.innerHTML = nh;
        applyLean();
        return;
      }
      // The wallet draws at most four slots wide, and counts when it cannot fit
      // (Ed, 2026-08-17). Four held is four pencils, because "+1" costs exactly
      // the space it saves and reads as an abbreviation of nothing. Five is three
      // pencils and a +2 — the count takes a glyph's width, so the row stays the
      // same length whatever you hold, and a spend is always visible as a change
      // in the number even when it is not visible as a missing pencil.
      const drawn = held <= 4 ? held : 3;
      const rest = held - drawn;
      // The empty slot a flight leaves behind: hidden, not removed, so the row
      // does not close up around the gap and reopen when the pencil comes back.
      const gh = (i) => (walletGhost && i === drawn - 1 ? ' class="gone"' : '');
      // No label (Ed, 2026-08-17). A row of pencils next to a clock is not
      // ambiguous enough to need naming, and the words were the widest thing in
      // it; the title still says what it is for anybody who hovers.
      env.walletEl.innerHTML =
        '<span class="pencils">' +
        Array.from({ length: drawn }, (_, i) => '<i' + gh(i) + '>✏️</i>').join('') +
        (rest > 0 ? '<span class="pmore' + (walletGhost && !drawn ? ' gone' : '') +
          '">+' + rest + '</span>' : '') +
        // The countdown carries the drip's own wash: the fill *is* how far the
        // tenth has run, so the thing that says **when** and the thing that shows
        // **how far** are one object rather than two saying it twice. That
        // retires the ghost pencil, whose only job was the fraction. Drawn at the
        // cap too: the stylesheet hides it there (`.wallet.full .pwhen`), so
        // `full` is a class with a look and the socket table is true of the CSS
        // (Ed, 2026-09-08, Q1286 (d)).
        '<span class="pwhen" style="--fill: ' +
          (Math.max(0, Math.min(1, env.editsToNext)) * 100).toFixed(1) + '%">' + dripIn() + '</span>' +
        '</span>';
      applyLean();
    }

    // ---- spend-preview (Q531, Ed 2026-08-22) ---------------------------------
    // **Hover a button that spends, and the token that will pay leans toward it.**
    // Nobody was realising these buttons had to be held, and the surface's whole
    // explanation of the gesture lived *inside* it — a glyph crossing the air
    // between the wallet and the button, while the eye is on the button. So the
    // wallet says, before anything is pressed, *this one, and it is going over
    // there*: the token strains a few pixels along the run it would fly, and back,
    // over and over, like a thing on a leash.
    //
    // A lean rather than a glow or a ring because the wallet is 400–700px from the
    // pointer: peripheral vision is poor at colour and detail and good at motion,
    // and of the motions available only this one also says **where**.
    //
    // **Phase-locked, because the wallet is rebuilt under it.** Every wallet on
    // this surface rebuilds its own innerHTML wholesale — the ✏️ row every second
    // on the drip, the power wallets on every render — so the token wearing the
    // lean is a different element moments later and a CSS animation would restart
    // from frame one, visibly, every second. So the preview is *render state* like
    // `walletGhost` beside it: a flag naming the button, re-applied at the tail of
    // each render, and the new animation is given the old one's `startTime` on the
    // shared document timeline. Same phase, no seam, one number of state.
    //
    // **And it re-validates rather than trusting `pointerout`.** A button can be
    // removed from under the cursor — the card commits and closes, or a poll
    // replaces the row mid-hover — and a `pointerout` that never arrives would
    // leave a preview running for ever. Checking `:hover` on every render means a
    // missed exit self-corrects within one tick, structurally, which matters
    // because the ✏️ path re-binds its handlers on every render.
    const LEAN_MS = 900, LEAN_PX = 6;
    let leanBtn = null, leanPick = null, leanT0 = 0, leanAnim = null;
    // where the lean points: the straight run from the token to the button, not
    // the arc's own opening tangent — the flight's bow is drawn fresh each time
    // and swings either way (`arcFrames`), so there is no one arc it will fly,
    // and the chord is the honest average of all of them.
    function leanFrames(token, btn) {
      if (REDUCED()) return [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }];
      const a = token.getBoundingClientRect(), b = btn.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      const x = (dx / len * LEAN_PX).toFixed(1), y = (dy / len * LEAN_PX).toFixed(1);
      return [{ transform: 'translate(0, 0)' },
              { transform: 'translate(' + x + 'px, ' + y + 'px)' },
              { transform: 'translate(0, 0)' }];
    }
    // the token that would pay: the last one drawn, which is what every other
    // part of this already means by it — the slot the ghost empties and the rect
    // the flight measures from
    const payingToken = () => { try { return (leanPick && leanPick()) || null; } catch (e) { return null; } };
    function dropLean() {
      if (leanAnim) { try { leanAnim.cancel(); } catch (e) { /* gone */ } leanAnim = null; }
    }
    function applyLean() {
      if (!leanBtn) { dropLean(); return; }
      // the self-heal, and the one that matters: a card commits and closes, or a
      // poll replaces the row, and the button is gone from under the cursor with
      // no exit event to be had. Checked on every render, which for the ✏️ row is
      // every second, so a lost button cannot leave a preview running for ever.
      //
      // **Deliberately not `matches(':hover')`.** That was the first version and
      // it was wrong twice over: it is false in headless Chromium even with the
      // pointer parked on the button, so every harness would have been blind to
      // this feature — and more importantly, hover is a *paint* state to ask CSS
      // about, not a fact to hang correctness on. The pointer is over exactly one
      // element chain at a time, so a `pointerover` on anything that does not
      // spend is itself the proof it has left, and that is what ends a preview.
      if (!leanBtn.isConnected) { stopLean(); return; }
      const token = payingToken();
      if (!token) { dropLean(); return; }
      if (leanAnim && leanAnim.effect && leanAnim.effect.target === token) return;
      dropLean();
      leanAnim = token.animate(leanFrames(token, leanBtn),
        { duration: LEAN_MS, iterations: Infinity, easing: 'ease-in-out' });
      try { leanAnim.startTime = leanT0; } catch (e) { /* a timeline that will not take it */ }
    }
    function startLean(btn, pick) {
      if (leanBtn === btn) return;
      stopLean();
      leanBtn = btn; leanPick = pick;
      // the phase origin, kept across every rebuild for as long as this preview
      // lasts, so the lean carries on rather than starting again
      leanT0 = document.timeline.currentTime || 0;
      applyLean();
    }
    function stopLean() { leanBtn = null; leanPick = null; dropLean(); }
    // **One listener, and each surface says what spends.** Both halves of this
    // page have hold-commits with different rules — the charter's ✏️ Propose here,
    // the constitution's 🪶 and ✒️ commits in the page's own script — and a
    // listener each would fight: whichever ran second would see a control it did
    // not recognise and stop the preview the first had just started. So they
    // register a *probe* (a target → `{btn, pick}` or null) and one listener asks
    // each in turn. It is also delegated rather than bound per button because
    // `renderDoc` re-binds its handlers on every render, and a per-button
    // listener would be re-attached on each pass and carry state across a swap it
    // cannot see.
    const spendProbes = [];
    const addSpendProbe = (fn) => spendProbes.push(fn);
    // the button the pointer is actually on, kept whether or not a preview is
    // running — a press stops the preview without the pointer having moved, and
    // this is how the token knows to start straining again when it gets home
    let hoverSpend = null;
    document.addEventListener('pointerover', (ev) => {
      let hit = null;
      for (const fn of spendProbes) {
        try { hit = fn(ev.target); } catch (e) { hit = null; }
        if (hit) break;
      }
      hoverSpend = hit;
      if (hit) startLean(hit.btn, hit.pick); else stopLean();
    });
    // leaving the window fires no `pointerover` anywhere, so this is the one exit
    // the rule above cannot see
    document.addEventListener('pointerout', (ev) => { if (!ev.relatedTarget) { hoverSpend = null; stopLean(); } });
    const resumeLean = (btn) => { if (hoverSpend && hoverSpend.btn === btn) startLean(btn, hoverSpend.pick); };
    addSpendProbe((t) => {
      const b = t && t.closest && t.closest('[data-act="draft-propose"]');
      // ✒️ spends nothing, so no pencil leans toward it (R-058)
      if (!b || b.disabled || b.dataset.pen === '1' || !env.walletEl) return null;
      return { btn: b, pick: () => [...env.walletEl.querySelectorAll('.pencils i')].pop() };
    });

    return { arcFrames, refundFlight, flyGlyph, nudgeHome, pencilStorm,
      setWalletHeld, setWalletGhost, setWalletTitle, renderWallet,
      applyLean, startLean, stopLean, addSpendProbe, resumeLean,
      // the raw ghost, for the propose hold this file does not run: it is
      // set without a render on the fired path (the spend’s own render
      // releases the gap a frame later) and before `resumeLean` on the
      // returning one, so `setWalletGhost`'s render cannot stand in for it
      get walletGhost() { return walletGhost; },
      set walletGhost(v) { walletGhost = v; } };
  }
  return { make };
})();
