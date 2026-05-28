import type { TicketPriority } from '@prisma/client';

const SLA_RULES: Record<TicketPriority, { responseHours: number; resolutionHours: number }> = {
  URGENT: { responseHours: 1, resolutionHours: 4 },
  HIGH: { responseHours: 4, resolutionHours: 24 },
  NORMAL: { responseHours: 24, resolutionHours: 72 },
  LOW: { responseHours: 72, resolutionHours: 168 },
};

export function calculateSlaDeadline(priority: TicketPriority, createdAt: Date): Date {
  const rule = SLA_RULES[priority];
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + rule.resolutionHours);
  return deadline;
}

export function isSlaViolated(slaDeadline: Date | null, status: string): boolean {
  if (!slaDeadline || status === 'CLOSED' || status === 'RESOLVED') return false;
  return new Date() > slaDeadline;
}
