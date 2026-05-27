import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret');
export const COOKIE_NAME = 'session';

export interface SessionPayload extends JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function createSession(userId: string, email: string, role: string): Promise<string> {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const token = await new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
  return token;
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  try {
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
