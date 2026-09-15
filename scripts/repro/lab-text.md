# 2026 Constitutional Convention — Draft Submission

## Manifesto

Attention is the Laboratory's scarcest resource, and the thing most easily destroyed by its own governance. Fifteen people cannot deliberate on everything; if we try, we will deliberate on whatever is loudest and neglect the rest. So this constitution is built around one commitment: **agreement should be free, and disagreement should be the only thing that costs.**

Anyone may propose anything. If nobody objects within three days, it is law. If someone objects, we have a real disagreement, and only then do we spend the group's time on it — through pairwise ranking on docs.vote, which is already running for this Convention. Most rules will pass in silence. That is the point.

Second: the record *is* the constitution. A rule that is not in the repository is not a rule, a decision that is not written down did not happen, and a judgment that cannot be cited will be re-litigated by whoever benefits from forgetting it. We keep everything in git, where every change carries an author and a timestamp that nobody has to be trusted to maintain.

Third: small wrongs need small remedies. A system whose only sanction is expulsion has, in practice, no sanctions. Ours is a ladder, beginning with a written finding and reaching the College's door only at the far end.

Members hold equal rights to propose, to object, to vote, and to be heard before being sanctioned. Non-members — guests, faculty, neighbours — hold no vote, but may bring a dispute and are owed the same procedure we owe each other.

All of this expires on 29 November. We will have been wrong about most of it by then, and we should find out which parts while it is still cheap to be wrong.

---

## Draft Interim Constitution

### Article 1 — Rule of Recognition

A **rule** of the Laboratory is a Markdown file under `/rules/` on the `main` branch of `github.com/nwspk/2026`. Nothing else is a rule, however widely believed.

Each rule file opens with frontmatter giving `id`, `tier` (*ordinary* or *constitutional*), `adopted` (date and merge commit), `pr`, and `status` (*in force*, *repealed*, *expired*). What is in force is what `main` says now; when it was made, and by whom, is what the git history says. The same repository holds the constitutional record entire: this constitution at `/constitution.md`, judgments at `/judgments/`, recorded positions at `/positions/`, standing at `/register/standing.csv`, and the Agent's outbox at `/agent/outbox/`.

`main` is protected: no direct pushes, merges only under Article 2. Every member holds write access to the repository from the close of the Convention.

This repository is College infrastructure, and we note the dependency rather than pretend it away. The record is therefore portable by design: any member may mirror it, and a fork carrying identical history is an authentic copy of the record.

The **Recorder**, drawn by lot each month, maintains repository settings, executes suspensions, and does no other governing.

### Article 2 — Amendment Procedure

**Ordinary rules.** Any member opens a pull request carrying a one-sentence rationale. It stands open 72 hours. If no member has objected in that window, any member may merge it, and it is law. This is the ordinary path and should be the busy one.

An objection is a review comment marked *Object*, with a reason. On objection, the proposal, the status quo, and any competing pull requests go to docs.vote for 72 hours, ranked pairwise under Bradley–Terry–Davidson. Quorum is eight members voting; the top-ranked option is adopted and merged.

**Urgency.** With five co-signers, the window shortens to twelve hours. Nothing constitutional may be made urgent.

**Constitutional amendments.** A pull request touching `/constitution.md` is labelled `constitutional`. It stands open seven days, always goes to docs.vote, requires eleven members voting, and must be ranked above the status quo on two-thirds of ballots cast.

### Article 3 — Adjudication

Any person, member or not, may bring a complaint by opening an issue labelled `dispute`, or privately to the Recorder, who files it.

A **Referee** is drawn by lot from the members, excluding the complainant, the respondent, and anyone either party strikes — each party may strike one member without giving a reason.

The respondent receives the complaint in writing and has 72 hours to answer. Both sides may file written statements; the Referee may convene one hearing; the finding is published to `/judgments/` within seven days of appointment, and must state whether a defect in this constitution contributed to the dispute.

The Referee may impose one of:

1. an unpublished advisory note;
2. a published finding of fact;
3. a requirement to make specified amends by a stated date;
4. suspension, for up to 28 days, of any privilege this constitution creates — proposing, objecting, voting, holding office, nominating guests, hosting events;
5. referral of the judgment to the College under the Exclusion Policy.

Suspensions are recorded in `/register/standing.csv` by the Recorder; that file, not goodwill, is the enforcement.

Either party may appeal within seven days, on procedural grounds only, to a panel of three drawn by lot. The panel may uphold, quash, or reduce; it may not increase.

### Article 4 — Agent: Founding Registration

The Agent is staffed by two members — the **Agent** and the **Deputy** — elected by docs.vote at the Convention, serving until this constitution expires. Either may act alone.

**Authorisation and verification.** A statement is a statement of the Laboratory if, and only if, it is committed to `/agent/outbox/` on `main` as a dated file, before it is sent or within 24 hours after. Every statement carries the line: *"Issued by the Agent of the 2026 Newspeak House Governance Laboratory; verify at github.com/nwspk/2026/agent/outbox."* Anything absent from the outbox is not the Laboratory speaking, and any member may say so publicly.

**Limits.** The Agent may commit up to £100 of the treasury per undertaking, £500 in total; may accept, decline, and schedule invitations, bookings, and guests; and may state any position already recorded in `/positions/`. It may not state a position that is not recorded there, bind the Laboratory beyond 29 November 2026, or alter the standing register. Asked something we have not decided, the Agent says exactly that, and gives a date by which we will have.

**Amendment.** This Article is the registration in force. It is amended only by the constitutional procedure in Article 2, and any amendment is verifiable as a merge commit in this file's history — which is why the record's authority rests on the history and not on whoever currently holds the keys.

### Article 5 — Expiry

This constitution expires at 23:59 on **Sunday 29 November 2026**. On expiry the Agent's registration lapses and our collective rights lie dormant until we ratify a successor; ordinary rules made under it survive unless the successor says otherwise.

To make sure there is something better on the other side:

- **From week one**, any member may label any pull request, judgment, or incident `constitutional-defect`. That label is the agenda.
- **1 November**: a drafting committee of three, drawn by lot, plus the Agent, must publish a successor draft by 15 November, working from the labelled record.
- **22 November**: amendment window opens on docs.vote.
- **29 November**: ratification session. The successor is adopted at the Article 2 constitutional threshold. Failing that, this text may be re-ratified unchanged, once only, until 28 February 2027.
