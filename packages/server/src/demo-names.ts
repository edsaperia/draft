/**
 * **A visitor's made-up name** (design/DEMO.md Stage 3; Q1535): an adjective
 * and a topping, *Crispy Basil*, *Smoky Porcini* — friendly, plainly a
 * pseudonym, never a real person's name and never a speaker's (the cast are
 * people's names; nothing here is). Drawn until it matches no name already in
 * the generation, so two phones never read the same; past the lists' 900
 * pairs a number is added rather than a name repeated.
 */
import { randomInt } from 'node:crypto';

export const ADJECTIVES = [
  'Crispy', 'Smoky', 'Golden', 'Toasty', 'Zesty', 'Tangy', 'Sunny', 'Rustic', 'Bubbly', 'Charred',
  'Peppery', 'Saucy', 'Herby', 'Fiery', 'Mellow', 'Sizzling', 'Hearty', 'Plucky', 'Merry', 'Jolly',
  'Nimble', 'Breezy', 'Cosy', 'Dapper', 'Lively', 'Gentle', 'Curious', 'Cheerful', 'Snappy', 'Sprightly',
] as const;

export const TOPPINGS = [
  'Basil', 'Oregano', 'Olive', 'Caper', 'Crust', 'Mozzarella', 'Burrata', 'Truffle', 'Porcini', 'Artichoke',
  'Rocket', 'Tomato', 'Garlic', 'Chilli', 'Pesto', 'Calzone', 'Focaccia', 'Dough', 'Flatbread', 'Ricotta',
  'Parmesan', 'Provolone', 'Fennel', 'Aubergine', 'Pepper', 'Onion', 'Mushroom', 'Pineapple', 'Rosemary', 'Thyme',
] as const;

/** A name no member of the generation wears; `taken` holds the names in use. */
export function visitorName(taken: ReadonlySet<string>, pick: (n: number) => number = randomInt): string {
  const all = ADJECTIVES.length * TOPPINGS.length;
  // a random draw first, which is what the room sees; then a walk from it,
  // so a crowded generation still finds a free pair without looping
  const start = pick(all);
  for (let k = 0; k < all; k++) {
    const i = (start + k) % all;
    const name = `${ADJECTIVES[Math.floor(i / TOPPINGS.length)]} ${TOPPINGS[i % TOPPINGS.length]}`;
    if (!taken.has(name)) return name;
  }
  const base = `${ADJECTIVES[Math.floor(start / TOPPINGS.length)]} ${TOPPINGS[start % TOPPINGS.length]}`;
  for (let n = 2; ; n++) if (!taken.has(`${base} ${n}`)) return `${base} ${n}`;
}
