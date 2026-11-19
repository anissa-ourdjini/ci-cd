import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { signAdminToken } from '../../src/middleware/auth.js';

test('1. unit: signAdminToken creates an ADMIN JWT', () => {
  process.env.JWT_SECRET = 'test-secret';
  const token = signAdminToken({ id: 7, email: 'admin@test.fr', role: 'ADMIN' });
  const payload = jwt.verify(token, 'test-secret');

  assert.equal(payload.id, 7);
  assert.equal(payload.email, 'admin@test.fr');
  assert.equal(payload.role, 'ADMIN');
});
