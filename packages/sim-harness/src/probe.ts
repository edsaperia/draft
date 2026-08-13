/** One-shot auth probe: `npx tsx src/probe.ts` */
import { probeSubscription } from './subscription-persona.js';

const failure = await probeSubscription();
console.log(failure === null ? 'SUBSCRIPTION AUTH OK' : `FAILED: ${failure}`);
