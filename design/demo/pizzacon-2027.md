# Demo preset: PizzaCon 2027

The content for docs.vote's demo document, which is reset to this state before each live demo. Everything below is fictional: the conference, the Neapolitan Dough Society, the Istituto dell'Arte Bianca, every speaker. Real places and real history (Naples, 1889, the diaspora, the regional styles) are used as they are.

Parts: 1 the document text · 2 open proposals · 3 decided changes · 4 insertions · 5 the bot cast · 6 rule settings · 7 things I am unsure about.

**How the server reads this file** (`design/DEMO.md` §3; `npm run demo-check` checks it). Only what sits between a `<!-- @… -->` marker and the `<!-- @end -->` after it is read; they are invisible in a markdown preview, and everything outside them — these notes, the headings, the contest notes — is for people. Inside a proposals section an entry opens with its bold label on a line of its own, and its fields are `Replaces:`, `After:`, `With:`, `Reason:`, `Proposer:` and `State:` (`fresh`, `leaning` or `contested` — how the room has judged it so far); a decided change has `As it was:`, `Adopted:` and optionally `Losing rival:`, `Rival reason:`, `Rival proposer:`. A field holding several lines has them on the lines below it, indented by two spaces. Lines starting `>` are notes. Backticks round a quoted line are optional.

---

## 1. The document text

**Title (🪶):**

<!-- @title -->
PizzaCon 2027
<!-- @end -->

**Text (📝)**, exactly as it should stand at reset — one line per block, between the two rules:

---

