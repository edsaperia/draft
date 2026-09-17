/**
 * The design surface, served. `npm run design` → the addresses it prints.
 *
 * It exists because the fixture is the only place the **stagehand** lives —
 * the dev seat dropdown and ⏩ settle the founding — and both `liveBoot` and
 * `birthBoot` hide it, correctly: ⏩ against a real document would settle
 * somebody's actual founding, and at the birth it would fake a document the
 * server knows nothing about. So docs.vote can never show it, and the way to
 * press it is the fixture.
 *
 * The page also runs straight from the filesystem (no modules, no fetch on
 * the fixture path), so opening design/session-view.html in a browser works
 * on its own. This is for the two things file:// cannot do: the
 * /reference/ copies rendering with their own relative assets, and anything
 * that wants a real origin.
 *
 *   /session-view.html                     the founding, from a blank arrival
 *   /session-view.html?fixture=session     the Hollow Oak session, mid-flight
 *   /session-view.html?fixture=session&closed=1   the closed document
 *   /reference/                            the byte-frozen copy, for a diff
 *
 * **Every address names the page, because `/` is not the fixture.** At
 * pathname `/` the page boots as the live birth (`BIRTH`, session-view.html),
 * which wants an API this server does not have, so `/?fixture=session` is a
 * blank arrival and the query is never read (issue #21). Every tool in the
 * repository already opens `/session-view.html`, which is why nothing caught
 * it; this file and README were the two places that said otherwise.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const ROOT = 'design';
// two builds run at once, each in its own worktree, so the port is the
// environment's to choose; the source is kept because *DESIGN_PORT is busy*
// and *8137 is busy* want different things done about them
const [PORT, PORT_FROM] = process.argv[2]
  ? [Number(process.argv[2]), 'the argument']
  : process.env.DESIGN_PORT
    ? [Number(process.env.DESIGN_PORT), 'DESIGN_PORT']
    : [8137, 'the built-in default'];
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'session-view.html';
  // no escaping the design directory
  const file = join(ROOT, normalize(p).split(/[\/]+/).filter((x) => x && x !== '..').join('/'));
  if (!existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not here: ' + p);
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(await readFile(file));
});

// a held port is the ordinary case when two builds are up, and the stack it
// used to print sent one session after the holder with kill -9 — which is
// another live build's server
server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  console.error('design surface  port ' + PORT + ' is already held (it came from ' + PORT_FROM + ').');
  console.error('  The holder is very likely another build\'s design server, running in');
  console.error('  another worktree of this repository. Do not kill it — it belongs to');
  console.error('  a build that is still going.');
  console.error('  Serve on a port of your own instead: set DESIGN_PORT, or pass one —');
  console.error('    npm run design -- 8139');
  process.exit(1);
});

server.listen(PORT, () => {
  const at = 'http://localhost:' + PORT;
  console.log('design surface  port ' + PORT + ', from ' + PORT_FROM);
  console.log('  the founding  ' + at + '/session-view.html            ⏩ and the seat dropdown are here');
  console.log('  a live room   ' + at + '/session-view.html?fixture=session');
  console.log('  the close     ' + at + '/session-view.html?fixture=session&closed=1');
  console.log('  frozen copy   ' + at + '/reference/');
});
