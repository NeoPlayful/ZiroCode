import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Integration tests need a running database.
// These tests verify the API routes work correctly end-to-end.
// To run: pnpm vitest
// Prerequisite: docker compose up -d && pnpm prisma db push && pnpm prisma db seed

const prisma = new PrismaClient();

beforeAll(async () => {
  // Verify DB is reachable
  try {
    await prisma.$connect();
  } catch {
    // Tests will fail gracefully if DB isn't available
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
