import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing service
vi.mock('../../config/prisma', () => ({
  prisma: {
    skinTypeAdvice: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from '../../config/prisma';
import { getSkinTypeAdvice, updateSkinTypeAdvice } from './skin-weather.service';

describe('getSkinTypeAdvice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all advice records ordered by skinType', async () => {
    const fakeRecords = [
      { id: '1', skinType: 'SUCHA', content: 'porada', updatedAt: new Date() },
    ];
    vi.mocked(prisma.skinTypeAdvice.findMany).mockResolvedValue(fakeRecords as any);

    const result = await getSkinTypeAdvice();
    expect(result).toEqual(fakeRecords);
    expect(prisma.skinTypeAdvice.findMany).toHaveBeenCalledOnce();
  });
});

describe('updateSkinTypeAdvice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws 400 for invalid skinType', async () => {
    await expect(updateSkinTypeAdvice('INVALID', 'treść')).rejects.toThrow('Nieprawidłowy typ skóry');
  });

  it('upserts record for valid skinType', async () => {
    const fakeRecord = { id: '1', skinType: 'SUCHA', content: 'treść', updatedAt: new Date() };
    vi.mocked(prisma.skinTypeAdvice.upsert).mockResolvedValue(fakeRecord as any);

    const result = await updateSkinTypeAdvice('SUCHA', 'treść');
    expect(result).toEqual(fakeRecord);
    expect(prisma.skinTypeAdvice.upsert).toHaveBeenCalledWith({
      where: { skinType: 'SUCHA' },
      update: { content: 'treść' },
      create: { skinType: 'SUCHA', content: 'treść' },
    });
  });

  it('allows empty content (admin can clear advice)', async () => {
    const fakeRecord = { id: '1', skinType: 'TLUSTA', content: '', updatedAt: new Date() };
    vi.mocked(prisma.skinTypeAdvice.upsert).mockResolvedValue(fakeRecord as any);

    await expect(updateSkinTypeAdvice('TLUSTA', '')).resolves.not.toThrow();
  });
});
