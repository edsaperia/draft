/**
 * The charter the phase ladder drafts on, and the rewrites its cast
 * proposes: the Hollow Oak Club house charter, generated once from
 * `packages/sim-harness/src/clubhouse.ts` — the sim's own scenario, where
 * every line and every rewrite is hand-authored with the reason its author
 * would give. Copied rather than imported: the server must not depend on a
 * package that pulls the Anthropic SDK, and this is data, not behaviour.
 *
 * Ten clauses carry three rewrites each — the thirty proposals the ladder's
 * session rung is asked for (Q678), before the settings, membership and
 * power motions on top.
 *
 * Dev only: reached solely from `dev-ladder.ts`, which is itself imported
 * only from inside a DEV-labelled block, so esbuild's dropLabels removes
 * the statement and this file never enters the production bundle.
 */

export const CHARTER_LINES: readonly string[] = [
  "# The Hollow Oak Club — House Charter",
  "The Hollow Oak Club exists so that its members may have a place of their own: to meet, make, cook, argue, garden, and put the world to rights.",
  "The clubhouse at 44 Aldermoss Lane is held on a long lease from the Marchmont Trust, which reserves to itself the fabric of the building, the lease itself, insurance, and compliance with the law; everything else about the life of the house is the Club's to govern.",
  "Should the Club cease to operate any part of house life, its management reverts to the Trust, which will run it plainly on the Club's behalf; reversion is not a sanction, and any function may be reclaimed by a valid decision.",
  "## The House",
  "The house comprises the Common Room, the Kitchen, the Workshop, the Library Corner, the Guest Bedroom upstairs, and the Garden behind, together with the cellar and the shed.",
  "## Members",
  "The Club comprises its fourteen founding members, named in the Members' Book; changes to membership are made under the decisions rule and recorded there.",
  "## Keys",
  "Every member holds a front-door key, and members may lend or cut spares for regulars they trust.",
  "## The Guest Bedroom",
  "The Guest Bedroom goes to whoever claims it first, and guests leave it as they found it.",
  "## The Garden",
  "The Garden looks after itself, more or less, with occasional heroic weekends.",
  "## Money",
  "The Purse-holder pays the bills and reimburses what seems fair, and keeps the receipts in the tin.",
  "Members chip into the jar when it looks low, and the jar usually manages.",
  "## The Thursday Dinner",
  "Dinner happens on Thursdays when somebody cooks, and it is usually pasta.",
  "## Guests",
  "Friends of the house are welcome whenever a member is in.",
  "## Meetings and Decisions",
  "House matters are settled by whoever is in the room when they come up.",
  "## Offices",
  "The club has a Steward and a Purse-holder, chosen by acclaim, who do what needs doing until they stop.",
  "## Changing These Rules",
  "These rules change when everyone who cares agrees, over dinner if possible.",
  "## Disputes",
  "Disputes among members are the house's to settle: talk first, then a house meeting if talking fails, with judgments recorded in the Members' Book.",
  "Any member may bring any worry to any other in confidence, and confidence is kept; nothing undisclosed to a respondent may ever count against them.",
  "## The Trust",
  "The Trust reserves the fabric and lease of the house, its insurance, and all legal obligations; within everything else, what the Club validly decides, the Trust treats as decided.",
  "Adopted at the house, by the fourteen, over pasta.",
];

export const CHARTER_TEXT = CHARTER_LINES.join('\n');

/** One member's rewrite of one line, with the reason they would give. */
export interface Rewrite {
  /** Index into CHARTER_LINES — the engine holds one line per block. */
  readonly line: number;
  readonly text: string;
  readonly why: string;
}

