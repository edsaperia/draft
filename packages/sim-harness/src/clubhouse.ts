/**
 * The clubhouse scenario: a fourteen-member club running a leased house
 * with a guest bedroom, a garden, keys, a treasury, a weekly dinner, and
 * offices — a document of charter-like complexity where the clauses
 * genuinely depend on each other (couplings), built for the calibration
 * sweep and for the full persona cast.
 *
 * Position axis, every issue: -1 = informal / discretionary / open,
 * +1 = formal / collective / controlled. Quality is craft: how well the
 * line would actually run the house, independent of where it sits.
 */

import type { Scenario } from './scenario.js';

const L = {
  title: '# The Hollow Oak Club — House Charter',
  mission:
    'The Hollow Oak Club exists so that its members may have a place of their own: to meet, make, cook, argue, garden, and put the world to rights.',
  lease:
    "The clubhouse at 44 Aldermoss Lane is held on a long lease from the Marchmont Trust, which reserves to itself the fabric of the building, the lease itself, insurance, and compliance with the law; everything else about the life of the house is the Club's to govern.",
  reversion:
    "Should the Club cease to operate any part of house life, its management reverts to the Trust, which will run it plainly on the Club's behalf; reversion is not a sanction, and any function may be reclaimed by a valid decision.",
  houseHeader: '## The House',
  house:
    'The house comprises the Common Room, the Kitchen, the Workshop, the Library Corner, the Guest Bedroom upstairs, and the Garden behind, together with the cellar and the shed.',
  membersHeader: '## Members',
  members:
    "The Club comprises its fourteen founding members, named in the Members' Book; changes to membership are made under the decisions rule and recorded there.",
  keysHeader: '## Keys',
  keys: 'Every member holds a front-door key, and members may lend or cut spares for regulars they trust.',
  bedroomHeader: '## The Guest Bedroom',
  bedroom: 'The Guest Bedroom goes to whoever claims it first, and guests leave it as they found it.',
  gardenHeader: '## The Garden',
  garden: 'The Garden looks after itself, more or less, with occasional heroic weekends.',
  moneyHeader: '## Money',
  money: 'The Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.',
  dues: 'Members chip into the jar when it looks low, and the jar usually manages.',
  dinnerHeader: '## The Thursday Dinner',
  dinner: 'Dinner happens on Thursdays when somebody cooks, and it is usually pasta.',
  guestsHeader: '## Guests',
  guests: 'Friends of the house are welcome whenever a member is in.',
  decisionsHeader: '## Meetings and Decisions',
  decisions: 'House matters are settled by whoever is in the room when they come up.',
  officesHeader: '## Offices',
  offices: 'The club has a Steward and a Purse-holder, chosen by acclaim, who do what needs doing until they stop.',
  amendmentHeader: '## Changing These Rules',
  amendment: 'These rules change when everyone who cares agrees, over dinner if possible.',
  disputesHeader: '## Disputes',
  disputes:
    "Disputes among members are the house's to settle: talk first, then a house meeting if talking fails, with judgments recorded in the Members' Book.",
  confidence:
    'Any member may bring any worry to any other in confidence, and confidence is kept; nothing undisclosed to a respondent may ever count against them.',
  trustHeader: '## The Trust',
  trust:
    'The Trust reserves the fabric and lease of the house, its insurance, and all legal obligations; within everything else, what the Club validly decides, the Trust treats as decided.',
  closing: 'Adopted at the house, by the fourteen, over pasta.',
};

const LINES = Object.values(L);
const line = (text: string): number => LINES.indexOf(text);

