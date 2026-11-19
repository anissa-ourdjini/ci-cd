import assert from 'node:assert/strict';
import test from 'node:test';
import { server, pool } from '../../src/server.js';

test('GET / returns an API status response', async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /API GLesCrocs fonctionne/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await pool.end();
  }
});