export const REWRITES: readonly Rewrite[] = [
  { line: 9, text: "Front-door keys are held by members only; every key and fob is listed in the Key Book, and lost keys are reported and replaced at the holder’s expense.",
    why: "A house anyone can copy a key to is a house nobody is responsible for. The Key Book is one page of admin for knowing who can open our door." },
  { line: 9, text: "Keys are held by members only, and no copies may be made; anyone else is let in by a member and is that member’s guest.",
    why: "Fourteen keys, fourteen people, no ambiguity. Everyone else knocks." },
  { line: 9, text: "Spare keys hang by the door for anyone the house has met twice.",
    why: "A clubhouse you need permission to enter is a bank. Hang the spares up." },
  { line: 11, text: "The Guest Bedroom is booked in the House Diary, at most three nights per guest per month, with the hosting member responsible for their guest.",
    why: "First-come-first-served means whoever texts fastest wins and nobody is answerable. A diary and a named host settles both." },
  { line: 11, text: "The Guest Bedroom is booked in the House Diary; stays beyond three nights, and any use for paying guests, require a decision of the house.",
    why: "Long stays and paying guests change what the room is. That escalation belongs to the house, not the diary." },
  { line: 11, text: "The Guest Bedroom is kept free for members’ own late nights, and houses guests only when no member wants it.",
    why: "It is our spare room before it is anyone’s hotel. Members first." },
  { line: 13, text: "The Garden is tended by a monthly rota, with a wild patch at the far end left undug for the birds, the hedgehogs, and the digging of holes.",
    why: "Heroic weekends produce guilt and brambles. A light rota keeps it alive, and the wild patch keeps it interesting." },
  { line: 13, text: "A Garden Steward, appointed termly, plans the beds and may spend up to a set sum per term from the treasury on plants and tools.",
    why: "Gardens need one person with a plan and a small budget, not a committee with a rota." },
  { line: 13, text: "The Garden is paved over except for pots, which want less of everyone’s time.",
    why: "Nobody actually weeds. Pave it, pot it, and stop pretending." },
  { line: 15, text: "The Purse-holder spends within a termly budget agreed by the house, keeps an itemised book open to any member, and reports at each house meeting.",
    why: "A budget the house agreed and a book anyone may open. Not bureaucracy — just the difference between our money and their money." },
  { line: 15, text: "All spending above fifty pounds is approved in advance at a house meeting, and the accounts are read aloud termly.",
    why: "Prior approval for anything that matters, read aloud so nobody has to ask. Money does not manage itself." },
  { line: 15, text: "The Purse-holder is trusted to get on with it; asking for receipts is asking to do the job yourself.",
    why: "We picked someone we trust; let them work. Paperwork punishes the volunteer." },
  { line: 16, text: "Members pay fixed monthly dues, set termly by the house, with a quiet hardship waiver at the Purse-holder’s discretion.",
    why: "The jar economy means the generous subsidise the forgetful. Fixed dues with a quiet waiver is fair in both directions." },
  { line: 16, text: "Members pay what they can on a published sliding scale, reviewed termly.",
    why: "From each according to their means, on a scale everyone can see. Fair without being flat." },
  { line: 16, text: "Dues are equal and non-negotiable; a club of unequal payers is a club of unequal members.",
    why: "One club, one rate. Anything else breeds ledgers of resentment." },
  { line: 18, text: "Thursday Dinner runs on a cooking rota, with ingredients paid from the treasury and guests welcome for a small contribution to the pot.",
    why: "The dinner is the club’s heartbeat and deserves better than whoever-feels-like-it. A rota shares the load; the treasury buys the food." },
  { line: 18, text: "Thursday Dinner is bring-a-dish; the house provides the table, the company, and the washing-up rota.",
    why: "Everyone brings something, nobody is chef. The washing-up rota is the only rule that matters." },
  { line: 18, text: "Thursday Dinner is catered termly in advance by decision of the house, with a set menu and a head count taken by Tuesday.",
    why: "Plan it properly once a term and the quality goes up while the arguing goes down." },
  { line: 20, text: "Guests are welcome when their host is in the house; each guest signs the Guest Book, and their host answers for them.",
    why: "Guests are the life of the house — and every one of them should have a name and a host. The Guest Book is hospitality with a spine." },
  { line: 20, text: "Guests are welcome in the Common Room and Garden only, capped at three per member, signed in and out.",
    why: "A clubhouse full of strangers is not a clubhouse. Common areas, capped, counted." },
  { line: 20, text: "The door is open; a clubhouse that vets its visitors is a members-only fortress.",
    why: "The whole point of the place is that people wander in. Keep the door open." },
  { line: 22, text: "The house meets monthly; decisions are taken by a majority of members present, with the question posted on the board three days ahead.",
    why: "Whoever-is-in-the-room is government by loitering. A monthly meeting with three days’ notice lets everyone who cares turn up." },
  { line: 22, text: "Decisions are taken by consensus of members present, falling back to a two-thirds vote when an hour’s honest talking has not produced one.",
    why: "Talk first, vote only when talking fails. The fallback stops one stubborn person owning the evening." },
  { line: 22, text: "Any member may call a decision on the house channel; if half the membership votes within a week, it carries by simple majority.",
    why: "Not everyone can make a Tuesday meeting. A week on the channel reaches the whole club, not just the regulars." },
  { line: 24, text: "The Steward and Purse-holder are elected termly, may be recalled by majority at any meeting, and hand over their books on leaving office.",
    why: "Chosen-by-acclaim-until-they-stop is how clubs acquire owners. Termly election and recall keeps the offices ours." },
  { line: 24, text: "There are no standing offices: the house’s chores rotate monthly through all members by a posted rota.",
    why: "Abolish the offices and rotate the work. Nobody should be the club." },
  { line: 24, text: "One capable Steward, left alone to run the house, beats any committee yet devised.",
    why: "Committees discuss; a steward does. Pick a good one and get out of their way." },
  { line: 26, text: "These rules are amended by a two-thirds vote at a house meeting, with the exact wording posted on the board a week ahead.",
    why: "Rules that change over dinner change back over breakfast. Exact wording, a week’s notice, a real majority." },
  { line: 26, text: "These rules are amended by simple majority at any house meeting, with the change recorded in the Members’ Book.",
    why: "A majority and a written record. Enough ceremony to be deliberate, not enough to entrench mistakes." },
  { line: 26, text: "These rules are best treated as a description, not a law; when practice and rules disagree, update the rules.",
    why: "The house runs on habits, not statutes. Write down what we actually do." },
];