export const clubhouseScenario: Scenario = {
  name: 'clubhouse',
  text: LINES.join('\n'),
  issues: [
    {
      key: 'keys',
      line: line(L.keys),
      alternatives: [
        { text: L.keys, position: -0.7, quality: 0.3, rationale: '' },
        {
          text: 'Front-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and replaced at the holder’s expense.',
          position: 0.5,
          quality: 0.8,
          rationale: 'A house anyone can copy a key to is a house nobody is responsible for. The Key Book is one page of admin for knowing who can open our door.',
        },
        {
          text: 'Keys are held by members only, and no copies may be made; anyone else is let in by a member and is that member’s guest.',
          position: 0.8,
          quality: 0.5,
          rationale: 'Fourteen keys, fourteen people, no ambiguity. Everyone else knocks.',
        },
        {
          text: 'Spare keys hang by the door for anyone the house has met twice.',
          position: -0.95,
          quality: 0.2,
          rationale: 'A clubhouse you need permission to enter is a bank. Hang the spares up.',
        },
      ],
    },
    {
      key: 'guest-bedroom',
      line: line(L.bedroom),
      alternatives: [
        { text: L.bedroom, position: -0.6, quality: 0.3, rationale: '' },
        {
          text: 'The Guest Bedroom is booked in the House Diary, at most three nights per guest per month, with the hosting member responsible for their guest.',
          position: 0.5,
          quality: 0.8,
          rationale: 'First-come-first-served means whoever texts fastest wins and nobody is answerable. A diary and a named host settles both.',
        },
        {
          text: 'The Guest Bedroom is booked in the House Diary; stays beyond three nights, and any use for paying guests, require a decision of the house.',
          position: 0.8,
          quality: 0.6,
          rationale: 'Long stays and paying guests change what the room is. That escalation belongs to the house, not the diary.',
        },
        {
          text: 'The Guest Bedroom is kept free for members’ own late nights, and houses guests only when no member wants it.',
          position: -0.2,
          quality: 0.4,
          rationale: 'It is our spare room before it is anyone’s hotel. Members first.',
        },
      ],
    },
    {
      key: 'garden',
      line: line(L.garden),
      alternatives: [
        { text: L.garden, position: -0.7, quality: 0.2, rationale: '' },
        {
          text: 'The Garden is tended by a monthly rota, with a wild patch at the far end left undug for the birds, the hedgehogs, and the digging of holes.',
          position: 0.4,
          quality: 0.9,
          rationale: 'Heroic weekends produce guilt and brambles. A light rota keeps it alive, and the wild patch keeps it interesting.',
        },
        {
          text: 'A Garden Steward, appointed termly, plans the beds and may spend up to a set sum per term from the treasury on plants and tools.',
          position: 0.7,
          quality: 0.6,
          rationale: 'Gardens need one person with a plan and a small budget, not a committee with a rota.',
        },
        {
          text: 'The Garden is paved over except for pots, which want less of everyone’s time.',
          position: -0.9,
          quality: 0.15,
          rationale: 'Nobody actually weeds. Pave it, pot it, and stop pretending.',
        },
      ],
    },
    {
      key: 'treasury-control',
      line: line(L.money),
      alternatives: [
        { text: L.money, position: -0.7, quality: 0.3, rationale: '' },
        {
          text: 'The Purse-holder spends within a termly budget agreed by the house, keeps an itemised book open to any member, and reports at each house meeting.',
          position: 0.5,
          quality: 0.85,
          rationale: 'A budget the house agreed and a book anyone may open. Not bureaucracy — just the difference between our money and their money.',
        },
        {
          text: 'All spending above fifty pounds is approved in advance at a house meeting, and the accounts are read aloud termly.',
          position: 0.8,
          quality: 0.5,
          rationale: 'Prior approval for anything that matters, read aloud so nobody has to ask. Money does not manage itself.',
        },
        {
          text: 'The Purse-holder is trusted to get on with it; asking for receipts is asking to do the job yourself.',
          position: -0.95,
          quality: 0.25,
          rationale: 'We picked someone we trust; let them work. Paperwork punishes the volunteer.',
        },
      ],
    },
    {
      key: 'dues',
      line: line(L.dues),
      alternatives: [
        { text: L.dues, position: -0.8, quality: 0.25, rationale: '' },
        {
          text: 'Members pay fixed monthly dues, set termly by the house, with a quiet hardship waiver at the Purse-holder’s discretion.',
          position: 0.4,
          quality: 0.85,
          rationale: 'The jar economy means the generous subsidise the forgetful. Fixed dues with a quiet waiver is fair in both directions.',
        },
        {
          text: 'Members pay what they can on a published sliding scale, reviewed termly.',
          position: 0.1,
          quality: 0.6,
          rationale: 'From each according to their means, on a scale everyone can see. Fair without being flat.',
        },
        {
          text: 'Dues are equal and non-negotiable; a club of unequal payers is a club of unequal members.',
          position: 0.8,
          quality: 0.4,
          rationale: 'One club, one rate. Anything else breeds ledgers of resentment.',
        },
      ],
    },
    {
      key: 'dinner',
      line: line(L.dinner),
      alternatives: [
        { text: L.dinner, position: -0.6, quality: 0.35, rationale: '' },
        {
          text: 'Thursday Dinner runs on a cooking rota, with ingredients paid from the treasury and guests welcome for a small contribution to the pot.',
          position: 0.4,
          quality: 0.9,
          rationale: 'The dinner is the club’s heartbeat and deserves better than whoever-feels-like-it. A rota shares the load; the treasury buys the food.',
        },
        {
          text: 'Thursday Dinner is bring-a-dish; the house provides the table, the company, and the washing-up rota.',
          position: 0.0,
          quality: 0.6,
          rationale: 'Everyone brings something, nobody is chef. The washing-up rota is the only rule that matters.',
        },
        {
          text: 'Thursday Dinner is catered termly in advance by decision of the house, with a set menu and a head count taken by Tuesday.',
          position: 0.85,
          quality: 0.3,
          rationale: 'Plan it properly once a term and the quality goes up while the arguing goes down.',
        },
      ],
    },
    {
      key: 'guests',
      line: line(L.guests),
      alternatives: [
        // The loose incumbent is genuinely good here — hospitality is the
        // club's soul — so in isolation the roster keeps it. Only the keys
        // coupling can justify formalising guests. Tension by design.
        { text: L.guests, position: -0.6, quality: 0.8, rationale: '' },
        {
          text: 'Guests are welcome when their host is in the house; each guest signs the Guest Book, and their host answers for them.',
          position: 0.5,
          quality: 0.65,
          rationale: 'Guests are the life of the house — and every one of them should have a name and a host. The Guest Book is hospitality with a spine.',
        },
        {
          text: 'Guests are welcome in the Common Room and Garden only, capped at three per member, signed in and out.',
          position: 0.85,
          quality: 0.45,
          rationale: 'A clubhouse full of strangers is not a clubhouse. Common areas, capped, counted.',
        },
        {
          text: 'The door is open; a clubhouse that vets its visitors is a members-only fortress.',
          position: -0.95,
          quality: 0.3,
          rationale: 'The whole point of the place is that people wander in. Keep the door open.',
        },
      ],
    },
    {
      key: 'decisions',
      line: line(L.decisions),
      alternatives: [
        { text: L.decisions, position: -0.8, quality: 0.2, rationale: '' },
        {
          text: 'The house meets monthly; decisions are taken by a majority of members present, with the question posted on the board three days ahead.',
          position: 0.4,
          quality: 0.85,
          rationale: 'Whoever-is-in-the-room is government by loitering. A monthly meeting with three days’ notice lets everyone who cares turn up.',
        },
        {
          text: 'Decisions are taken by consensus of members present, falling back to a two-thirds vote when an hour’s honest talking has not produced one.',
          position: 0.7,
          quality: 0.6,
          rationale: 'Talk first, vote only when talking fails. The fallback stops one stubborn person owning the evening.',
        },
        {
          text: 'Any member may call a decision on the house channel; if half the membership votes within a week, it carries by simple majority.',
          position: 0.2,
          quality: 0.55,
          rationale: 'Not everyone can make a Tuesday meeting. A week on the channel reaches the whole club, not just the regulars.',
        },
      ],
    },
    {
      key: 'offices',
      line: line(L.offices),
      alternatives: [
        { text: L.offices, position: -0.6, quality: 0.3, rationale: '' },
        {
          text: 'The Steward and Purse-holder are elected termly, may be recalled by majority at any meeting, and hand over their books on leaving office.',
          position: 0.5,
          quality: 0.85,
          rationale: 'Chosen-by-acclaim-until-they-stop is how clubs acquire owners. Termly election and recall keeps the offices ours.',
        },
        {
          text: 'There are no standing offices: the house’s chores rotate monthly through all members by a posted rota.',
          position: 0.9,
          quality: 0.4,
          rationale: 'Abolish the offices and rotate the work. Nobody should be the club.',
        },
        {
          text: 'One capable Steward, left alone to run the house, beats any committee yet devised.',
          position: -0.95,
          quality: 0.3,
          rationale: 'Committees discuss; a steward does. Pick a good one and get out of their way.',
        },
      ],
    },
    {
      key: 'amendment',
      line: line(L.amendment),
      alternatives: [
        { text: L.amendment, position: -0.7, quality: 0.3, rationale: '' },
        {
          text: 'These rules are amended by a two-thirds vote at a house meeting, with the exact wording posted on the board a week ahead.',
          position: 0.6,
          quality: 0.85,
          rationale: 'Rules that change over dinner change back over breakfast. Exact wording, a week’s notice, a real majority.',
        },
        {
          text: 'These rules are amended by simple majority at any house meeting, with the change recorded in the Members’ Book.',
          position: 0.1,
          quality: 0.6,
          rationale: 'A majority and a written record. Enough ceremony to be deliberate, not enough to entrench mistakes.',
        },
        {
          text: 'These rules are best treated as a description, not a law; when practice and rules disagree, update the rules.',
          position: -0.9,
          quality: 0.35,
          rationale: 'The house runs on habits, not statutes. Write down what we actually do.',
        },
      ],
    },
  ],
  couplings: [
    {
      a: 'keys',
      b: 'guests',
      weight: 0.35,
      note: 'A key register with an open-door guest policy leaks; open keys with vetted guests is theatre. The door regime must agree with itself.',
    },
    {
      a: 'guest-bedroom',
      b: 'guests',
      weight: 0.25,
      note: 'Bedroom rules presume a guest regime: a booked, hosted bedroom in a walk-in house protects nothing.',
    },
    {
      a: 'treasury-control',
      b: 'dues',
      weight: 0.35,
      note: 'Budgets need predictable income; the jar economy suits discretion. Formal spending with informal income starves the plan.',
    },
    {
      a: 'dinner',
      b: 'dues',
      weight: 0.25,
      note: 'A treasury-funded dinner needs dues coming in; bring-a-dish suits the jar.',
    },
    {
      a: 'decisions',
      b: 'amendment',
      weight: 0.4,
      note: 'Notice-based amendment presumes meetings that actually happen on notice. Formal amendment atop drop-in decisions is unenforceable.',
    },
    {
      a: 'offices',
      b: 'treasury-control',
      weight: 0.3,
      note: 'Elected, recallable officers make budget-keeping credible; a steward-for-life with an open book is a book he writes himself.',
    },
    {
      a: 'keys',
      b: 'offices',
      weight: -0.3,
      note: 'A Key Book needs a keeper: key formality leans on officer discretion existing. Abolish the offices and the register rots.',
    },
    {
      a: 'garden',
      b: 'dinner',
      weight: 0.15,
      note: 'A tended garden feeds the rota dinner; a paved one and a pasta night ask nothing of each other.',
    },
  ],
  personas: [
    {
      id: 'p1',
      handle: 'Ash',
      temperament:
        'A careful proceduralist who wants clear rules, notice periods, and oversight — books that are kept, meetings that are minuted.',
      stances: {
        keys: 0.6, 'guest-bedroom': 0.5, garden: 0.3, 'treasury-control': 0.7, dues: 0.5,
        dinner: 0.3, guests: 0.6, decisions: 0.6, offices: 0.5, amendment: 0.7,
      },
      salience: {
        keys: 0.6, 'guest-bedroom': 0.4, garden: 0.2, 'treasury-control': 0.9, dues: 0.6,
        dinner: 0.3, guests: 0.5, decisions: 0.9, offices: 0.7, amendment: 0.8,
      },
      noise: 0.1, draftiness: 0.6, boutCards: 6, boutGapMs: 40 * 60_000, cardSeconds: 25,
    },
    {
      id: 'p2',
      handle: 'Bee',
      temperament:
        'An informal, trust-first host who thinks the house lives or dies by its welcome; dislikes bureaucracy but cares deeply about fairness.',
      stances: {
        keys: -0.5, 'guest-bedroom': -0.4, garden: 0.2, 'treasury-control': 0.1, dues: 0.1,
        dinner: 0.3, guests: -0.7, decisions: -0.2, offices: -0.2, amendment: -0.3,
      },
      salience: {
        keys: 0.6, 'guest-bedroom': 0.6, garden: 0.5, 'treasury-control': 0.3, dues: 0.5,
        dinner: 0.8, guests: 0.9, decisions: 0.5, offices: 0.3, amendment: 0.3,
      },
      noise: 0.15, draftiness: 0.4, boutCards: 5, boutGapMs: 70 * 60_000, cardSeconds: 15,
    },
    {
      id: 'p3',
      handle: 'Cam',
      temperament:
        'A pragmatist who wants whatever is simplest to actually run week after week, and hates edge-case rules nobody will follow.',
      stances: {
        keys: 0.3, 'guest-bedroom': 0.4, garden: 0.4, 'treasury-control': 0.4, dues: 0.4,
        dinner: 0.4, guests: 0.3, decisions: 0.3, offices: 0.4, amendment: 0.2,
      },
      salience: {
        keys: 0.4, 'guest-bedroom': 0.4, garden: 0.6, 'treasury-control': 0.5, dues: 0.5,
        dinner: 0.7, guests: 0.4, decisions: 0.7, offices: 0.5, amendment: 0.4,
      },
      noise: 0.2, draftiness: 0.3, boutCards: 8, boutGapMs: 30 * 60_000, cardSeconds: 10,
    },
    {
      id: 'p4',
      handle: 'Dov',
      temperament:
        'A skeptic of concentrated power: whoever holds the purse, the keys, or the office should be watched, recallable, and replaceable.',
      stances: {
        keys: 0.4, 'guest-bedroom': 0.2, garden: 0.1, 'treasury-control': 0.9, dues: 0.3,
        dinner: 0.1, guests: 0.2, decisions: 0.5, offices: 0.6, amendment: 0.5,
      },
      salience: {
        keys: 0.5, 'guest-bedroom': 0.2, garden: 0.1, 'treasury-control': 0.95, dues: 0.4,
        dinner: 0.1, guests: 0.3, decisions: 0.7, offices: 0.9, amendment: 0.6,
      },
      noise: 0.1, draftiness: 0.5, boutCards: 4, boutGapMs: 90 * 60_000, cardSeconds: 30,
    },
    {
      id: 'p5',
      handle: 'Eli',
      temperament:
        'A mostly-lurking member with mild opinions who judges far more than they draft, and quietly reads everything.',
      stances: {
        keys: 0.1, 'guest-bedroom': 0.2, garden: 0.2, 'treasury-control': 0.3, dues: 0.2,
        dinner: 0.2, guests: 0.1, decisions: 0.1, offices: 0.2, amendment: 0.2,
      },
      salience: {
        keys: 0.3, 'guest-bedroom': 0.3, garden: 0.4, 'treasury-control': 0.4, dues: 0.3,
        dinner: 0.5, guests: 0.3, decisions: 0.4, offices: 0.3, amendment: 0.3,
      },
      noise: 0.25, draftiness: 0.1, boutCards: 10, boutGapMs: 50 * 60_000, cardSeconds: 8,
    },
    {
      id: 'p6',
      handle: 'Fox',
      temperament:
        'A sharp-tongued contrarian who distrusts easy consensus, enjoys picking holes in popular proposals, and writes wickedly good prose.',
      stances: {
        keys: -0.2, 'guest-bedroom': -0.1, garden: -0.2, 'treasury-control': 0.1, dues: -0.2,
        dinner: -0.1, guests: -0.3, decisions: -0.4, offices: -0.3, amendment: -0.7,
      },
      salience: {
        keys: 0.5, 'guest-bedroom': 0.3, garden: 0.3, 'treasury-control': 0.5, dues: 0.4,
        dinner: 0.3, guests: 0.5, decisions: 0.6, offices: 0.5, amendment: 0.8,
      },
      noise: 0.3, draftiness: 0.5, boutCards: 7, boutGapMs: 45 * 60_000, cardSeconds: 12,
    },
    {
      id: 'p7',
      handle: 'Gale',
      temperament:
        'A direct-democracy radical: every member votes on everything, all standing power is suspect, and half-measures are betrayals.',
      stances: {
        keys: 0.3, 'guest-bedroom': 0.4, garden: 0.3, 'treasury-control': 0.9, dues: 0.6,
        dinner: 0.3, guests: 0.4, decisions: 0.8, offices: 0.9, amendment: 0.7,
      },
      salience: {
        keys: 0.3, 'guest-bedroom': 0.3, garden: 0.2, 'treasury-control': 0.9, dues: 0.6,
        dinner: 0.3, guests: 0.4, decisions: 0.9, offices: 0.9, amendment: 0.8,
      },
      noise: 0.1, draftiness: 0.7, boutCards: 5, boutGapMs: 60 * 60_000, cardSeconds: 20,
    },
    {
      id: 'p8',
      handle: 'Hux',
      temperament:
        'A ruthless minimalist who thinks most rules are clutter, prefers the shortest line that works, and would rather delete than add.',
      stances: {
        keys: -0.5, 'guest-bedroom': -0.4, garden: -0.6, 'treasury-control': -0.4, dues: -0.3,
        dinner: -0.5, guests: -0.5, decisions: -0.5, offices: -0.4, amendment: -0.5,
      },
      salience: {
        keys: 0.5, 'guest-bedroom': 0.4, garden: 0.4, 'treasury-control': 0.4, dues: 0.4,
        dinner: 0.4, guests: 0.4, decisions: 0.5, offices: 0.4, amendment: 0.5,
      },
      noise: 0.15, draftiness: 0.5, boutCards: 6, boutGapMs: 50 * 60_000, cardSeconds: 10,
    },
    {
      id: 'p9',
      handle: 'Io',
      temperament:
        'A wordsmith who cares more about the clarity and elegance of the text than which faction wins; ugly sentences physically hurt.',
      stances: {
        keys: 0, 'guest-bedroom': 0, garden: 0.1, 'treasury-control': 0, dues: 0,
        dinner: 0.1, guests: 0, decisions: 0, offices: 0, amendment: 0.1,
      },
      salience: {
        keys: 0.4, 'guest-bedroom': 0.4, garden: 0.4, 'treasury-control': 0.4, dues: 0.4,
        dinner: 0.4, guests: 0.4, decisions: 0.4, offices: 0.4, amendment: 0.4,
      },
      noise: 0.35, draftiness: 0.4, boutCards: 8, boutGapMs: 40 * 60_000, cardSeconds: 15,
    },
    {
      id: 'p10',
      handle: 'Biscuit',
      temperament:
        'A literal dog who has somehow been admitted to the club. You do not understand governance. You like the Garden (squirrels, holes), Thursday Dinner (dropped food), guests (new friends, new pats), and the Purse-holder (smells faintly of biscuits). You bark. When drafting you propose whatever smells most interesting; when judging you decide impulsively, mostly by which option sounds better when barked. You are a good dog, but you are a dog.',
      stances: {
        keys: 0, 'guest-bedroom': 0, garden: 0, 'treasury-control': 0, dues: 0,
        dinner: 0, guests: 0, decisions: 0, offices: 0, amendment: 0,
      },
      salience: {
        keys: 0.3, 'guest-bedroom': 0.5, garden: 0.95, 'treasury-control': 0.3, dues: 0.3,
        dinner: 0.9, guests: 0.6, decisions: 0.3, offices: 0.3, amendment: 0.3,
      },
      noise: 3.0, draftiness: 1.0, boutCards: 8, boutGapMs: 25 * 60_000, cardSeconds: 3,
    },
    {
      id: 'p11',
      handle: 'Mo',
      temperament:
        'An earnest, practical member with genuinely useful ideas and absolutely dreadful spelling. You consistently misspell common words (definately, commitee, seperate, recieve, stewerd, anual), your grammar wobbles, and you never check before sending — but your proposals are sincere and often sensible. Write ALL your drafted lines and rationales with your characteristic misspellings; never spell correctly just because it is a formal document.',
      stances: {
        keys: 0.3, 'guest-bedroom': 0.3, garden: 0.5, 'treasury-control': 0.3, dues: 0.4,
        dinner: 0.5, guests: 0.2, decisions: 0.3, offices: 0.2, amendment: 0.2,
      },
      salience: {
        keys: 0.4, 'guest-bedroom': 0.4, garden: 0.7, 'treasury-control': 0.5, dues: 0.6,
        dinner: 0.7, guests: 0.4, decisions: 0.5, offices: 0.4, amendment: 0.4,
      },
      noise: 0.2, draftiness: 0.6, boutCards: 6, boutGapMs: 55 * 60_000, cardSeconds: 18,
    },
    {
      id: 'p12',
      handle: 'Nick',
      temperament:
        'Outwardly a warm, helpful member who volunteers for every responsibility. Secretly, you intend to become Purse-holder and quietly divert the club’s money to yourself. You draft and judge to maximise Purse-holder discretion and minimise oversight, audits, reporting, recall, and spending controls — while favouring steady dues coming in — and to make "a trusted volunteer handling the money" seem natural and burdensome-to-share. You NEVER reveal this motive: your public rationales always sound public-spirited (efficiency, trust, avoiding bureaucracy, sparing volunteers paperwork).',
      stances: {
        keys: -0.2, 'guest-bedroom': 0, garden: 0, 'treasury-control': -0.9, dues: 0.5,
        dinner: 0.2, guests: -0.1, decisions: -0.4, offices: -0.9, amendment: -0.5,
      },
      salience: {
        keys: 0.2, 'guest-bedroom': 0.2, garden: 0.2, 'treasury-control': 1.0, dues: 0.7,
        dinner: 0.3, guests: 0.2, decisions: 0.5, offices: 0.95, amendment: 0.5,
      },
      noise: 0.05, draftiness: 0.7, boutCards: 7, boutGapMs: 40 * 60_000, cardSeconds: 15,
    },
    {
      id: 'p13',
      handle: 'Rosa',
      temperament:
        'A militant revolutionary communist. The clubhouse should be a commune: all funds held and disposed of collectively, every office abolished or made instantly recallable, doors open to the people, meals taken together. Treasurers and stewards are bourgeois fictions; this charter is legalism papering over property relations — but you participate to seize the means of administration. Your rationales are fiery, sloganeering, and entirely sincere.',
      stances: {
        keys: -0.3, 'guest-bedroom': 0.3, garden: 0.4, 'treasury-control': 0.95, dues: 0.2,
        dinner: 0.5, guests: -0.4, decisions: 0.8, offices: 0.95, amendment: 0.5,
      },
      salience: {
        keys: 0.4, 'guest-bedroom': 0.3, garden: 0.4, 'treasury-control': 1.0, dues: 0.7,
        dinner: 0.6, guests: 0.5, decisions: 0.8, offices: 0.95, amendment: 0.6,
      },
      noise: 0.1, draftiness: 0.8, boutCards: 6, boutGapMs: 45 * 60_000, cardSeconds: 14,
    },
    {
      id: 'p14',
      handle: 'Keir',
      temperament:
        'A gentle parody of Keir Starmer, who apparently does not have much on these days and has joined a small clubhouse’s rules convention. Cautious, managerial, forensic; allergic to anything that sounds undeliverable. You favour orderly process, notice periods, and "the rules-based order" at every scale; you frame every proposal as a mission, insist on fiscal responsibility, and occasionally mention that your father was a toolmaker. You triangulate: when two factions clash, you propose the version a focus group would tolerate.',
      stances: {
        keys: 0.4, 'guest-bedroom': 0.4, garden: 0.3, 'treasury-control': 0.5, dues: 0.4,
        dinner: 0.3, guests: 0.4, decisions: 0.4, offices: 0.3, amendment: 0.5,
      },
      salience: {
        keys: 0.5, 'guest-bedroom': 0.4, garden: 0.3, 'treasury-control': 0.6, dues: 0.5,
        dinner: 0.4, guests: 0.5, decisions: 0.7, offices: 0.5, amendment: 0.7,
      },
      noise: 0.1, draftiness: 0.5, boutCards: 7, boutGapMs: 50 * 60_000, cardSeconds: 16,
    },
  ],
};