<!-- @text -->
PizzaCon 2027 is the third international conference on the history, craft and business of pizza, convened by the Neapolitan Dough Society for bakers, historians, suppliers, researchers and anybody who has ever argued about a crust.
It meets from Tuesday 12 to Thursday 14 October 2027 in the Sala Grande of the Istituto dell'Arte Bianca, in the old city of Naples, ten minutes' walk from the port.
The programme runs as a single track, so every delegate hears every session; all times are local, and each day ends with something to eat.
## Day 1 · Tuesday 12 October · Origins
### 08:30 · Registration and coffee
Badges are collected in the foyer, where coffee is served until the opening remarks.
### 09:15 · Opening remarks
**Professor Lucia Ferrante** — chair of the programme committee and professor of food history at the Università del Golfo, author of *The Oven and the City* (2019).
The chair welcomes delegates, introduces the committee and explains why a conference about pizza needs three days.
### 09:45 · Keynote: The Margherita Question: A Documentary History
**Dr Tomasz Wierzbicki** — archivist and historian of the royal households of Naples, who has spent a decade in the city's municipal records.
The story of the pizza made for Queen Margherita in 1889 rests on a single letter of thanks whose authenticity has been disputed for decades. Dr Wierzbicki sets out what the archives can and cannot prove, and why the legend has outlasted every attempt to correct it.
### 10:45 · Coffee break
### 11:15 · The Great Blind Tasting Debate: Is It the Oven or the Baker?
**Declan Fairweather-Obi** (chair) — broadcaster and presenter of the long-running radio programme *Crust and Crumb*, with a panel of four pizzaioli who have not been told what they are eating.
Six unlabelled margheritas, three ovens, three bakers and one question: can a trained palate tell which made the difference? Delegates vote from their seats, and the panel is held to its answers.
### 12:30 · Lunch
Lunch is served in the courtyard; vegetarian, vegan and gluten-free pizzas are marked at the counter.
### 14:00 · From Port to Pan: Naples and the Pizza Diaspora
**Grace Okonkwo-Bellini**, **Hiroshi Tanabe** and **Marisol Duarte** — a migration historian from Liverpool, a baker who trained in Naples before opening in Osaka, and a food writer from Buenos Aires.
Between 1880 and 1920 millions left southern Italy, and pizza went with some of them. The panel follows the dish to New York and Buenos Aires, and a century later to Osaka, and asks what each city kept, changed and forgot.
### 15:15 · Tea
### 15:45 · Four Crusts, One Idea: New Haven, Detroit, São Paulo and Rome
**Dr Amara Nwosu** — food geographer at the Institute for Culinary Geography in Lisbon, whose atlas of regional styles maps more than two hundred local traditions.
Charred and coal-fired, square and crisp-edged, thin and generously topped, sold by weight: four cities, four answers to the same flatbread. Dr Nwosu explains how water, fuel, rent and appetite made each one.
### 17:00 · Welcome reception
Drinks and fried pizza in the courtyard, with the compliments of the Neapolitan Dough Society.
## Day 2 · Wednesday 13 October · Industry
### 09:00 · Keynote: Announcing the 2027 Standard for Wood-Fired Ovens
**Priya Raman-Costa** — chartered engineer and chair of the Society's Oven Standards Working Group, formerly a designer of industrial kilns.
After three years of consultation the Working Group publishes its standard for floor temperature, heat recovery and emissions in commercial wood-fired ovens. This session presents the standard, the evidence behind it and the timetable for certification.
### 10:00 · The Flour Supply Report 2027: Harvest, Price and Protein
**Dr Henrik Aalto** — research fellow in grain economics at the Nordic Institute for Cereal Markets, and author of the Society's annual supply report since 2023.
A poor summer in the northern hemisphere has tightened the market for high-protein soft wheat. Dr Aalto presents this year's figures on yield, price and quality, and what bakers should expect to pay by spring.
### 10:45 · Coffee, and the ovens on show in the cloister
### 11:15 · The Last Mile: The Economics of Pizza Delivery
**Nadia Haddad** — transport economist and lead author of the Delivery Costs Study, a two-year survey of 40,000 orders in eleven cities.
The study measures what a delivered pizza really costs, from the courier's wage to the box and the minutes lost in traffic. Its central finding is that the average pizzeria makes less on a delivered pizza than on one eaten at the table.
### 12:00 · Panel: The Independent Pizzeria in 2027
**Chidi Mensah-Lombardi**, **Élodie Marchand** and **Rafael Ortega Ruiz** — owners of independent pizzerias in Manchester, Lyon and Valencia, chaired by Nadia Haddad.
Rents are rising, cooks are scarce and ovens cost more than ever. Three owners discuss what keeps a small pizzeria open, and what they would ask of suppliers, landlords and this Society.
### 13:00 · Lunch
Lunch is served in the courtyard, with a tasting of this year's new flours.
### 14:15 · The Pineapple Tribunal: The People v. Pineapple
**Judge Harriet Osei-Brennan** (presiding), **Marco Villani** (prosecution) and **Tamsin Kealoha-Reid** (defence) — a retired circuit judge from Bristol, a Neapolitan pizzaiolo of the fourth generation, and a chef from Honolulu.
A mock trial, conducted with every courtesy, on the charge that pineapple has no place on a pizza. Witnesses are called, the evidence is tasted and delegates sit as the jury; the court's ruling binds nobody.
### 15:30 · Tea
### 16:00 · Buffalo, Cow or Neither: The Mozzarella Market
**Dr Sofia Lindqvist** — dairy scientist and adviser to cheesemaking cooperatives in southern Italy and Scandinavia.
Buffalo milk is scarce, cow's-milk fior di latte is cheaper, and plant-based cheeses now melt convincingly. Dr Lindqvist compares the three on cost, supply and behaviour in a hot oven.
### 19:30 · Conference dinner
A seated dinner at the Istituto, with pizzas baked by the owners from the morning's panel.
## Day 3 · Thursday 14 October · Trends
### 09:30 · Keynote: Slow Dough: The Return of Long Fermentation
**Kwame Asante-Romano** — baker, teacher and founder of a fermentation school in Turin, who has trained more than a thousand pizzaioli.
Forty-eight and seventy-two hour doughs have moved from the enthusiast's kitchen into ordinary pizzerias. Mr Asante-Romano explains what long fermentation changes in flavour, digestibility and the working day, and what it costs in fridge space.
### 10:30 · Plant-Based Pizza: Beyond the Substitute
**Leila Farahani** — chef and product developer who has written plant-based menus for restaurant groups in Tehran, Toronto and Berlin.
The first plant-based pizzas imitated cheese and sausage. The second generation starts from vegetables and asks what a pizza is for.
### 11:15 · Coffee
### 11:45 · Robots at the Peel: Automation in the Pizzeria
**Dr Mei-Lin Zhao** and **Jorge Ibáñez** — a roboticist at a university laboratory in Shenzhen, and the operations director of a forty-branch pizza chain in Mexico City.
Machines can now stretch, top and bake a pizza without a human hand. The speakers report on eighteen months of trials and ask which tasks a pizzeria should automate, and which it should not.
### 12:45 · Lunch
Lunch is served in the courtyard, followed by the committee's photograph on the steps.
### 14:00 · The Topping Pitch: Six Inventions, Five Minutes Each
**Declan Fairweather-Obi** (host) — returning from Tuesday's tasting, with six delegates chosen by lot in advance.
Six delegates each have five minutes to propose a topping the world has not yet tried. The audience votes, and the winning pizza is baked on the spot and eaten by the losers.
### 15:00 · Closing session: What Should Pizza Be in 2037?
**Professor Lucia Ferrante** with the programme committee.
The committee draws the week's threads together and invites delegates to say what the next ten years should protect, change and abandon. The date and city of PizzaCon 2028 are announced.
### 16:00 · Close of conference
<!-- @end -->

---

72 lines: 3 introduction paragraphs, 3 day headings, 28 session headings (16 sessions with speakers, and 12 for registration, breaks, meals, the reception, the dinner and the close), the speaker and abstract lines, and short lines under registration, the lunches, the reception and the dinner. No line repeats another, so every proposal below points at exactly one place.

---

## 2. Open proposals (20 wordings on 11 clauses)

Each quotes the lines it replaces exactly, the new wording, the proposer's reason and the proposer. **Every proposer is a speaker playing themselves** (the cast is §5): they care most about their own sessions, and now and then offer a rival edit to a colleague's, always good-naturedly. The contest notes say which rival ought to win and which are a genuine toss-up, for whoever tunes the bots.

