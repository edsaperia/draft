import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto(process.argv[2]); await p.waitForTimeout(1500);
console.log(await p.evaluate(process.argv[3]));
await b.close();
