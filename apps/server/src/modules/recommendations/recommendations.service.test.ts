import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma', () => ({
  prisma: {
    appointmentRecommendation: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../config/prisma';
import { getRecommendationsByUser } from './recommendations.service';

describe('getRecommendationsByUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.appointmentRecommendation.findMany as any).mockResolvedValue([]);
  });

  it('queries by userId', async () => {
    await getRecommendationsByUser('user-abc');
    expect(prisma.appointmentRecommendation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-abc' } })
    );
  });

  it('returns empty array when no recommendations found', async () => {
    const result = await getRecommendationsByUser('user-abc');
    expect(result).toEqual([]);
  });
});
