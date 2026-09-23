import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { createRequire } from 'node:module';
import { once } from 'node:events';

const { createCanvasHost } = createRequire(import.meta.url)('../dist/canvas-host.cjs');
const publicOrigin = 'https://code.example.com';

async function check(publicUrl, cases) {
  const host = createCanvasHost({ distDir: 'dist', publicOrigin: publicUrl });
  const server = createServer(host.handle);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  const localHost = `127.0.0.1:${port}`;
  try {
    for (const [label, headers, expected] of cases(localHost)) {
      const response = await new Promise((resolve, reject) => {
        const req = request({ hostname: '127.0.0.1', port, path: '/rpc', method: 'POST', headers: {
          'content-type': 'application/json', ...headers,
        } }, res => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.end(JSON.stringify({ id: 'probe', method: 'getCapabilities' }));
      });
      assert.equal(response.status, expected, label);
      if (expected === 200) assert.deepEqual(JSON.parse(response.body), {
        type: 'response', id: 'probe', data: { host: 'canvas', llm: false },
      });
      console.log(`PASS ${label}`);
    }
  } finally {
    host.dispose();
    await new Promise(resolve => server.close(resolve));
  }
}

await check(undefined, local => [
  ['loopback remains available', { host: local, origin: `http://${local}` }, 200],
  ['unconfigured public host blocked', { host: 'code.example.com', origin: publicOrigin }, 403],
  ['cross-origin loopback request blocked', { host: local, origin: publicOrigin }, 403],
]);
await check(publicOrigin, local => [
  ['configured HTTPS dashboard receives JSON', { host: 'code.example.com', origin: publicOrigin }, 200],
  ['loopback remains available when hosted', { host: local }, 200],
  ['foreign origin blocked', { host: 'code.example.com', origin: 'https://evil.example' }, 403],
  ['wrong host blocked', { host: 'evil.example', origin: publicOrigin }, 403],
  ['HTTP downgrade blocked', { host: 'code.example.com', origin: 'http://code.example.com' }, 403],
  ['different port blocked', { host: 'code.example.com', origin: 'https://code.example.com:444' }, 403],
  ['missing public origin blocked', { host: 'code.example.com' }, 403],
]);
for (const invalid of ['http://code.example.com', 'https://code.example.com/path', 'https://user@code.example.com', 'not a URL']) {
  assert.throws(() => createCanvasHost({ distDir: 'dist', publicOrigin: invalid }));
}
console.log('PASS invalid public origins rejected');
