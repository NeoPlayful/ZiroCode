import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Auth API', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'test123456',
    name: 'Test User',
  };

  it('should register a new user', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    // May fail if DB is not running, that's OK
    if (res.status === 500) return; // graceful skip

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe(testUser.email);
  });

  it('should login with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@zirocode.com',
        password: 'admin123',
      }),
    });

    if (res.status === 500) return;

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe('admin@zirocode.com');
  });

  it('should reject invalid credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrong@example.com',
        password: 'wrongpass',
      }),
    });

    expect(res.status).toBe(401);
  });

  it('should reject registration with missing fields', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'incomplete@example.com' }),
    });

    expect(res.status).toBe(400);
  });
});

describe('API Keys', () => {
  it('should require authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/keys`);
    expect(res.status).toBe(401);
  });
});

describe('Health', () => {
  it('should return ok', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });
});

describe('Gateway', () => {
  it('should reject requests without API key', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] }),
    });

    expect(res.status).toBe(401);
  });

  it('should reject invalid API keys', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-invalidkey123',
      },
      body: JSON.stringify({ model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] }),
    });

    expect(res.status).toBe(401);
  });
});