Clauses A–I change wording; clauses B, J and K reorder sessions (the section *Reordering proposals* below explains how a reordering is written). No two clauses touch the same line, so each is its own contest.

<!-- @proposals -->
### Clause A — the Pineapple Tribunal's title (3 rivals, contested)

**A1**
Replaces: `### 14:15 · The Pineapple Tribunal: The People v. Pineapple`
With: `### 14:15 · Pineapple on Trial: A Friendly Hearing`
Reason: *As the presiding judge I should prefer the court not to be named for one party. "A Friendly Hearing" tells every delegate what kind of court this is before they sit down.*
Proposer: Judge Harriet Osei-Brennan
State: contested

**A2**
Replaces: `### 14:15 · The Pineapple Tribunal: The People v. Pineapple`
With: `### 14:15 · The Pineapple Tribunal: A Good-Natured Hearing`
Reason: *Keep the Tribunal, which is a good name, and drop "The People v. Pineapple", which puts my client in the dock before a word of evidence. Pineapple deserves a fair trial.*
Proposer: Tamsin Kealoha-Reid
State: contested

**A3**
Replaces: `### 14:15 · The Pineapple Tribunal: The People v. Pineapple`
With: `### 14:15 · The Hawaiian Question: A Tribunal on Pineapple`
Reason: *The Hawaiian pizza was first made in Canada in 1962, by an immigrant from Greece. The tribunal is really trying a piece of the diaspora, and the title can echo Tuesday's Margherita Question.*
Proposer: Grace Okonkwo-Bellini
State: contested

> Contest: a genuine three-way toss-up. A2 should edge it; A3 is the cleverest and the most likely to split the vote. Marco Villani, for the prosecution, votes for the current title every time.

### Clause C — the Margherita keynote's abstract (2 rivals, contested)

**C1**
Replaces: `The story of the pizza made for Queen Margherita in 1889 rests on a single letter of thanks whose authenticity has been disputed for decades. Dr Wierzbicki sets out what the archives can and cannot prove, and why the legend has outlasted every attempt to correct it.`
With: `The pizza said to have been made for Queen Margherita in 1889 rests on one disputed letter. Dr Wierzbicki sets out what the archives prove, what they do not, and why the legend survives.`
Reason: *Same content, a third shorter. An abstract is read standing up in a corridor, and Tomasz's talk deserves to be read to the end.*
Proposer: Marisol Duarte
State: contested

**C2**
Replaces: `The story of the pizza made for Queen Margherita in 1889 rests on a single letter of thanks whose authenticity has been disputed for decades. Dr Wierzbicki sets out what the archives can and cannot prove, and why the legend has outlasted every attempt to correct it.`
With: `The story of the pizza made for Queen Margherita in 1889 rests on a single letter of thanks whose authenticity has been disputed for decades. Dr Wierzbicki presents the letter in facsimile, sets out what the archives can and cannot prove, and considers why the legend has outlasted every attempt to correct it.`
Reason: *I have obtained permission to show the letter in facsimile, which is the reason to attend. My abstract should promise it.*
Proposer: Dr Tomasz Wierzbicki
State: contested

> Contest: close. C1 is better on a phone screen; C2 carries real news from the speaker himself.

### Clause D — the oven standard keynote's title (2 rivals, contested)

**D1**
Replaces: `### 09:00 · Keynote: Announcing the 2027 Standard for Wood-Fired Ovens`
With: `### 09:00 · Keynote: Announcing the 2027 Standard for Wood-Fired Ovens (with live demonstration)`
Reason: *There is a certified oven in the cloister all week. Say so, and the first session of the day fills up; I will happily help run it.*
Proposer: Dr Mei-Lin Zhao
State: contested

**D2**
Replaces: `### 09:00 · Keynote: Announcing the 2027 Standard for Wood-Fired Ovens`
With: `### 09:00 · Keynote: The 2027 Wood-Fired Oven Standard`
Reason: *Shorter, and it promises nothing the Working Group has confirmed. Nobody has yet agreed to light an oven in the Sala Grande at nine in the morning, and the chair would rather not be the one to explain why.*
Proposer: Professor Lucia Ferrante
State: contested

> Contest: a toss-up, decided by whether the bots believe there will be a demonstration.

### Clause E — a speaker's biography (1 proposal, a correction)

**E1**
Replaces: `**Dr Henrik Aalto** — research fellow in grain economics at the Nordic Institute for Cereal Markets, and author of the Society's annual supply report since 2023.`
With: `**Dr Henrik Aalto** — senior research fellow in grain economics at the Nordic Institute for Cereal Markets, and author of the Society's annual supply report since 2021.`
Reason: *Two corrections to my own entry: I was promoted in the spring, and I have written the report since 2021, not 2023.*
Proposer: Dr Henrik Aalto
State: leaning

> Contest: uncontested and plainly right; it should pass quickly and shows the simplest case.

