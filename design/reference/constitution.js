/* GENERATED — do not edit. Source: packages/constitution. Rebuild: npm run bundle */
"use strict";
var CONSTITUTION = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/browser.ts
  var browser_exports = {};
  __export(browser_exports, {
    CATALOGUE: () => CATALOGUE,
    CATALOGUE_BY_ID: () => CATALOGUE_BY_ID,
    ConstitutionSession: () => ConstitutionSession,
    JUDGE_GATES: () => JUDGE_GATES,
    SCHEMA_VERSION: () => SCHEMA_VERSION,
    WARN_FRACTION: () => WARN_FRACTION,
    adoptionFloor: () => adoptionFloor,
    adoptionFloorTerm: () => adoptionFloorTerm,
    barAt: () => barAt,
    chainHash: () => chainHash,
    constitutionBlock: () => constitutionBlock,
    eOf: () => eOf,
    entryOf: () => entryOf,
    eqValue: () => eqValue,
    holderOf: () => holderOf,
    inE: () => inE,
    lapseDue: () => lapseDue,
    motionElectorateOf: () => motionElectorateOf,
    motionRouteOf: () => motionRouteOf,
    quorumBaseOf: () => quorumBaseOf,
    quorumCount: () => quorumCount,
    reAnchor: () => reAnchor,
    resolveConsent: () => resolveConsent,
    roomSettings: () => roomSettings,
    seedAnchors: () => seedAnchors,
    sha256Hex: () => sha256Hex,
    slugify: () => slugify,
    smoothstep: () => smoothstep,
    stableStringify: () => stableStringify,
    validateFor: () => validateFor,
    validateValue: () => validateValue,
    versionOf: () => versionOf,
    view: () => view
  });

  // src/sha256.ts
  var K = new Uint32Array([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  function utf8Bytes(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c < 128) out.push(c);
      else if (c < 2048) out.push(192 | c >> 6, 128 | c & 63);
      else if (c >= 55296 && c < 56320 && i + 1 < s.length && s.charCodeAt(i + 1) >= 56320 && s.charCodeAt(i + 1) < 57344) {
        const cp = 65536 + (c - 55296 << 10) + (s.charCodeAt(i + 1) - 56320);
        out.push(
          240 | cp >> 18,
          128 | cp >> 12 & 63,
          128 | cp >> 6 & 63,
          128 | cp & 63
        );
        i++;
      } else if (c >= 55296 && c < 57344) out.push(239, 191, 189);
      else out.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
    }
    return Uint8Array.from(out);
  }
  function rotr(x, n) {
    return (x >>> n | x << 32 - n) >>> 0;
  }
  function sha256Hex(input) {
    const msg = utf8Bytes(input);
    const padded = new Uint8Array((msg.length + 8 >> 6) + 1 << 6);
    padded.set(msg);
    padded[msg.length] = 128;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, Math.floor(msg.length / 536870912));
    dv.setUint32(padded.length - 4, msg.length << 3 >>> 0);
    const h = new Uint32Array([
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ]);
    const w = new Uint32Array(64);
    for (let off = 0; off < padded.length; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + (i << 2));
      for (let i = 16; i < 64; i++) {
        const a15 = w[i - 15];
        const a2 = w[i - 2];
        const s0 = (rotr(a15, 7) ^ rotr(a15, 18) ^ a15 >>> 3) >>> 0;
        const s1 = (rotr(a2, 17) ^ rotr(a2, 19) ^ a2 >>> 10) >>> 0;
        w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3];
      let e = h[4], f = h[5], g = h[6], hh = h[7];
      for (let i = 0; i < 64; i++) {
        const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        const ch = (e & f ^ ~e & g) >>> 0;
        const t1 = hh + S1 + ch + K[i] + w[i] >>> 0;
        const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        const maj = (a & b ^ a & c ^ b & c) >>> 0;
        const t2 = S0 + maj >>> 0;
        hh = g;
        g = f;
        f = e;
        e = d + t1 >>> 0;
        d = c;
        c = b;
        b = a;
        a = t1 + t2 >>> 0;
      }
      h[0] = h[0] + a >>> 0;
      h[1] = h[1] + b >>> 0;
      h[2] = h[2] + c >>> 0;
      h[3] = h[3] + d >>> 0;
      h[4] = h[4] + e >>> 0;
      h[5] = h[5] + f >>> 0;
      h[6] = h[6] + g >>> 0;
      h[7] = h[7] + hh >>> 0;
    }
    let hex = "";
    for (let i = 0; i < 8; i++) hex += h[i].toString(16).padStart(8, "0");
    return hex;
  }

  // src/hash.ts
  function stableStringify(value) {
    return JSON.stringify(sortValue(value));
  }
  function sortValue(value) {
    if (Array.isArray(value)) return value.map(sortValue);
    if (value !== null && typeof value === "object") {
      const out = {};
      for (const key of Object.keys(value).sort()) {
        const v = value[key];
        if (v !== void 0) out[key] = sortValue(v);
      }
      return out;
    }
    return value;
  }
  function chainHash(prevHash, event) {
    return sha256Hex(prevHash + stableStringify(event));
  }

  // src/values.ts
  var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
  var isFiniteNum = (v) => typeof v === "number" && Number.isFinite(v);
  var isInt = (v) => Number.isInteger(v);
  function validateValue(type, v) {
    if (!isObj(v)) return `${type}: value must be an object`;
    switch (type) {
      case "text":
        return typeof v.text === "string" ? null : "text: { text: string } required";
      case "slug":
        if (typeof v.slug !== "string") return "slug: { slug: string } required";
        return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug) ? null : `slug: '${String(v.slug)}' is not a valid slug`;
      case "ending":
        if (v.endsAtMs === null) return null;
        return isFiniteNum(v.endsAtMs) && v.endsAtMs >= 0 ? null : "ending: endsAtMs must be null (never) or a non-negative time";
      case "percent":
        return isFiniteNum(v.pct) && v.pct >= 50 && v.pct <= 100 ? null : "percent: pct must be 50–100 (the incumbent sits at 50 by construction)";
      case "pace":
        if (v.shape === "fixed") return "startPct" in v ? "pace: fixed carries no startPct" : null;
        if (v.shape === "ramp")
          return isFiniteNum(v.startPct) && v.startPct >= 50 && v.startPct <= 100 ? null : "pace: ramp needs startPct 50–100";
        return "pace: shape must be 'fixed' or 'ramp'";
      case "quorum":
        if (v.form !== "count" && v.form !== "share") return "quorum: form must be 'count' or 'share'";
        if (v.form === "count")
          return isInt(v.n) && v.n >= 0 ? null : "quorum: count n must be an integer ≥ 0";
        return isFiniteNum(v.n) && v.n >= 0 && v.n <= 100 ? null : "quorum: share n must be 0–100";
      case "ladder":
        return typeof v.rung === "string" ? null : "ladder: { rung: string } required";
      case "rate":
        if (!isInt(v.grant) || v.grant < 0) return "rate: grant must be an integer ≥ 0";
        if (!isInt(v.cap) || v.cap < 1) return "rate: cap must be an integer ≥ 1";
        if (v.cap < v.grant) return "rate: cap must be ≥ grant";
        return isFiniteNum(v.dripMinutes) && v.dripMinutes > 0 ? null : "rate: dripMinutes must be a positive number of real minutes (Q353)";
      case "lapse":
        if (v.afterMs === null) return null;
        return isFiniteNum(v.afterMs) && v.afterMs > 0 ? null : "lapse: afterMs must be null (never) or a positive duration";
      case "machines":
        if (typeof v.enabled !== "boolean") return "machines: enabled must be a boolean";
        return isInt(v.budget) && v.budget >= 0 ? null : "machines: budget must be an integer ≥ 0";
      case "applications":
        if (v.holder !== void 0 && v.holder !== "members" && v.holder !== "reserved" && v.holder !== "reserved-unilateral" && v.holder !== "reserved-assent")
          return "applications: holder (legacy) must be 'members' | 'reserved' | 'reserved-unilateral' | 'reserved-assent'";
        return v.joinPolicy === "invite" || v.joinPolicy === "proposed" || v.joinPolicy === "apply" || v.joinPolicy === "open" ? null : "applications: joinPolicy must be invite | proposed | apply | open";
      case "register":
        return "membership has no scalar value — the register changes by command (invite, remove)";
    }
  }
  function slugify(title) {
    const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-").slice(0, 48).replace(/^-+|-+$/g, "");
    return base.length > 0 ? base : "untitled";
  }
  function eqValue(a, b) {
    return stableStringify(a) === stableStringify(b);
  }

  // src/catalogue.ts
  var ladderOrder = (rungs) => (a, b) => rungs.indexOf(b.rung) - rungs.indexOf(a.rung);
  var neverIsHighest = (of) => (a, b) => {
    const av = of(a);
    const bv = of(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return av - bv;
  };
  var CATALOGUE = [
    {
      id: "title",
      glyph: "🪶",
      kind: "ordinary",
      holderDefault: "convenor",
      delegable: false,
      valueType: "text",
      deps: [],
      judgeGate: false
    },
    {
      id: "link",
      glyph: "📍",
      kind: "ordinary",
      holderDefault: "convenor",
      delegable: false,
      valueType: "slug",
      deps: [],
      judgeGate: false
    },
    // Confirmed, may be empty (§9.0b); changed post-start by proposing in the
    // document itself, so it has no motion route (motion-controls: a motion
    // button there would be a second door to the same room).
    {
      id: "startingText",
      glyph: "📄",
      kind: "ordinary",
      holderDefault: "convenor",
      delegable: false,
      valueType: "text",
      deps: [],
      judgeGate: false
    },
    {
      id: "ending",
      glyph: "⏰",
      kind: "constitutional",
      holderDefault: "members",
      delegable: true,
      valueType: "ending",
      consent: {
        ask: "the earliest close you will accept — never being the latest of all",
        order: neverIsHighest((v) => v.endsAtMs)
      },
      routeOf: (p, c) => p.endsAtMs === null || c.endsAtMs === null ? "constitutional" : "ordinary",
      deps: [],
      judgeGate: false
    },
    {
      id: "bar",
      glyph: "✒️",
      kind: "constitutional",
      holderDefault: "members",
      delegable: true,
      valueType: "percent",
      consent: {
        ask: "the lowest bar at the close you will accept",
        order: (a, b) => a.pct - b.pct
      },
      deps: ["ending"],
      judgeGate: true
    },
    // Ordinary by §9.6's test (pacing re-rates nothing) and **the founder's,
    // not delegable** (Ed, 2026-08-19, closing Q415 — reverting his own
    // 2026-08-18 override, which was made with "we can change this later"
    // attached). Q341's ruling is the reason: the bar at the close is consent
    // and the ramp that reaches it is *pacing*, which stays with the founder.
    // Nothing was collecting an answer for it either — no surface ever grew a
    // founding question for a {shape, startPct}. The members can still take it
    // over after the start, by the reserve route, where no blind question is
    // needed. The consent order survives for exactly that case.
    {
      id: "pace",
      glyph: "📈",
      kind: "ordinary",
      holderDefault: "convenor",
      delegable: false,
      valueType: "pace",
      consent: {
        ask: "the most gradual arrival at the close bar you will accept",
        order: (a, b) => {
          const pa = a;
          const pb = b;
          if (pa.shape !== pb.shape) return pa.shape === "fixed" ? 1 : -1;
          if (pa.shape === "ramp" && pb.shape === "ramp") return pa.startPct - pb.startPct;
          return 0;
        }
      },
      deps: ["ending"],
      judgeGate: false
    },
    // The form is the convenor's, the number the room's (§9.0a) — resolution
    // refuses mixed forms rather than converting.
    {
      id: "quorum",
      glyph: "👥",
      kind: "constitutional",
      holderDefault: "members",
      delegable: true,
      valueType: "quorum",
      consent: {
        ask: "the lowest quorum you will accept, in the convenor's chosen form",
        order: (a, b) => a.n - b.n
      },
      deps: [],
      judgeGate: true
    },
    {
      id: "authorship",
      glyph: "👤",
      kind: "constitutional",
      holderDefault: "members",
      delegable: true,
      valueType: "ladder",
      rungs: ["anonymous", "sealed", "public"],
      consent: {
        ask: "the most exposure of proposers you will accept",
        order: ladderOrder(["anonymous", "sealed", "public"])
      },
      deps: [],
      judgeGate: true
    },
    {
      id: "signing",
      glyph: "✍️",
      kind: "constitutional",
      holderDefault: "members",
      delegable: true,
      valueType: "ladder",
      rungs: ["nobody", "each", "everybody"],
      consent: {
        ask: "the most signing you will accept",
        order: ladderOrder(["nobody", "each", "everybody"])
      },
      deps: [],
      judgeGate: true
    },
    {
      id: "judgments",
      glyph: "👁️",
      kind: "constitutional",
      holderDefault: "members",
      delegable: true,
      valueType: "ladder",
      rungs: ["never", "after"],
      consent: {
        ask: "the most judgment disclosure you will accept",
        order: ladderOrder(["never", "after"])
      },
      deps: [],
      judgeGate: true
    },
    {
      id: "chamber",
      glyph: "🌍",
      kind: "constitutional",
      holderDefault: "members",
      delegable: true,
      valueType: "ladder",
      rungs: ["closed", "link", "public"],
      consent: {
        ask: "the most visibility you will accept",
        order: ladderOrder(["closed", "link", "public"])
      },
      deps: [],
      judgeGate: true
    },
    {
      id: "rate",
      glyph: "⏱️",
      kind: "ordinary",
      holderDefault: "convenor",
      delegable: true,
      valueType: "rate",
      consent: {
        // Most generous wins (§9.0): higher grant, then higher cap, then a
        // faster drip. Generosity is the protective direction here — nobody
        // is bound by a rate more restrictive than they accepted.
        ask: "the least generous proposal rate you will accept",
        order: (a, b) => {
          const ra = a;
          const rb = b;
          if (ra.grant !== rb.grant) return ra.grant - rb.grant;
          if (ra.cap !== rb.cap) return ra.cap - rb.cap;
          return rb.dripMinutes - ra.dripMinutes;
        }
      },
      deps: [],
      judgeGate: false
    },
    {
      id: "lapse",
      glyph: "💤",
      kind: "constitutional",
      holderDefault: "members",
      delegable: true,
      valueType: "lapse",
      consent: {
        ask: "the shortest quiet spell you will accept being lapsed after",
        order: neverIsHighest((v) => v.afterMs)
      },
      deps: [],
      judgeGate: true
    },
    // **How a member is removed** (Q401, Ed 2026-08-19). Three rungs, and the
    // middle one is a decision class of its own — unanimity excluding the
    // subject (the live-electorate settle check minus one member), which is
    // what real constitutions mostly do (partnerships expel by unanimity of
    // the others). 'everyone' includes the subject's own answer, which makes
    // it effectively a no-expulsion rule — the most protective, and today's
    // default. The subject always *sees* a motion running against them (Ed's
    // ruling); whether they may judge their own *ordinary* removal race is
    // open (Q401b). Not judge-gated: like the join policy, it touches no
    // recorded judgment.
    {
      id: "removal",
      glyph: "🚪",
      kind: "constitutional",
      holderDefault: "members",
      delegable: true,
      valueType: "ladder",
      rungs: ["everyone", "others", "ordinary"],
      consent: {
        ask: "the easiest removal of a member you will accept",
        order: ladderOrder(["everyone", "others", "ordinary"])
      },
      deps: [],
      judgeGate: false
    },
    // Ordinary (Q352, Ed 2026-08-18): the auditor is not a member — it judges
    // nothing and counts toward no quorum, so switching it re-rates nothing
    // already decided. A member could put the document through an AI
    // themselves; the tool is a convenience for the membership.
    {
      id: "machines",
      glyph: "🤖",
      kind: "ordinary",
      holderDefault: "convenor",
      delegable: true,
      valueType: "machines",
      consent: {
        ask: "the most machine proposing you will accept",
        order: (a, b) => {
          const ma = a;
          const mb = b;
          if (ma.enabled !== mb.enabled) return ma.enabled ? -1 : 1;
          return mb.budget - ma.budget;
        }
      },
      deps: [],
      judgeGate: false
    },
    // The register itself — changed by command (invite, arrive, remove),
    // never by a scalar motion. Who holds it lives on 'applications' (§9.7½).
    {
      id: "membership",
      glyph: "🪪",
      kind: "constitutional",
      holderDefault: "members",
      delegable: false,
      valueType: "register",
      deps: [],
      judgeGate: false
    },
    // Not judge-gated: the mock's ceremony gate is exactly the eight settings
    // a judgment is recorded under or counted towards (§9.0b); the join
    // policy touches neither. A delegated applications question still blocks
    // judging while it collects, like any delegated question.
    {
      id: "applications",
      glyph: "🤝",
      kind: "constitutional",
      holderDefault: "members",
      delegable: true,
      valueType: "applications",
      consent: {
        ask: "the most open join policy you will accept",
        order: (a, b) => {
          const rungs = ["invite", "proposed", "apply", "open"];
          const byPolicy = rungs.indexOf(b.joinPolicy) - rungs.indexOf(a.joinPolicy);
          if (byPolicy !== 0) return byPolicy;
          return byPolicy;
        }
      },
      deps: [],
      judgeGate: false
    },
    {
      id: "displayName",
      glyph: "✋",
      kind: "personal",
      holderDefault: "member",
      delegable: false,
      valueType: "text",
      deps: [],
      judgeGate: false
    },
    {
      id: "picture",
      glyph: "🖼️",
      kind: "personal",
      holderDefault: "member",
      delegable: false,
      valueType: "text",
      deps: [],
      judgeGate: false
    }
  ];
  var CATALOGUE_BY_ID = new Map(CATALOGUE.map((e) => [e.id, e]));
  function entryOf(id) {
    const e = CATALOGUE_BY_ID.get(id);
    if (!e) throw new Error(`unknown setting '${id}'`);
    return e;
  }
  var JUDGE_GATES = CATALOGUE.filter((e) => e.judgeGate).map((e) => e.id);
  function validateFor(entry, v) {
    const err = validateValue(entry.valueType, v);
    if (err) return err;
    if (entry.valueType === "ladder") {
      const rung = v.rung;
      if (!entry.rungs?.includes(rung))
        return `${entry.id}: '${rung}' is not one of [${entry.rungs?.join(", ")}]`;
    }
    return null;
  }
  function motionRouteOf(entry, proposed, current) {
    if (current === null) return "constitutional";
    if (entry.routeOf) return entry.routeOf(proposed, current);
    if (entry.kind === "personal") throw new Error(`${entry.id} is personal — no motion route`);
    return entry.kind === "constitutional" ? "constitutional" : "ordinary";
  }

  // src/consent.ts
  function resolveConsent(entry, answers) {
    const consent = entry.consent;
    if (!consent) throw new Error(`${entry.id} is not a consent question`);
    if (answers.length === 0) throw new Error(`${entry.id}: nothing to resolve — no answers`);
    const distribution = [...answers].sort((a, b) => {
      const byOrder = consent.order(b, a);
      if (byOrder !== 0) return byOrder;
      return stableStringify(a) < stableStringify(b) ? -1 : 1;
    });
    return { value: distribution[0], distribution };
  }

  // src/types.ts
  function holderOf(powers) {
    return powers.unilateral || powers.assent ? "convenor" : "members";
  }
  var SCHEMA_VERSION = 1;
  function versionOf(entry) {
    return entry.schemaVersion ?? 1;
  }

  // src/populations.ts
  function inE(m) {
    return m.arrivedAtT !== null && !m.removed && !m.lapsed;
  }
  function eOf(members) {
    return [...members].filter(inE);
  }
  function quorumBaseOf(members) {
    return eOf(members).filter((m) => m.signedOut !== "abstaining");
  }
  function motionElectorateOf(members) {
    return quorumBaseOf(members);
  }
  function quorumCount(quorum, E) {
    return quorum.form === "count" ? quorum.n : Math.ceil(quorum.n / 100 * E);
  }
  function adoptionFloorTerm(E) {
    return Math.ceil(E / 3);
  }
  function adoptionFloor(quorumN, E, fMax) {
    return Math.max(quorumN, Math.min(adoptionFloorTerm(E), fMax));
  }

  // src/threshold.ts
  function smoothstep(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return x * x * (3 - 2 * x);
  }
  function seedAnchors(shape, startPct, endPct, constitutedT, endT) {
    if (endT === null && shape === "ramp")
      throw new Error("a ramp needs an endpoint — perpetual forces fixed (§9.0)");
    if (shape === "ramp" && startPct === null)
      throw new Error("a ramp needs a start");
    return {
      shape,
      endPct,
      anchorT: constitutedT,
      anchorPct: shape === "ramp" ? startPct : endPct,
      endT
    };
  }
  function barAt(a, t) {
    if (a.shape === "fixed" || a.endT === null) return a.endPct;
    const span = a.endT - a.anchorT;
    const x = span <= 0 ? 1 : (t - a.anchorT) / span;
    return a.anchorPct + (a.endPct - a.anchorPct) * smoothstep(x);
  }
  function reAnchor(a, tNow, newEndT) {
    const current = barAt(a, tNow);
    return {
      shape: newEndT === null ? "fixed" : a.shape,
      endPct: a.endPct,
      anchorT: tNow,
      anchorPct: newEndT === null ? a.endPct : current,
      endT: newEndT
    };
  }

  // src/clocks.ts
  var WARN_FRACTION = 0.75;
  function lapseDue(lastActivityT, afterMs) {
    if (afterMs === null) return null;
    return {
      warnAtT: lastActivityT + afterMs * WARN_FRACTION,
      lapseAtT: lastActivityT + afterMs
    };
  }

  // src/session.ts
  var MANAGED = CATALOGUE.filter((e) => e.kind !== "personal" && e.id !== "membership" && e.id !== "startingText").map((e) => e.id);
  var HELD = [...MANAGED, "startingText"];
  var CONSTITUTIONAL = new Set(
    CATALOGUE.filter((e) => e.kind === "constitutional" && e.id !== "membership").map((e) => e.id)
  );
  var SEEN_EVERY_MS = 60 * 6e4;
  var ConstitutionSession = class _ConstitutionSession {
    constructor() {
      __publicField(this, "log", []);
      __publicField(this, "lastT", -Infinity);
      // ---- fold state ----------------------------------------------------------
      __publicField(this, "convenor");
      __publicField(this, "crownLapsedFlag", false);
      __publicField(this, "members", /* @__PURE__ */ new Map());
      __publicField(this, "settings", /* @__PURE__ */ new Map());
      __publicField(this, "quorumFormValue", "share");
      __publicField(this, "startingText", null);
      __publicField(this, "textConfirmedFlag", false);
      __publicField(this, "slugHistory", []);
      __publicField(this, "constitutedT", null);
      __publicField(this, "closedFlag", false);
      __publicField(this, "closedT", null);
      __publicField(this, "anchors", null);
      __publicField(this, "frozenFlag", false);
      __publicField(this, "motions", /* @__PURE__ */ new Map());
      __publicField(this, "crownQuestions", /* @__PURE__ */ new Map());
      __publicField(this, "applicants", /* @__PURE__ */ new Map());
      __publicField(this, "nextMemberN", 1);
      __publicField(this, "nextMotionN", 1);
      __publicField(this, "nextCrownN", 1);
      __publicField(this, "nextApplicantN", 1);
    }
    // -------------------------------------------------------------------------
    // Opening and replay
    static open(input, t) {
      const s = new _ConstitutionSession();
      if (!input.title.trim()) throw new Error("a document begins with its title (§9.7a)");
      const slugErr = validateFor(entryOf("link"), { slug: input.slug });
      if (slugErr) throw new Error(slugErr);
      s.emit({
        type: "created",
        t,
        title: input.title,
        slug: input.slug,
        convenor: input.convenor
      });
      return s;
    }
    /** Rebuild a session by replaying a log (verifies the hash chain). */
    static replay(log) {
      const s = new _ConstitutionSession();
      let prev = "";
      for (const entry of log) {
        const expected = chainHash(prev, entry.event);
        if (entry.hash !== expected || entry.prevHash !== prev) {
          throw new Error(`hash chain broken at seq ${entry.seq}`);
        }
        s.log.push(entry);
        s.apply(entry.event, entry.seq);
        prev = entry.hash;
      }
      return s;
    }
    // -------------------------------------------------------------------------
    // Event plumbing
    emit(event) {
      const prevHash = this.log.length > 0 ? this.log[this.log.length - 1].hash : "";
      const seq = this.log.length;
      const hash = chainHash(prevHash, event);
      this.log.push({ seq, hash, prevHash, event, schemaVersion: SCHEMA_VERSION });
      this.apply(event, seq);
    }
    apply(event, _seq) {
      if (event.t < this.lastT) throw new Error("timestamps must be non-decreasing");
      this.lastT = event.t;
      switch (event.type) {
        case "created": {
          const c = event.convenor;
          this.convenor = {
            ...c,
            name: c.name ?? null,
            picture: c.picture ?? null,
            lastActivityT: event.t,
            lapseWarned: false
          };
          for (const id of HELD) {
            this.settings.set(id, {
              id,
              holder: "convenor",
              powers: { unilateral: true, assent: true },
              value: null,
              settledBy: null,
              settledAtT: null,
              collecting: false,
              answers: /* @__PURE__ */ new Map(),
              distribution: null
            });
          }
          this.foldSet("title", { text: event.title }, "convenor", event.t);
          this.foldSet("link", { slug: event.slug }, "convenor", event.t);
          this.slugHistory.push(event.slug);
          if (c.isMember) this.members.set(c.id, this.freshMember(c.id, c.email, event.t, event.t));
          break;
        }
        case "convenor-membership-set": {
          if (event.isMember) {
            this.members.set(
              this.convenor.id,
              this.freshMember(this.convenor.id, this.convenor.email, event.t, event.t)
            );
          } else {
            this.members.delete(this.convenor.id);
          }
          break;
        }
        case "setting-set": {
          this.touch(this.convenor.id, event.t);
          this.foldSet(event.setting, event.value, event.by, event.t);
          if (event.setting === "quorum") {
            this.quorumFormValue = event.value.form;
          }
          if (event.setting === "link") {
            const slug = event.value.slug;
            if (!this.slugHistory.includes(slug)) this.slugHistory.push(slug);
          }
          if (CONSTITUTIONAL.has(event.setting)) {
            for (const m of this.members.values()) m.okGiven.delete(event.setting);
          }
          this.reseedAnchorsIfLive(event.t, event.setting);
          break;
        }
        case "setting-delegated": {
          const st = this.settings.get(event.setting);
          this.setPowers(st, { unilateral: false, assent: false });
          st.collecting = true;
          st.value = null;
          st.settledBy = null;
          st.settledAtT = null;
          st.distribution = null;
          break;
        }
        case "setting-reclaimed": {
          const st = this.settings.get(event.setting);
          const wasDelegated = st.holder === "members";
          this.setPowers(st, { unilateral: true, assent: true });
          if (wasDelegated) {
            st.collecting = false;
            st.answers.clear();
            st.value = null;
            st.settledBy = null;
            st.settledAtT = null;
            st.distribution = null;
          }
          break;
        }
        case "starting-text-confirmed": {
          this.startingText = event.text.replace(/\r\n?/g, "\n");
          this.textConfirmedFlag = true;
          break;
        }
        case "quorum-form-set": {
          this.quorumFormValue = event.form;
          break;
        }
        case "identity-set": {
          if (event.member === this.convenor.id && !this.members.has(event.member)) {
            if (event.name !== void 0) this.convenor.name = event.name;
            if (event.picture !== void 0) this.convenor.picture = event.picture;
            break;
          }
          const m = this.members.get(event.member);
          if (event.name !== void 0) m.name = event.name;
          if (event.picture !== void 0) m.picture = event.picture;
          this.touch(event.member, event.t);
          break;
        }
        case "member-invited": {
          this.members.set(
            event.member,
            this.freshMember(event.member, event.email, event.t, null)
          );
          this.nextMemberN += 1;
          break;
        }
        case "member-uninvited": {
          const m = this.members.get(event.member);
          m.removed = true;
          break;
        }
        case "member-arrived": {
          const m = this.members.get(event.member);
          m.arrivedAtT = event.t;
          m.lastActivityT = event.t;
          break;
        }
        case "member-removed": {
          const m = this.members.get(event.member);
          m.removed = true;
          break;
        }
        case "answer-given": {
          const st = this.settings.get(event.setting);
          st.answers.set(event.member, event.value);
          this.touch(event.member, event.t);
          break;
        }
        case "question-resolved": {
          const st = this.settings.get(event.setting);
          st.collecting = false;
          st.value = event.value;
          st.settledBy = "ceremony";
          st.settledAtT = event.t;
          st.distribution = event.distribution;
          if (event.setting === "quorum") {
            this.quorumFormValue = event.value.form;
          }
          this.reseedAnchorsIfLive(event.t, event.setting);
          break;
        }
        case "ceremony-ground-shifted":
          break;
        // answers stand — the event is the notification (§9.6a)
        case "constituted": {
          this.constitutedT = event.t;
          this.anchors = this.computeAnchors(event.t);
          this.setPowers(this.settings.get("startingText"), { unilateral: false, assent: false });
          break;
        }
        case "ok-owed": {
          const m = this.members.get(event.member);
          for (const id of event.settings) m.okOwed.add(id);
          break;
        }
        case "ok-given": {
          const m = this.members.get(event.member);
          m.okOwed.delete(event.setting);
          m.okGiven.add(event.setting);
          this.touch(event.member, event.t);
          break;
        }
        case "floor-recomputed":
          break;
        // an announcement (§9.3/Q10); the numbers ride in the event
        case "tick":
          break;
        default:
          this.applyLifecycle(event);
      }
    }
    /** Motions and the crown (§9.6–§9.7, v0.48). */
    applyLifecycle(event) {
      switch (event.type) {
        case "motion-opened": {
          this.motions.set(event.motion, {
            id: event.motion,
            by: event.by,
            payload: event.payload,
            route: event.route,
            stake: event.stake,
            openedAtT: event.t,
            why: event.why ?? null,
            status: "running",
            answers: /* @__PURE__ */ new Map(),
            settledAtT: null
          });
          this.nextMotionN += 1;
          if (event.payload.kind === "admit") {
            this.applicants.get(event.payload.applicant).motion = event.motion;
          }
          if (event.by) this.touch(event.by, event.t);
          break;
        }
        case "motion-answer": {
          const rec = this.motions.get(event.motion);
          rec.answers.set(event.member, event.answer);
          this.touch(event.member, event.t);
          break;
        }
        case "power-relinquished": {
          const st = this.settings.get(event.setting);
          const powers = { ...st.powers, [event.power]: false };
          this.setPowers(st, powers);
          this.touch(this.convenor.id, event.t);
          break;
        }
        case "motion-withdrawn": {
          const rec = this.motions.get(event.motion);
          rec.status = "withdrawn";
          rec.settledAtT = event.t;
          break;
        }
        case "motion-carried": {
          const rec = this.motions.get(event.motion);
          rec.status = "carried";
          rec.settledAtT = event.t;
          if (rec.payload.kind === "set") {
            this.applyPayloadSet(rec.payload.setting, rec.payload.value, "motion", event.t);
          }
          if (rec.payload.kind === "reserve") {
            const st = this.settings.get(rec.payload.setting);
            const p = rec.payload.power ?? "both";
            this.setPowers(st, {
              unilateral: st.powers.unilateral || p !== "assent",
              assent: st.powers.assent || p !== "unilateral"
            });
          }
          break;
        }
        case "motion-adjudicated": {
          const rec = this.motions.get(event.motion);
          rec.settledAtT = event.t;
          if (event.outcome === "held") {
            rec.status = "held";
          } else if (this.reservedTarget(rec)) {
            rec.status = "awaiting-crown";
            rec.settledAtT = null;
          } else {
            rec.status = "carried";
            if (rec.payload.kind === "set") {
              this.applyPayloadSet(rec.payload.setting, rec.payload.value, "motion", event.t);
            }
          }
          break;
        }
        case "crown-question-opened": {
          this.crownQuestions.set(event.question, {
            id: event.question,
            motion: event.motion,
            ...event.text ? { text: event.text } : {},
            openedAtT: event.t,
            status: "pending"
          });
          if (event.motion !== null) {
            const parked = this.motions.get(event.motion);
            parked.status = "awaiting-crown";
            parked.settledAtT = null;
          }
          this.nextCrownN += 1;
          break;
        }
        case "crown-question-answered":
        case "crown-question-auto-passed": {
          const q = this.crownQuestions.get(event.question);
          const accepted = event.type === "crown-question-auto-passed" || event.outcome === "accept";
          q.status = event.type === "crown-question-auto-passed" ? "auto-passed" : accepted ? "accepted" : "rejected";
          if (q.motion !== null) {
            const rec = this.motions.get(q.motion);
            rec.status = accepted ? "carried" : "held";
            rec.settledAtT = event.t;
            if (accepted && rec.payload.kind === "set") {
              this.applyPayloadSet(rec.payload.setting, rec.payload.value, "crown", event.t);
            }
          }
          if (event.type === "crown-question-answered") {
            this.touch(this.convenor.id, event.t);
          }
          break;
        }
        case "setting-handed-over": {
          const st = this.settings.get(event.setting);
          this.setPowers(st, { unilateral: false, assent: false });
          this.touch(this.convenor.id, event.t);
          break;
        }
        case "crown-lapsed": {
          this.crownLapsedFlag = true;
          break;
        }
        case "crown-returned": {
          this.crownLapsedFlag = false;
          this.convenor.lapseWarned = false;
          this.touch(this.convenor.id, event.t);
          break;
        }
        default:
          this.applyPresence(event);
      }
    }
    /** Presence, the freeze, lapsing and applications (§9.5, §9.5a, §9.7½). */
    applyPresence(event) {
      switch (event.type) {
        case "signed-out": {
          const m = this.members.get(event.member);
          m.signedOut = event.mode;
          this.touch(event.member, event.t);
          break;
        }
        case "member-returned": {
          const m = this.members.get(event.member);
          m.signedOut = null;
          m.lapsed = false;
          m.lapseWarned = false;
          this.touch(event.member, event.t);
          break;
        }
        case "member-seen":
          this.touch(event.member, event.t);
          break;
        case "lapse-warned": {
          if (event.member === this.convenor.id && !this.members.has(event.member)) {
            this.convenor.lapseWarned = true;
          } else {
            this.members.get(event.member).lapseWarned = true;
          }
          break;
        }
        case "member-lapsed": {
          this.members.get(event.member).lapsed = true;
          break;
        }
        case "frozen": {
          this.frozenFlag = true;
          break;
        }
        case "thawed": {
          this.frozenFlag = false;
          break;
        }
        case "closed": {
          this.closedFlag = true;
          this.closedT = event.t;
          break;
        }
        case "motion-kept-at-close": {
          const rec = this.motions.get(event.motion);
          rec.status = "kept-at-close";
          rec.settledAtT = event.t;
          break;
        }
        case "crown-failed-closed": {
          const q = this.crownQuestions.get(event.question);
          q.status = "failed-closed";
          if (q.motion !== null) {
            const rec = this.motions.get(q.motion);
            rec.status = "held";
            rec.settledAtT = event.t;
          }
          break;
        }
        case "invitation-expired": {
          this.members.get(event.member).invitationExpired = true;
          break;
        }
        case "close-acknowledged": {
          const m = this.members.get(event.member);
          if (m) m.closingAck = { t: event.t, comment: event.comment };
          break;
        }
        case "application-started": {
          this.applicants.set(event.applicant, {
            id: event.applicant,
            email: event.email,
            status: "started",
            name: null,
            picture: null,
            words: null,
            motion: null
          });
          this.nextApplicantN += 1;
          break;
        }
        case "application-verified": {
          this.applicants.get(event.applicant).status = "verified";
          break;
        }
        case "application-submitted": {
          const a = this.applicants.get(event.applicant);
          a.status = "submitted";
          a.name = event.name ?? null;
          a.picture = event.picture ?? null;
          a.words = event.words ?? null;
          break;
        }
        case "application-proposed": {
          this.applicants.get(event.applicant).status = "proposed";
          this.touch(event.by, event.t);
          break;
        }
        case "member-admitted": {
          const a = this.applicants.get(event.applicant);
          a.status = "admitted";
          const rec = this.freshMember(event.member, a.email, event.t, event.t);
          rec.name = a.name;
          rec.picture = a.picture;
          this.members.set(event.member, rec);
          this.nextMemberN += 1;
          break;
        }
        case "application-refused": {
          this.applicants.get(event.applicant).status = "refused";
          break;
        }
        default:
          throw new Error(`unhandled event '${event.type}'`);
      }
    }
    /** A carried change lands on the setting, keeping who holds it. */
    applyPayloadSet(id, value, by, t) {
      const st = this.settings.get(id);
      st.value = value;
      st.settledBy = by;
      st.settledAtT = t;
      st.collecting = false;
      this.foldApplications(st);
      if (id === "quorum") this.quorumFormValue = value.form;
      if (id === "link") {
        const slug = value.slug;
        if (!this.slugHistory.includes(slug)) this.slugHistory.push(slug);
      }
      this.reseedAnchorsIfLive(t, id);
    }
    /** Does this motion's target sit behind the crown's assent (§9.7)?
     *  v0.54: the assent power specifically — a setting held unilateral-only
     *  applies a carried change with nobody's accept asked. */
    reservedTarget(rec) {
      if (this.crownLapsedFlag) return false;
      if (rec.payload.kind === "set") {
        return this.settings.get(rec.payload.setting).powers.assent;
      }
      if (rec.payload.kind === "reserve") return false;
      return this.registerPowers().assent;
    }
    /** §9.7 v0.54: holder derives from powers — the convenor's iff any is held. */
    setPowers(st, powers) {
      st.powers = powers;
      st.holder = holderOf(powers);
    }
    freshMember(id, email, invitedAtT, arrivedAtT) {
      return {
        id,
        email,
        invitedAtT,
        arrivedAtT,
        removed: false,
        lapsed: false,
        lapseWarned: false,
        signedOut: null,
        name: null,
        picture: null,
        lastActivityT: arrivedAtT ?? invitedAtT,
        okOwed: /* @__PURE__ */ new Set(),
        okGiven: /* @__PURE__ */ new Set(),
        invitationExpired: false,
        closingAck: null
      };
    }
    foldSet(id, value, by, t) {
      const st = this.settings.get(id);
      st.collecting = false;
      st.value = value;
      st.settledBy = by === "crown" ? "crown" : "convenor";
      st.settledAtT = t;
      this.foldApplications(st);
    }
    /**
     * Q506 migration (2026-08-21): a legacy applications value carried the
     * register's crown as `holder`; the pair now lives on the setting's own
     * powers like every held-able setting. The event keeps its bytes -- the
     * fold reads the holder onto the powers and strips it from what stands,
     * so an old log and a fresh session reach the same state.
     */
    foldApplications(st) {
      if (st.id !== "applications" || st.value === null) return;
      const v = st.value;
      if (v.holder === void 0) return;
      const h = v.holder;
      this.setPowers(st, {
        unilateral: h === "reserved" || h === "reserved-unilateral",
        assent: h === "reserved" || h === "reserved-assent"
      });
      st.value = { joinPolicy: v.joinPolicy };
    }
    touch(member, t) {
      const m = this.members.get(member);
      if (m) {
        m.lastActivityT = t;
        m.lapseWarned = false;
      }
      if (member === this.convenor.id) {
        this.convenor.lastActivityT = t;
        this.convenor.lapseWarned = false;
      }
    }
    // -------------------------------------------------------------------------
    // Threshold anchors (§4.3): seeded at constituted, reseeded when the room's
    // pacing settings settle late (prospective application, NOTES.md).
    computeAnchors(t) {
      const bar = this.settings.get("bar").value;
      const pace = this.settings.get("pace").value;
      const ending = this.settings.get("ending").value;
      const endPct = bar ? bar.pct : 95;
      const endT = ending ? ending.endsAtMs : null;
      const shape = endT !== null && pace?.shape === "ramp" ? "ramp" : "fixed";
      return seedAnchors(
        shape,
        shape === "ramp" ? pace.startPct : null,
        endPct,
        t,
        endT
      );
    }
    reseedAnchorsIfLive(t, setting) {
      if (this.constitutedT === null || this.anchors === null) return;
      if (setting === "ending") {
        const ending = this.settings.get("ending").value;
        this.anchors = reAnchor(this.anchors, t, ending ? ending.endsAtMs : null);
      } else if (setting === "bar" || setting === "pace") {
        this.anchors = this.computeAnchors(t);
      }
    }
    // -------------------------------------------------------------------------
    // Commands — the pre-start free hand (§9.6a)
    requirePreStart(what) {
      if (this.constitutedT !== null) {
        throw new Error(`${what} is pre-start only — after the start it is a motion (§9.6a)`);
      }
    }
    /** After the close nothing changes but the signing (SPEC §4.6). */
    requireOpen(what) {
      if (this.closedFlag) throw new Error(`the document has closed — ${what} is over (§4.6)`);
    }
    setConvenorMembership(t, isMember) {
      this.requireOpen("the founder's membership");
      this.requirePreStart("re-ticking the convenor row");
      const current = this.members.has(this.convenor.id);
      if (current === isMember) return;
      this.emit({ type: "convenor-membership-set", t, isMember });
      this.afterRosterChange(t, isMember ? "arrival" : "departure", this.convenor.id);
    }
    setSetting(t, setting, value) {
      this.requireOpen("setting");
      const entry = entryOf(setting);
      if (setting === "startingText") {
        throw new Error("the text is confirmed once, then changed by drafting (Q440)");
      }
      if (!this.settings.has(setting)) {
        throw new Error(`'${setting}' is not set this way`);
      }
      const st = this.settings.get(setting);
      if (!st.powers.unilateral) {
        if (this.constitutedT !== null) {
          throw new Error(st.powers.assent ? `'${setting}' — the unilateral power is given up; propose like a member (§9.7 v0.54)` : `'${setting}' is the members' — not the convenor's to set (§9.7)`);
        }
        throw new Error(`'${setting}' is delegated — reclaim it first (§9.0a)`);
      }
      const err = validateFor(entry, value);
      if (err) throw new Error(err);
      if (setting === "pace") {
        const ending = this.settings.get("ending").value;
        if (ending && ending.endsAtMs === null && value.shape === "ramp") {
          throw new Error("perpetual forces a fixed bar — a ramp needs an endpoint (§9.0)");
        }
      }
      const postStart = this.constitutedT !== null;
      this.emit({
        type: "setting-set",
        t,
        setting,
        value,
        by: postStart ? "crown" : "convenor"
      });
      if (CONSTITUTIONAL.has(setting)) this.oweOks(t, setting);
    }
    setQuorumForm(t, form) {
      this.requireOpen("the quorum's form");
      this.requirePreStart("re-framing the quorum question");
      if (this.quorumFormValue === form) return;
      const st = this.settings.get("quorum");
      if (st.settledBy !== null && st.holder === "convenor") {
        throw new Error("quorum is set — change it by setting a value in the new form");
      }
      if (st.answers.size > 0) {
        throw new Error("the question is collecting in the current form — answers would change meaning");
      }
      this.emit({ type: "quorum-form-set", t, form });
    }
    /**
     * Delegation — the one verb for handing a setting to the members (§9.7
     * v0.52, Ed 2026-08-19: the founder may delegate anything as soon as
     * proposing opens). Before the start a delegable setting delegates into
     * its founding question (§9.0a). Past that — and for the title and link,
     * which no blind question can collect (there is no most-protective title
     * for maxima to find) — the same verb is a hand-over: the settled value
     * stands and only the holder changes. One-way, the founder's own free
     * act; the road back is a constitutional motion (the reserve payload).
     */
    delegate(t, setting) {
      this.requireOpen("delegating");
      const entry = entryOf(setting);
      if (entry.kind === "personal") {
        throw new Error(`'${setting}' is a member's own (§9.0c) — never held, never delegated`);
      }
      if (setting === "membership") {
        throw new Error("the register is held through 'applications' -- delegate that (§9.7½)");
      }
      const st = this.settings.get(setting);
      if (this.constitutedT === null && entry.delegable) {
        if (st.holder === "members") return;
        this.emit({ type: "setting-delegated", t, setting });
        return;
      }
      if (!this.textConfirmedFlag && this.constitutedT === null) {
        throw new Error("delegation opens with proposing — confirm the starting text first (§9.7)");
      }
      if (st.holder !== "convenor") return;
      this.emit({ type: "setting-handed-over", t, setting });
    }
    /**
     * Give up one crown power on one setting (§9.7 v0.54): free, separate,
     * one-way — the road back is the room's reserve motion. Assent may go
     * from creation; unilateral change only once proposing opens, because
     * the assent-only state is inert before the start (Ed, 2026-08-19,
     * corrected the same day: delegation keeps its earlier clock).
     */
    relinquish(t, setting, power) {
      this.requireOpen("giving up a power");
      const entry = entryOf(setting);
      if (entry.kind === "personal") {
        throw new Error(`'${setting}' is a member's own (§9.0c) — never held`);
      }
      if (setting === "membership") {
        throw new Error("the register's powers are the applications setting's -- relinquish there (§9.7½)");
      }
      const st = this.settings.get(setting);
      if (!st.powers[power]) {
        throw new Error(`the ${power} power on '${setting}' is not held`);
      }
      if (power === "unilateral" && this.constitutedT === null) {
        if (!st.powers.assent && entry.delegable) {
          this.emit({ type: "setting-delegated", t, setting });
          return;
        }
        if (!this.textConfirmedFlag) {
          throw new Error("giving up unilateral change waits until proposing opens (§9.7 v0.54)");
        }
      }
      this.emit({ type: "power-relinquished", t, setting, power });
    }
    reclaim(t, setting) {
      this.requireOpen("reclaiming");
      this.requirePreStart("reclaiming");
      const st = this.settings.get(setting);
      if (!st) throw new Error(`'${setting}' is not a delegable setting`);
      if (st.holder === "convenor" && st.powers.unilateral && st.powers.assent) return;
      this.emit({ type: "setting-reclaimed", t, setting });
    }
    confirmStartingText(t, text) {
      this.requireOpen("the text");
      if (this.constitutedT !== null) {
        throw new Error("after the start the text changes by proposing in the document itself");
      }
      this.emit({ type: "starting-text-confirmed", t, text });
    }
    setIdentity(t, member, identity) {
      this.requireOpen("a name or picture");
      if (member !== this.convenor.id && !this.members.has(member)) {
        throw new Error(`unknown member '${member}'`);
      }
      const e = { type: "identity-set", t, member };
      if (identity.name !== void 0) e.name = identity.name;
      if (identity.picture !== void 0) e.picture = identity.picture;
      this.emit(e);
    }
    // -------------------------------------------------------------------------
    // The roster (§9.6a)
    invite(t, email) {
      this.requireOpen("inviting");
      if (this.constitutedT !== null && !(this.registerPowers().unilateral && !this.crownLapsedFlag)) {
        throw new Error("after the start an invitation is a constitutional motion (§9.6a)");
      }
      this.requireEmailFree(email);
      const id = `m-${this.nextMemberN}`;
      this.emit({ type: "member-invited", t, member: id, email });
      return id;
    }
    uninvite(t, member) {
      this.requireOpen("uninviting");
      this.requirePreStart("uninviting");
      const m = this.members.get(member);
      if (!m || m.removed) throw new Error(`unknown member '${member}'`);
      if (member === this.convenor.id) {
        throw new Error("the convenor unticks their own row instead (§9.6a)");
      }
      const wasInE = inE(m);
      this.emit({ type: "member-uninvited", t, member });
      if (wasInE) this.afterRosterChange(t, "departure", member);
    }
    arrive(t, member) {
      if (this.closedFlag) throw new Error("the document has closed; there is nothing left to join, only to read (§4.6)");
      const m = this.members.get(member);
      if (!m || m.removed) throw new Error(`unknown member '${member}'`);
      if (m.arrivedAtT !== null) {
        this.touch(member, t);
        return;
      }
      this.emit({ type: "member-arrived", t, member });
      this.oweOnJoining(t, member);
      this.afterRosterChange(t, "arrival", member);
    }
    // -------------------------------------------------------------------------
    // The ceremony (§9.0a)
    answer(t, member, setting, value) {
      this.requireOpen("answering");
      const m = this.members.get(member);
      if (!m || !inE(m)) throw new Error(`'${member}' is not an arrived member`);
      const st = this.settings.get(setting);
      if (!st || !st.collecting) {
        throw new Error(`'${setting}' is not collecting answers`);
      }
      const entry = entryOf(setting);
      const err = validateFor(entry, value);
      if (err) throw new Error(err);
      if (setting === "quorum" && value.form !== this.quorumFormValue) {
        throw new Error(`the quorum question is asked as a ${this.quorumFormValue} (§9.0a)`);
      }
      if (setting === "pace") {
        const ending = this.settings.get("ending").value;
        if (ending && ending.endsAtMs === null && value.shape === "ramp") {
          throw new Error("perpetual forces a fixed bar — a ramp needs an endpoint (§9.0)");
        }
      }
      for (const dep of entry.deps) {
        const depSt = this.settings.get(dep);
        if (depSt && depSt.settledBy === null) {
          throw new Error(`'${setting}' waits on '${dep}' (§9.0a)`);
        }
      }
      this.emit({ type: "answer-given", t, member, setting, value });
      this.maybeResolve(t, setting);
    }
    giveOk(t, member, setting) {
      this.requireOpen("acknowledging");
      const m = this.members.get(member);
      if (!m) throw new Error(`unknown member '${member}'`);
      if (!m.okOwed.has(setting)) return;
      this.emit({ type: "ok-given", t, member, setting });
    }
    // -------------------------------------------------------------------------
    // Follow-on emitters (the maybeAdopt pattern — command layer only)
    maybeResolve(t, setting) {
      const st = this.settings.get(setting);
      if (!st.collecting) return;
      const entry = entryOf(setting);
      for (const dep of entry.deps) {
        const depSt = this.settings.get(dep);
        if (depSt && depSt.settledBy === null) return;
      }
      if ([...this.members.values()].some((m) => m.arrivedAtT === null && !m.removed)) return;
      const electorate = eOf(this.members.values());
      if (electorate.length < 2) return;
      if (!electorate.every((m) => st.answers.has(m.id))) return;
      const answers = electorate.map((m) => st.answers.get(m.id));
      const { value, distribution } = resolveConsent(entry, answers);
      this.emit({
        type: "question-resolved",
        t,
        setting,
        value,
        distribution,
        electorate: electorate.map((m) => m.id).sort()
      });
    }
    maybeResolveAll(t) {
      for (const id of MANAGED) this.maybeResolve(t, id);
    }
    /**
     * 🍾 **Begin — the founder's explicit act of starting the document**
     * (CLAUDE.md `🍾 Begin`, Q443; built 2026-08-21). Until now the
     * constitution constituted itself the moment its last judge-gate setting
     * settled; now nothing starts until the founder says so. Judging needs the
     * whole constitution (§9.0b: a judgment is recorded under a disclosure
     * setting and counted towards a quorum, neither settleable afterwards), so
     * 🍾 refuses while any judge-gate setting is still being decided — and
     * names it, which is what the readiness readout is for. The batch is the
     * `constituted` fold: the Text's ✒️/🛡️ laid down, the ramp anchored,
     * judging open. Readiness informs and never blocks (Q443c): a member who
     * has not answered a question the room has already resolved holds nothing up.
     */
    begin(t) {
      this.requireOpen("beginning");
      if (this.constitutedT !== null) throw new Error("the document has already begun");
      const waiting = this.waitingOn();
      if (waiting.length > 0) {
        throw new Error(`the document cannot begin while '${waiting.join("', '")}' ${waiting.length === 1 ? "is" : "are"} still being decided (§9.0b)`);
      }
      this.emit({ type: "constituted", t });
    }
    /** The judge-gate settings not yet settled — what 🍾 waits on. */
    waitingOn() {
      return CATALOGUE.filter((e) => e.judgeGate && this.settings.get(e.id).settledBy === null).map((e) => e.id);
    }
    /**
     * The founder's readiness readout (Q443 (a)(i), both halves; founder-only
     * by the host's choice — it is part of the 🍾 task, not of the document).
     * Per question: whether it stands, and how many have answered. Per person:
     * how many of the questions they owe they have answered. **Participation
     * itemised by name, never preference** — no value, no running maximum.
     */
    readiness() {
      const E = eOf(this.members.values());
      const open = MANAGED.filter((id) => this.settings.get(id).collecting);
      const questions = MANAGED.filter((id) => {
        const st = this.settings.get(id);
        return st.collecting || st.distribution !== null;
      }).map((id) => {
        const st = this.settings.get(id);
        return {
          setting: id,
          settled: st.settledBy !== null,
          collecting: st.collecting,
          answered: st.answers.size,
          electorate: E.length
        };
      });
      const members = [...this.members.values()].filter((m) => !m.removed && !m.invitationExpired).map((m) => ({
        id: m.id,
        name: m.name,
        arrived: m.arrivedAtT !== null,
        owed: m.arrivedAtT === null ? 0 : open.length,
        answered: m.arrivedAtT === null ? 0 : open.filter((id) => this.settings.get(id).answers.has(m.id)).length
      }));
      const waiting = this.waitingOn();
      return { ready: this.constitutedT === null && waiting.length === 0, waiting, questions, members };
    }
    /**
     * Presence is presence (Q459 (a)): an authenticated read refreshes the
     * member's activity clock, so nobody lapses with the page open in front of
     * them. At most one event an hour per member, or a polling page would write
     * the log every four seconds. Returns whether anything was recorded.
     */
    seen(t, member) {
      if (this.closedFlag) return false;
      const m = this.members.get(member);
      const rec = m ?? (member === this.convenor.id ? this.convenor : null);
      if (!rec || m && m.removed) return false;
      if (m && m.arrivedAtT === null) return false;
      if (m && m.lapsed) return false;
      if (t - rec.lastActivityT < SEEN_EVERY_MS) return false;
      this.emit({ type: "member-seen", t, member });
      return true;
    }
    oweOks(t, setting) {
      for (const m of eOf(this.members.values())) {
        if (m.id === this.convenor.id) continue;
        if (m.okOwed.has(setting)) continue;
        this.emit({ type: "ok-owed", t, member: m.id, settings: [setting] });
      }
    }
    afterRosterChange(t, cause, member) {
      const shifted = MANAGED.filter((id) => {
        const st = this.settings.get(id);
        return st.collecting && st.answers.size > 0;
      });
      if (shifted.length > 0) {
        this.emit({ type: "ceremony-ground-shifted", t, settings: shifted, cause, member });
      }
      const E = eOf(this.members.values()).length;
      const q = this.settings.get("quorum").value;
      this.emit({
        type: "floor-recomputed",
        t,
        E,
        quorumN: q ? quorumCount(q, E) : null,
        floorTerm: adoptionFloorTerm(E)
      });
      this.maybeResolveAll(t);
      this.maybeSettleMotions(t);
    }
    // -------------------------------------------------------------------------
    // Motions (§9.6, v0.48): the one act by which a settled document changes
    // its own rules. The route is a fact about the setting.
    openMotion(t, by, payload, why) {
      this.requireOpen("a motion");
      if (this.constitutedT === null) {
        throw new Error("before the start nothing is amended — only set (§9.6a)");
      }
      const mover = this.members.get(by);
      if (!mover || !inE(mover)) throw new Error(`'${by}' is not an arrived member`);
      let route;
      if (payload.kind === "set") {
        const entry = entryOf(payload.setting);
        if (entry.kind === "personal") throw new Error(`${payload.setting} is yours alone (§9.0c)`);
        if (payload.setting === "startingText" || !this.settings.has(payload.setting)) {
          throw new Error(`'${payload.setting}' is not moved this way`);
        }
        const st = this.settings.get(payload.setting);
        if (st.value === null) throw new Error(`'${payload.setting}' has no settled value to move against`);
        const err = validateFor(entry, payload.value);
        if (err) throw new Error(err);
        if (eqValue(payload.value, st.value)) {
          throw new Error("the motion proposes what already stands");
        }
        route = motionRouteOf(entry, payload.value, st.value);
      } else if (payload.kind === "reserve") {
        const re = entryOf(payload.setting);
        if (re.kind === "personal") {
          throw new Error(`'${payload.setting}' is never held, so it cannot be reserved (§9.7)`);
        }
        if (payload.setting === "membership") {
          throw new Error("the register's crown is the applications setting's -- reserve that (§9.7½)");
        }
        const rst = this.settings.get(payload.setting);
        const want = payload.power ?? "both";
        const already = want === "both" ? rst.powers.unilateral && rst.powers.assent : rst.powers[want];
        if (already) {
          throw new Error(`'${payload.setting}' — ${want === "both" ? "both powers are" : `the ${want} power is`} already the convenor's`);
        }
        route = "constitutional";
      } else if (payload.kind === "invite") {
        this.requireEmailFree(payload.email);
        route = "constitutional";
      } else if (payload.kind === "remove") {
        const target = this.members.get(payload.member);
        if (!target || !inE(target)) throw new Error(`'${payload.member}' is not a member`);
        route = this.removalRung() === "ordinary" ? "ordinary" : "constitutional";
      } else {
        route = "ordinary";
      }
      if (route === "constitutional" && this.heldOutBy(by)) {
        throw new Error("one 🏛️ out per member at a time (§9.6)");
      }
      const id = `mo-${this.nextMotionN}`;
      const e = {
        type: "motion-opened",
        t,
        motion: id,
        by,
        payload,
        route,
        stake: route === "ordinary" ? 1 : 0
      };
      if (why !== void 0 && why !== "") e.why = why;
      this.emit(e);
      if (route === "constitutional") {
        this.emit({ type: "motion-answer", t, motion: id, member: by, answer: "accept" });
        this.maybeSettleMotions(t);
      }
      return id;
    }
    answerMotion(t, member, motion, answer) {
      this.requireOpen("answering a motion");
      const rec = this.motions.get(motion);
      if (!rec || rec.status !== "running") throw new Error("the motion is not running");
      if (rec.route !== "constitutional") {
        throw new Error("an ordinary motion is judged as a race, not answered (§9.6)");
      }
      const m = this.members.get(member);
      if (!m || !motionElectorateOf([m]).length) {
        throw new Error(`'${member}' is not in the motion's electorate`);
      }
      if (this.motionExcludes(rec) === member) {
        throw new Error("the subject of a removal is not asked on this route (🚪 Q401a) — they see it, and it settles without them");
      }
      this.emit({ type: "motion-answer", t, motion, member, answer });
      this.maybeSettleMotions(t);
    }
    withdrawMotion(t, member, motion) {
      this.requireOpen("withdrawing");
      const rec = this.motions.get(motion);
      if (!rec || rec.status !== "running") throw new Error("the motion is not running");
      if (rec.by !== member) throw new Error("only the mover withdraws a motion");
      this.emit({ type: "motion-withdrawn", t, motion });
    }
    /**
     * The ordinary-route seam: this package never runs races. The host — the
     * engine, the sim, a mock — judges the motion at the bar and reports the
     * outcome here; post-368 the caller is an engine-core race over the value.
     */
    adjudicateOrdinaryMotion(t, motion, outcome) {
      this.requireOpen("a motion");
      const rec = this.motions.get(motion);
      if (!rec || rec.status !== "running") throw new Error("the motion is not running");
      if (rec.route !== "ordinary") {
        throw new Error("a constitutional motion settles by unanimity, not adjudication");
      }
      this.emit({ type: "motion-adjudicated", t, motion, outcome });
      const after = this.motions.get(motion).status;
      if (after === "awaiting-crown") {
        this.emit({
          type: "crown-question-opened",
          t,
          question: `cq-${this.nextCrownN}`,
          motion: rec.id
        });
      } else if (after === "carried") {
        this.settleCarriedEffects(
          t,
          rec,
          /* everyoneHadSay */
          false
        );
      } else if (after === "held") {
        this.settleHeldEffects(t, rec);
      }
    }
    answerCrownQuestion(t, question, outcome) {
      this.requireOpen("the 👑 question");
      const q = this.crownQuestions.get(question);
      if (!q || q.status !== "pending") throw new Error("no such pending 👑 question");
      if (this.crownLapsedFlag) throw new Error("the crown has lapsed — the question passes by itself");
      this.emit({ type: "crown-question-answered", t, question, outcome });
      if (q.motion === null) return;
      const rec = this.motions.get(q.motion);
      if (outcome === "accept") {
        this.settleCarriedEffects(t, rec, rec.route === "constitutional");
      } else {
        this.settleHeldEffects(t, rec);
      }
    }
    /** 🚪 (Q401): the removal rung as it stands — unset reads as today's rule,
     *  everyone's consent with the subject's own answer counted. */
    removalRung() {
      const st = this.settings.get("removal");
      const v = st ? st.value : null;
      return v?.rung ?? "everyone";
    }
    /** Under 'others', the subject of a removal stands outside its electorate
     *  (Q401a) — they see the motion, and it settles without them. Read live,
     *  like the electorate itself: a rung change mid-motion is a ground shift. */
    motionExcludes(rec) {
      return rec.payload.kind === "remove" && this.removalRung() === "others" ? rec.payload.member : null;
    }
    heldOutBy(member) {
      for (const rec of this.motions.values()) {
        if (rec.by === member && rec.route === "constitutional" && (rec.status === "running" || rec.status === "awaiting-crown")) {
          return true;
        }
      }
      return false;
    }
    /**
     * The settle check (v0.48): a constitutional motion carries at the moment
     * every currently active member — the quorum base, evaluated live — stands
     * at accept or abstain with no keep standing. Re-run on every answer and
     * every roster event; a standing keep blocks but does not kill.
     */
    maybeSettleMotions(t) {
      let settled = true;
      while (settled) {
        settled = false;
        for (const rec of this.motions.values()) {
          if (rec.status !== "running" || rec.route !== "constitutional") continue;
          const excl = this.motionExcludes(rec);
          const electorate = motionElectorateOf(this.members.values()).filter((m2) => m2.id !== excl);
          if (electorate.length === 0) continue;
          const answers = electorate.map((m) => rec.answers.get(m.id));
          if (answers.some((a) => a === void 0 || a === "keep")) continue;
          if (!answers.some((a) => a === "accept")) continue;
          if (this.reservedTarget(rec)) {
            this.emit({
              type: "crown-question-opened",
              t,
              question: `cq-${this.nextCrownN}`,
              motion: rec.id
            });
            settled = true;
            break;
          }
          this.emit({ type: "motion-carried", t, motion: rec.id });
          this.settleCarriedEffects(t, rec, true);
          settled = true;
          break;
        }
      }
    }
    /** Follow-ons of a carried motion: membership events and owed OKs. */
    settleCarriedEffects(t, rec, everyoneHadSay) {
      if (rec.payload.kind === "invite") {
        const id = `m-${this.nextMemberN}`;
        this.emit({
          type: "member-invited",
          t,
          member: id,
          email: rec.payload.email,
          viaMotion: rec.id
        });
      } else if (rec.payload.kind === "remove") {
        const target = rec.payload.member;
        const wasInE = inE(this.members.get(target));
        this.emit({ type: "member-removed", t, member: target, viaMotion: rec.id });
        if (wasInE) this.afterRosterChange(t, "departure", target);
      } else if (rec.payload.kind === "set" && CONSTITUTIONAL.has(rec.payload.setting)) {
        for (const m of this.members.values()) {
          if (m.removed) continue;
          if (m.arrivedAtT === null) continue;
          if (everyoneHadSay && rec.answers.has(m.id)) continue;
          if (m.okOwed.has(rec.payload.setting)) continue;
          this.emit({ type: "ok-owed", t, member: m.id, settings: [rec.payload.setting] });
        }
      }
      if (rec.payload.kind === "admit") {
        const id = `m-${this.nextMemberN}`;
        this.emit({
          type: "member-admitted",
          t,
          applicant: rec.payload.applicant,
          member: id
        });
        this.oweOnJoining(t, id);
        this.afterRosterChange(t, "arrival", id);
      }
    }
    /** A joiner is owed an OK on every constitutional setting they had no say in. */
    oweOnJoining(t, member) {
      const owed = this.settledConstitutionalIds().filter((id) => !this.settings.get(id).answers.has(member));
      if (owed.length > 0) this.emit({ type: "ok-owed", t, member, settings: owed });
    }
    /** Follow-ons of a held motion: a refused application is told so (§9.7½). */
    settleHeldEffects(t, rec) {
      if (rec.payload.kind === "admit") {
        this.emit({ type: "application-refused", t, applicant: rec.payload.applicant });
      }
    }
    // -------------------------------------------------------------------------
    // Presence, the freeze and the lapse clocks (§9.5, §9.5a)
    signOut(t, member, mode) {
      this.requireOpen("signing out");
      const m = this.members.get(member);
      if (!m || !inE(m)) throw new Error(`'${member}' is not an arrived member`);
      this.emit({ type: "signed-out", t, member, mode });
      this.maybeSettleMotions(t);
      this.maybeFreezeOrThaw(t);
    }
    /**
     * Revival is just logging in again (§9.5a) — the host calls this on any
     * authenticated return. Emits only when there is something to revive;
     * routine activity rides the member's own commands (NOTES.md).
     */
    memberReturn(t, member) {
      if (member === this.convenor.id && this.crownLapsedFlag) {
        this.emit({ type: "crown-returned", t });
      }
      const m = this.members.get(member);
      if (!m || m.removed) {
        if (member === this.convenor.id) return;
        throw new Error(`unknown member '${member}'`);
      }
      if (m.signedOut === null && !m.lapsed && !m.lapseWarned) return;
      const wasLapsed = m.lapsed;
      this.emit({ type: "member-returned", t, member });
      if (wasLapsed) this.afterRosterChange(t, "arrival", member);
      else this.maybeSettleMotions(t);
      this.maybeFreezeOrThaw(t);
    }
    /**
     * All clock-driven events flow through one host-called tick (the package
     * has no wall clock): lapse warnings, lapses, the crown's own clock, and
     * the freeze line.
     */
    tick(t) {
      if (this.constitutedT !== null && !this.closedFlag) {
        const ending = this.settings.get("ending").value;
        if (ending && ending.endsAtMs !== null && t >= ending.endsAtMs) {
          this.runClose(ending.endsAtMs);
          return;
        }
      }
      if (this.closedFlag) return;
      const lapse = this.settings.get("lapse").value;
      if (lapse && lapse.afterMs !== null) {
        for (const m of [...this.members.values()]) {
          if (!inE(m)) continue;
          const due = lapseDue(m.lastActivityT, lapse.afterMs);
          if (t >= due.lapseAtT) {
            this.emit({ type: "member-lapsed", t, member: m.id });
            this.afterRosterChange(t, "departure", m.id);
          } else if (t >= due.warnAtT && !m.lapseWarned) {
            this.emit({ type: "lapse-warned", t, member: m.id });
          }
        }
        if (!this.crownLapsedFlag && this.holdsAnythingReserved()) {
          const due = lapseDue(this.convenor.lastActivityT, lapse.afterMs);
          if (t >= due.lapseAtT) {
            this.emit({ type: "crown-lapsed", t });
            for (const q of [...this.crownQuestions.values()]) {
              if (q.status !== "pending") continue;
              this.emit({ type: "crown-question-auto-passed", t, question: q.id });
              if (q.motion !== null) {
                const mrec = this.motions.get(q.motion);
                this.settleCarriedEffects(t, mrec, mrec.route === "constitutional");
              }
            }
          } else if (t >= due.warnAtT && !this.convenor.lapseWarned && !this.members.has(this.convenor.id)) {
            this.emit({ type: "lapse-warned", t, member: this.convenor.id });
          }
        }
      }
      this.maybeFreezeOrThaw(t);
    }
    holdsAnythingReserved() {
      for (const st of this.settings.values()) {
        if (st.holder === "convenor") return true;
      }
      return false;
    }
    /**
     * The host's explicit close (SPEC §4.6) — a perpetual document's freeze
     * made final, or a caller standing in for the clock. The windowed close
     * runs itself from `tick` when the ending is crossed.
     */
    close(t) {
      if (this.constitutedT === null) throw new Error("nothing to close before the start");
      if (this.closedFlag) return;
      this.runClose(t);
    }
    /**
     * T=0 (SPEC §4.6): the closing act already happened when the close was
     * set, so this is the room's own decision executing. A constitutional
     * motion still running resolves *kept* (what stands stands, the mover's
     * 🏛️ returns); a 👑 question pending fails closed (carried-but-
     * unassented — lapse auto-pass does not fire, because the close is
     * everybody's deadline, not one absence); an invitation outstanding
     * expires. Ordinary motions are the engine's races — the bridge holds
     * them at the close and reports through `adjudicateOrdinaryMotion`.
     */
    runClose(t) {
      this.emit({ type: "closed", t });
      for (const rec of [...this.motions.values()]) {
        if (rec.status === "running" && rec.route === "constitutional") {
          this.emit({ type: "motion-kept-at-close", t, motion: rec.id });
        }
      }
      for (const q of [...this.crownQuestions.values()]) {
        if (q.status === "pending") {
          this.emit({ type: "crown-failed-closed", t, question: q.id });
        }
      }
      for (const m of [...this.members.values()]) {
        if (!m.removed && m.arrivedAtT === null && !m.invitationExpired) {
          this.emit({ type: "invitation-expired", t, member: m.id });
        }
      }
    }
    /**
     * A member acknowledges the close (SPEC §4.6): OK on the 🥂 card. The
     * acknowledgment *is* the signature, and the comment — freely blank,
     * dissent as welcome as praise — is the signing rationale. Per member,
     * once, on their own clock; a clerk who was never a member cannot sign.
     */
    acknowledgeClose(t, member, comment) {
      if (!this.closedFlag) throw new Error("the document has not closed");
      const m = this.members.get(member);
      if (!m || m.removed) throw new Error(`'${member}' is not a member`);
      if (m.closingAck !== null) throw new Error("already signed");
      this.emit({ type: "close-acknowledged", t, member, comment });
    }
    /** The freeze line (§9.5): counted base below quorum parks the document. */
    maybeFreezeOrThaw(t) {
      if (this.constitutedT === null) return;
      const q = this.settings.get("quorum").value;
      if (!q) return;
      const E = eOf(this.members.values()).length;
      const counted = quorumBaseOf(this.members.values()).length;
      const needed = quorumCount(q, E);
      if (!this.frozenFlag && counted < needed) {
        this.emit({ type: "frozen", t });
      } else if (this.frozenFlag && counted >= needed) {
        this.emit({ type: "thawed", t });
      }
    }
    // -------------------------------------------------------------------------
    // Applications (§9.7½)
    joinPolicy() {
      const apps = this.settings.get("applications").value;
      return apps ? apps.joinPolicy : "invite";
    }
    startApplication(t, email) {
      this.requireOpen("applying");
      if (this.joinPolicy() === "invite") {
        throw new Error("this document is invitation-only (§9.7½)");
      }
      this.requireEmailFree(email);
      for (const a of this.applicants.values()) {
        if (a.email === email && a.status !== "refused") {
          throw new Error("an application from that address is already underway");
        }
      }
      const id = `ap-${this.nextApplicantN}`;
      this.emit({ type: "application-started", t, applicant: id, email });
      return id;
    }
    verifyApplication(t, applicant) {
      this.requireOpen("applying");
      const a = this.applicants.get(applicant);
      if (!a || a.status !== "started") throw new Error("nothing to verify");
      this.emit({ type: "application-verified", t, applicant });
    }
    /** Nothing is sent before Submit; an empty application is a real application. */
    submitApplication(t, applicant, fields = {}) {
      this.requireOpen("applying");
      const a = this.applicants.get(applicant);
      if (!a || a.status !== "verified") {
        throw new Error("an application is verified by magic link before it can be submitted (§9.7½)");
      }
      const e = { type: "application-submitted", t, applicant };
      if (fields.name !== void 0) e.name = fields.name;
      if (fields.picture !== void 0) e.picture = fields.picture;
      if (fields.words !== void 0) e.words = fields.words;
      this.emit(e);
      const policy = this.joinPolicy();
      if (policy === "open") {
        const id = `m-${this.nextMemberN}`;
        this.emit({ type: "member-admitted", t, applicant, member: id });
        this.oweOnJoining(t, id);
        this.afterRosterChange(t, "arrival", id);
      } else if (policy === "apply") {
        this.emit({
          type: "motion-opened",
          t,
          motion: `mo-${this.nextMotionN}`,
          by: null,
          payload: { kind: "admit", applicant },
          route: "ordinary",
          stake: 0
        });
      }
    }
    /** A second is a proposed application (§9.7½, Q348a): the member stakes the ✏️.
     *  The rationale is theirs to write or leave blank (v0.57) — the lane is
     *  offered by the surface, never demanded by the mechanism. */
    proposeApplicant(t, member, applicant, why) {
      this.requireOpen("proposing");
      if (this.joinPolicy() !== "proposed") {
        throw new Error("this document's applications are not proposed (§9.7½)");
      }
      const m = this.members.get(member);
      if (!m || !inE(m)) throw new Error(`'${member}' is not an arrived member`);
      const a = this.applicants.get(applicant);
      if (!a || a.status !== "submitted") throw new Error("no submitted application to propose");
      this.emit({ type: "application-proposed", t, applicant, by: member });
      const e = {
        type: "motion-opened",
        t,
        motion: `mo-${this.nextMotionN}`,
        by: member,
        payload: { kind: "admit", applicant },
        route: "ordinary",
        stake: 1
      };
      if (why !== void 0 && why.trim() !== "") e.why = why;
      this.emit(e);
    }
    // -------------------------------------------------------------------------
    // Reads used by projections (view.ts owns the member-facing surface)
    /** The register's crown as the two powers (§9.7 v0.54), lapse ignored —
     *  a sleeping crown still holds; callers check the lapse where it bites. */
    registerPowers() {
      return { ...this.settings.get("applications").powers };
    }
    /** Any register power held and the crown awake — the direct-invite gate. */
    membershipReserved() {
      const rp = this.registerPowers();
      return (rp.unilateral || rp.assent) && !this.crownLapsedFlag;
    }
    /**
     * 👑 by any reservation (Ed, 2026-08-18, Q379 wide): the mark reads what
     * the convenor holds, not the membership alone — and a sleeping crown
     * still holds it (lapse grants assent, it does not transfer anything).
     * The Text counts (Q440, 2026-08-21): a founder who keeps the pen or the
     * shield on the document itself is a crown by the same rule as anywhere.
     */
    crowned() {
      for (const st of this.settings.values()) {
        if (st.holder === "convenor") return true;
      }
      return false;
    }
    /**
     * Q440: the shield on the Text means an **adoption** waits on the
     * founder's accept -- assent over the drafting mechanism itself. The
     * engine has already adopted; the host asks here whether the document it
     * serves may follow, and a sleeping crown grants (lapse is abstention).
     */
    textAdoptionNeedsAssent() {
      return this.settings.get("startingText").powers.assent && !this.crownLapsedFlag;
    }
    /** Open the 👑 question for one adopted candidate; the host reads its
     *  record (`crownQuestionRecords`) to learn accept / reject / auto-pass. */
    openTextCrownQuestion(t, text) {
      this.requireOpen("the 👑 question");
      if (this.constitutedT === null) throw new Error("nothing adopts before the start");
      if (!this.textAdoptionNeedsAssent()) {
        throw new Error("the Text carries no assent -- the adoption stands by itself");
      }
      for (const q of this.crownQuestions.values()) {
        if (q.status === "pending" && q.text?.candidateId === text.candidateId) {
          throw new Error("that adoption already awaits the crown");
        }
      }
      const id = `cq-${this.nextCrownN}`;
      this.emit({ type: "crown-question-opened", t, question: id, motion: null, text });
      return id;
    }
    settledConstitutionalIds() {
      return [...CONSTITUTIONAL].filter((id) => this.settings.get(id).settledBy !== null);
    }
    requireEmailFree(email) {
      for (const m of this.members.values()) {
        if (!m.removed && m.email === email) {
          throw new Error("that address is already on the membership — log in instead (§9.7½)");
        }
      }
      if (this.convenor.email === email && this.members.has(this.convenor.id)) {
        throw new Error("that address is already on the membership — log in instead (§9.7½)");
      }
    }
    // -------------------------------------------------------------------------
    // Plain accessors (host-facing; blind projections live in view.ts)
    get titleOf() {
      return this.settings.get("title").value.text;
    }
    get slug() {
      return this.settings.get("link").value.slug;
    }
    get slugs() {
      return this.slugHistory;
    }
    get constitutedAtT() {
      return this.constitutedT;
    }
    get frozen() {
      return this.frozenFlag;
    }
    get closed() {
      return this.closedFlag;
    }
    get closedAt() {
      return this.closedT;
    }
    /** How many must return to thaw (§9.5): the quorum shortfall while frozen, null otherwise. */
    mustReturn() {
      if (!this.frozenFlag) return null;
      const q = this.settings.get("quorum").value;
      if (!q) return null;
      const E = eOf(this.members.values()).length;
      const counted = quorumBaseOf(this.members.values()).length;
      return Math.max(0, quorumCount(q, E) - counted);
    }
    /**
     * The signatures block (SPEC §4.6): who has acknowledged the close, in the
     * order they signed, each with their comment. Names follow the ✍️ signing
     * setting — `nobody` anonymises every signature, `each` lets the signer's
     * own name stand, `everybody` names all. The comment is always shown; it
     * is the rationale, and blank is a real signature.
     */
    closingSignatures() {
      const signing = this.settings.get("signing").value;
      const rung = signing?.rung ?? "each";
      const out = [];
      for (const m of this.members.values()) {
        if (m.closingAck === null) continue;
        out.push({
          member: m.id,
          name: rung === "nobody" ? null : m.name,
          comment: m.closingAck.comment,
          t: m.closingAck.t
        });
      }
      return out.sort((a, b) => a.t - b.t);
    }
    get textConfirmed() {
      return this.textConfirmedFlag;
    }
    get text() {
      return this.startingText;
    }
    get quorumForm() {
      return this.quorumFormValue;
    }
    get crownLapsed() {
      return this.crownLapsedFlag;
    }
    convenorRecord() {
      return this.convenor;
    }
    memberRecords() {
      return this.members;
    }
    settingState(id) {
      const st = this.settings.get(id);
      if (!st) throw new Error(`'${id}' has no setting state`);
      return st;
    }
    motionRecords() {
      return this.motions;
    }
    crownQuestionRecords() {
      return this.crownQuestions;
    }
    applicantRecords() {
      return this.applicants;
    }
    E() {
      return eOf(this.members.values()).length;
    }
    quorumBase() {
      return quorumBaseOf(this.members.values()).length;
    }
    motionElectorate() {
      return motionElectorateOf(this.members.values()).map((m) => m.id);
    }
    /** The bar now, percent (§4.3). Null before the document is constituted. */
    bar(t) {
      return this.anchors === null ? null : barAt(this.anchors, t);
    }
    /** Judging is the room's gate (§9.0b): open from constituted, parked by freeze. */
    canJudge() {
      return this.constitutedT !== null && !this.frozenFlag;
    }
    /** Proposing is yours (§9.0b): confirmed text plus your own outstanding answers. */
    canPropose(member) {
      if (!this.textConfirmedFlag) return false;
      const m = this.members.get(member);
      if (!m || !inE(m)) return false;
      for (const id of MANAGED) {
        const st = this.settings.get(id);
        if (st.collecting && this.answerable(id) && !st.answers.has(member)) return false;
      }
      return true;
    }
    /** A collecting question is only outstanding once its dependencies settled. */
    answerable(id) {
      return entryOf(id).deps.every((dep) => {
        const st = this.settings.get(dep);
        return !st || st.settledBy !== null;
      });
    }
    // -------------------------------------------------------------------------
    // Integrity (SPEC §11)
    verifyChain() {
      let prev = "";
      for (const entry of this.log) {
        if (entry.prevHash !== prev) return false;
        if (entry.hash !== chainHash(prev, entry.event)) return false;
        prev = entry.hash;
      }
      return true;
    }
    rollingHash() {
      return this.log.length > 0 ? this.log[this.log.length - 1].hash : "";
    }
    logEntries() {
      return this.log;
    }
    /** Every member can verify their own moves were counted (SPEC §11). */
    receipt(memberId) {
      return this.log.filter((entry) => {
        const e = entry.event;
        return e.member === memberId || e.by === memberId;
      }).map((entry) => ({ seq: entry.seq, hash: entry.hash }));
    }
  };

  // src/view.ts
  var MANAGED2 = CATALOGUE.filter((e) => e.kind !== "personal" && e.id !== "membership" && e.id !== "startingText");
  function view(s, member) {
    const me = s.memberRecords().get(member) ?? null;
    const isConvenor = member === s.convenorRecord().id;
    const electorateSize = s.motionElectorate().length;
    const questions = [];
    const resolutions = [];
    const settings = [];
    {
      const st = s.settingState("startingText");
      settings.push({
        setting: "startingText",
        glyph: "📄",
        kind: "ordinary",
        holder: st.holder,
        powers: { ...st.powers },
        value: null,
        settledBy: null,
        settledAtT: null,
        collecting: false
      });
    }
    for (const entry of MANAGED2) {
      const st = s.settingState(entry.id);
      settings.push({
        setting: entry.id,
        glyph: entry.glyph,
        kind: entry.kind,
        holder: st.holder,
        powers: { ...st.powers },
        value: st.value,
        settledBy: st.settledBy,
        settledAtT: st.settledAtT,
        collecting: st.collecting
      });
      if (st.collecting) {
        const answerable = entry.deps.every((d) => s.settingState(d).settledBy !== null);
        const eIds = new Set(s.motionElectorate());
        let answered = 0;
        for (const id of st.answers.keys()) if (eIds.has(id)) answered += 1;
        questions.push({
          setting: entry.id,
          glyph: entry.glyph,
          answerable,
          answeredCount: answered,
          electorateSize,
          myAnswer: me ? st.answers.get(member) ?? null : null
        });
      }
      if (st.settledBy === "ceremony" && st.distribution && st.settledAtT !== null) {
        resolutions.push({
          setting: entry.id,
          value: st.value,
          distribution: st.distribution,
          settledAtT: st.settledAtT
        });
      }
    }
    const motions = [];
    let myHeldMotion = null;
    for (const rec of s.motionRecords().values()) {
      if ((rec.status === "running" || rec.status === "awaiting-crown") && rec.route === "constitutional" && rec.by === member) {
        myHeldMotion = rec.id;
      }
      motions.push({
        id: rec.id,
        route: rec.route,
        payload: rec.payload,
        why: rec.why,
        status: rec.status,
        mine: rec.by === member,
        answeredCount: rec.route === "constitutional" ? rec.answers.size : 0,
        electorateSize,
        myAnswer: rec.answers.get(member) ?? null
      });
    }
    const rp = s.registerPowers();
    const register = {
      holder: holderOf(rp),
      powers: rp
    };
    const applicants = [];
    for (const a of s.applicantRecords().values()) {
      if (a.status === "started") continue;
      applicants.push({
        id: a.id,
        email: a.email,
        name: a.name,
        picture: a.picture,
        words: a.words,
        status: a.status,
        motion: a.motion
      });
    }
    const convenorId = s.convenorRecord().id;
    const members = [];
    for (const rec of s.memberRecords().values()) {
      if (rec.removed) continue;
      members.push({
        id: rec.id,
        email: rec.email,
        name: rec.name,
        picture: rec.picture,
        arrived: rec.arrivedAtT !== null,
        lapsed: rec.lapsed,
        isConvenor: rec.id === convenorId
      });
    }
    return {
      gates: {
        reading: true,
        proposing: me ? s.canPropose(member) : false,
        judging: s.canJudge()
      },
      questions,
      resolutions,
      settings,
      members,
      register,
      applicants,
      owedOks: me ? [...me.okOwed] : [],
      motions,
      myHeldMotion,
      crownTasks: isConvenor ? [...s.crownQuestionRecords().values()].filter((q) => q.status === "pending").map((q) => ({ id: q.id, motion: q.motion, ...q.text ? { text: q.text } : {} })) : [],
      identity: me ? { name: me.name, picture: me.picture } : isConvenor ? { name: s.convenorRecord().name, picture: s.convenorRecord().picture } : { name: null, picture: null },
      lapseWarned: me ? me.lapseWarned : isConvenor ? s.convenorRecord().lapseWarned : false,
      frozen: s.frozen,
      mustReturn: s.mustReturn(),
      closed: s.closed ? {
        at: s.closedAt,
        mySignature: me && me.closingAck ? me.closingAck : null,
        signatures: s.closingSignatures()
      } : null
    };
  }
  function constitutionBlock(s) {
    const c = s.convenorRecord();
    const member = s.memberRecords().get(c.id);
    return {
      convenor: {
        name: member ? member.name : c.name,
        picture: member ? member.picture : c.picture,
        crowned: s.crowned()
        // any reservation (Q379 wide), sleeping or not
      },
      constitutedAtT: s.constitutedAtT,
      rules: MANAGED2.filter((e) => e.kind === "constitutional").map((e) => {
        const st = s.settingState(e.id);
        return { setting: e.id, glyph: e.glyph, value: st.value, holder: st.holder };
      })
    };
  }
  function roomSettings(s) {
    const out = {};
    for (const entry of MANAGED2) {
      const st = s.settingState(entry.id);
      out[entry.id] = { value: st.value, settledBy: st.settledBy, holder: st.holder };
    }
    return out;
  }
  return __toCommonJS(browser_exports);
})();
