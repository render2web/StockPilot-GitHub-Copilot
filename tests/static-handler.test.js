import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAppServer } from '../server/static-handler.js';

function rawRequest(port, requestPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: requestPath,
        method
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8')
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('static-handler server (Fase 1)', () => {
  let server;
  let baseUrl;
  let port;

  before(async () => {
    server = createAppServer();
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    port = address.port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('sirve index.html en / con código 200 y MIME text/html', async () => {
    const res = await fetch(`${baseUrl}/`);
    const text = await res.text();

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
    assert.match(text, /StockPilot/);
  });

  it('sirve archivos CSS y JS con sus tipos MIME correspondientes', async () => {
    const cssRes = await fetch(`${baseUrl}/css/styles.css`);
    assert.equal(cssRes.status, 200);
    assert.match(cssRes.headers.get('content-type') || '', /text\/css/);

    const jsRes = await fetch(`${baseUrl}/js/main.js`);
    assert.equal(jsRes.status, 200);
    assert.match(jsRes.headers.get('content-type') || '', /text\/javascript/);
  });

  it('devuelve 404 para rutas inexistentes', async () => {
    const res = await fetch(`${baseUrl}/no-existe.html`);
    assert.equal(res.status, 404);
  });

  it('bloquea intentos de path traversal fuera de public/', async () => {
    const traversal1 = await rawRequest(port, '/../package.json');
    assert.ok(
      traversal1.statusCode === 403 || traversal1.statusCode === 404,
      `Se esperaba 403 o 404 y se recibió ${traversal1.statusCode}`
    );

    const traversal2 = await rawRequest(port, '/%2e%2e/package.json');
    assert.ok(
      traversal2.statusCode === 403 || traversal2.statusCode === 404,
      `Se esperaba 403 o 404 y se recibió ${traversal2.statusCode}`
    );
  });

  it('devuelve 405 cuando el método HTTP no es GET ni HEAD', async () => {
    const res = await fetch(`${baseUrl}/`, { method: 'POST' });
    assert.equal(res.status, 405);
  });
});