### Clause F — the delivery study's abstract (2 rivals, contested: formal against informal)

**F1**
Replaces: `The study measures what a delivered pizza really costs, from the courier's wage to the box and the minutes lost in traffic. Its central finding is that the average pizzeria makes less on a delivered pizza than on one eaten at the table.`
With: `The study measures the full cost of a delivered pizza, including labour, packaging, platform commission and time in transit. It finds that the median pizzeria earns a lower margin on delivery than on dining in, and sets out the difference city by city.`
Reason: *"Average" is wrong: my sample is skewed and the study reports medians. And the commission charged by delivery platforms, the largest single cost, is missing from the current text.*
Proposer: Nadia Haddad
State: contested

**F2**
Replaces: `The study measures what a delivered pizza really costs, from the courier's wage to the box and the minutes lost in traffic. Its central finding is that the average pizzeria makes less on a delivered pizza than on one eaten at the table.`
With: `Every pizza that leaves the building takes a slice of the profit with it: the courier, the box, the app's cut, the traffic. Ms Haddad's study shows exactly how much, and it is more than you'd think.`
Reason: *This is the session the trade press will write about. Give it a sentence people will repeat on the way to lunch.*
Proposer: Declan Fairweather-Obi
State: contested

> Contest: F1 should win on accuracy, and it is the author's own correction; F2 is the house's tone test.

### Clause G — the opening paragraph (2 rivals, contested)

**G1**
Replaces: `PizzaCon 2027 is the third international conference on the history, craft and business of pizza, convened by the Neapolitan Dough Society for bakers, historians, suppliers, researchers and anybody who has ever argued about a crust.`
With: `PizzaCon 2027 is a three-day conference about pizza: where it came from, how it is made and sold, and where it is going. It is for anybody who makes, sells, studies or loves pizza.`
Reason: *The first sentence is the one everybody reads. Mine says what the conference is and who it is for, without a word anybody has to look up.*
Proposer: Marisol Duarte
State: contested

**G2**
Replaces: `PizzaCon 2027 is the third international conference on the history, craft and business of pizza, convened by the Neapolitan Dough Society for bakers, historians, suppliers, researchers and anybody who has ever argued about a crust.`
With: `PizzaCon 2027, the third international conference of the Neapolitan Dough Society, brings together practitioners, scholars and suppliers to examine the history, craft and economics of pizza.`
Reason: *The Society's name belongs at the front, and "anybody who has ever argued about a crust" undersells a conference that publishes a standard.*
Proposer: Professor Lucia Ferrante
State: contested

> Contest: a toss-up; the current text may well hold against both, which is worth seeing in a demo.

### Clause H — the automation session's title (2 rivals, contested)

**H1**
Replaces: `### 11:45 · Robots at the Peel: Automation in the Pizzeria`
With: `### 11:45 · Automation in the Pizzeria: What Machines Can and Cannot Do`
Reason: *Our session is eighteen months of trial results, not a novelty act. The title should say what an owner will take home from it.*
Proposer: Jorge Ibáñez
State: contested

**H2**
Replaces: `### 11:45 · Robots at the Peel: Automation in the Pizzeria`
With: `### 11:45 · Peel Good Technology: Robots in the Pizzeria`
Reason: *If a robot is going to take the peel, it may as well get a good pun out of it.*
Proposer: Declan Fairweather-Obi
State: contested

> Contest: H1 is clearly better, and is its own speaker's; H2 is there to lose cheerfully. Dr Zhao, Jorge's co-speaker, rather likes the pun.

### Clause I — the second day's lunch (1 proposal)

**I1**
Replaces: `Lunch is served in the courtyard, with a tasting of this year's new flours.`
With: `Lunch is served in the courtyard, with a tasting of this year's new flours; gluten-free pizzas are marked at the counter.`
Reason: *Tuesday's lunch says what a delegate with coeliac disease can eat and Wednesday's does not. A flour tasting is exactly the lunch where they need to know.*
Proposer: Leila Farahani
State: leaning

> Contest: uncontested and plainly right.

### Reordering proposals (7 wordings on 3 clauses, two of them contested)

> A reordering is one proposal that changes several places at once. **The time slots stay where they are and the sessions move**: each `### HH:MM · Title` heading keeps its time and takes the other session's title, and the speaker and abstract lines travel with their title. Every place is listed in document order, with every line it replaces and the new wording.

#### Clause B — the tasting debate, before lunch or after (2 rivals, contested)

**B1** — swap the tasting debate (11:15) and the diaspora panel (14:00) on Day 1, so the tasting follows lunch. Two places, one proposal, voted as one.
Place 1 replaces:
  `### 11:15 · The Great Blind Tasting Debate: Is It the Oven or the Baker?`
  `**Declan Fairweather-Obi** (chair) — broadcaster and presenter of the long-running radio programme *Crust and Crumb*, with a panel of four pizzaioli who have not been told what they are eating.`
  `Six unlabelled margheritas, three ovens, three bakers and one question: can a trained palate tell which made the difference? Delegates vote from their seats, and the panel is held to its answers.`
