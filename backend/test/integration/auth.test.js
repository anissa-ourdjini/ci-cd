import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { server, pool } from '../../src/server.js';

let baseUrl;
let originalQuery;

before(async () => {
  process.env.JWT_SECRET = 'test-secret';
  originalQuery = pool.query;
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  pool.query = originalQuery;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  await pool.end();
});

test('1. GET /api/auth/info reports auth state', async () => {
  pool.query = async () => [[{ c: 1 }]];
  const response = await fetch(`${baseUrl}/api/auth/info`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { hasAdmin: true });
});

test('2. POST /api/auth/register rejects missing credentials', async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'email and password required' });
});

test('3. POST /api/auth/login rejects invalid credentials', async () => {
  pool.query = async () => [[{
    id: 1,
    email: 'admin@test.fr',
    password_hash: await bcrypt.hash('wrong-password', 4),
    role: 'ADMIN'
  }]];
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.fr', password: 'bad-password' })
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Invalid credentials' });
});

test('4. POST /api/auth/login returns a token for valid credentials', async () => {
  const passwordHash = await bcrypt.hash('secret123', 4);
  pool.query = async () => [[{
    id: 1,
    email: 'admin@test.fr',
    password_hash: passwordHash,
    role: 'ADMIN'
  }]];
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.fr', password: 'secret123' })
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.user.email, 'admin@test.fr');
  assert.equal(jwt.verify(body.token, 'test-secret').role, 'ADMIN');
});

test('5. POST /api/auth/register allows the first admin', async () => {
  const queries = [
    [[{ c: 0 }]],
    [[]],
    [{ insertId: 12 }]
  ];
  pool.query = async () => queries.shift();
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'first@test.fr', password: 'secret123' })
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.user.email, 'first@test.fr');
  assert.equal(jwt.verify(body.token, 'test-secret').role, 'ADMIN');
});
