import { describe, expect, it } from 'vitest';
import request from 'supertest';

describe('Auth API Integration Tests', () => {
  it('registers a new user and returns user info with cookie', async () => {
    const { app } = await import('../../backend/src/app.js');
    const email = `auth-test-${Date.now()}@example.com`;

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Password123!' });

    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(email);
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('fails registration with duplicate email', async () => {
    const { app } = await import('../../backend/src/app.js');
    const email = `dup-test-${Date.now()}@example.com`;

    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Password123!' });

    const dupResponse = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Password123!' });

    expect(dupResponse.status).toBe(409);
    expect(dupResponse.body.code).toBe('EMAIL_IN_USE');
  });

  it('logs in an existing user and authenticates subsequent requests', async () => {
    const { app } = await import('../../backend/src/app.js');
    const email = `login-test-${Date.now()}@example.com`;
    const password = 'Password123!';

    // Register
    await request(app).post('/api/auth/register').send({ email, password });

    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.email).toBe(email);
    const cookies = loginRes.headers['set-cookie'];

    // Get /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(email);
  });

  it('rejects protected routes without auth cookie', async () => {
    const { app } = await import('../../backend/src/app.js');

    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