With:
  `### 11:15 · From Port to Pan: Naples and the Pizza Diaspora`
  `**Grace Okonkwo-Bellini**, **Hiroshi Tanabe** and **Marisol Duarte** — a migration historian from Liverpool, a baker who trained in Naples before opening in Osaka, and a food writer from Buenos Aires.`
  `Between 1880 and 1920 millions left southern Italy, and pizza went with some of them. The panel follows the dish to New York and Buenos Aires, and a century later to Osaka, and asks what each city kept, changed and forgot.`
Place 2 replaces:
  `### 14:00 · From Port to Pan: Naples and the Pizza Diaspora`
  `**Grace Okonkwo-Bellini**, **Hiroshi Tanabe** and **Marisol Duarte** — a migration historian from Liverpool, a baker who trained in Naples before opening in Osaka, and a food writer from Buenos Aires.`
  `Between 1880 and 1920 millions left southern Italy, and pizza went with some of them. The panel follows the dish to New York and Buenos Aires, and a century later to Osaka, and asks what each city kept, changed and forgot.`
With:
  `### 14:00 · The Great Blind Tasting Debate: Is It the Oven or the Baker?`
  `**Declan Fairweather-Obi** (chair) — broadcaster and presenter of the long-running radio programme *Crust and Crumb*, with a panel of four pizzaioli who have not been told what they are eating.`
  `Six unlabelled margheritas, three ovens, three bakers and one question: can a trained palate tell which made the difference? Delegates vote from their seats, and the panel is held to its answers.`
Reason: *Six margheritas at 11:15 and the hall is full before lunch, and the caterers throw away forty pizzas. Tasting after lunch, history before: the day runs better and wastes less.*
Proposer: Jorge Ibáñez
State: contested

**B2** — keep the tasting before lunch, and say why in its title.
Replaces: `### 11:15 · The Great Blind Tasting Debate: Is It the Oven or the Baker?`
With: `### 11:15 · Oven or Baker? A Blind Tasting Before Lunch, on Purpose`
Reason: *Every pizzaiolo in Naples tastes dough hungry: a full stomach cannot tell one crust from another. The tasting belongs before lunch, and the title should say so, so nobody moves it.*
Proposer: Marco Villani
State: contested

> Contest: a genuine toss-up between logistics and craft. B1 and B2 both change the tasting's heading, so they race each other and the current text. Grace and Marisol, whose panel B1 moves to the morning, are glad of the earlier slot; Declan, whose session it is, is happy either way and says so at length.

#### Clause J — the start of the third day (2 rivals, contested)

**J1** — swap the two adjacent sessions that open Day 3, one run of six lines replaced by six.
Replaces:
  `### 09:30 · Keynote: Slow Dough: The Return of Long Fermentation`
  `**Kwame Asante-Romano** — baker, teacher and founder of a fermentation school in Turin, who has trained more than a thousand pizzaioli.`
  `Forty-eight and seventy-two hour doughs have moved from the enthusiast's kitchen into ordinary pizzerias. Mr Asante-Romano explains what long fermentation changes in flavour, digestibility and the working day, and what it costs in fridge space.`
  `### 10:30 · Plant-Based Pizza: Beyond the Substitute`
  `**Leila Farahani** — chef and product developer who has written plant-based menus for restaurant groups in Tehran, Toronto and Berlin.`
  `The first plant-based pizzas imitated cheese and sausage. The second generation starts from vegetables and asks what a pizza is for.`
With:
  `### 09:30 · Plant-Based Pizza: Beyond the Substitute`
  `**Leila Farahani** — chef and product developer who has written plant-based menus for restaurant groups in Tehran, Toronto and Berlin.`
  `The first plant-based pizzas imitated cheese and sausage. The second generation starts from vegetables and asks what a pizza is for.`
  `### 10:30 · Keynote: Slow Dough: The Return of Long Fermentation`
  `**Kwame Asante-Romano** — baker, teacher and founder of a fermentation school in Turin, who has trained more than a thousand pizzaioli.`
  `Forty-eight and seventy-two hour doughs have moved from the enthusiast's kitchen into ordinary pizzerias. Mr Asante-Romano explains what long fermentation changes in flavour, digestibility and the working day, and what it costs in fridge space.`
Reason: *The conference dinner ends late and half the hall will arrive at ten on Thursday. I am up early anyway: let me take 09:30 and give Kwame's keynote the full room.*
Proposer: Leila Farahani
State: contested

**J2** — a different reordering of the same day: the Topping Pitch opens it and the keynote moves to the afternoon. Two places.
Place 1 replaces:
  `### 09:30 · Keynote: Slow Dough: The Return of Long Fermentation`
  `**Kwame Asante-Romano** — baker, teacher and founder of a fermentation school in Turin, who has trained more than a thousand pizzaioli.`
  `Forty-eight and seventy-two hour doughs have moved from the enthusiast's kitchen into ordinary pizzerias. Mr Asante-Romano explains what long fermentation changes in flavour, digestibility and the working day, and what it costs in fridge space.`
With:
  `### 09:30 · The Topping Pitch: Six Inventions, Five Minutes Each`
  `**Declan Fairweather-Obi** (host) — returning from Tuesday's tasting, with six delegates chosen by lot in advance.`
  `Six delegates each have five minutes to propose a topping the world has not yet tried. The audience votes, and the winning pizza is baked on the spot and eaten by the losers.`
Place 2 replaces:
  `### 14:00 · The Topping Pitch: Six Inventions, Five Minutes Each`
  `**Declan Fairweather-Obi** (host) — returning from Tuesday's tasting, with six delegates chosen by lot in advance.`
  `Six delegates each have five minutes to propose a topping the world has not yet tried. The audience votes, and the winning pizza is baked on the spot and eaten by the losers.`
With:
  `### 14:00 · Keynote: Slow Dough: The Return of Long Fermentation`
  `**Kwame Asante-Romano** — baker, teacher and founder of a fermentation school in Turin, who has trained more than a thousand pizzaioli.`
  `Forty-eight and seventy-two hour doughs have moved from the enthusiast's kitchen into ordinary pizzerias. Mr Asante-Romano explains what long fermentation changes in flavour, digestibility and the working day, and what it costs in fridge space.`
Reason: *Nobody is sharp at 09:30 the morning after the dinner. Let me wake the hall with the Topping Pitch, and give Kwame the afternoon, when people are awake to hear him.*
Proposer: Declan Fairweather-Obi
State: contested

> Contest: J1 and J2 both change the keynote's lines, so they race each other and the current order. A genuine toss-up; Lucia Ferrante and Marco Villani will likely hold for the current order, which makes it a good three-way demonstration.

#### Clause K — a swap across two days (1 proposal)

**K1** — swap the regional styles session (Day 1, 15:45) with the mozzarella session (Day 2, 16:00). Two places.
Place 1 replaces:
  `### 15:45 · Four Crusts, One Idea: New Haven, Detroit, São Paulo and Rome`
  `**Dr Amara Nwosu** — food geographer at the Institute for Culinary Geography in Lisbon, whose atlas of regional styles maps more than two hundred local traditions.`
  `Charred and coal-fired, square and crisp-edged, thin and generously topped, sold by weight: four cities, four answers to the same flatbread. Dr Nwosu explains how water, fuel, rent and appetite made each one.`
With:
  `### 15:45 · Buffalo, Cow or Neither: The Mozzarella Market`
  `**Dr Sofia Lindqvist** — dairy scientist and adviser to cheesemaking cooperatives in southern Italy and Scandinavia.`
  `Buffalo milk is scarce, cow's-milk fior di latte is cheaper, and plant-based cheeses now melt convincingly. Dr Lindqvist compares the three on cost, supply and behaviour in a hot oven.`
Place 2 replaces:
  `### 16:00 · Buffalo, Cow or Neither: The Mozzarella Market`
  `**Dr Sofia Lindqvist** — dairy scientist and adviser to cheesemaking cooperatives in southern Italy and Scandinavia.`
  `Buffalo milk is scarce, cow's-milk fior di latte is cheaper, and plant-based cheeses now melt convincingly. Dr Lindqvist compares the three on cost, supply and behaviour in a hot oven.`
With:
  `### 16:00 · Four Crusts, One Idea: New Haven, Detroit, São Paulo and Rome`
  `**Dr Amara Nwosu** — food geographer at the Institute for Culinary Geography in Lisbon, whose atlas of regional styles maps more than two hundred local traditions.`
  `Charred and coal-fired, square and crisp-edged, thin and generously topped, sold by weight: four cities, four answers to the same flatbread. Dr Nwosu explains how water, fuel, rent and appetite made each one.`
Reason: *I have to leave Naples on Wednesday night, and Dr Nwosu cannot arrive before Wednesday morning. Swapping our slots keeps both sessions and costs the programme nothing.*
Proposer: Dr Sofia Lindqvist
State: contested

> Contest: uncontested, and a speaker's travel is hard to argue with; Dr Wierzbicki may vote against it because the history day loses its regional styles session, which gives it some resistance.
<!-- @end -->

---

## 3. Decided changes (4, adopted before the demo starts)

Each adopted wording is already in the text in §1; the "as it was" line is not.

<!-- @decided -->
**Decided 1** — the regional styles title
As it was: `### 15:45 · Regional Styles: A Survey`
Adopted: `### 15:45 · Four Crusts, One Idea: New Haven, Detroit, São Paulo and Rome`
Reason: *"A Survey" says nothing. Name the four cities; they are what people will come for.*
Proposer: Marisol Duarte
Losing rival: `### 15:45 · Around the World in Four Crusts`
Rival reason: *It's a journey! Make it sound like one.*
Rival proposer: Declan Fairweather-Obi

**Decided 2** — the first day's lunch
As it was: `Lunch is provided.`
Adopted: `Lunch is served in the courtyard; vegetarian, vegan and gluten-free pizzas are marked at the counter.`
Reason: *Delegates need to know where lunch is and whether they can eat it. Four people asked me last year.*
Proposer: Leila Farahani

**Decided 3** — the Tribunal's abstract
As it was: `A mock trial on the charge that pineapple does not belong on pizza. The jury's verdict is final.`
Adopted: `A mock trial, conducted with every courtesy, on the charge that pineapple has no place on a pizza. Witnesses are called, the evidence is tasted and delegates sit as the jury; the court's ruling binds nobody.`
Reason: *A verdict that is "final" is a joke some delegates will not hear as one. Say plainly that it is all in good humour, and that there is tasting.*
Proposer: Tamsin Kealoha-Reid
Losing rival: `A mock trial in which pineapple is prosecuted, convicted and sentenced to the dessert menu.`
Rival reason: *Why pretend there is any doubt about the outcome?*
Rival proposer: Marco Villani

**Decided 4** — the dates
As it was: `It meets from Monday 11 to Wednesday 13 October 2027 in the Sala Grande of the Istituto dell'Arte Bianca, in the old city of Naples, ten minutes' walk from the port.`
Adopted: `It meets from Tuesday 12 to Thursday 14 October 2027 in the Sala Grande of the Istituto dell'Arte Bianca, in the old city of Naples, ten minutes' walk from the port.`
Reason: *The Istituto is booked from Tuesday to Thursday. The Monday dates came from last year's template, and that is my fault.*
Proposer: Professor Lucia Ferrante
<!-- @end -->

---

## 4. Insertions (2, proposed at a gap)

<!-- @insertions -->
**Insertion 1** — a housekeeping note, between the introduction and Day 1
After: `The programme runs as a single track, so every delegate hears every session; all times are local, and each day ends with something to eat.`
With: `Sessions are recorded and published within a week, except the Pineapple Tribunal, which is not recorded at the request of the defence.`
Reason: *People always ask whether they can watch later. And the defence has asked, very politely: I am the defence.*
Proposer: Tamsin Kealoha-Reid
State: leaning

**Insertion 2** — a new short session, between the third day's lunch and the Topping Pitch
After: `Lunch is served in the courtyard, followed by the committee's photograph on the steps.`
With:
  `### 13:30 · Stretching Clinic (optional, in the courtyard)`
  `**Marco Villani** — who prosecutes pineapple on Wednesday and teaches dough by hand on Thursday.`
  `Half an hour for delegates who want to stretch a dough by hand under instruction before the afternoon begins; aprons are provided.`
Reason: *Three days of talking about dough and nobody touches any. I will teach it myself, and the courtyard is free after lunch.*
Proposer: Marco Villani
State: fresh
<!-- @end -->

---

## 5. The bot cast (14 speakers, playing themselves)

The bots are the conference's own speakers. PizzaCon 2027 has 21; these are the 14 most distinct. The other seven (Hiroshi Tanabe, Dr Amara Nwosu, Priya Raman-Costa, Chidi Mensah-Lombardi, Élodie Marchand, Rafael Ortega Ruiz and Kwame Asante-Romano) appear in the text but are not seated. Each line is how the speaker proposes and how they vote; each cares most about their own session and is generous about everybody else's.

**The Founder is the programme chair**, marked *(founder)*: that seat is Ed's, switched to from the demo panel, and is never a bot, so thirteen speakers run as bots (`design/DEMO.md` §9, 1535 (d)).

<!-- @cast -->
1. **Professor Lucia Ferrante** (founder) — the chair: diplomatic and careful, will not let the programme promise what nobody has confirmed, and leans towards the current text unless a change is clearly better.
2. **Dr Tomasz Wierzbicki** — the archivist: checks every date and claim, distrusts legends, and votes for accuracy over style and against anything he thinks is a myth.
3. **Declan Fairweather-Obi** — the broadcaster who chairs the tasting and hosts the Topping Pitch: loves a pun and a catchy title, writes in a bright spoken voice, and votes for whatever would sound best on air.
4. **Grace Okonkwo-Bellini** — the migration historian: sees the diaspora in everything, likes titles that connect one session to another, and votes for wording that includes the whole world rather than Naples alone.
5. **Marisol Duarte** — the food writer: plain language, short sentences, no insider words; votes for the shortest wording a stranger would understand.
6. **Dr Henrik Aalto** — the grain economist: precise about figures and titles, his own included; votes for the wording with the correct number in it.
7. **Nadia Haddad** — the transport economist: tightens claims, dislikes "average" where the data says "median", and votes for what the evidence supports.
8. **Judge Harriet Osei-Brennan** — the retired judge presiding at the Tribunal: formal, fair-minded and exact; votes for the more formal wording and against anything that prejudges a question.
9. **Marco Villani** — the Neapolitan pizzaiolo prosecuting pineapple: a traditionalist and a craftsman, sceptical of trends and machines; votes against anything that makes the tradition look quaint, and does it with a grin.
10. **Tamsin Kealoha-Reid** — the chef from Honolulu defending pineapple: cheerful and never cross, gently resists anything that mocks any topping; votes for fairness and good humour.
11. **Dr Sofia Lindqvist** — the dairy scientist: practical, well organised, pragmatic about schedules; votes for whatever makes the programme work for the people in it.
12. **Leila Farahani** — the plant-based chef: speaks for delegates with dietary needs, likes practical notes; votes for wording that answers a delegate's question.
13. **Dr Mei-Lin Zhao** — the roboticist: keen on technology, demonstrations and anything live; votes for wording that makes a session sound like something happens in it.
14. **Jorge Ibáñez** — the operations director: thinks in times, queues, room changes and catering; proposes moves and retimings, and votes for whatever makes the day run.
<!-- @end -->

Who proposes what, at a glance: Ferrante D2, G2, Decided 4 · Wierzbicki C2 · Fairweather-Obi F2, H2, J2 · Okonkwo-Bellini A3 · Duarte C1, G1, Decided 1 · Aalto E1 · Haddad F1 · Osei-Brennan A1 · Villani B2, Insertion 2 · Kealoha-Reid A2, Decided 3, Insertion 1 · Lindqvist K1 · Farahani I1, J1, Decided 2 · Zhao D1 · Ibáñez B1, H1.

---

## 6. Rule settings (Ed's rulings, 2026-09-24, Q1535)

Each line is a setting's catalogue id and its value as the server reads it, with the plain words beneath. Visibility, closing date, applications and admissions are the demo's own and fixed (`design/DEMO.md` §3.1): they may be stated here, but only at the value shown.

<!-- @rules -->
quorum: {"form":"count","n":6}
> 👥 Quorum — a fixed six members (Ed, 2026-09-24: at three the proposals were too close to passing, so viewers mostly saw green passed marks). A seeded proposal now needs a few more votes before it passes, so a visitor's vote can still matter.
rate: {"grant":3,"cap":3,"dripMinutes":2}
> ⏱️ Proposal rate — members start with 3 proposals, up to a maximum of 3 (R-083, as every document), and get another every 2 minutes.
ending: {"endsAtMs":null}
> ⏰ Closing date — never; the document is reset, not closed.
lapse: {"afterMs":null}
> 💤 Lapse — memberships do not lapse, so a bot is never counted as abstaining. A visitor's seat is the demo's own business: it leaves 30 minutes after its last action (`design/DEMO.md` D8).
chamber: {"rung":"public"}
> 🌍 Visibility — public, so a stranger can read the document from the link on the screen before joining.
authorship: {"rung":"public"}
> 👤 Names — every proposal is signed: its proposer is named from the moment it is made.
<!-- @end -->

Joining is by one tap or the QR code (`design/DEMO.md` Stage 3), not by an application, so 🤝 stays shut and 🪪 is the Founder's; 🎩 the Founder is a member, so the person demonstrating can propose and vote from the same seat.

---

## 7. Things I am unsure about

1. **The reorderings are long.** B1, J2 and K1 each replace six lines in two places, and J1 six lines in one run. They show a proposal made in several places at once, but they are heavy for a bot to compose and for a visitor to read on a phone. If they prove unwieldy, keep B2 and J1 and drop the others.
2. **How a visitor gets in.** I suggested applications open at the cheapest price, but I am not sure whether an application at ✒️ admits a stranger at once or still waits for a member's word, nor whether the demo will instead use invitation links shown on screen. That choice decides how quickly phones join.
3. **Speakers voting on their own sessions.** With the cast drawn from the speakers, several proposals are a speaker's edit to their own abstract or slot. The document seals authorship, so the other bots do not know it is the speaker's own, but a bot told its persona will naturally favour its own session; if that tilts the demo, tell the bots to vote on the wording alone.
4. **Whether the title (🪶) should also open the text.** I kept "PizzaCon 2027" as the document's title only and did not repeat it as a heading at the top of the text; if the demo reads better with a `#` heading there, add `# Programme` above the first paragraph.
5. **The middle dot in headings** (`### 09:30 · Title`) follows the brief's example. Speaker lines use an em dash and bold names; if bold inside a speaker line reads badly on a phone, the names can go plain.
6. **Fictional names that may collide with real ones.** I chose names to be plainly invented, but I have not searched for them. Worth a quick check before the demo is shown publicly: the *Neapolitan Dough Society*, the *Istituto dell'Arte Bianca*, the *Università del Golfo* and the radio programme *Crust and Crumb*.
7. **The historical claims** (the 1889 Margherita letter and its disputed authenticity; the Hawaiian pizza first made in Canada in 1962 by a Greek immigrant; emigration from southern Italy peaking between 1880 and 1920) are real history as commonly told, stated cautiously; Dr Wierzbicki's and Grace Okonkwo-Bellini's bots should not embellish them.
8. **Insertion 2 sits in the gap just above the Topping Pitch heading**, which J2 also replaces. They should not collide (one inserts at the gap, the other replaces the line after it), but if the engine treats a gap and its neighbouring line as one place, move the clinic to the gap after the Day 2 lunch instead.
